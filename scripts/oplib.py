"""Shared helpers for the youth-programme database.

Standard library only, so the GitHub Action needs no `pip install`.
Every script in this folder imports from here; the website mirrors
`compute_status` in assets/js/app.js.
"""
from __future__ import annotations

import datetime as dt
import gzip
import hashlib
import html
import json
import re
import ssl
import urllib.error
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "programs.json"
META = ROOT / "data" / "meta.json"
CHANGELOG = ROOT / "data" / "changelog.json"
WATCH = ROOT / "data" / "watch-state.json"
ARCHIVE = ROOT / "archive" / "archive.json"

UNKNOWN = "Unknown / Not specified"
CLOSING_SOON_DAYS = 14
ARCHIVE_GRACE_DAYS = 14
DEADLINE_BUCKETS = (30, 14, 7, 3, 1)

CATEGORIES = ["Internship", "Volunteering", "Youth Programme", "Fellowship", "Leadership", "Training",
              "Entrepreneurship", "Summit or Event", "Exchange", "Graduate Programme",
              "Competition or Award", "Other"]
AUDIENCES = ["secondary-school", "university-student", "postgraduate-student", "recent-graduate",
             "graduate", "young-professional", "entrepreneur", "any-adult"]
FUNDING_TYPES = ["Paid", "Fully Funded", "Substantially Funded", "Partially Funded", "Travel Funded",
                 "Participation Funded", "Free", "Unpaid", "Self Funded", "Funding Unclear"]
VERIFICATION = ["VERIFIED", "PARTIALLY VERIFIED", "NEEDS VERIFICATION"]
CONFIDENCE = ["HIGH", "MEDIUM", "LOW"]
STATUSES = ["OPEN", "CLOSING SOON", "UPCOMING", "DEADLINE PASSED", "ROLLING", "DATE UNKNOWN"]
COVERAGE_KEYS = ["tuition", "stipend", "flight", "accommodation", "meals", "visa", "insurance",
                 "local_transport"]
COVERAGE_VALUES = ["Covered", "Partially covered", "Not covered", "Not specified", "Not applicable"]
LOCATION_TYPES = ["Kinshasa", "Elsewhere in the DRC", "Remote", "Abroad in Africa",
                  "Abroad outside Africa", "Multiple locations"]
DELIVERY_MODES = ["In-person", "Online", "Hybrid"]
DRC_ELIGIBLE = ["Yes", "No", "Unclear"]
EXPERIENCE_LEVELS = ["None required", "Some experience needed", "Not stated"]
APPLICATION_FEES = ["No fee stated", "Fee required", "Unknown"]
SOURCE_TYPES = ["Official", "Institutional", "Aggregator", "Social media", "News"]

# Field -> default. Order here is the order fields are written to disk.
DEFAULTS: dict = {
    "id": "",
    "title": "",
    "organization": "",
    "overview": "",
    "category": [],
    "audience": [],
    "country": UNKNOWN,
    "city": UNKNOWN,
    "location_type": "Kinshasa",
    "delivery_mode": "In-person",
    "program_dates": UNKNOWN,
    "duration": UNKNOWN,
    "application_deadline": "",
    "deadline_utc": "",
    "deadline_text": UNKNOWN,
    "deadline_timezone": UNKNOWN,
    "opens_on": "",
    "open_now": False,
    "rolling": False,
    "recurring": False,
    "expected_next_cycle": "",
    "last_cycle_deadline": "",
    "status": "DATE UNKNOWN",
    "funding_type": "Funding Unclear",
    "funding_details": [],
    "coverage": {},
    "travel_funded": False,
    "flight_funded": False,
    "accommodation_funded": False,
    "meals_funded": False,
    "visa_funded": False,
    "insurance_funded": False,
    "local_transport_funded": False,
    "application_fee": "Unknown",
    "participation_fee": UNKNOWN,
    "stipend": UNKNOWN,
    "age_min": None,
    "age_max": None,
    "age_requirement": UNKNOWN,
    "experience_level": "Not stated",
    "experience_requirement": UNKNOWN,
    "education_requirement": UNKNOWN,
    "nationality_requirements": [],
    "drc_eligible": "Unclear",
    "language_requirement": UNKNOWN,
    "eligibility": [],
    "other_requirements": [],
    "documents_required": [],
    "application_process": [],
    "official_application_url": "",
    "official_information_url": "",
    "source_url": "",
    "source_type": "Official",
    "source_confidence": "MEDIUM",
    "verification": "NEEDS VERIFICATION",
    "sources": [],
    "potential_issues": [],
    "benefits": [],
    "action": "",
    "last_verified": "",
    "date_discovered": "",
    "notes": "",
}

