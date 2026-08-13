// Do researched peak rosters actually RESOLVE against this catalog?
//
// Measured before any more research is done, because the answer decides whether researching the
// remaining lists is worth anything. A roster of names the catalog cannot match is not a tick
// list — it is 53 rows that silently never become objectives, which is the exact failure mode
// lib/lists.js warns about for a mistyped id.
//
// The Fifty Classics pass is the precedent and its lesson runs both ways: a name matcher that is
// too loose invents matches ("Needle Rock" is a subset of "Crestone Needle" on the word
// "needle"), and one that is too strict reports present data as missing — 17 of the 20 entries
// it first called absent were in the catalog.
//
// Read-only. Reports; writes nothing.
import { anonKey, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
import { CO_14ERS, CA_14ERS, STATE_HIGHPOINTS, CASCADE_VOLCANOES } from "./roster-data.mjs";

const LOOSE = !!process.env.LOOSE;   // opt-in only, for comparing precision
const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// Abbreviations are EXPANDED rather than stripped, and applied to both sides. That is what lets
// an exact-name rule still match the catalog's "Mt. Hood" to a roster's "Mount Hood", while
// keeping "Castle, The" away from "Castle Peak".
const EXPAND = [[/\bmt\b/g, "mount"], [/\bmtn\b/g, "mountain"], [/\bst\b/g, "saint"], [/\bn\b/g, "north"], [/\bs\b/g, "south"], [/\be\b/g, "east"], [/\bw\b/g, "west"]];
const norm = s => {
  let t = String(s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  for (const [re, to] of EXPAND) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
};
// "Mount", "Peak", "Mountain" are noise in a peak name — the catalog and every roster disagree
// about which to include ("Mount Sneffels" vs "Sneffels"). Deliberately NOT stripping direction
// words: "North Palisade" and "Middle Palisade" are different mountains.
const STOP = /\b(mount|mt|the|peak|mountain|massif)\b/g;
const key = s => norm(s).replace(STOP, " ").replace(/\s+/g, " ").trim();

// Renames and second names. A roster written today says "Mount Blue Sky" while a catalog built
// from older data says "Mount Evans", and neither is wrong — so this is a genuine alias table,
// not a fuzzy-match crutch. Each entry is a documented rename or an equally-used second name.
const ALIASES = {
  "blue sky": ["evans"],                    // renamed 2023
  "denali": ["mckinley"],                   // renamed 2015
  "kuwohi": ["clingmans dome"],             // renamed 2024
  "black elk": ["harney"],                  // renamed 2016
  "mckinley": ["denali"],
  "evans": ["blue sky"],
};

const areas = await selectAll("areas", "id,name,area_type,elevation_ft,route_count,path", "", { pageSize: 1000, key: KEY });
if (!areas.length) { console.error("FAIL: empty read of areas — refusing to report every roster as unresolvable."); process.exit(1); }
console.log(`\nloaded ${areas.length} areas\n`);

// Index by normalised name. Many names repeat across states ("Castle Peak", "Black Mountain"),
// so the state is used to disambiguate rather than taking the first hit.
const byKey = new Map();
// A SECOND index on the full normalised name, keeping "mount" and "peak". This is the one that
// separates Mount Wilson (14,252) from Wilson Peak (14,023) — two different San Juan fourteeners
// that both reduce to "wilson" once the stopwords go, and which the first draft happily resolved
// to the SAME area. Stripping is a fallback, never the primary test.
const byFull = new Map();
for (const a of areas) {
  const k = key(a.name);
  if (k) { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(a); }
  const f = norm(a.name);
  if (f) { if (!byFull.has(f)) byFull.set(f, []); byFull.get(f).push(a); }
}

// A route id / path prefix is the only state signal available. `path` is the ltree lineage and
// its first label is the country, so the STATE is the second label.
const stateOf = a => {
  const parts = String(a.path || "").split(".");
  return parts.length > 1 ? parts[1] : "";
};

const resolve = (name, stateHint, wantFt) => {
  const k = key(name);
  const gather = map => {
    const out = [];
    const push = kk => { for (const a of map.get(kk) || []) if (!out.includes(a)) out.push(a); };
    push(map === byFull ? norm(name) : k);
    for (const alt of ALIASES[k] || []) push(map === byFull ? norm(alt) : key(alt));
    return out;
  };
  // EXACT normalised name (stopwords intact) is what separates Mount Wilson from Wilson Peak.
  // The STRIPPED key is the fallback, and only when no OTHER entry on this roster reduces to it.
  const exactC = gather(byFull);
  // The stripped-key fallback is DISABLED, and this is the finding that killed it: it matched
  // Colorado's "Castle Peak" (14,279 ft, Elk Mountains) to `co_castle_the` — an area named
  // "Castle, The" in Buffalo Creek, a granite crag outside Denver — and "Crestone Peak" to a bare
  // "Crestone". Colorado's areas carry NO elevation, so the height check that would have caught
  // both could not fire, and the tree is a CRAG tree where generic formation names are everywhere.
  // A wrong summit on a tick list is worse than a short list, so the loose path is off by default.
  const looseC = LOOSE ? (AMBIGUOUS.has(k) ? [] : gather(byKey)) : [];
  // Filter by state FIRST, then prefer exact. Preferring exact before the state filter was a
  // regression: an area literally named "Mount Hood" exists outside Oregon, and finding it
  // suppressed the fallback that reaches Oregon's own "Mt. Hood". Precision within the right
  // state beats precision across the whole country.
  const ofState = list => stateHint ? list.filter(a => stateOf(a).includes(stateHint)) : list;
  const cands = ofState(exactC).length ? ofState(exactC) : ofState(looseC);
  if (!cands.length) {
    if (AMBIGUOUS.has(k)) return { hit: null, why: `"${name}" is not distinguishable from another entry on this list by name alone` };
    return { hit: null, why: (exactC.length || looseC.length) ? `name exists, but not in ${stateHint}` : "no area with this name" };
  }
  // FAIL CLOSED on the state, above. The first draft fell back to an out-of-state candidate when
  // the named state had none, and every one of those was WRONG: Colorado's Mount Lincoln resolved
  // to `ok_mt_lincoln`, Mount Columbia to `wa_columbia_peak`, New Mexico's Wheeler Peak to
  // `vt_wheeler_mountain`, and Missouri Mountain to the `missouri` STATE ROW. Peak names repeat
  // heavily across states, so "no candidate here, take one from anywhere" manufactures exactly
  // the cross-state contamination this catalog has already bled once.
  //
  // Prefer an area that actually holds climbs — a hollow grouping row of the same name is not the
  // objective, it is the shell beside it. That shape is on record catalog-wide.
  // ELEVATION is an independent check on identity, and it is the one that catches a plausible
  // wrong answer. "Castle Peak" (14,279 ft) matched `co_castle_the` — an area called "Castle,
  // The" — purely on the stripped key, and "Crestone Peak" matched a bare "Crestone". A name can
  // be coincidence; a name AND a height cannot. Only applied when the area carries an elevation,
  // so a missing value never rejects a good match.
  const near = a => a.elevation_ft == null || wantFt == null || Math.abs(a.elevation_ft - wantFt) <= 500;
  const plausible = cands.filter(near);
  if (!plausible.length) {
    const best = cands[0];
    return { hit: null, why: `name matches ${best.id} but its elevation ${best.elevation_ft} ft is nowhere near ${wantFt} ft` };
  }
  const withRoutes = plausible.filter(a => (a.route_count || 0) > 0);
  const pick = (withRoutes.length ? withRoutes : plausible).sort((a, b) => (b.route_count || 0) - (a.route_count || 0))[0];
  return { hit: pick, why: "", n: plausible.length };
};

// Keys that more than one entry on the SAME roster reduces to. Computed per list, because the
// collision that matters is within a list — two different fourteeners cannot both be the objective.
const RESOLVED = {};
let AMBIGUOUS = new Set();
const ambiguousIn = roster => {
  const seen = new Map();
  for (const e of roster) { const k = key(e.name); seen.set(k, (seen.get(k) || 0) + 1); }
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
};

const report = (label, roster, stateHint) => {
  AMBIGUOUS = ambiguousIn(roster);
  let ok = 0, withRoutes = 0;
  const misses = [], offState = [];
  const hits = [];
  for (const e of roster) {
    const hint = stateHint || e.state;
    const r = resolve(e.name, hint, e.ft);
    if (!r.hit) { misses.push(`${e.name}${r.why.startsWith("name exists") ? " (wrong state)" : ""}`); continue; }
    ok++;
    if ((r.hit.route_count || 0) > 0) { withRoutes++; hits.push({ ...e, id: r.hit.id, rc: r.hit.route_count }); }
  }
  // Two entries landing on ONE area means the matcher collapsed distinct peaks. Drop both and say
  // so — shipping either would put a wrong summit on a tick list, and shipping both would make the
  // same area two objectives.
  const byArea = new Map();
  for (const h of hits) { if (!byArea.has(h.id)) byArea.set(h.id, []); byArea.get(h.id).push(h.name); }
  const collided = [...byArea].filter(([, ns]) => ns.length > 1);
  const bad = new Set(collided.flatMap(([id]) => id));
  const clean = hits.filter(h => !bad.has(h.id));
  if (collided.length) {
    console.log(`   COLLISION (${collided.length}) — dropped, distinct peaks resolving to one area:`);
    for (const [id, ns] of collided) console.log(`      ${id} <- ${ns.join(" + ")}`);
  }
  withRoutes = clean.length;
  RESOLVED[label] = clean.map(h => ({ id: h.id, name: h.name, ft: h.ft }));
  console.log(`${label.padEnd(22)} ${String(ok).padStart(3)}/${String(roster.length).padStart(3)} resolve   ${String(withRoutes).padStart(3)} hold a route`);
  if (misses.length) console.log(`   no match (${misses.length}): ${misses.slice(0, 12).join(", ")}${misses.length > 12 ? ", ..." : ""}`);
  if (offState.length) console.log(`   state mismatch (${offState.length}): ${offState.slice(0, 5).join(" | ")}`);
  return { ok, withRoutes, total: roster.length };
};

console.log("list                   resolved      usable");
const a = report("Colorado 14ers", CO_14ERS, "colorado");
const b = report("California 14ers", CA_14ERS, "california");
const c = report("State highpoints", STATE_HIGHPOINTS, null);
const d = report("Cascade volcanoes", CASCADE_VOLCANOES, null);

const tot = [a, b, c, d].reduce((n, x) => n + x.total, 0);
const res = [a, b, c, d].reduce((n, x) => n + x.ok, 0);
const use = [a, b, c, d].reduce((n, x) => n + x.withRoutes, 0);
console.log(`\n${res}/${tot} names resolve to an area; ${use} of those hold at least one route.`);
console.log(`A roster entry whose area holds NO route is not an objective a climber can tick —\nit would render as a name with nothing behind it.`);

// Emit the resolved rosters as JS literals for lib/lists.js. Emitted from the resolver rather
// than hand-copied for the reason the Bulger roster records: a mistyped id is invisible — the
// entry simply never becomes an objective.
if (process.env.DUMP) {
  const varName = { "Colorado 14ers": "CO_14ER_PEAKS", "California 14ers": "CA_14ER_PEAKS", "State highpoints": "STATE_HIGHPOINT_PEAKS", "Cascade volcanoes": "CASCADE_VOLCANO_PEAKS" };
  console.log("\n// ---- generated, paste into lib/lists.js ----");
  for (const [label, rows] of Object.entries(RESOLVED)) {
    console.log(`export const ${varName[label]} = [`);
    for (const r of rows) console.log(`  { id: "${r.id}", name: ${JSON.stringify(r.name)}, ft: ${r.ft} },`);
    console.log(`];`);
  }
}
