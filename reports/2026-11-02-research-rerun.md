# Research cycle 2026-11-02, rerun (second and deeper pass)

The first pass of 2 November 2026 (`reports/2026-11-02-research.md`, batch in `research/2026-11-02/`) was left untouched. This pass writes to `research/2026-11-02-rerun/` only (batch files 1 to 5, plus the French files `fr.json` and `fr-2.json` to `fr-5.json`) and re-reads pages instead of trusting the first pass's summaries.

Settings of the run (output of the diagnostic command): `CLAUDE_EFFORT=max`, `--effort max`, `--model claude-sonnet-5-5`.

How pages were read: plain `curl` with its default user agent (the raw HTML is kept and searched, including the data a page embeds in scripts) and the WebFetch tool. A site that answered 403, a certificate error, a bot check or a time-out was recorded as unreadable and not retried in any other way.

## Summary

- **5 records added, 24 updated.** The database now has 81 live records (76 before) and 13 archived. `validate.py` reports 0 errors and one warning (the EAC Youth Fellowship is `Fully Funded` in the organiser's words, which does not itemise what is covered). French wording is complete (2,122 of 2,122 record texts).
- Three changes of substance to existing records: two UN Careers postings lost their VERIFIED label because the official page cannot be read; four funding labels that the organisers' own wording does not support were corrected; six `drc_eligible: Yes` entries now cite a page that names the DRC.
- Five programmes that were missing are now in: two UNFPA internships, the EAC Youth Fellowship, UNICEF Jeunes Champions (UN Volunteers, DRC) and the ALU Mastercard Foundation Scholars Program.
- Four commits were pushed: checkpoints 1, 2 and 3, then the final commit.

## What the first pass missed or got wrong

1. **Two UN Careers postings were labelled VERIFIED, but the official page could not be read.**
   - OHCHR Yaoundé intern (job opening 286456) and UN-Habitat Abidjan intern (286269). The record text said the notice was "read through the UN Careers public job-opening data".
   - careers.un.org answers HTTP 403 (CloudFront) to curl, including its `api/public/opening` data address and its organisation listing, and WebFetch only returns a placeholder ("Welcome to the UN Careers website"). The Inspira address stored as the application link opens a cookie error page, so it could not be confirmed either.
   - The full notice text is readable on unvacancies.org, which reproduces it word for word and links to the official posting, and the closing time ("Closes 4 Nov 2026, 23:59 EST (UTC-5)") is on unjobnet.org. The facts in the records match both.
   - Changes: verification PARTIALLY VERIFIED, confidence MEDIUM, wording "Reported by secondary sources", the two mirrors listed as sources, and the application link now points to the official posting page (the one URL the mirrors confirm). By the README's strict definition a record whose official page was never read would be NEEDS VERIFICATION; PARTIALLY VERIFIED was chosen because the mirrors reproduce the official notice and the facts agree. Change it if you prefer the strict reading.
2. **Funding labels that the organiser's own wording does not support** (`AGENTS.md` rule 4). Corrected, with the quotes kept in `funding_details`:
   - Tony Elumelu Entrepreneurship Programme 2027: `Fully Funded` to `Partially Funded`. The TEF page says participants "receive the training, mentorship, and funding needed to succeed" and become "eligible to receive their $5,000 non-refundable seed capital"; it never says "fully funded".
   - Internet Society Fellowship 2027: `Substantially Funded` to `Partially Funded` (a project stipend of up to USD 5,000 and travel support to one event).
   - ALX sponsored programmes: `Substantially Funded` to `Partially Funded` (the learner still pays USD 5 a month and the page does not say how much the sponsorship covers).
   - Vodacom Elite: `Paid` to `Funding Unclear`. "Rémunéré" came from one secondary source (youth.cd); Vodacom's own page showed no call. The overview no longer calls the programme paid.
   - Checked and left unchanged: Earth Prize and HP LIFE (`Free`: "free of charge", "a free ... program"), Yoma ("completely free"), EAC Youth Fellowship, Sir Cyril Taylor and Mandela Washington (`Fully Funded`, in or implied by the organisers' words), OIF Senghor (the OIF lists what it covers), Afreximbank, EU Delegation DRC and the World Bank (stipend, monthly grant, salary stated by the organisers).
3. **`drc_eligible: Yes` rested on "member of X" wording with no page naming the DRC.** The rule says `Yes` only when the rules list the DRC or state no nationality condition. Now cited, from pages read on 2 November 2026: FAO's "Membership of FAO" page (FAO internship, FAO volunteer, WFF Youth Policy Board, WFF Young Scientists Group), the African Union's member states page (AU Youth Volunteer Corps) and the WHO Regional Office for Africa's countries page (WHO internship programme). The FAO volunteer record said `Unclear` for the same rule the FAO internship record called `Yes`; both are now `Yes`.
4. **FAO volunteer posting (job 2601986)**: the record quoted the closure as '31/Dec/2026, 11:59:00 PM'; the posting data says '31/Dec/2026, 10:59:00 PM' (the internship posting 2601980 says 11:59:00 PM). Corrected.
5. **Five programmes were missing** (see "New records").
6. **Novartis Next Generation Scientist 2027** was PARTIALLY VERIFIED although deadline, eligibility and funding are all on Novartis's own pages: the Workday posting's own data says `"datePosted": "2026-10-15"` and `"validThrough": "2026-11-15"`, and the Novartis page gives the MSc/PhD/MD condition and the monthly stipend. Now VERIFIED. `drc_eligible` stays `Unclear` because the posting does not list the countries in scope.

## Re-verified independently (pages read by me in this pass)

- **Flagged records**
  - AU logo competition: the call text still says "Submission deadline: 23 October 2026, 23:59 EAT" and the event block shows 24 September to 31 October 2026, 17:59. No extension; closed either way.
  - One Young World Leading Scholarship: "Application deadline: 31 October 2026" at the top of the page and "Application Deadline: Closed" at the bottom; no 2027 edition on the page.
  - EU Delegation DRC traineeship: still "Expired", "Deadline 25.01.2026"; only the related-vacancies box changes.
- **Deadline wording matches the official pages**: Global Leadership Challenge (5 November, rolling review), WIPO Moot Court (6 November), USTC Winter Camp (8 November), Anzisha (10 November; "free of charge", ages 15 to 22), Dalai Lama Fellows (11 November, 22:00 UTC), D-Prize (25 October, 15 November and 6 December, midnight Pacific), Global Solvers (15 November), ITU Gender Champions (15 November), Novartis (15 November), Unearthodox (16 November), Sir Cyril Taylor (19 November, 23:59 UTC), Youth Global Forum (20 November), GTF (23 November), Jim Leech (1 December), Allianz x Social Shifters (18 December, 17:00 UTC; ages 18 to 30), Internet Society (18 December), AU Commission and UNESCO internship postings (31 December), Earth Prize (registration to 10 January, submissions to 31 January 2027), African Leadership Academy (15 January 2027), WFF Young Scientists Group (call open).
- **FAO jobs 2601980 and 2601986**: read from the posting data embedded in the FAO page (the visible text is empty until scripts run). Ages 21 to 30 for interns, 18 or older for volunteers, stipend only "if they are not sponsored", no remuneration for volunteers, no fee.
- **UNFPA**: the Global Internship Roster (31319) and two further postings read in UNFPA's own careers data. A keyword search for "Kinshasa" and "stagiaire" returns no posting.
- **UNICEF**: the DRC filter on jobs.unicef.org (read through WebFetch) lists three vacancies, none an internship or UN Volunteer post. unvacancies.org's Kinshasa listing shows eight UN offers (staff and consultants, no internship).

## New records (5)

- **UNFPA Equatorial Guinea: Secretariat Support Intern (Malabo)**: VERIFIED in UNFPA's own careers data. Part time; fluent Spanish required; ends 5 November 2026 at 14:18 UTC. The posting's "Compensation and Benefits" paragraph speaks of a "competitive net salary" with no amount and has no intern-stipend paragraph, so funding stays `Funding Unclear`.
- **UNFPA Supply Chain Internship Roster 2026 (SCMU, Copenhagen)**: VERIFIED in UNFPA's own careers data. On site in Copenhagen; ends 1 January 2027 04:59 UTC; stipend only for interns with no outside funding.
- **EAC Youth Fellowship (4th cohort, MS TCDC, Arusha)**: VERIFIED on the organiser's pages. Ages 18 to 35, bachelor's degree minimum, citizens of Kenya, Tanzania, Uganda, South Sudan, Burundi, Rwanda, Somalia or the DRC. "Fully funded under the Together for Impact Partnership". The YouLead portal shows applications from 17 August to 7 September 2026 (closed) and an event start of 15 November 2026. Kept as a recurring, watched programme because the organiser numbers its cohorts.
- **UNICEF Jeunes Champions (UN Volunteers), DRC**: VERIFIED on UNICEF DRC's own page, for the 2024 call (28 places): six months full time as a UN Volunteer in one of 13 cities including Kinshasa; Congolese aged 18 to 30 with a state diploma, six months of volunteering and excellent French; closed on 16 February 2024. No later call was found. Funding `Funding Unclear`: UNICEF speaks of "une allocation mensuelle de subsistance", not a salary, and gives no amount. Recurring, watched.
- **African Leadership University (ALU) Rwanda: Mastercard Foundation Scholars Program, January 2027 intake**: VERIFIED on ALU's pages. The January 2027 intake "closes" on 30 November 2026; ALU "does not charge any fees ... for application services". Its Financial Aid page describes "full-ride scholarships covering full tuition and additional financial support", for applicants aged 26 and below who show financial need, open to individuals "across the African continent". Aid is requested inside the application, so no separate scholarship deadline exists on the pages.

## Updated records (24)

- Provenance and labels: OHCHR Yaoundé intern, UN-Habitat Abidjan intern, Novartis Next Generation Scientist.
- Funding labels: Tony Elumelu, Internet Society, ALX, Vodacom Elite.
- DRC evidence: FAO internship, FAO volunteer, WFF Youth Policy Board, WFF Young Scientists Group, WHO internship programme, AU Youth Volunteer Corps.
- Re-read, date and wording refreshed: UNFPA Global Internship Roster, Allianz x Social Shifters, Earth Prize, African Leadership Academy, AU Commission internship, UNESCO internship, HP LIFE, Yoma.
- Watch records: UN agencies in Kinshasa (UNFPA's own data shows no Kinshasa post), UNICEF DRC internships (UNICEF portal added as a source; read 2 November 2026), YouthConnekt Africa Summit (the official page lists only past summits, its "Register Now" button pointed to "#", the registration page showed only "Loading form...").

## Deadlines in the next 14 days (from 2 November 2026)

| Programme | Closes | Label |
|---|---|---|
| OHCHR intern, Yaoundé | 4 November, 23:59 New York time | PARTIALLY VERIFIED (official page unreadable) |
| UN-Habitat intern, Abidjan | 4 November, 23:59 New York time | PARTIALLY VERIFIED (official page unreadable) |
| Global Leadership Challenge | 5 November | VERIFIED |
| UNFPA Equatorial Guinea intern, Malabo | 5 November, 14:18 UTC | VERIFIED |
| WIPO IP Moot Court | 6 November, Geneva time | VERIFIED |
| USTC Winter Camp | 8 November | VERIFIED (3000 CNY fee unless a fellowship is awarded) |
| Anzisha Fellowship | 10 November | PARTIALLY VERIFIED |
| Dalai Lama Fellows | 11 November, 22:00 UTC | VERIFIED |
| CMU-Africa AI certificate | 15 November (secondary sources) | NEEDS VERIFICATION |
| D-Prize | 15 November (extension to 6 December) | VERIFIED |
| Global Solvers Accelerator | 15 November | VERIFIED (USD 900 programme fee if selected) |
| ITU Gender Champions | 15 November | VERIFIED |
| Novartis Next Generation Scientist | 15 November | VERIFIED |
| Unearthodox Co-Lab | 16 November | VERIFIED |

Next after that: Sir Cyril Taylor (19 November), Youth Global Forum (20 November, pay-to-apply), GTF mentoring (23 November), WFF Youth Policy Board (30 November, secondary sources), ALU scholarship (30 November), Jim Leech (1 December).

## Open in Kinshasa

- Only one record based in Kinshasa has an open status: the Transsion/Infinix administrative-assistant internship, NEEDS VERIFICATION. emploi.cd answers HTTP 403 to both curl and WebFetch, so it could not be re-checked; it was last seen on 19 October.
- No UN agency internship is open in Kinshasa on any portal that could be read: UNFPA's own careers data, UNICEF's DRC vacancy list and the unvacancies.org Kinshasa list show only staff and consultant posts. UNICEF Jeunes Champions has had no call since February 2024. Orange Corners RDC is expected to open between December 2026 and January 2027.
- Programmes that can be followed from Kinshasa online: GTF mentoring, Green Institute fellowship, WFF Youth Policy Board and Young Scientists Group, Jim Leech fellowship, Internet Society, Earth Prize, the Allianz challenge.

## Warnings and anything suspicious

- **Aggregators widen organisers' rules.** ChangemakerXchange's "Changemakers for Youth" (deadline 9 November 2026) is presented by several aggregators as open to young African social entrepreneurs; the organiser's own page limits it to ventures based in Egypt, Germany (impact in Eastern Germany), Jordan, Lebanon, Morocco, Palestine, Switzerland or Tunisia. Not eligible for the DRC, so no record.
- **YouthConnekt Africa Summit**: the official site gives no 2026 details, its registration button pointed to "#", the registration page only loaded "Loading form...", and the site's blog showed unrelated online-casino posts on 12 October. The record warns about all of this.
- **Mirrors are not the organiser.** The OHCHR and UN-Habitat texts come from copies of the UN notices; confirm them on careers.un.org before applying (the closing time is 23:59 New York time on 4 November).
- Unchanged from the first pass: Youth Global Forum (pay-to-apply, LOW confidence), the Jim Leech stipend contradiction, and the I AM NALA form that still accepts answers after its deadline.

## Looked at and not added

- **African Development Bank Internship Programme 2027, Session 1**: closed on 12 October 2026 (secondary sources only); afdb.org answers with a Cloudflare check, so nothing could be read on the organiser's side.
- **UN Volunteers online assignments** ("International Volunteer Day/Year 2026 Online Volunteers", closes 12 November 2026; a UNFPA call for 500 online volunteers for a DRC gender-violence campaign, listed on lesopportunites.com on 29 October 2026): only mirrors or an aggregator could be read; app.unv.org shows an empty shell and unv.org answers HTTP 403. The UNFPA DRC call links to UNV posting 1784888021273579, whose deadline could not be found. Worth a manual look in a browser.
- **VIJANA (FPI and FOGEC loans to young entrepreneurs aged 18 to 35, up to USD 50,000)**: only press reports (ACP, actualite.cd): 18 loan agreements signed on 14 July 2026 and a national call "in the coming days". No organiser page or call could be found.
- **Global Shapers Community Kinshasa Hub** and **YALI Network courses**: globalshapers.org and yali.state.gov answered HTTP 403.
- **Environmental journalists training call (mkaajimpya.org, listed on lesopportunites.com on 6 October 2026)**: the organiser's PDF could not be reached (connection reset).
- **UNHCR/Mastercard Foundation scholarship for the DRC** (31 August to 30 September 2026): closed, one aggregator only. **Top100 Africa Future Leaders 2026**: closed on 31 August. **WFP Kinshasa Graphic Design intern**: closed on 16 August 2026 and already covered by the WFP watch record. **AU Youth Ambassadors for Peace PDF**: dated 2023. **TotalEnergies Young Graduate Program**: the only 2026 posting found is for Uganda. **Service civique to France (10 volunteers)**: Congo-Brazzaville. **Go Volunteer Africa placements in Kinshasa**: foreign-volunteer placements with no stated terms. **Erasmus+ youth calls**: run through organisations, not open to individuals. **Scholarship lists for the DRC** (university entrance awards, PhD grants): outside the scope of the database.
- ACTED "Volontaire Finance Pays" (Kinshasa, listed on ngojobsinafrica.com): the page timed out for both fetch tools.

## Could not be read

- **HTTP 403 or bot check:** careers.un.org (job pages, its `api/public/opening` data and its organisation listing), untalent.org, emploi.cd (curl and WebFetch), afreximbank.com (careers page), afdb.org (Cloudflare "Just a moment..."), unv.org (Incapsula), coe.int and rm.coe.int, globalshapers.org, yali.state.gov, acp.cd, francophonie.org.
- **Certificate or TLS errors (not bypassed):** CMU-Africa pages (and HTTP 503 through WebFetch), jobs.unops.org, onlinevolunteering.org.
- **Other errors:** jobs.unicef.org answers HTTP 202 with no page to curl (WebFetch could read the DRC vacancy list); fpi.cd (proxy error); mkaajimpya.org and mstcdc.or.tz and youthconnektafrica.org (connection reset for curl; the last two were read through WebFetch); ngojobsinafrica.com (time-out in both tools); careers.unu.edu (HTTP 404, the closed posting is gone).
- **Scripts only:** app.unv.org (empty shell), the join.anzisha.org form, the QT EMS registration page of the YouthConnekt summit, the UN Careers job lists.
- **Two actions refused by the permission checker and not retried:** reading the proxy's own help file and status address, and probing other site numbers on UNFPA's careers host.