# Fields whose change between two research cycles is worth logging.
TRACKED_FIELDS = ["application_deadline", "deadline_utc", "deadline_text", "opens_on", "program_dates",
                  "funding_type", "coverage", "participation_fee", "application_fee", "eligibility",
                  "age_min", "age_max", "nationality_requirements", "drc_eligible",
                  "official_application_url", "official_information_url", "verification"]

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/126.0.0.0 Safari/537.36")


# ---------------------------------------------------------------- json io
def load(path: Path, default):
    if not path.exists():
        return default
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def save(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    with path.open("w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def load_db() -> dict:
    return load(DB, {"schema_version": 1, "updated": "", "programs": []})


def load_archive() -> dict:
    return load(ARCHIVE, {"schema_version": 1, "updated": "", "programs": []})


# ---------------------------------------------------------------- dates
def parse_date(value) -> dt.date | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return dt.date.fromisoformat(value[:10])
    except ValueError:
        return None


def today_utc() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def compute_status(rec: dict, today: dt.date | None = None) -> str:
    """Deadline status. Mirrored in assets/js/app.js (statusOf)."""
    today = today or today_utc()
    if rec.get("rolling"):
        return "ROLLING"
    deadline = parse_date(rec.get("application_deadline"))
    opens = parse_date(rec.get("opens_on"))
    if deadline:
        if deadline < today:
            return "DEADLINE PASSED"
        if opens and opens > today:
            return "UPCOMING"
        if (deadline - today).days <= CLOSING_SOON_DAYS:
            return "CLOSING SOON"
        return "OPEN"
    if opens and opens > today:
        return "UPCOMING"
    if rec.get("open_now"):          # organiser says applications are open, no single deadline
        return "OPEN"
    if rec.get("expected_next_cycle"):
        return "UPCOMING"
    return "DATE UNKNOWN"


def days_remaining(rec: dict, today: dt.date | None = None) -> int | None:
    deadline = parse_date(rec.get("application_deadline"))
    if not deadline:
        return None
    return (deadline - (today or today_utc())).days


# ---------------------------------------------------------------- records
def slug(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def norm_url(url: str) -> str:
    url = (url or "").strip().lower()
    url = re.sub(r"^https?://(www\.)?", "", url)
    url = url.split("#")[0].split("?")[0]
    return url.rstrip("/")


def dedupe_key(rec: dict) -> str:
    return slug(rec.get("title", "")) + "|" + slug(rec.get("organization", ""))


def normalize(rec: dict, today: dt.date | None = None) -> dict:
    """Return the record with every schema field present, derived fields recomputed."""
    out = {}
    for key, default in DEFAULTS.items():
        value = rec.get(key, default)
        if isinstance(default, (list, dict)) and value is default:
            value = type(default)(default)
        out[key] = value
    for key, value in rec.items():           # keep unknown/extra fields at the end
        if key not in out:
            out[key] = value
    cov = {k: out["coverage"].get(k, "Not specified") for k in COVERAGE_KEYS}
    out["coverage"] = cov
    out["flight_funded"] = cov["flight"] == "Covered"
    out["accommodation_funded"] = cov["accommodation"] == "Covered"
    out["meals_funded"] = cov["meals"] == "Covered"
    out["visa_funded"] = cov["visa"] == "Covered"
    out["insurance_funded"] = cov["insurance"] == "Covered"
    out["local_transport_funded"] = cov["local_transport"] == "Covered"
    out["travel_funded"] = cov["flight"] in ("Covered", "Partially covered")
    out["status"] = compute_status(out, today)
    return out


def find_duplicate(records: list[dict], rec: dict) -> dict | None:
    """Same id, same official page, or same title + organiser => same programme."""
    key = dedupe_key(rec)
    info = norm_url(rec.get("official_information_url", ""))
    for other in records:
        if other.get("id") == rec.get("id"):
            return other
        if key and dedupe_key(other) == key:
            return other
        if info and norm_url(other.get("official_information_url", "")) == info:
            return other
    return None


def diff_tracked(old: dict, new: dict) -> list[dict]:
    changes = []
    for field in TRACKED_FIELDS:
        if old.get(field) != new.get(field):
            changes.append({"field": field, "old": old.get(field), "new": new.get(field)})
    return changes


def log_changes(entries: list[dict]) -> None:
    if not entries:
        return
    log = load(CHANGELOG, {"schema_version": 1, "entries": []})
    log["entries"] = (entries + log["entries"])[:500]
    save(CHANGELOG, log)


# ---------------------------------------------------------------- http
def fetch(url: str, timeout: int = 25, accept: str | None = None) -> tuple[int, str, bytes]:
    """GET a public page. Returns (status, final_url, body). status 0 = network error."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": accept or "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        "Accept-Encoding": "gzip, deflate",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as resp:
            raw = resp.read(3_000_000)
            enc = (resp.headers.get("Content-Encoding") or "").lower()
            if enc == "gzip":
                raw = gzip.decompress(raw)
            elif enc == "deflate":
                try:
                    raw = zlib.decompress(raw)
                except zlib.error:
                    raw = zlib.decompress(raw, -zlib.MAX_WBITS)
            return resp.status, resp.geturl(), raw
    except urllib.error.HTTPError as err:
        return err.code, url, b""
    except Exception:  # noqa: BLE001 - any network failure is reported as status 0
        return 0, url, b""


_BLOCK = re.compile(r"</?(p|div|li|ul|ol|h[1-6]|tr|td|th|table|section|article|br|dt|dd|header|"
                    r"footer|blockquote|summary|details|option)\b[^>]*>", re.I)


def visible_lines(raw: bytes) -> list[str]:
    text = raw.decode("utf-8", errors="replace")
    text = re.sub(r"<(script|style|noscript|svg|template)\b.*?</\1>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    text = _BLOCK.sub("\n", text)
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    lines, seen = [], set()
    for line in text.split("\n"):
        line = re.sub(r"\s+", " ", line).strip()
        if len(line) >= 3 and line not in seen:
            seen.add(line)
            lines.append(line)
    return lines


_DEADLINE_WORDS = re.compile(
    r"deadline|closing date|apply by|applications? (are |is )?(now )?(open|closed)|date limite|"
    r"cl[oô]ture|call for applications|appel [àa] candidatures", re.I)
_YEAR = re.compile(r"\b20(2[6-9]|3\d)\b")
_CONTEXT = re.compile(r"appl|candidat|open|clos|\bcall\b|until|before|submit|intake|cohort|edition", re.I)


def date_lines_hash(raw: bytes) -> str:
    """Fingerprint of the lines of a page that talk about deadlines and application dates.

    Hashing only those lines keeps the change detector quiet when a site merely
    rotates news items, and loud when a deadline or cycle year is edited.
    """
    lines = [ln for ln in visible_lines(raw)
             if len(ln) < 400 and (_DEADLINE_WORDS.search(ln) or (_YEAR.search(ln) and _CONTEXT.search(ln)))]
    return hashlib.sha256("\n".join(sorted(lines)).encode("utf-8")).hexdigest()[:16] if lines else ""
