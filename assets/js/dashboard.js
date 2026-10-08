/* Dashboard (index.html). One scope control above everything; every tile, list and
   chart below re-renders against the same slice so the numbers always agree. */
(function () {
  "use strict";
  const { el, fill, icon, statusOf, isLive, daysLeft, timeLeftLabel, fmtDate, fmtDateTime, deadlineSummary, badge,
    ageText, whereText, audienceLabels, STATUS_META, VERIF_META, DRC_META, AUDIENCE_LABELS, AUDIENCE_ORDER, WHERE_LABELS,
    WHERE_ORDER, openDetail, loadAll, initTheme, showError, known, safeUrl } = window.YP;

  const SCOPES = {
    all: { label: "Everything tracked", test: () => true },
    local: { label: "Kinshasa, DRC or online", test: (r) => ["Kinshasa", "Remote", "Elsewhere in the DRC"].includes(r.location_type) },
    beginner: { label: "No experience needed", test: (r) => r.experience_level === "None required" },
    funded: { label: "Paid or funded", test: (r) => ["Paid", "Fully Funded", "Substantially Funded", "Partially Funded", "Travel Funded", "Participation Funded", "Free"].includes(r.funding_type) }
  };
  let state = { scope: "all" };
  let data = null;
  let tooltip = null;

  function tile(label, value, href, hint) {
    return el("a", { class: "tile", href },
      el("span", { class: "tile-label", text: label }),
      el("span", { class: "tile-value", text: String(value) }),
      hint ? el("span", { class: "tile-hint", text: hint }) : null);
  }

  /* ------------------------------------------------------------ bar chart with table twin */
  function showTip(event, title, value) {
    if (!tooltip) {
      tooltip = el("div", { class: "viz-tip", role: "status" });
      document.body.appendChild(tooltip);
    }
    fill(tooltip, el("strong", { text: value }), el("span", { text: title }));
    tooltip.hidden = false;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || box.left + box.width / 2;
    const y = event.clientY || box.top;
    tooltip.style.left = Math.min(window.innerWidth - tooltip.offsetWidth - 12, Math.max(12, x + 12)) + "px";
    tooltip.style.top = Math.max(12, y - tooltip.offsetHeight - 10) + window.scrollY + "px";
  }
  function hideTip() { if (tooltip) tooltip.hidden = true; }

  function barChart(title, subtitle, rows, hrefFor) {
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    const max = Math.max(1, ...rows.map((row) => row.value));
    const bars = el("div", { class: "bars" }, rows.map((row) => {
      const share = total ? Math.round((row.value / total) * 100) : 0;
      const tip = (event) => showTip(event, row.label, row.value + " (" + share + "% of entries)");
      return el("a", {
        class: "bar-row", href: hrefFor(row.key),
        onpointermove: tip, onpointerleave: hideTip, onfocus: tip, onblur: hideTip
      },
        el("span", { class: "bar-label", text: row.label }),
        el("span", { class: "bar-track" }, el("span", { class: "bar", style: "width:" + (row.value / max) * 100 + "%" })),
        el("span", { class: "bar-value", text: String(row.value) }));
    }));
    const table = el("table", { class: "viz-table", hidden: true },
      el("thead", null, el("tr", null, el("th", { scope: "col", text: title }), el("th", { scope: "col", text: "Count" }))),
      el("tbody", null, rows.map((row) => el("tr", null, el("th", { scope: "row", text: row.label }), el("td", { text: String(row.value) })))));
    const toggle = el("button", { type: "button", class: "btn ghost small", "aria-pressed": "false" }, icon("table"), "Table");
    toggle.addEventListener("click", () => {
      const showTable = table.hidden;
      table.hidden = !showTable;
      bars.hidden = showTable;
      toggle.setAttribute("aria-pressed", String(showTable));
      fill(toggle, icon(showTable ? "bars" : "table"), showTable ? "Chart" : "Table");
    });
    return el("figure", { class: "panel viz" },
      el("figcaption", null,
        el("div", null, el("h3", { text: title }), el("p", { class: "muted small", text: subtitle })), toggle),
      rows.length ? bars : el("p", { class: "muted", text: "Nothing in this scope." }), table);
  }

  function countBy(records, picker, labelOf) {
    const counts = new Map();
    for (const rec of records) {
      for (const key of [].concat(picker(rec) || [])) {
        if (!known(key)) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return [...counts.entries()].map(([key, value]) => ({ key, label: labelOf ? labelOf(key) : key, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  /* ------------------------------------------------------------ "find what fits me" form */
  function finder() {
    const age = el("input", { id: "me-age", type: "number", min: "10", max: "60", inputmode: "numeric", placeholder: "e.g. 24" });
    const who = el("select", { id: "me-who" }, el("option", { value: "", text: "Any" }),
      AUDIENCE_ORDER.filter((a) => a !== "any-adult").map((a) => el("option", { value: a, text: AUDIENCE_LABELS[a] })));
    const where = el("select", { id: "me-where" }, el("option", { value: "", text: "Anywhere" }),
      el("option", { value: "kinshasa-or-online", text: "Kinshasa, DRC or online" }),
      WHERE_ORDER.map((w) => el("option", { value: w, text: WHERE_LABELS[w] })));
    const open = el("select", { id: "me-open" }, el("option", { value: "open", text: "Open now" }), el("option", { value: "", text: "Everything" }));
    const form = el("form", { class: "finder", onsubmit: (event) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (age.value) params.set("age", age.value);
      if (who.value) params.set("who", who.value);
      if (where.value) params.set("where", where.value);
      if (open.value) params.set("deadline", open.value);
      location.href = "programs.html" + (params.toString() ? "?" + params.toString() : "");
    } },
      el("label", { class: "field" }, el("span", { text: "My age" }), age),
      el("label", { class: "field" }, el("span", { text: "I am" }), who),
      el("label", { class: "field" }, el("span", { text: "Where" }), where),
      el("label", { class: "field" }, el("span", { text: "Show" }), open),
      el("button", { type: "submit", class: "btn primary" }, "Show what fits", icon("arrow")));
    return el("section", { class: "panel", "aria-labelledby": "finder-title" },
      el("h2", { id: "finder-title", text: "Find what fits you" }),
      el("p", { class: "panel-sub", text: "Your age and situation stay in your browser and in the page address. Nothing is saved on the site." }),
      form);
  }

  /* ------------------------------------------------------------ render */
  function render() {
    const now = new Date();
    const flags = (data.meta && data.meta.flags) || [];
    const scope = SCOPES[state.scope];
    const records = data.records.filter(scope.test);
    const open = (id) => openDetail(data.records.find((r) => r.id === id), flags);

    const live = records.filter((r) => isLive(r, now));
    const closing = records.filter((r) => statusOf(r, now) === "CLOSING SOON");
    const watch = records.filter((r) => statusOf(r, now) === "UPCOMING");
    const kin = records.filter((r) => r.location_type === "Kinshasa" && isLive(r, now));
    const online = records.filter((r) => r.location_type === "Remote" && isLive(r, now));
    const fee = records.filter((r) => r.application_fee === "Fee required");
    const scopeParams = state.scope === "local" ? { where: "kinshasa-or-online" } : state.scope === "beginner" ? { experience: "none" }
      : state.scope === "funded" ? { funding: "funded" } : {};
    const q = (params) => "programs.html?" + new URLSearchParams(Object.assign({}, scopeParams, params)).toString();

    fill(document.getElementById("hero"),
      el("div", { class: "hero-figure" },
        el("span", { class: "hero-value", text: String(live.length) }),
        el("span", { class: "hero-label" }, "open to apply to now",
          el("span", { class: "muted", text: " out of " + records.length + " tracked in this scope" }))),
      el("p", { class: "muted small" },
        "Last research: " + (fmtDate(data.updated) || "not recorded") + ". ",
        data.meta && data.meta.last_refresh ? "Last automatic refresh: " + fmtDateTime(data.meta.last_refresh) + "." : "Automatic refresh has not run yet."));

    fill(document.getElementById("tiles"),
      tile("Tracked", records.length, q({}), data.archive.length + " in archive"),
      tile("Open now", live.length, q({ deadline: "open" })),
      tile("Closing soon", closing.length, q({ deadline: "closing" }), "within 14 days"),
      tile("In Kinshasa", kin.length, q({ where: "Kinshasa", deadline: "open" }), "open now"),
      tile("Online", online.length, q({ where: "Remote", deadline: "open" }), "open now"),
      tile("Closed, watch next", watch.length, q({ deadline: "watch" }), "next edition expected"),
      tile("Fee involved", fee.length, q({ fee: "fee" }), "check before paying"));

    // action queue
    const queue = live.filter((r) => r.source_confidence !== "LOW").sort((a, b) => {
      const da = daysLeft(a, now), db = daysLeft(b, now);
      if ((da === null) !== (db === null)) return da === null ? 1 : -1;
      if (da !== null && da !== db) return da - db;
      return a.title.localeCompare(b.title);
    });
    fill(document.getElementById("queue"),
      queue.length ? el("ol", { class: "queue" }, queue.map((rec) => {
        const apply = safeUrl(rec.official_application_url) || safeUrl(rec.official_information_url);
        return el("li", null,
          el("div", { class: "queue-main" },
            el("button", { type: "button", class: "linklike queue-title", onclick: () => open(rec.id), text: rec.title }),
            el("p", { class: "queue-meta" },
              el("span", { class: "queue-deadline" }, icon("calendar"), deadlineSummary(rec),
                timeLeftLabel(rec, now) ? el("span", { class: "left", text: timeLeftLabel(rec, now) }) : null),
              badge(DRC_META[rec.drc_eligible] || DRC_META.Unclear, rec.drc_eligible === "Unclear" ? "quiet" : ""),
              el("span", { class: "muted", text: whereText(rec) + " · " + ageText(rec) })),
            known(rec.action) ? el("p", { class: "queue-action", text: rec.action }) : null),
          el("div", { class: "queue-buttons" },
            el("button", { type: "button", class: "btn small", onclick: () => open(rec.id), text: "Details" }),
            apply ? el("a", { class: "btn small primary", href: apply, target: "_blank", rel: "noopener noreferrer" }, "Apply", icon("external")) : null));
      })) : el("p", { class: "muted", text: "Nothing open in this scope right now." }));

    // deadline monitor
    const buckets = [[1, "24 hours"], [3, "3 days"], [7, "7 days"], [14, "14 days"], [30, "30 days"]];
    let floor = -Infinity;
    fill(document.getElementById("monitor"), el("ul", { class: "monitor" }, buckets.map(([limit, label]) => {
      const lower = floor;
      floor = limit;
      const hits = records.filter((r) => {
        const left = daysLeft(r, now);
        return left !== null && left >= 0 && left <= limit && left > lower && statusOf(r, now) !== "UPCOMING";
      });
      return el("li", { class: hits.length ? "" : "empty" },
        el("span", { class: "monitor-label", text: "Within " + label }),
        el("span", { class: "monitor-count", text: String(hits.length) }),
        hits.length ? el("ul", null, hits.map((r) => el("li", null,
          el("button", { type: "button", class: "linklike", onclick: () => open(r.id), text: r.title }),
          el("span", { class: "muted small", text: " " + fmtDate(r.application_deadline) })))) : null);
    })));

    // watch list: closed now, a next edition is expected
    const watchList = watch.slice().sort((a, b) => (b.last_cycle_deadline || "").localeCompare(a.last_cycle_deadline || "")).slice(0, 8);
    fill(document.getElementById("watch"),
      watchList.length ? el("ul", { class: "lead-list" }, watchList.map((r) => el("li", null,
        el("button", { type: "button", class: "linklike", onclick: () => open(r.id), text: r.title }),
        el("span", { class: "muted small", text: r.last_cycle_deadline ? "Last call closed " + fmtDate(r.last_cycle_deadline) : "Next call not announced" }))))
        : el("p", { class: "muted", text: "No closed programme is being watched in this scope." }),
      el("p", null, el("a", { class: "more", href: q({ deadline: "watch" }) }, "All " + watch.length + " programmes to watch", icon("arrow"))));

    // warnings
    const flagBox = document.getElementById("flags");
    const risky = records.filter((r) => r.source_confidence === "LOW" || r.application_fee === "Fee required");
    fill(flagBox, risky.length ? el("div", { class: "notice tone-critical" }, icon("alert"),
      el("div", null, el("strong", { text: risky.length + (risky.length === 1 ? " listing needs caution" : " listings need caution") + ": a fee is involved or the source is thin" }),
        el("ul", { class: "plain-list" }, risky.slice(0, 8).map((r) => el("li", null,
          el("button", { type: "button", class: "linklike", onclick: () => open(r.id), text: r.title }),
          el("span", { class: "muted small", text: " " + ((r.potential_issues || [])[0] || (r.application_fee === "Fee required" ? "A fee is involved." : "")) })))))) : null,
    flags.length ? el("div", { class: "notice tone-serious" }, icon("alert"),
      el("div", null, el("strong", { text: flags.length + (flags.length === 1 ? " record needs" : " records need") + " re-verification" }),
        el("ul", { class: "plain-list" }, flags.map((f) => {
          const rec = data.records.find((r) => r.id === f.id);
          return el("li", null,
            rec ? el("button", { type: "button", class: "linklike", onclick: () => open(f.id), text: rec.title }) : f.id,
            el("span", { class: "muted small", text: " " + f.detail }));
        })))) : null);

    // charts
    fill(document.getElementById("charts"),
      barChart("By type", "A programme can sit in several types.", countBy(records, (r) => r.category),
        (key) => q({ category: key })),
      barChart("By place", "Where it takes place.", countBy(records, (r) => r.location_type, (k) => WHERE_LABELS[k] || k),
        (key) => q({ where: key })),
      barChart("Who it is for", "A programme can be open to several groups.", countBy(records, (r) => r.audience, (k) => AUDIENCE_LABELS[k] || k),
        (key) => q({ who: key })),
      barChart("By verification", "How much was checked on the organiser's own page.",
        Object.keys(VERIF_META).map((key) => ({ key, label: VERIF_META[key].label, value: records.filter((r) => r.verification === key).length })).filter((row) => row.value > 0),
        (key) => q({ verification: key })));

    const feeds = (data.meta && data.meta.watch) || null;
    document.getElementById("health").textContent = feeds
      ? feeds.ok + " of " + feeds.checked + " official pages answered on the last automatic check."
      : "The official pages have not been checked automatically yet.";
  }

  function initScope() {
    const box = document.getElementById("scope");
    fill(box, el("span", { class: "filter-label", id: "scope-label", text: "Scope" }),
      el("div", { class: "segmented", role: "group", "aria-labelledby": "scope-label" },
        Object.entries(SCOPES).map(([key, scope]) => el("button", {
          type: "button", "aria-pressed": String(state.scope === key), "data-scope": key, text: scope.label,
          onclick: () => {
            state.scope = key;
            box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scope === key)));
            render();
          }
        }))));
  }

  /* switching language rebuilds the page, so dates and counts are produced in the new language */
  window.addEventListener("yp-language", () => { if (data) render(); });

  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    try {
      data = await loadAll();
    } catch (error) {
      showError(document.getElementById("hero"), error);
      return;
    }
    fill(document.getElementById("finder"), finder());
    initScope();
    render();
    const match = location.hash.match(/^#p=(.+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]);
      const rec = data.records.concat(data.archive).find((r) => r.id === id);
      if (rec) openDetail(rec, (data.meta && data.meta.flags) || []);
    }
  });
})();
