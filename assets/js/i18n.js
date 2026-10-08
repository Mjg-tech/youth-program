/* Language layer: English (the language of the data and of the code) and French.

   English is never touched: the scripts keep producing English, and when the visitor's language is
   French this file translates what is DISPLAYED, using
     - assets/js/i18n-ui-fr.js   the interface (labels, headings, notes)
     - data/fr.json              the wording of the programmes themselves (loaded only for French)
   plus a few patterns for sentences the scripts assemble ("12 days left", "Opens 3 Oct 2026").
   Text that has no French entry stays in English, so nothing ever disappears.

   Language choice: ?lang=fr or ?lang=en, else the saved choice, else the device language
   (French device -> French, anything else -> English). The EN | FR switch in the header changes it live.
   No personal data is involved: only the choice "en" or "fr" is saved in this browser. */
(function () {
  "use strict";

  const LANGS = ["en", "fr"];
  const DEFAULT_LANG = "en";
  const STORE_KEY = "yp-lang";
  const ATTRS = ["placeholder", "aria-label", "alt", "title"];
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, TITLE: 1 };

  const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const FR_MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const DATE_RE = new RegExp("\\b(\\d{1,2}) (" + EN_MONTHS.join("|") + ") (\\d{4})\\b", "g");

  let lang = DEFAULT_LANG;
  const dict = Object.create(null);        // normalised English text -> French (interface + programmes)
  let dataLoaded = false;

  /* ---------------------------------------------------------------- choice of language */
  function storeGet() { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } }
  function storeSet(value) { try { localStorage.setItem(STORE_KEY, value); } catch (e) { /* storage blocked */ } }
  function fromTag(tag) {
    const base = String(tag || "").toLowerCase().split(/[-_]/)[0];
    return LANGS.includes(base) ? base : null;
  }
  function detect() {
    const asked = fromTag(new URLSearchParams(location.search).get("lang"));
    if (asked) { storeSet(asked); return asked; }
    const saved = fromTag(storeGet());
    if (saved) return saved;
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const tag of list) { const l = fromTag(tag); if (l) return l; }
    return DEFAULT_LANG;
  }

  /* ---------------------------------------------------------------- translation */
  const norm = (text) => text.replace(/\s+/g, " ").trim();

  function addEntries(entries) {
    for (const [english, french] of Object.entries(entries || {})) {
      if (typeof french === "string" && french) dict[norm(english)] = french;
    }
  }

  function localiseDates(text) {
    return text.replace(DATE_RE, (m, d, mo, y) => d + " " + FR_MONTHS[EN_MONTHS.indexOf(mo)] + " " + y);
  }
  function isoFr(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return d + " " + FR_MONTHS[m - 1] + " " + y;
  }
  const plural = (n, one, many) => n + " " + (Number(n) === 1 ? one : many);

  /* "A, B, C": translate each piece when the whole is unknown */
  function pieces(text, separator) {
    const parts = text.split(separator);
    if (parts.length < 2) return null;
    let changed = false;
    const out = parts.map((part) => { const t = tr(part); if (t !== part) changed = true; return t; });
    return changed ? out.join(separator) : null;
  }

  /* "Congolese nationality Resident in Kinshasa": several known texts joined by a space (the detail view
     does this for nationality conditions). Cover the whole text with known texts, or give up. */
  function segments(core) {
    const words = core.split(" ");
    if (words.length < 2 || words.length > 60) return null;
    const best = new Array(words.length + 1).fill(null);
    best[0] = [];
    for (let i = 0; i < words.length; i++) {
      if (!best[i]) continue;
      for (let j = words.length; j > i; j--) {
        const french = dict[words.slice(i, j).join(" ")];
        if (french !== undefined && !best[j]) best[j] = best[i].concat([french]);
      }
    }
    return best[words.length] ? best[words.length].join(" ") : null;
  }

  /* sentences assembled by the scripts: [pattern, builder] */
  const PATTERNS = [
    [/^Closed (\d+) days? ago$/, (m) => "Clos il y a " + plural(m[1], "jour", "jours")],
    [/^(\d+) hours? left$/, (m) => plural(m[1], "heure restante", "heures restantes")],
    [/^(\d+) days? left$/, (m) => plural(m[1], "jour restant", "jours restants")],
    [/^(\d+) hours?$/, (m) => plural(m[1], "heure", "heures")],
    [/^(\d+) days?$/, (m) => plural(m[1], "jour", "jours")],
    [/^Within (.+)$/, (m) => "Sous " + tr(m[1])],
    [/^(\d+) to (\d+) years$/, (m) => m[1] + " à " + m[2] + " ans"],
    [/^(\d+) years or older$/, (m) => m[1] + " ans ou plus"],
    [/^Up to (\d+) years$/, (m) => "Jusqu'à " + m[1] + " ans"],
    [/^Opens (.+)$/, (m) => "Ouverture le " + tr(m[1])],
    [/^Last call closed (.+)$/, (m) => "Dernier appel clos le " + tr(m[1])],
    [/^Last call closed: (.+)$/, (m) => "Dernier appel clos le : " + tr(m[1])],
    [/^Next edition: (.+)$/, (m) => "Prochaine édition : " + tr(m[1])],
    [/^For: (.+)$/, (m) => "Pour : " + (tr(m[1]) !== m[1] ? tr(m[1]) : pieces(m[1], ", ") || m[1])],
    [/^Time zone: (.+)$/, (m) => "Fuseau horaire : " + tr(m[1])],
    [/^A fee is involved: (.+)\. Never pay before confirming who the organiser is\.$/,
      (m) => "Des frais sont demandés : " + tr(m[1]) + ". Ne payez jamais avant d'avoir confirmé qui est l'organisateur."],
    [/^(.+) \(flagged (.+)\)$/, (m) => tr(m[1]) + " (signalé le " + tr(m[2]) + ")"],
    [/^Official page returned HTTP (\d+) on two runs\.$/,
      (m) => "La page officielle a renvoyé le code HTTP " + m[1] + " lors de deux contrôles successifs."],
    [/^Date or deadline wording on the official page changed after the last verification\. Re-verify\.$/,
      () => "La formulation de la date ou de la date limite sur la page officielle a changé après la dernière vérification. À revérifier."],
    [/^Last cycle closed on (\d{4}-\d{2}-\d{2})\. Next cycle not announced yet\.$/,
      (m) => "Dernier cycle clos le " + isoFr(m[1]) + ". Prochain cycle pas encore annoncé."],
    [/^Recurring programme; previous cycle closed on (\d{4}-\d{2}-\d{2})\.$/,
      (m) => "Programme récurrent ; le cycle précédent s'est clos le " + isoFr(m[1]) + "."],
    [/^(.*?)\s*\[auto (\d{4}-\d{2}-\d{2})\] Cycle closed\. The details below describe the previous cycle and must be re-verified when the next call opens\.$/,
      (m) => (m[1] ? tr(m[1]) + " " : "") + "[auto " + isoFr(m[2]) + "] Cycle clos. Les informations ci-dessous décrivent le cycle précédent et doivent être revérifiées à l'ouverture du prochain appel."],
    /* dashboard */
    [/^out of (\d+) tracked in this scope$/, (m) => "sur " + m[1] + " suivis dans ce périmètre"],
    [/^Last research: (.+)\.$/, (m) => "Dernière recherche : " + tr(m[1]) + "."],
    [/^Last automatic refresh: (.+)\.$/, (m) => "Dernière actualisation automatique : " + m[1] + "."],
    [/^(\d+) in archive$/, (m) => plural(m[1], "archivé", "archivés")],
    [/^(\d+) \((\d+)% of entries\)$/, (m) => m[1] + " (" + m[2] + " % des fiches)"],
    [/^All (\d+) programmes to watch$/, (m) => "Les " + m[1] + " programmes à surveiller"],
    [/^(\d+) listings? needs? caution: a fee is involved or the source is thin$/,
      (m) => plural(m[1], "fiche demande", "fiches demandent") + " de la prudence : des frais sont demandés ou la source est fragile"],
    [/^(\d+) records? needs? re-verification$/, (m) => plural(m[1], "fiche à revérifier", "fiches à revérifier")],
    [/^(\d+) of (\d+) official pages answered on the last automatic check\.$/,
      (m) => m[1] + " pages officielles sur " + m[2] + " ont répondu lors de la dernière vérification automatique."],
    /* explorer */
    [/^Showing (\d+) of (\d+)$/, (m) => "Affichage de " + m[1] + " sur " + m[2]],
    [/^Showing (\d+) of (\d+) \(archive included\)$/, (m) => "Affichage de " + m[1] + " sur " + m[2] + " (archives incluses)"],
    [/^(\d+) archived hidden$/, (m) => plural(m[1], "archivé masqué", "archivés masqués")],
    [/^(Type|I am|Where|Pay or funding|Deadline|Experience|Fees|DRC nationals|Country|Verification): (.+)$/,
      (m) => tr(m[1]) + " : " + tr(m[2])],
    [/^Search: (.+)$/, (m) => "Recherche : " + m[1]],
    [/^My age: (\d+) \(age limits applied\)$/, (m) => "Mon âge : " + m[1] + " (limites d'âge appliquées)"],
    [/^My age: (\d+) \(shown, not applied\)$/, (m) => "Mon âge : " + m[1] + " (affiché, non appliqué)"],
    [/^Remove filter (.+)$/, (m) => "Retirer le filtre " + tr(m[1])],
    [/^(\d+) of (\d+)$/, (m) => m[1] + " sur " + m[2]]
  ];

  function tr(text) {
    if (lang === "en" || !text) return text;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    const core = norm(text);
    if (!core) return text;
    let out = dict[core];
    if (out === undefined) {
      for (const [re, build] of PATTERNS) {
        const m = re.exec(core);
        if (m) { out = build(m); break; }
      }
    }
    if (out === undefined && core.includes(" · ")) out = pieces(core, " · ") || undefined;
    if (out === undefined && core.includes(", ")) out = pieces(core, ", ") || undefined;
    if (out === undefined) out = segments(core) || undefined;
    if (out === undefined) {
      const dated = localiseDates(core);
      if (dated === core) return text;
      out = dated;
    }
    return lead + localiseDates(out) + trail;
  }

  /* ---------------------------------------------------------------- DOM walking */
  const textState = new WeakMap();        // text node -> { orig, out }
  const attrState = new WeakMap();        // element -> { attr: { orig, out } }

  function skipped(node, attrsOnly) {
    for (let el = node, own = true; el && el.nodeType === 1; el = el.parentNode, own = false) {
      if (el.hasAttribute("data-i18n-skip")) return true;
      if (SKIP_TAGS[el.tagName] && !(own && attrsOnly && el.tagName === "TEXTAREA")) return true;
    }
    return false;
  }

  function processText(node) {
    const cur = node.nodeValue;
    if (!cur || !cur.trim()) return;
    const st = textState.get(node);
    const orig = st && st.out === cur ? st.orig : cur;      // our own output -> keep the English source
    const parent = node.parentNode;
    if (parent && parent.tagName === "OPTION" && (!parent.hasAttribute("value") || parent.hasAttribute("data-i18n-v"))) {
      parent.setAttribute("value", norm(orig));              // the value stays English whatever is shown
      parent.setAttribute("data-i18n-v", "");
    }
    const t = tr(orig);
    textState.set(node, { orig, out: t === orig ? null : t });
    if (t !== cur) node.nodeValue = t;
  }

  function processAttr(el, name) {
    const cur = el.getAttribute(name);
    if (cur === null || !cur.trim()) return;
    let all = attrState.get(el);
    if (!all) { all = {}; attrState.set(el, all); }
    const st = all[name];
    const orig = st && st.out === cur ? st.orig : cur;
    const t = tr(orig);
    all[name] = { orig, out: t === orig ? null : t };
    if (t !== cur) el.setAttribute(name, t);
  }

  function walk(node) {
    if (node.nodeType === 3) { if (!skipped(node.parentNode)) processText(node); return; }
    if (node.nodeType !== 1 || skipped(node, true)) return;
    for (const name of ATTRS) processAttr(node, name);
    if (SKIP_TAGS[node.tagName]) return;
    for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "childList") r.addedNodes.forEach(walk);
      else if (r.type === "characterData") { if (!skipped(r.target.parentNode)) processText(r.target); }
      else if (r.type === "attributes") { if (!skipped(r.target, true)) processAttr(r.target, r.attributeName); }
    }
    placeSwitch();
  });

  /* ---------------------------------------------------------------- page title, description, <html lang> */
  let titleOrig = null;
  let descOrig = null;
  function applyMeta() {
    document.documentElement.setAttribute("lang", lang);
    if (titleOrig === null) titleOrig = document.title;
    document.title = tr(titleOrig);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      if (descOrig === null) descOrig = meta.getAttribute("content") || "";
      meta.setAttribute("content", tr(descOrig));
    }
  }

  /* ---------------------------------------------------------------- EN | FR switch in the header */
  let box = null;
  function buildSwitch() {
    box = document.createElement("div");
    box.className = "segmented lang-switch";
    box.setAttribute("role", "group");
    box.setAttribute("data-i18n-skip", "");
    for (const [code, name] of [["en", "English"], ["fr", "Français"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = code.toUpperCase();
      b.setAttribute("data-lang", code);
      b.setAttribute("lang", code);
      b.setAttribute("title", name);
      b.setAttribute("aria-label", name);
      b.addEventListener("click", () => setLang(code, true));
      box.appendChild(b);
    }
    refreshSwitch();
  }
  function refreshSwitch() {
    if (!box) return;
    box.setAttribute("aria-label", lang === "fr" ? "Langue" : "Language");
    box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  function placeSwitch() {
    if (!box || box.isConnected) return;
    const inner = document.querySelector(".site-header .inner");
    if (!inner) return;
    const toggle = document.getElementById("theme-toggle");
    inner.insertBefore(box, toggle && toggle.parentNode === inner ? toggle : null);
  }

  /* ---------------------------------------------------------------- data dictionary (French only) */
  async function loadData() {
    if (dataLoaded) return;
    try {
      const stamp = Math.floor(Date.now() / 3600000);
      const response = await fetch("data/fr.json?t=" + stamp, { cache: "no-cache" });
      if (!response.ok) throw new Error("fr.json " + response.status);
      const body = await response.json();
      addEntries(body.strings);
      dataLoaded = true;
    } catch (error) {
      /* programme texts stay in English if the file cannot be read */
    }
  }

  /* ---------------------------------------------------------------- applying a language */
  function setLang(code, remember) {
    if (!LANGS.includes(code)) return;
    lang = code;
    if (remember) {
      storeSet(code);
      try {
        const url = new URL(location.href);
        if (url.searchParams.has("lang")) { url.searchParams.delete("lang"); history.replaceState(null, "", url.toString()); }
      } catch (e) { /* old browser */ }
    }
    const apply = () => {
      applyMeta();
      refreshSwitch();
      if (document.body) walk(document.body);
      window.dispatchEvent(new CustomEvent("yp-language", { detail: { lang } }));
    };
    if (lang === "fr" && !dataLoaded) loadData().then(apply); else apply();
  }

  /* ---------------------------------------------------------------- start */
  addEntries(window.YP_UI_FR);
  lang = detect();
  document.documentElement.setAttribute("lang", lang);
  const ready = lang === "fr" ? loadData() : Promise.resolve();

  window.YP_I18N = {
    get lang() { return lang; },
    get locale() { return lang === "fr" ? "fr-FR" : undefined; },
    t: (text) => tr(String(text == null ? "" : text)),
    ready,
    set: (code) => setLang(code, true)
  };

  function start() {
    buildSwitch();
    placeSwitch();
    applyMeta();
    walk(document.body);
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
