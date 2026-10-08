"""French wording of the programmes (data/fr.json).

The site is written in English. When a visitor's language is French, the browser looks up each English
text of a record in `data/fr.json` and shows the French one; a text with no entry stays in English, and a
text whose English changed simply loses its old translation (it can never show a stale or wrong French).

    python scripts/i18n_check.py              how many texts are translated, how many are missing
    python scripts/i18n_check.py --missing    list the missing texts
    python scripts/i18n_check.py --todo FILE  write the missing texts as a JSON list to FILE
    python scripts/i18n_check.py --add FILE   merge FILE ({"English text": "Texte français", ...}) into data/fr.json
    python scripts/i18n_check.py --prune      drop entries whose English text no longer exists in any record

Fixed interface wording (labels, buttons, headings) is in assets/js/i18n-ui-fr.js, not here.
"""
from __future__ import annotations

import argparse
import json
import re
import sys

import oplib as L

FR = L.ROOT / "data" / "fr.json"

# record fields shown on the site as free text
TEXT_FIELDS = ["title", "organization", "overview", "country", "city", "program_dates", "duration",
               "deadline_text", "deadline_timezone", "participation_fee", "stipend", "age_requirement",
               "experience_requirement", "education_requirement", "language_requirement", "action", "notes",
               "expected_next_cycle"]
LIST_FIELDS = ["funding_details", "nationality_requirements", "eligibility", "other_requirements",
               "documents_required", "application_process", "potential_issues", "benefits"]

# sentences the scripts assemble themselves; the browser translates them with patterns (assets/js/i18n.js)
GENERATED = [re.compile(p) for p in (
    r"^Last cycle closed on \d{4}-\d{2}-\d{2}\. Next cycle not announced yet\.$",
    r"^Recurring programme; previous cycle closed on \d{4}-\d{2}-\d{2}\.$",
)]


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def collect(records: list[dict]) -> list[str]:
    """Every distinct English text of the records that a visitor can read, in first-seen order."""
    seen: dict[str, None] = {}

    def add(value) -> None:
        if not isinstance(value, str):
            return
        text = norm(value)
        if not text or text == L.UNKNOWN or any(p.match(text) for p in GENERATED):
            return
        if not re.search(r"[A-Za-z]{2,}", text):
            return
        seen.setdefault(text, None)

    for rec in records:
        for field in TEXT_FIELDS:
            add(rec.get(field))
        for field in LIST_FIELDS:
            for item in rec.get(field) or []:
                add(item)
        for source in rec.get("sources") or []:
            add(source.get("label"))
    return list(seen)


def load_fr() -> dict:
    data = L.load(FR, {"schema_version": 1, "strings": {}})
    data.setdefault("strings", {})
    return data


def all_records() -> list[dict]:
    return L.load_db()["programs"] + L.load_archive()["programs"]


def missing_strings() -> list[str]:
    have = {norm(k) for k in load_fr()["strings"]}
    return [s for s in collect(all_records()) if s not in have]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--missing", action="store_true")
    parser.add_argument("--todo", metavar="FILE")
    parser.add_argument("--add", metavar="FILE")
    parser.add_argument("--prune", action="store_true")
    args = parser.parse_args()

    data = load_fr()
    if args.add:
        with open(args.add, encoding="utf-8") as handle:
            new = json.load(handle)
        if not isinstance(new, dict):
            sys.exit("--add expects a JSON object {English: French}")
        for english, french in new.items():
            if isinstance(french, str) and french.strip():
                data["strings"][norm(english)] = french.strip()
        data["strings"] = dict(sorted(data["strings"].items(), key=lambda kv: kv[0].lower()))
        L.save(FR, data)
        print(f"data/fr.json now has {len(data['strings'])} entries")
    wanted = collect(all_records())
    if args.prune:
        keep = set(wanted)
        dropped = [k for k in data["strings"] if k not in keep]
        for key in dropped:
            del data["strings"][key]
        L.save(FR, data)
        print(f"pruned {len(dropped)} unused entries")
    have = {norm(k) for k in data["strings"]}
    missing = [s for s in wanted if s not in have]
    if args.todo:
        with open(args.todo, "w", encoding="utf-8") as handle:
            json.dump(missing, handle, ensure_ascii=False, indent=1)
    if args.missing:
        for text in missing:
            print("-", text)
    print(f"i18n: {len(wanted) - len(missing)} of {len(wanted)} record texts have a French version, {len(missing)} missing")
    return 0


if __name__ == "__main__":
    sys.exit(main())
