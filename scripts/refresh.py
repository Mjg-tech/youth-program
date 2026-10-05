"""Daily maintenance run. No AI, no credentials: executed by .github/workflows/refresh.yml.

What it does, in order:
  1. Recomputes the deadline status of every record.
  2. Closes finished cycles: snapshots them into archive/archive.json, then either
     rolls a recurring programme forward ("next cycle not announced") or moves a
     one-off programme out of the live database.
  3. Re-fetches each official page, stores its HTTP status and a fingerprint of its
     date/deadline lines, and flags dead links and changed pages.
  4. Writes data/meta.json and reports/latest.md.

What it never does: edit a factual field (deadline, funding, eligibility, URL).
Facts only change through a research cycle and scripts/upsert.py. See AGENTS.md.

    python scripts/refresh.py                 # full run
    python scripts/refresh.py --no-network    # statuses, lifecycle, meta, report only
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from concurrent.futures import ThreadPoolExecutor

import oplib as L


# ---------------------------------------------------------------- lifecycle
def lifecycle(db: dict, archive: dict, today: dt.date, changes: list[dict]) -> None:
    stamp = today.isoformat()
    keep = []
    archived_ids = {a.get("archive_id") for a in archive["programs"]}
    for rec in db["programs"]:
        deadline = L.parse_date(rec.get("application_deadline"))
        if not deadline or (today - deadline).days <= L.ARCHIVE_GRACE_DAYS:
            keep.append(rec)
            continue
        archive_id = f"{rec['id']}@{rec['application_deadline']}"
        if archive_id not in archived_ids:
            snapshot = dict(rec)
            snapshot.update({"archive_id": archive_id, "archived_on": stamp, "status": "DEADLINE PASSED"})
            archive["programs"].append(snapshot)
        if rec.get("recurring"):
            closed = rec["application_deadline"]
            rec["last_cycle_deadline"] = closed
            rec["deadline_text"] = f"Last cycle closed on {closed}. Next cycle not announced yet."
            rec["application_deadline"] = rec["deadline_utc"] = rec["opens_on"] = ""
            if not rec.get("expected_next_cycle"):
                rec["expected_next_cycle"] = f"Recurring programme; previous cycle closed on {closed}."
            if rec.get("verification") == "VERIFIED":
                rec["verification"] = "PARTIALLY VERIFIED"
            note = (f"[auto {stamp}] Cycle closed. The details below describe the previous cycle "
                    f"and must be re-verified when the next call opens.")
            rec["notes"] = (rec.get("notes", "") + " " + note).strip()
            changes.append({"date": stamp, "id": rec["id"], "title": rec["title"],
                            "field": "(cycle closed)", "old": closed, "new": "rolled to next cycle"})
            keep.append(rec)
        else:
            changes.append({"date": stamp, "id": rec["id"], "title": rec["title"],
                            "field": "(archived)", "old": rec["application_deadline"], "new": "archive"})
    db["programs"] = keep


# ---------------------------------------------------------------- official-page watch
def watch(db: dict, today: dt.date) -> tuple[dict, list[dict]]:
    stamp = today.isoformat()
    state = L.load(L.WATCH, {})
    targets = [(r["id"], r["official_information_url"]) for r in db["programs"]
               if r.get("official_information_url")]

    def probe(target):
        rid, url = target
        status, _final, body = L.fetch(url, timeout=20)
        return rid, url, status, (L.date_lines_hash(body) if status == 200 and body else "")

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(probe, targets))

    summary = {"checked": len(results), "ok": 0, "blocked_or_unreachable": 0, "dead": 0}
    for rid, url, status, fingerprint in results:
        prev = state.get(rid, {})
        if prev.get("url") != url:
            prev = {}
        entry = {"url": url, "status": status, "checked": stamp,
                 "fingerprint": fingerprint or prev.get("fingerprint", ""),
                 "changed_on": prev.get("changed_on", ""),
                 "fail_streak": 0}
        if status == 200:
            summary["ok"] += 1
            if fingerprint and prev.get("fingerprint") and fingerprint != prev["fingerprint"]:
                entry["changed_on"] = stamp
        elif status in (404, 410):
            entry["fail_streak"] = prev.get("fail_streak", 0) + 1
            summary["dead"] += 1
        else:
            summary["blocked_or_unreachable"] += 1
        state[rid] = entry
    for rid in list(state):                    # forget records that left the database
        if rid not in {t[0] for t in targets}:
            del state[rid]
    L.save(L.WATCH, state)

    flags = []
    by_id = {r["id"]: r for r in db["programs"]}
    for rid, entry in state.items():
        rec = by_id.get(rid)
        if not rec:
            continue
        if entry["fail_streak"] >= 2:
            flags.append({"id": rid, "type": "dead_link", "since": entry["checked"],
                          "detail": f"Official page returned HTTP {entry['status']} on two runs."})
        if entry["changed_on"] and entry["changed_on"] > (rec.get("last_verified") or ""):
            flags.append({"id": rid, "type": "source_changed", "since": entry["changed_on"],
                          "detail": "Date or deadline wording on the official page changed after the "
                                    "last verification. Re-verify."})
    return summary, flags


# ---------------------------------------------------------------- meta + report
def build_meta(db: dict, archive: dict, today: dt.date, extra: dict) -> dict:
    records = db["programs"]
    counts = {
        "total": len(records),
        "archived": len(archive["programs"]),
        "by_status": {s: sum(r["status"] == s for r in records) for s in L.STATUSES},
        "by_funding": {f: sum(r["funding_type"] == f for r in records) for f in L.FUNDING_TYPES},
        "by_verification": {v: sum(r["verification"] == v for r in records) for v in L.VERIFICATION},
        "in_kinshasa": sum(r["location_type"] == "Kinshasa" for r in records),
        "remote": sum(r["location_type"] == "Remote" for r in records),
        "fee_required": sum(r["application_fee"] == "Fee required" for r in records),
    }
    buckets = {str(n): [] for n in L.DEADLINE_BUCKETS}
    for rec in records:
        left = L.days_remaining(rec, today)
        if left is None or left < 0:
            continue
        for limit in sorted(L.DEADLINE_BUCKETS):
            if left <= limit:
                buckets[str(limit)].append(rec["id"])
                break
    meta = L.load(L.META, {})
    meta.update({"schema_version": 1,
                 "last_refresh": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                 "counts": counts, "deadline_buckets": buckets})
    meta.update(extra)
    return meta


def write_report(db: dict, meta: dict, today: dt.date) -> None:
    records = db["programs"]
    by_id = {r["id"]: r for r in records}
    live = [r for r in records if r["status"] in ("OPEN", "CLOSING SOON", "ROLLING")
            and r["source_confidence"] != "LOW"]
    live.sort(key=lambda r: (r["application_deadline"] or "9999", r["title"]))
    lines = [f"# Status report - {today.isoformat()}", "",
             "Generated by `scripts/refresh.py`. Facts come from `data/programs.json`; "
             "this file only re-arranges them.", "",
             f"- Live records: {meta['counts']['total']} (archived: {meta['counts']['archived']})",
             "- By status: " + ", ".join(f"{k} {v}" for k, v in meta["counts"]["by_status"].items() if v),
             f"- In Kinshasa: {meta['counts']['in_kinshasa']} | Remote: {meta['counts']['remote']} | "
             f"Application fee required: {meta['counts']['fee_required']}",
             "", "## Open now", ""]
    for i, rec in enumerate(live, 1):
        left = L.days_remaining(rec, today)
        when = f"{rec['application_deadline']} ({left} days left)" if left is not None else (
            "rolling" if rec["rolling"] else "no single deadline")
        lines += [f"{i}. **{rec['title']}** ({rec['organization']})",
                  f"   - Deadline: {when}",
                  f"   - Where: {rec['location_type']} | Funding: {rec['funding_type']} | "
                  f"Verification: {rec['verification']}",
                  f"   - Apply: {rec.get('official_application_url') or rec.get('official_information_url') or 'no verified link'}",
                  ""]
    if not live:
        lines += ["Nothing open right now.", ""]
    risky = [r for r in records if r["source_confidence"] == "LOW" or r["application_fee"] == "Fee required"]
    if risky:
        lines += ["## Warnings (low confidence or an application fee)", ""]
        lines += [f"- **{r['title']}**: {'; '.join(r.get('potential_issues') or ['fee required'])}" for r in risky] + [""]
    lines += ["## Deadline monitor", ""]
    for limit in sorted(L.DEADLINE_BUCKETS):
        ids = meta["deadline_buckets"].get(str(limit), [])
        label = "24 hours" if limit == 1 else f"{limit} days"
        names = "; ".join(f"{by_id[i]['title']} ({by_id[i]['application_deadline']})" for i in ids if i in by_id)
        lines.append(f"- Within {label}: {names or 'none'}")
    lines += ["", "## Flags raised by the automatic checks", ""]
    flags = meta.get("flags", [])
    lines += [f"- `{f['id']}` {f['type']} since {f['since']}: {f['detail']}" for f in flags] or ["- none"]
    path = L.ROOT / "reports" / "latest.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


# ---------------------------------------------------------------- main
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    parser.add_argument("--no-network", action="store_true", help="skip official-page checks")
    parser.add_argument("--today", help="override today's date (YYYY-MM-DD), for tests")
    args = parser.parse_args()
    today = L.parse_date(args.today) or L.today_utc()
    stamp = today.isoformat()

    db, archive = L.load_db(), L.load_archive()
    changes: list[dict] = []
    lifecycle(db, archive, today, changes)
    db["programs"] = [L.normalize(r, today) for r in db["programs"]]
    db["programs"].sort(key=lambda r: r["id"])
    db["status_computed_on"] = stamp
    archive["updated"] = stamp

    extra: dict = {}
    if not args.no_network:
        try:
            summary, flags = watch(db, today)
            extra.update({"watch": summary, "flags": flags})
        except Exception as exc:  # noqa: BLE001 - never let a network hiccup block publishing
            print("watch failed:", exc)

    L.save(L.DB, db)
    L.save(L.ARCHIVE, archive)
    L.log_changes(changes)
    meta = build_meta(db, archive, today, extra)
    L.save(L.META, meta)
    write_report(db, meta, today)
    print(f"refresh: {meta['counts']['total']} live, {meta['counts']['archived']} archived, "
          f"{len(changes)} lifecycle changes, {len(meta.get('flags', []))} flags")
    return 0


if __name__ == "__main__":
    sys.exit(main())
