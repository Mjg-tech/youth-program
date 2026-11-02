# Research cycle 2026-11-02, rerun (second and deeper pass)

The first pass of 2 November 2026 (`reports/2026-11-02-research.md`, batch in `research/2026-11-02/`) was left untouched. This pass writes to `research/2026-11-02-rerun/` only and re-reads pages instead of trusting the first pass's summaries.

Settings of the run (output of the diagnostic command): `CLAUDE_EFFORT=max`, `--effort max`, `--model claude-sonnet-5-5`.

How pages were read: plain `curl` with its default user agent (the raw HTML is kept and searched, including the data a page embeds in scripts) and the WebFetch tool. A site that answered 403, a certificate error or a bot check was recorded as unreadable and not retried in any other way.

This report is extended at each checkpoint, so it exists even if the session is cut off.

## Checkpoint 1

Result: 3 records added and 6 updated. `validate.py` reports 0 errors; the French wording is complete (2,061 of 2,061 record texts).

### What the first pass missed or got wrong

- **Two UN Careers postings were labelled VERIFIED, but the official page could not be read.**
  - OHCHR Yaoundé intern (job opening 286456) and UN-Habitat Abidjan intern (286269). The record text said the notice was "read through the UN Careers public job-opening data".
  - On this rerun careers.un.org answers HTTP 403 (CloudFront) to curl, including its `api/public/opening` data address, and WebFetch only returns a placeholder ("Welcome to the UN Careers website"). The Inspira address in `official_application_url` opens a cookie error page, so it could not be confirmed either.
  - The full notice text is readable on unvacancies.org, which reproduces it word for word and links to the official posting, and the closing time ("Closes 4 Nov 2026, 23:59 EST (UTC-5)") on unjobnet.org. The facts in the records match both.
  - Changes: verification set to PARTIALLY VERIFIED, confidence to MEDIUM, the wording now says "Reported by secondary sources", the two mirrors are listed as sources, and the application link now points to the official posting page (the one URL the mirrors confirm) instead of the unconfirmed Inspira link.
- **FAO Regular Volunteer Programme (job 2601986)**: the record quoted the closure as '31/Dec/2026, 11:59:00 PM'. The posting data in the page says '31/Dec/2026, 10:59:00 PM' (the internship posting 2601980 says 11:59:00 PM). Corrected.
- **FAO records disagreed on the DRC**: the internship record said `drc_eligible: Yes`, the volunteer record said `Unclear`, with the same rule ("Be nationals of FAO Members"). FAO's own "Membership of FAO" page (read 2 November 2026) lists the Democratic Republic of the Congo among the Member Nations, so both are now `Yes` and the page is cited.
- **Two open UNFPA internships were not in the database.** UNFPA's own careers data lists, besides the Global Internship Roster: a Secretariat Support Intern in Malabo (ends 5 November 2026) and a Supply Chain Internship Roster in Copenhagen (ends 31 December 2026). Both added.
- **The EAC Youth Fellowship was not in the database.** It names the DRC among the eight eligible countries (details below). Added as a watched programme.

### Re-verified independently (pages read by me in this pass)

- **Flagged records**
  - AU logo competition: the call text still says "Submission deadline: 23 October 2026, 23:59 EAT" and the event block shows 24 September to 31 October 2026, 17:59. Nothing new, still closed.
  - One Young World Leading Scholarship: the page shows "Application deadline: 31 October 2026" at the top and "Application Deadline: Closed" at the bottom; no 2027 edition on the page.
  - EU Delegation DRC traineeship: still "Expired", "Deadline 25.01.2026"; only the related-vacancies box changes.
- **Deadline wording matches the official pages**: Global Leadership Challenge (5 November, rolling review), WIPO Moot Court (6 November), USTC Winter Camp (8 November), Anzisha (10 November; "free of charge", ages 15 to 22), Dalai Lama Fellows (11 November, 22:00 UTC), D-Prize (25 October, 15 November and 6 December, midnight Pacific), Global Solvers (15 November), ITU Gender Champions (15 November), Unearthodox (16 November), Allianz x Social Shifters (18 December, 17:00 UTC; ages 18 to 30), Sir Cyril Taylor (19 November, 23:59 UTC), GTF (23 November), Youth Global Forum (20 November), Jim Leech (1 December).
- **FAO jobs 2601980 and 2601986**: read from the posting data embedded in the FAO page (the visible text is empty until scripts run). Ages 21 to 30 for interns and 18 or older for volunteers, stipend only "if they are not sponsored", no remuneration for volunteers, no fee.
- **UNFPA Global Internship Roster (31319)**: re-read in UNFPA's own careers data (posted 16 January 2026, ends 1 January 2027 04:59 UTC). UNFPA's keyword searches for "Kinshasa" and "stagiaire" return no posting.

### New records (3)

- **UNFPA Equatorial Guinea: Secretariat Support Intern (Malabo)**: VERIFIED in UNFPA's own careers data. Part time; fluent Spanish required; ends 5 November 2026 at 14:18 UTC. The posting's "Compensation and Benefits" paragraph speaks of a "competitive net salary" with no amount, and has no intern-stipend paragraph, so funding stays Funding Unclear.
- **UNFPA Supply Chain Internship Roster 2026 (SCMU, Copenhagen)**: VERIFIED in UNFPA's own careers data. On site in Copenhagen; ends 1 January 2027 04:59 UTC; stipend only for interns with no outside funding.
- **EAC Youth Fellowship (4th cohort, MS TCDC, Arusha)**: VERIFIED on the organiser's pages. Ages 18 to 35, bachelor's degree minimum, citizens of Kenya, Tanzania, Uganda, South Sudan, Burundi, Rwanda, Somalia or the DRC. The organiser says "fully funded under the Together for Impact Partnership". The YouLead portal shows applications from 17 August to 7 September 2026 (closed) and an event start of 15 November 2026. Kept as a recurring, watched programme because the organiser numbers its cohorts.

## Could not be read in this pass so far

- careers.un.org (jobs 286456, 286269, 286380, its public data address and its organisation listing): HTTP 403.
- untalent.org, emploi.cd, afreximbank.com (careers page), afdb.org (Cloudflare "Just a moment..."): HTTP 403 or bot check.
- CMU-Africa pages: certificate error (not bypassed).
- jobs.unops.org: certificate error. jobs.unicef.org: answers HTTP 202 with no page (a script challenge).
- mstcdc.or.tz: the connection was reset for curl; read through WebFetch instead.
- jobs.fao.org and the UNFPA Oracle page show no text without scripts; the data embedded in the page (FAO) or behind it (UNFPA) was read instead.
