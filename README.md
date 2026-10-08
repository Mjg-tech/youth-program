# Youth Program

A public, self-updating database of internships, volunteering posts, fellowships, leadership
programmes, training and events for **young people with little or no experience**, with a focus on
Kinshasa and the Democratic Republic of the Congo. Published as a static website on GitHub Pages.

Live site: https://mjg-tech.github.io/youth-program/

It follows the same design as [global-opportunities](https://github.com/Mjg-tech/global-opportunities):
a JSON database, a small Python toolchain, a daily automatic refresh and a weekly research cycle.
The difference is that nothing here is matched to a person: every record states its own rules
(age limits, who it is for, experience needed, pay, fees, whether DRC nationals can apply), and
visitors filter for themselves.

## What the site does

| Page | Purpose |
|---|---|
| `index.html` | Dashboard: open now, closing soon, Kinshasa and online counts, a "find what fits you" form, deadline monitor, programmes to watch, warnings, charts |
| `programs.html` | Explorer: search, ten filters, sorting, an age box that hides programmes whose age limit excludes you, a detail view per programme |

A programme can be linked directly: `programs.html#p=<id>`. Any filter view can be bookmarked,
because the state lives in the query string.

## Repository layout

```
index.html, programs.html     the two pages
assets/css/style.css          one stylesheet, light and dark
assets/js/app.js              shared: data loading, status rules, badges, cards, detail dialog
assets/js/dashboard.js        dashboard page
assets/js/explorer.js         explorer page
assets/js/i18n.js             language layer: device language, EN | FR switch, translates what is displayed
assets/js/i18n-ui-fr.js       French wording of the interface
data/programs.json            the database (live records)
data/fr.json                  French wording of the records (English text -> French text)
data/meta.json                counts, deadline buckets, flags (written by the refresh)
data/changelog.json           every change to a tracked field, newest first
data/watch-state.json         HTTP status and date-line fingerprint of each official page
archive/archive.json          closed programmes that do not repeat (never deleted)
research/YYYY-MM-DD/          the raw batch files of each research cycle
reports/                      latest.md (generated daily) and one report per research cycle
scripts/                      oplib.py, upsert.py, validate.py, refresh.py, i18n_check.py (standard library only)
AGENTS.md                     runbook for the research cycle
```

## Data structure

`data/programs.json` is `{schema_version, updated, programs: [...]}`. Main fields:

| Field | Meaning |
|---|---|
| `id`, `title`, `organization`, `overview` | identity, in plain language |
| `category[]` | Internship, Volunteering, Youth Programme, Fellowship, Leadership, Training, Entrepreneurship, Summit or Event, Exchange, Graduate Programme, Competition or Award, Other |
| `audience[]` | who it is for: secondary-school, university-student, postgraduate-student, recent-graduate, graduate, young-professional, entrepreneur, any-adult |
| `location_type` | Kinshasa, Elsewhere in the DRC, Remote, Abroad in Africa, Abroad outside Africa, Multiple locations |
| `age_min`, `age_max`, `age_requirement` | numeric limits (or null) and the organiser's wording |
| `experience_level` | None required, Some experience needed, Not stated |
| `drc_eligible` | Yes, No, Unclear |
| `application_deadline`, `deadline_text`, `opens_on`, `open_now`, `rolling` | dates; the source's own wording is always kept |
| `recurring`, `expected_next_cycle`, `last_cycle_deadline` | cycle tracking for programmes that repeat |
| `status` | OPEN, CLOSING SOON, UPCOMING (next edition expected), DEADLINE PASSED, ROLLING, DATE UNKNOWN (derived) |
| `funding_type` | Paid, Fully Funded, Substantially Funded, Partially Funded, Travel Funded, Participation Funded, Free, Unpaid, Self Funded, Funding Unclear |
| `coverage{}` | per expense: tuition, stipend, flight, accommodation, meals, visa, insurance, local_transport |
| `application_fee`, `participation_fee` | No fee stated, Fee required, Unknown, plus the detail |
| `eligibility[]`, `education_requirement`, `nationality_requirements[]`, `language_requirement` | the organiser's rules |
| `official_application_url`, `official_information_url`, `source_url` | never invented; empty when not confirmed |
| `verification`, `source_confidence`, `source_type`, `sources[]` | traceability |
| `potential_issues[]`, `action`, `last_verified`, `date_discovered` | risks, next step, freshness |

Anything that could not be confirmed is written as `Unknown / Not specified`. It is never guessed.

## Verification

| Label | Rule |
|---|---|
| VERIFIED | deadline, eligibility and funding read on the organiser's own page on `last_verified` |
| PARTIALLY VERIFIED | some facts from the official page; the rest from secondary sources, marked in the text |
| NEEDS VERIFICATION | the official page could not be read; everything is from secondary sources |

`scripts/validate.py` enforces the honesty rules (the publish step fails on an error):

- every record has a `source_url`; VERIFIED requires an official source and URL;
- `Paid`, `Fully Funded`, `Substantially Funded` and `Free` cannot be claimed on a record that
  still NEEDS VERIFICATION: the secondary claim is quoted in `funding_details` instead;
- a LOW-confidence record must list its problems;
- dates are ISO dates, URLs are real URLs, enumerations are closed lists, ids are unique, and two
  records cannot share the same title and organiser.

Scam checks made during research: application or participation fees, organisers that cannot be
identified, unofficial domains, "funded" claims that appear only on aggregators. A programme that
charges to apply is flagged with `application_fee: "Fee required"` and shown with a warning.

## Automation

- **Daily, on GitHub, free, no credentials** (`.github/workflows/refresh.yml`): recomputes statuses,
  archives programmes that do not repeat, rolls recurring programmes to "next edition expected",
  and re-fetches each official page to flag dead links and changed deadline wording. It never
  edits a fact.
- **Research cycle** (`AGENTS.md`): an AI agent or a person re-verifies flagged records, reads the
  organiser's page for the programmes still marked NEEDS VERIFICATION, and adds new ones through
  `scripts/upsert.py`.

## How to update the database

```bash
git pull --rebase                      # the daily refresh commits to main
python scripts/upsert.py batch.json    # add or update records (no duplicates, changes logged)
python scripts/validate.py             # must report 0 errors
python scripts/refresh.py --no-network # optional: recompute statuses and reports/latest.md
git add -A && git commit -m "Research cycle YYYY-MM-DD" && git push
```

Run the site locally with `python -m http.server` from the repository root.

## Privacy

The repository is public and holds no personal data. A visitor's age and situation are typed into
a form that works entirely in the browser and in the page address; nothing is stored or sent.
Pages carry `noindex` so search engines are asked not to list them.

## Limits

- Many official sites block automated readers. Those records say so and carry a lower
  verification label; open the page in a browser.
- Most records were first found on aggregator sites. Treat NEEDS VERIFICATION as "go and check".
- Rules change. The `last_verified` date on each record says how old the check is.

## English and French

The data and the code are English. The site opens in the visitor's language: French on a French device,
English otherwise, with an EN | FR switch in the header (`?lang=fr` or `?lang=en` forces one). French is an
overlay: `assets/js/i18n.js` translates what is displayed, using `assets/js/i18n-ui-fr.js` (interface) and
`data/fr.json` (the records), plus patterns for sentences the scripts assemble ("12 days left"). Values,
filters and links stay English, so nothing in the database or the URLs changes with the language. A text with no
French entry stays in English, and a record whose English text changes loses its old French until it is
re-translated (it can never show a stale translation).

`python scripts/i18n_check.py` shows how many record texts are translated; the research cycle in `AGENTS.md`
keeps `data/fr.json` complete. Only the choice "en" or "fr" is saved, in the visitor's own browser.
