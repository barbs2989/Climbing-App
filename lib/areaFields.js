// The seven area fields a climber may suggest an edit to, in ONE place.
//
// The database holds the same list as a check constraint (0304, contributions_area_field_ck) and
// its applier (apply_agreed_area_field) writes exactly these columns; the editor
// (lib/AreaSuggestFix.jsx) offers them and the area page (lib/DbAreaBrowser.jsx) renders them.
// check:area-edit-fields fails if any of those four stop agreeing with this table — the
// shape check:search-norm uses for the JS/SQL spelling rules.
//
// Each entry: key (the areas column and the contributions.field), label, type, limits, and
// `cur(area)` — the current value as the editor's row shows it (never [object Object]).
//
// No ACCESS field, by the owner's call (2026-10-04, reaffirmed 2026-10-15): access stays on the
// route page. No `season` text either — season_months is the one area season field, and it is
// never read out of the routes' own season strings.

export const ASPECTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "varies"];
export const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthsLabel(months) {
  if (!Array.isArray(months) || !months.length) return "";
  const on = [...new Set(months.map(Number).filter(m => m >= 1 && m <= 12))].sort((a, b) => a - b);
  if (!on.length) return "";
  if (on.length === 12) return "Year-round";
  // Runs of consecutive months read as a range ("Apr–Jun, Sep–Oct"); a run that wraps the year
  // end ("Nov–Mar") is kept as one range rather than split at December.
  const set = new Set(on);
  const runs = [];
  let start = null;
  for (let m = 1; m <= 12; m++) {
    if (set.has(m) && start == null) start = m;
    if (start != null && (!set.has(m + 1) || m === 12)) { runs.push([start, m]); start = null; }
  }
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) { const last = runs.pop(); runs[0] = [last[0], runs[0][1]]; }
  return runs.map(([a, b]) => a === b ? MONTH_ABBR[a - 1] : MONTH_ABBR[a - 1] + "–" + MONTH_ABBR[b - 1]).join(", ");
}

// Strings only: a stray object or array must read as empty, never as "[object Object]".
const text = s => (s == null || typeof s === "object" || String(s).trim() === "") ? "" : String(s).trim();

export const AREA_EDIT_FIELDS = [
  { k: "blurb", label: "About this area", type: "long", min: 20, max: 1500, hint: "What it is, what the climbing is like, and who it suits. Two short paragraphs is plenty.", cur: a => text(a.blurb) },
  { k: "approach", label: "Walk in", type: "long", min: 1, max: 600, hint: "From the parking to the base: the trail, landmarks, and anything easy to miss.", cur: a => text(a.approach) },
  { k: "approach_min", label: "Walk-in time", type: "int", min: 1, max: 600, unit: "min", hint: "Minutes from the car at a normal pace.", cur: a => a.approach_min == null ? "" : String(a.approach_min) + " min" },
  { k: "parking_note", label: "Drive & park", type: "long", min: 5, max: 400, hint: "How to drive there and where climbers actually park. Written as directions, not a link.", cur: a => text(a.parking_note) },
  { k: "rock", label: "Rock", type: "text", min: 1, max: 40, hint: "Granite, sandstone, limestone, basalt…", cur: a => text(a.rock) },
  { k: "aspect", label: "Faces", type: "aspect", opts: ASPECTS, hint: "Which way the main walls face. Pick “varies” for a formation with faces every way.", cur: a => text(a.aspect) },
  { k: "season_months", label: "Season", type: "months", hint: "The months people climb here.", cur: a => monthsLabel(a.season_months) },
];

export const AREA_EDIT_KEYS = AREA_EDIT_FIELDS.map(f => f.k);

// The clustering key for one submitted value: what SQL area_field_norm() does (0304), so the
// pending banner's "N of 3" counts the same way the database will.
export function areaEditNorm(v) {
  if (v == null) return null;
  if (Array.isArray(v)) { const xs = [...new Set(v.map(Number).filter(Number.isFinite))].sort((a, b) => a - b); return xs.length ? xs.join(",") : null; }
  if (typeof v === "number") return String(v);
  const s = String(v).trim().replace(/\s+/g, " ").toLowerCase().replace(/\.$/, "");
  return s || null;
}

// Group one field's contribution rows into clusters of agreeing climbers, largest first.
// Rows: { field, value, contributor, status, created_at }. Rejected rows and unnamed
// contributors never count, as in the applier.
export function areaEditClusters(rows, field) {
  const by = new Map();
  for (const r of rows || []) {
    if (!r || r.field !== field || r.kind !== "field" || r.status === "rejected") continue;
    if (!r.contributor || r.contributor === "anon") continue;
    const key = areaEditNorm(r.value);
    if (key == null) continue;
    const c = by.get(key) || { key, value: r.value, who: new Set(), latest: "", approved: false };
    c.who.add(r.contributor);
    if (!c.latest || r.created_at > c.latest) { c.latest = r.created_at; c.value = r.value; }
    if (r.status === "approved") c.approved = true;
    by.set(key, c);
  }
  return [...by.values()].map(c => ({ key: c.key, value: c.value, n: c.who.size, who: [...c.who], approved: c.approved })).sort((a, b) => b.n - a.n);
}

export const AREA_EDIT_NEED = 3;
