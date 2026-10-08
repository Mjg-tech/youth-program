/* Explorer (programs.html): search, filters, sorting, cards. Filter state lives in the
   query string so any view can be bookmarked or linked from the dashboard. The visitor's
   age is only ever used inside the browser to compare against each programme's limits. */
(function () {
  "use strict";
  const { el, fill, icon, statusOf, daysLeft, card, openDetail, loadAll, initTheme, showError, known,
    FUNDING_RANK, STATUS_ORDER, VERIF_META, DRC_META, AUDIENCE_LABELS, AUDIENCE_ORDER, WHERE_LABELS, WHERE_ORDER,
    matchesFundingFilter, matchesDeadlineFilter, matchesWhereFilter, ageFit } = window.YP;

  const CATEGORIES = ["Internship", "Volunteering", "Youth Programme", "Fellowship", "Leadership", "Training",
    "Entrepreneurship", "Summit or Event", "Exchange", "Graduate Programme", "Competition or Award", "Other"];

  const FILTERS = [
    { key: "category", label: "Type", options: () => CATEGORIES.map((c) => [c, c]),
      test: (r, v) => (r.category || []).includes(v) },
    { key: "who", label: "I am", options: () => AUDIENCE_ORDER.filter((a) => a !== "any-adult").map((a) => [a, AUDIENCE_LABELS[a]]),
      test: (r, v) => (r.audience || []).includes(v) || (r.audience || []).includes("any-adult") },
    { key: "where", label: "Where", options: () => [["kinshasa-or-online", "Kinshasa, DRC or online"]]
      .concat(WHERE_ORDER.map((w) => [w, WHERE_LABELS[w]])), test: (r, v) => matchesWhereFilter(r, v) },
    { key: "funding", label: "Pay or funding", options: () => [["paid", "Paid"], ["funded", "Funded or partly funded"],
      ["free", "Free to join"], ["unpaid", "Unpaid or self-funded"], ["unclear", "Not stated"]],
      test: (r, v) => matchesFundingFilter(r, v) },
    { key: "deadline", label: "Deadline", options: () => [["open", "Open now"], ["closing", "Closing soon"],
      ["month", "This month"], ["quarter", "Next 3 months"], ["later", "Later"], ["watch", "Closed: watch next edition"],
      ["rolling", "Open all year"], ["unknown", "Unknown"], ["passed", "Deadline passed"]],
      test: (r, v) => matchesDeadlineFilter(r, v) },
    { key: "experience", label: "Experience", options: () => [["none", "No experience needed"], ["some", "Some experience needed"], ["unknown", "Not stated"]],
      test: (r, v) => (v === "none" ? r.experience_level === "None required" : v === "some" ? r.experience_level === "Some experience needed"
        : r.experience_level === "Not stated") },
    { key: "fee", label: "Fees", options: () => [["none", "No fee stated"], ["fee", "A fee is involved"]],
      test: (r, v) => (v === "fee" ? r.application_fee === "Fee required" : r.application_fee !== "Fee required") },
    { key: "drc", label: "DRC nationals", options: () => Object.keys(DRC_META).map((k) => [k, DRC_META[k].label]),
      test: (r, v) => r.drc_eligible === v },
    { key: "country", label: "Country", options: (all) => distinct(all, "country"), test: (r, v) => r.country === v },
    { key: "verification", label: "Verification", options: () => Object.keys(VERIF_META).map((k) => [k, VERIF_META[k].label]),
      test: (r, v) => r.verification === v }
  ];

  const SORTS = {
    deadline: ["Deadline (soonest first)", (a, b) => byDeadline(a, b)],
    discovered: ["Recently added", (a, b) => (b.date_discovered || "").localeCompare(a.date_discovered || "") || byDeadline(a, b)],
    verified: ["Recently verified", (a, b) => (b.last_verified || "").localeCompare(a.last_verified || "") || byDeadline(a, b)],
    funding: ["Pay or funding", (a, b) => (FUNDING_RANK[b.funding_type] || 0) - (FUNDING_RANK[a.funding_type] || 0) || byDeadline(a, b)],
    age: ["Youngest minimum age first", (a, b) => (a.age_min || 99) - (b.age_min || 99) || byDeadline(a, b)],
    title: ["Title (A to Z)", (a, b) => a.title.localeCompare(b.title)],
    category: ["Type (A to Z)", (a, b) => ((a.category || [])[0] || "").localeCompare((b.category || [])[0] || "") || a.title.localeCompare(b.title)]
  };

  let data = null;
  let state = {};

  function distinct(records, field) {
    return [...new Set(records.map((r) => r[field]).filter(known))].sort().map((v) => [v, v]);
  }

  function byDeadline(a, b) {
    const sa = STATUS_ORDER.indexOf(statusOf(a)), sb = STATUS_ORDER.indexOf(statusOf(b));
    const liveA = sa <= 2, liveB = sb <= 2;                 // closing soon, open and rolling first, by date
    if (liveA !== liveB) return liveA ? -1 : 1;
    const da = daysLeft(a), db = daysLeft(b);
    if (liveA && da !== null && db !== null && da !== db) return da - db;
    if (liveA && (da === null) !== (db === null)) return da === null ? 1 : -1;
    if (sa !== sb) return sa - sb;
    if (da !== null && db !== null && da !== db) return da - db;
    return a.title.localeCompare(b.title);
  }

  function readState() {
    const params = new URLSearchParams(location.search);
    state = { q: params.get("q") || "", sort: SORTS[params.get("sort")] ? params.get("sort") : "deadline",
      archive: params.get("archive") === "1", age: params.get("age") || "", hideage: params.get("hideage") !== "0" };
    for (const filter of FILTERS) state[filter.key] = params.get(filter.key) || "";
  }

  function writeState() {
    const params = new URLSearchParams(location.search.includes("theme=") ? { theme: new URLSearchParams(location.search).get("theme") } : {});
    if (state.q) params.set("q", state.q);
    if (state.sort !== "deadline") params.set("sort", state.sort);
    if (state.archive) params.set("archive", "1");
    if (state.age) params.set("age", state.age);
    if (!state.hideage) params.set("hideage", "0");
    for (const filter of FILTERS) if (state[filter.key]) params.set(filter.key, state[filter.key]);
    const query = params.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
  }

  function age() {
    const value = parseInt(state.age, 10);
    return value > 0 && value < 100 ? value : 0;
  }

  /* In French, visitors type French words: also search the French wording that is displayed. */
  function frenchText(rec) {
    if (!window.YP_I18N || window.YP_I18N.lang !== "fr") return "";
    const t = window.YP_I18N.t;
    return " " + [rec.title, rec.organization, rec.overview, rec.country, rec.city, rec.location_type, rec.funding_type]
      .concat(rec.category || [], (rec.audience || []).map((a) => AUDIENCE_LABELS[a]), rec.eligibility || [])
      .map((x) => t(x || "")).join(" ").toLowerCase();
  }

  function searchable(rec) {
    return [rec.title, rec.organization, rec.overview, rec.country, rec.city, rec.location_type,
      (rec.category || []).join(" "), (rec.audience || []).map((a) => AUDIENCE_LABELS[a]).join(" "),
      (rec.eligibility || []).join(" "), rec.funding_type].join(" ").toLowerCase() + frenchText(rec);
  }

  function apply() {
    const pool = state.archive ? data.records.concat(data.archive) : data.records;
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const myAge = age();
    let rows = pool.filter((rec) => {
      if (words.length) {
        const text = searchable(rec);
        if (!words.every((w) => text.includes(w))) return false;
      }
      if (myAge && state.hideage && ageFit(rec, myAge) === "outside") return false;
      return FILTERS.every((f) => !state[f.key] || f.test(rec, state[f.key]));
    });
    rows = rows.slice().sort(SORTS[state.sort][1]);
    return { rows, pool };
  }

  function render() {
    const { rows, pool } = apply();
    const flags = (data.meta && data.meta.flags) || [];
    const open = (id) => openDetail(pool.find((r) => r.id === id) || data.archive.find((r) => r.id === id), flags);
    const myAge = age();

    document.getElementById("count").textContent =
      "Showing " + rows.length + " of " + pool.length + (state.archive ? " (archive included)" : "")
      + (data.archive.length && !state.archive ? " · " + data.archive.length + " archived hidden" : "");

    const active = FILTERS.filter((f) => state[f.key]).map((f) => {
      const option = f.options(pool).find(([value]) => value === state[f.key]);
      return [f.key, f.label + ": " + (option ? option[1] : state[f.key])];
    });
    if (state.q) active.push(["q", "Search: " + state.q]);
    if (myAge) active.push(["age", "My age: " + myAge + (state.hideage ? " (age limits applied)" : " (shown, not applied)")]);
    fill(document.getElementById("active"),
      active.map(([key, label]) => el("button", {
        type: "button", class: "chip removable", "aria-label": "Remove filter " + label,
        onclick: () => { state[key] = ""; syncControls(); writeState(); render(); }
      }, label, icon("close"))),
      active.length ? el("button", { type: "button", class: "btn ghost small", text: "Reset all",
        onclick: () => { FILTERS.forEach((f) => { state[f.key] = ""; }); state.q = ""; state.age = ""; syncControls(); writeState(); render(); } }) : null);

    const grid = document.getElementById("grid");
    fill(grid, rows.length ? rows.map((rec) => card(rec, open, myAge))
      : [el("div", { class: "empty-state" }, el("p", { text: "No programme matches these filters." }),
        el("p", { class: "muted", text: "Remove a filter, or tick “Include archive”, to see more." }))]);
  }

  function syncControls() {
    document.getElementById("search").value = state.q;
    document.getElementById("sort").value = state.sort;
    document.getElementById("archive").checked = state.archive;
    document.getElementById("age").value = state.age;
    document.getElementById("hideage").checked = state.hideage;
    for (const filter of FILTERS) {
      const select = document.getElementById("f-" + filter.key);
      if (select) select.value = state[filter.key];
    }
  }

  function buildControls() {
    const all = data.records.concat(data.archive);
    const row = document.getElementById("filters");
    fill(row, FILTERS.map((filter) => {
      const select = el("select", { id: "f-" + filter.key },
        el("option", { value: "", text: "All" }),
        filter.options(all).map(([value, label]) => el("option", { value, text: label })));
      select.addEventListener("change", () => { state[filter.key] = select.value; writeState(); render(); });
      return el("label", { class: "field" }, el("span", { text: filter.label }), select);
    }));

    const sort = document.getElementById("sort");
    fill(sort, Object.entries(SORTS).map(([key, [label]]) => el("option", { value: key, text: label })));
    sort.addEventListener("change", () => { state.sort = sort.value; writeState(); render(); });

    const search = document.getElementById("search");
    let timer = null;
    search.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = search.value.trim(); writeState(); render(); }, 120);
    });

    const ageInput = document.getElementById("age");
    ageInput.addEventListener("input", () => { state.age = ageInput.value.trim(); writeState(); render(); });
    const hideage = document.getElementById("hideage");
    hideage.addEventListener("change", () => { state.hideage = hideage.checked; writeState(); render(); });

    const archive = document.getElementById("archive");
    archive.addEventListener("change", () => { state.archive = archive.checked; writeState(); render(); });
  }

  window.addEventListener("yp-language", () => { if (data) render(); });

  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    try {
      data = await loadAll();
    } catch (error) {
      showError(document.getElementById("grid"), error);
      return;
    }
    readState();
    buildControls();
    syncControls();
    if (window.innerWidth < 700) document.getElementById("filter-box").removeAttribute("open");
    render();
    const match = location.hash.match(/^#p=(.+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const rec = data.records.concat(data.archive).find((r) => r.id === id);
      if (rec) openDetail(rec, (data.meta && data.meta.flags) || []);
    }
  });
})();
