/* Shared code for every page: data loading, deadline status, badges, cards, detail dialog.
   No dependencies. All data is inserted with textContent, never innerHTML, because
   record text ultimately comes from other websites. */
(function () {
  "use strict";

  const UNKNOWN = "Unknown / Not specified";
  const CLOSING_SOON_DAYS = 14;   // keep in sync with scripts/oplib.py
  const DAY = 86400000;

  const FUNDING_RANK = {
    "Paid": 9, "Fully Funded": 8, "Free": 7, "Substantially Funded": 6, "Partially Funded": 5, "Travel Funded": 4,
    "Participation Funded": 3, "Unpaid": 2, "Self Funded": 1, "Funding Unclear": 0
  };
  const FUNDING_LEVEL = {
    "Paid": 4, "Fully Funded": 4, "Free": 4, "Substantially Funded": 3, "Partially Funded": 2, "Travel Funded": 2,
    "Participation Funded": 2, "Unpaid": 1, "Self Funded": 1, "Funding Unclear": 0
  };
  const STATUS_META = {
    "OPEN": { tone: "good", icon: "dot", label: "Open" },
    "CLOSING SOON": { tone: "serious", icon: "clock", label: "Closing soon" },
    "UPCOMING": { tone: "info", icon: "calendar", label: "Next edition expected" },
    "DEADLINE PASSED": { tone: "muted", icon: "cross", label: "Deadline passed" },
    "ROLLING": { tone: "good", icon: "loop", label: "Open all year" },
    "DATE UNKNOWN": { tone: "muted", icon: "question", label: "Date unknown" }
  };
  const STATUS_ORDER = ["CLOSING SOON", "OPEN", "ROLLING", "UPCOMING", "DATE UNKNOWN", "DEADLINE PASSED"];
  const VERIF_META = {
    "VERIFIED": { tone: "good", icon: "check", label: "Verified" },
    "PARTIALLY VERIFIED": { tone: "warning", icon: "half", label: "Partially verified" },
    "NEEDS VERIFICATION": { tone: "serious", icon: "alert", label: "Needs verification" }
  };
  const DRC_META = {
    "Yes": { tone: "good", icon: "check", label: "Open to DRC nationals" },
    "Unclear": { tone: "muted", icon: "question", label: "DRC eligibility unclear" },
    "No": { tone: "critical", icon: "cross", label: "Not open to DRC nationals" }
  };
  const AUDIENCE_LABELS = {
    "secondary-school": "Secondary school students", "university-student": "University students",
    "postgraduate-student": "Master's and postgraduate students", "recent-graduate": "Recent graduates",
    "graduate": "Graduates", "young-professional": "Young professionals", "entrepreneur": "Young entrepreneurs",
    "any-adult": "Open to any adult"
  };
  const AUDIENCE_ORDER = ["secondary-school", "university-student", "postgraduate-student", "recent-graduate",
    "graduate", "young-professional", "entrepreneur", "any-adult"];
  const WHERE_LABELS = {
    "Kinshasa": "In Kinshasa", "Elsewhere in the DRC": "Elsewhere in the DRC", "Remote": "Online or remote",
    "Abroad in Africa": "Abroad, in Africa", "Abroad outside Africa": "Abroad, outside Africa",
    "Multiple locations": "Several locations"
  };
  const WHERE_ORDER = ["Kinshasa", "Elsewhere in the DRC", "Remote", "Abroad in Africa", "Abroad outside Africa", "Multiple locations"];
  const COVERAGE_LABELS = [
    ["tuition", "Tuition or participation fee"], ["stipend", "Stipend or allowance"], ["flight", "Flight"],
    ["accommodation", "Accommodation"], ["meals", "Meals"], ["visa", "Visa"], ["insurance", "Insurance"],
    ["local_transport", "Local transport"]
  ];
  const COVERAGE_TONE = {
    "Covered": "good", "Partially covered": "warning", "Not covered": "critical",
    "Not specified": "muted", "Not applicable": "muted"
  };
  const COVERAGE_ICON = {
    "Covered": "check", "Partially covered": "half", "Not covered": "cross",
    "Not specified": "question", "Not applicable": "dash"
  };

  /* ---------------------------------------------------------------- dom helpers */
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    check: "M4 10.5l4 4 8-9",
    cross: "M5 5l10 10M15 5L5 15",
    half: "M10 3a7 7 0 100 14V3z",
    question: "M7.5 7.5a2.5 2.5 0 114 2c-.9.7-1.5 1.2-1.5 2.5M10 15.5v.5",
    dot: "M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z",
    dash: "M5 10h10",
    clock: "M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 6.5V10l2.5 1.5",
    calendar: "M4 6h12v10H4zM4 9h12M7 4v3M13 4v3",
    loop: "M5 8a5 5 0 019-1.5M15 4v3h-3M15 12a5 5 0 01-9 1.5M5 16v-3h3",
    alert: "M10 3.5l7 12H3l7-12zM10 8.5v3.5M10 14.2v.3",
    pin: "M10 17s5-4.7 5-8.5a5 5 0 00-10 0C5 12.3 10 17 10 17zM10 10.3a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z",
    people: "M7 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5M13.5 8a2 2 0 100-4M14 11.7c1.9.3 3.5 1.8 3.5 4.3",
    coin: "M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM10 6.5v7M8 8.2c0-.8.9-1.2 2-1.2s2 .4 2 1.2-1 1.1-2 1.4-2 .6-2 1.4 .9 1.2 2 1.2 2-.4 2-1.2",
    external: "M8 5H5v10h10v-3M11 4h5v5M16 4l-7 7",
    search: "M9 4a5 5 0 100 10A5 5 0 009 4zM13 13l3.5 3.5",
    sun: "M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4",
    moon: "M15.5 12.5A6.5 6.5 0 017.5 4.5a6.5 6.5 0 108 8z",
    close: "M5 5l10 10M15 5L5 15",
    arrow: "M4 10h12M11 5l5 5-5 5",
    table: "M3.5 5h13v10h-13zM3.5 8.5h13M3.5 12h13M8 5v10",
    bars: "M4 5h9M4 10h12M4 15h6"
  };
  const FILLED = new Set(["half", "dot"]);

  function icon(name, cls) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "icon" + (cls ? " " + cls : ""));
    if (name === "half") {
      const ring = document.createElementNS(SVG_NS, "circle");
      ring.setAttribute("cx", "10"); ring.setAttribute("cy", "10"); ring.setAttribute("r", "7");
      ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "currentColor"); ring.setAttribute("stroke-width", "1.8");
      svg.appendChild(ring);
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name] || ICONS.dot);
    if (FILLED.has(name)) {
      path.setAttribute("fill", "currentColor");
    } else {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.8");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    }
    svg.appendChild(path);
    return svg;
  }

  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return node;
  }

  /* replaceChildren that accepts nested arrays and skips null/false, like el() does. */
  function fill(node, ...kids) {
    node.replaceChildren(...kids.flat(Infinity).filter((kid) => kid !== null && kid !== undefined && kid !== false));
    return node;
  }

  function safeUrl(url) {
    return typeof url === "string" && /^https?:\/\//i.test(url) ? url : "";
  }

  function known(value) {
    return value !== null && value !== undefined && value !== "" && value !== UNKNOWN;
  }

  /* ---------------------------------------------------------------- dates and status */
  function deadlineMoment(rec) {
    if (rec.deadline_utc) {
      const exact = new Date(rec.deadline_utc);
      if (!isNaN(exact)) return exact;
    }
    if (rec.application_deadline) {
      const [y, m, d] = rec.application_deadline.split("-").map(Number);
      if (y && m && d) return new Date(Date.UTC(y, m - 1, d, 23, 59, 59));
    }
    return null;
  }

  function statusOf(rec, now) {
    now = now || new Date();
    if (rec.archive_id) return "DEADLINE PASSED";
    if (rec.rolling) return "ROLLING";
    const deadline = deadlineMoment(rec);
    const opens = rec.opens_on ? new Date(rec.opens_on + "T00:00:00Z") : null;
    if (deadline) {
      if (deadline < now) return "DEADLINE PASSED";
      if (opens && opens > now) return "UPCOMING";
      if ((deadline - now) / DAY <= CLOSING_SOON_DAYS) return "CLOSING SOON";
      return "OPEN";
    }
    if (opens && opens > now) return "UPCOMING";
    if (rec.open_now) return "OPEN";
    if (rec.expected_next_cycle) return "UPCOMING";
    return "DATE UNKNOWN";
  }

  function isLive(rec, now) {
    const s = statusOf(rec, now);
    return s === "OPEN" || s === "CLOSING SOON" || s === "ROLLING";
  }

  function daysLeft(rec, now) {
    const deadline = deadlineMoment(rec);
    if (!deadline) return null;
    return (deadline - (now || new Date())) / DAY;
  }

  function timeLeftLabel(rec, now) {
    const left = daysLeft(rec, now);
    if (left === null) return "";
    if (left < 0) {
      const ago = Math.floor(-left);
      return ago === 0 ? "Closed today" : "Closed " + ago + (ago === 1 ? " day ago" : " days ago");
    }
    if (left < 1) {
      const hours = Math.max(1, Math.floor(left * 24));
      return hours + (hours === 1 ? " hour left" : " hours left");
    }
    const days = Math.floor(left);
    return days + (days === 1 ? " day left" : " days left");
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return d + " " + MONTHS[m - 1] + " " + y;
  }

  function fmtDateTime(iso) {
    const date = new Date(iso);
    if (isNaN(date)) return "";
    return date.toLocaleString(window.YP_I18N ? window.YP_I18N.locale : undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function deadlineSummary(rec) {
    if (rec.application_deadline) return fmtDate(rec.application_deadline);
    if (rec.rolling) return "Open all year";
    if (rec.open_now) return "No single deadline";
    if (rec.opens_on) return "Opens " + fmtDate(rec.opens_on);
    if (rec.last_cycle_deadline) return "Last call closed " + fmtDate(rec.last_cycle_deadline);
    if (rec.expected_next_cycle) return "Next call not announced";
    return "Not announced";
  }

  /* ---------------------------------------------------------------- derived labels */
  function ageText(rec) {
    const min = rec.age_min, max = rec.age_max;
    if (min && max) return min + " to " + max + " years";
    if (min) return min + " years or older";
    if (max) return "Up to " + max + " years";
    return "No age limit stated";
  }

  /* "fits" / "outside" / "unknown" for an age typed by the visitor. The age never leaves the browser. */
  function ageFit(rec, age) {
    if (!age) return "none";
    if (!rec.age_min && !rec.age_max) return "unknown";
    if (rec.age_min && age < rec.age_min) return "outside";
    if (rec.age_max && age > rec.age_max) return "outside";
    return "fits";
  }

  function audienceLabels(rec, limit) {
    const list = AUDIENCE_ORDER.filter((a) => (rec.audience || []).includes(a)).map((a) => AUDIENCE_LABELS[a]);
    return limit ? list.slice(0, limit) : list;
  }

  function whereText(rec) {
    const base = WHERE_LABELS[rec.location_type] || rec.location_type || "";
    const place = [rec.city, rec.country].filter((x) => known(x) && x !== "Not stated").filter((x, i, a) => a.indexOf(x) === i).join(", ");
    if (rec.location_type === "Kinshasa" || rec.location_type === "Remote") return base;
    return place ? base + " · " + place : base;
  }

  function matchesFundingFilter(rec, filter) {
    switch (filter) {
      case "paid": return rec.funding_type === "Paid";
      case "funded": return ["Fully Funded", "Substantially Funded", "Partially Funded", "Travel Funded", "Participation Funded"].includes(rec.funding_type);
      case "free": return rec.funding_type === "Free";
      case "unpaid": return rec.funding_type === "Unpaid" || rec.funding_type === "Self Funded";
      case "unclear": return rec.funding_type === "Funding Unclear";
      default: return true;
    }
  }

  function matchesDeadlineFilter(rec, filter, now) {
    now = now || new Date();
    const status = statusOf(rec, now);
    const left = daysLeft(rec, now);
    const deadline = deadlineMoment(rec);
    switch (filter) {
      case "open": return status === "OPEN" || status === "CLOSING SOON" || status === "ROLLING";
      case "closing": return status === "CLOSING SOON";
      case "month":
        return !!deadline && left >= 0 && deadline.getUTCFullYear() === now.getUTCFullYear()
          && deadline.getUTCMonth() === now.getUTCMonth();
      case "quarter": return left !== null && left >= 0 && left <= 92;
      case "later": return left !== null && left > 92;
      case "watch": return status === "UPCOMING";
      case "rolling": return status === "ROLLING";
      case "unknown": return !deadline && status !== "ROLLING" && status !== "UPCOMING";
      case "passed": return status === "DEADLINE PASSED";
      default: return true;
    }
  }

  function matchesWhereFilter(rec, filter) {
    if (filter === "kinshasa-or-online") return ["Kinshasa", "Remote", "Elsewhere in the DRC"].includes(rec.location_type);
    return rec.location_type === filter;
  }

  /* ---------------------------------------------------------------- small components */
  function badge(meta, extraClass) {
    return el("span", { class: "badge tone-" + meta.tone + (extraClass ? " " + extraClass : "") },
      icon(meta.icon), meta.label);
  }

  function meter(level, max, label) {
    max = max || 4;
    const wrap = el("span", { class: "meter", role: "img", "aria-label": label || (level + " of " + max) });
    for (let i = 1; i <= max; i++) wrap.appendChild(el("span", { class: i <= level ? "on" : "" }));
    return wrap;
  }

  function fundingChip(rec) {
    const level = FUNDING_LEVEL[rec.funding_type] || 0;
    return el("span", { class: "chip funding" }, meter(level, 4, rec.funding_type), rec.funding_type);
  }

  function feeBadge(rec) {
    if (rec.application_fee === "Fee required") {
      return badge({ tone: "critical", icon: "alert", label: "Fee involved" });
    }
    return null;
  }

  function ageBadge(rec, age) {
    const fit = ageFit(rec, age);
    if (fit === "fits") return badge({ tone: "good", icon: "check", label: "Age fits" });
    if (fit === "outside") return badge({ tone: "critical", icon: "cross", label: "Age outside the limit" });
    if (fit === "unknown") return badge({ tone: "muted", icon: "question", label: "No age limit stated" }, "quiet");
    return null;
  }

  function linkButton(label, url, kind) {
    const href = safeUrl(url);
    if (!href) return null;
    return el("a", { class: "btn " + (kind || ""), href, target: "_blank", rel: "noopener noreferrer" },
      label, icon("external"));
  }

  /* ---------------------------------------------------------------- visitor settings (never stored in the repo) */
  function myAge() {
    const value = parseInt(new URLSearchParams(location.search).get("age") || "", 10);
    return value > 0 && value < 100 ? value : 0;
  }

  /* ---------------------------------------------------------------- card */
  function card(rec, onOpen, age) {
    const status = statusOf(rec);
    const left = timeLeftLabel(rec);
    const open = () => onOpen(rec.id);
    const who = audienceLabels(rec, 2).join(" · ") || "Not specified";
    return el("article", { class: "card" + (rec.archive_id ? " archived" : ""), "data-id": rec.id },
      el("div", { class: "card-tags" },
        (rec.category || []).slice(0, 3).map((c) => el("span", { class: "tag", text: c })),
        rec.archive_id ? el("span", { class: "tag tag-archive", text: "Archive" }) : null),
      el("h3", { class: "card-title" }, el("button", { type: "button", class: "linklike", onclick: open, text: rec.title })),
      el("p", { class: "card-org", text: rec.organization }),
      el("dl", { class: "facts" },
        el("div", null, el("dt", { text: "Where" }), el("dd", null, icon("pin"), whereText(rec) || UNKNOWN)),
        el("div", null, el("dt", { text: "Deadline" }),
          el("dd", null, icon("calendar"), deadlineSummary(rec), left ? el("span", { class: "left", text: left }) : null)),
        el("div", null, el("dt", { text: "Pay or funding" }), el("dd", null, fundingChip(rec))),
        el("div", null, el("dt", { text: "Age" }), el("dd", null, icon("people"), ageText(rec))),
        el("div", null, el("dt", { text: "Who it is for" }), el("dd", { text: who })),
        el("div", null, el("dt", { text: "Experience" }),
          el("dd", { text: rec.experience_level === "None required" ? "None required" : rec.experience_level === "Some experience needed" ? "Some experience needed" : "Not stated" }))),
      el("div", { class: "card-badges" },
        badge(STATUS_META[status]),
        ageBadge(rec, age),
        badge(DRC_META[rec.drc_eligible] || DRC_META.Unclear, rec.drc_eligible === "Unclear" ? "quiet" : ""),
        feeBadge(rec),
        badge(VERIF_META[rec.verification] || VERIF_META["NEEDS VERIFICATION"], "quiet")),
      el("div", { class: "card-foot" },
        el("button", { type: "button", class: "btn primary", onclick: open }, "View details")));
  }

  /* ---------------------------------------------------------------- detail dialog */
  function section(title, ...body) {
    const content = body.flat().filter(Boolean);
    if (!content.length) return null;
    return el("section", { class: "d-section" }, el("h3", { text: title }), content);
  }

  function list(items, ordered) {
    const clean = (items || []).filter(known);
    if (!clean.length) return el("p", { class: "muted", text: "Not specified." });
    return el(ordered ? "ol" : "ul", { class: "plain-list" }, clean.map((item) => el("li", { text: item })));
  }

  function factRow(label, value) {
    return el("div", null, el("dt", { text: label }), el("dd", { text: known(value) ? value : "Not specified" }));
  }

  function renderDetail(rec, flags, age) {
    const status = statusOf(rec);
    const left = timeLeftLabel(rec);
    const cov = rec.coverage || {};
    const apply = linkButton("Apply now", rec.official_application_url, "primary");
    const official = linkButton("Official website", rec.official_information_url);
    const source = linkButton("Source", rec.source_url);

    const coverageTable = el("table", { class: "coverage" },
      el("thead", null, el("tr", null, el("th", { text: "Expense", scope: "col" }), el("th", { text: "Coverage", scope: "col" }))),
      el("tbody", null, COVERAGE_LABELS.map(([key, label]) => {
        const value = cov[key] || "Not specified";
        return el("tr", null, el("th", { scope: "row", text: label }),
          el("td", null, el("span", { class: "cov tone-" + COVERAGE_TONE[value] }, icon(COVERAGE_ICON[value]), value)));
      })));

    const recFlags = (flags || []).filter((f) => f.id === rec.id);
    const hasCoverage = Object.values(cov).some((v) => v && v !== "Not specified");

    return el("div", { class: "detail" },
      el("header", { class: "d-head" },
        el("div", { class: "card-tags" }, (rec.category || []).map((c) => el("span", { class: "tag", text: c }))),
        el("h2", { id: "detail-title", text: rec.title }),
        el("p", { class: "d-org", text: rec.organization }),
        el("div", { class: "card-badges" },
          badge(STATUS_META[status]),
          ageBadge(rec, age),
          badge(DRC_META[rec.drc_eligible] || DRC_META.Unclear),
          feeBadge(rec),
          badge(VERIF_META[rec.verification] || VERIF_META["NEEDS VERIFICATION"]),
          fundingChip(rec)),
        el("dl", { class: "d-keyfacts" },
          el("div", null, el("dt", { text: "Where" }), el("dd", { text: whereText(rec) || "Not specified" })),
          el("div", null, el("dt", { text: "Programme dates" }), el("dd", { text: known(rec.program_dates) ? rec.program_dates : "Not specified" })),
          el("div", null, el("dt", { text: "Deadline" }),
            el("dd", null, deadlineSummary(rec), left ? el("span", { class: "left", text: left }) : null)),
          el("div", null, el("dt", { text: "Duration" }), el("dd", { text: known(rec.duration) ? rec.duration : "Not specified" })),
          el("div", null, el("dt", { text: "Age" }), el("dd", { text: ageText(rec) })),
          el("div", null, el("dt", { text: "Format" }), el("dd", { text: rec.delivery_mode || "" }))),
        el("div", { class: "d-actions" }, apply, official, source,
          !apply ? el("span", { class: "muted small", text: "No verified application link yet." }) : null)),

      recFlags.length ? el("div", { class: "notice tone-serious" }, icon("alert"),
        el("div", null, recFlags.map((f) => el("p", { text: f.detail + " (flagged " + fmtDate(f.since) + ")" })))) : null,
      rec.source_confidence === "LOW" ? el("div", { class: "notice tone-critical" }, icon("alert"),
        el("p", { text: "Low-confidence record. The source is thin or not the organiser. Read the potential problems before doing anything." })) : null,
      rec.application_fee === "Fee required" ? el("div", { class: "notice tone-critical" }, icon("alert"),
        el("p", { text: "A fee is involved: " + (known(rec.participation_fee) ? rec.participation_fee : "see the official page") + ". Never pay before confirming who the organiser is." })) : null,
      known(rec.action) ? el("div", { class: "notice tone-info" }, icon("arrow"),
        el("div", null, el("strong", { text: "Suggested next step" }), el("p", { text: rec.action }))) : null,

      section("Overview", el("p", { text: rec.overview || "Not specified." })),
      section("Deadline", el("p", { text: known(rec.deadline_text) ? rec.deadline_text : "Not specified." }),
        known(rec.deadline_timezone) ? el("p", { class: "muted small", text: "Time zone: " + rec.deadline_timezone }) : null,
        known(rec.last_cycle_deadline) || rec.last_cycle_deadline ? el("p", { class: "muted small", text: "Last call closed: " + fmtDate(rec.last_cycle_deadline) }) : null,
        known(rec.expected_next_cycle) ? el("p", { class: "muted small", text: "Next edition: " + rec.expected_next_cycle }) : null),
      section("Who can apply",
        el("p", { text: "For: " + (audienceLabels(rec).join(", ") || "not specified") }),
        list(rec.eligibility),
        el("dl", { class: "facts-inline" },
          factRow("Age", known(rec.age_requirement) ? rec.age_requirement : ageText(rec)),
          factRow("Experience", rec.experience_requirement),
          factRow("Education", rec.education_requirement),
          factRow("Nationality", (rec.nationality_requirements || []).join(" ")),
          factRow("Language", rec.language_requirement),
          factRow("Open to DRC nationals", (DRC_META[rec.drc_eligible] || DRC_META.Unclear).label)),
        (rec.other_requirements || []).length ? list(rec.other_requirements) : null),
      section("What it pays or covers",
        hasCoverage ? coverageTable : null,
        list(rec.funding_details),
        el("dl", { class: "facts-inline" },
          factRow("Fee to apply or take part", rec.participation_fee),
          factRow("Stipend", rec.stipend))),
      section("Documents required", (rec.documents_required || []).length ? list(rec.documents_required) : null),
      section("Application process", (rec.application_process || []).length ? list(rec.application_process, true) : null),
      section("Potential problems", list(rec.potential_issues)),
      (rec.benefits || []).length ? section("Benefits", list(rec.benefits)) : null,
      section("Sources and verification",
        el("ul", { class: "plain-list sources" }, (rec.sources || []).map((s) => {
          const href = safeUrl(s.url);
          return el("li", null,
            href ? el("a", { href, target: "_blank", rel: "noopener noreferrer", text: s.label || href }) : (s.label || ""),
            el("span", { class: "tag tag-soft", text: s.type || "" }));
        })),
        el("dl", { class: "facts-inline" },
          factRow("Last verified", fmtDate(rec.last_verified)),
          factRow("Discovered", fmtDate(rec.date_discovered)),
          factRow("Source type", rec.source_type),
          factRow("Source confidence", rec.source_confidence),
          rec.archived_on ? factRow("Archived", fmtDate(rec.archived_on)) : null),
        known(rec.notes) ? el("p", { class: "muted small", text: rec.notes }) : null));
  }

  let dialog = null;
  function ensureDialog() {
    if (dialog) return dialog;
    dialog = el("dialog", { class: "detail-dialog", "aria-labelledby": "detail-title" },
      el("div", { class: "dialog-bar" },
        el("button", { type: "button", class: "btn ghost", "aria-label": "Close details", onclick: () => dialog.close() },
          icon("close"), "Close")),
      el("div", { class: "dialog-body" }));
    dialog.addEventListener("close", () => {
      if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
    });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
    return dialog;
  }

  function openDetail(rec, flags) {
    const dlg = ensureDialog();
    const body = dlg.querySelector(".dialog-body");
    body.replaceChildren(renderDetail(rec, flags, myAge()));
    if (!dlg.open) dlg.showModal();
    body.scrollTop = 0;
    history.replaceState(null, "", location.pathname + location.search + "#p=" + encodeURIComponent(rec.id));
  }

  /* ---------------------------------------------------------------- data */
  async function loadJSON(path, fallback) {
    try {
      const stamp = Math.floor(Date.now() / 3600000);          // refetch at most hourly
      const response = await fetch(path + "?t=" + stamp, { cache: "no-cache" });
      if (!response.ok) throw new Error(path + " " + response.status);
      return await response.json();
    } catch (error) {
      if (fallback !== undefined) return fallback;
      throw error;
    }
  }

  async function loadAll() {
    if (window.YP_I18N) await window.YP_I18N.ready;          // French wording of the programmes must be there before the first render
    const [db, archive, meta] = await Promise.all([
      loadJSON("data/programs.json"),
      loadJSON("archive/archive.json", { programs: [] }),
      loadJSON("data/meta.json", {})
    ]);
    return { records: db.programs || [], updated: db.updated || "", archive: archive.programs || [], meta };
  }

  /* ---------------------------------------------------------------- page chrome */
  function initTheme() {
    let saved = new URLSearchParams(location.search).get("theme");   // ?theme=light|dark overrides, for sharing or testing
    if (saved !== "light" && saved !== "dark") {
      try { saved = localStorage.getItem("yp-theme"); } catch (e) { /* storage blocked */ }
    }
    if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    const isDark = () => {
      const forced = document.documentElement.getAttribute("data-theme");
      return forced ? forced === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const paint = () => {
      button.replaceChildren(icon(isDark() ? "sun" : "moon"));
      button.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    };
    button.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("yp-theme", next); } catch (e) { /* storage blocked */ }
      paint();
    });
    paint();
  }

  function showError(container, error) {
    container.replaceChildren(el("div", { class: "notice tone-critical" }, icon("alert"),
      el("div", null, el("strong", { text: "The database could not be loaded." }),
        el("p", { text: String(error && error.message ? error.message : error) }),
        el("p", { class: "small", text: "If you opened this file directly from disk, serve the folder instead: python -m http.server" }))));
  }

  window.YP = {
    UNKNOWN, FUNDING_RANK, STATUS_META, STATUS_ORDER, VERIF_META, DRC_META, AUDIENCE_LABELS, AUDIENCE_ORDER,
    WHERE_LABELS, WHERE_ORDER, el, fill, icon, known, safeUrl, statusOf, isLive, daysLeft, timeLeftLabel,
    deadlineMoment, fmtDate, fmtDateTime, deadlineSummary, ageText, ageFit, audienceLabels, whereText,
    matchesFundingFilter, matchesDeadlineFilter, matchesWhereFilter, badge, meter, fundingChip, feeBadge,
    ageBadge, linkButton, myAge, card, openDetail, loadAll, initTheme, showError
  };
})();
