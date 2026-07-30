// Detect the bug class where one peak's enrichment lands on a different peak's route.
//
// Root cause (measured 2026-07-29): only ~9% of WA route ids are peak-scoped
// (`wa_mount_baker_north_ridge`, i.e. id starts with area_id). The other ~91% are
// derived from the ROUTE NAME alone plus a disambiguating counter — `wa_north_ridge`,
// `wa_north_ridge_2`, `wa_north_face_3`, `wa_south_face`. With name-derived ids,
// "the North Ridge route" does not identify a peak, so any handoff that resolves a
// route by name (or by a name-shaped id) can land on an arbitrary peak's row.
//
// That is how a Mount Adams permit block ended up on Mount Baker, Forbidden, Whatcom,
// Cutthroat and Primus — every one of them has a route named "North Ridge". Same
// mechanism behind migrations 0044-0046 and the routes.access contamination.
//
// Read-only. Prints a report and writes JSON; touches no route data.
//
// Usage:
//   node scripts/audit-route-identity.mjs                 # whole catalog
//   node scripts/audit-route-identity.mjs --state wa      # one state subtree
//   node scripts/audit-route-identity.mjs --json out.json

import fs from "fs";
import crypto from "crypto";
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const STATE = (arg("--state", "") || "").toLowerCase();
const OUT = arg("--json", "");

// Columns written by the enrichment passes. Cross-region duplication in any of them
// is the fingerprint of a mis-targeted write.
const ENRICHED = ["approach", "descent_text", "emergency", "permit", "comms",
                  "watch_out", "obj_haz", "hazards", "bail", "pro_tips", "access"];

// Values that legitimately repeat verbatim across unrelated peaks. Boilerplate like
// "Reverse the route." is not contamination, and flagging it buries the real hits.
// The test for whether repeated prose is boilerplate: it names no place. Generic advice
// ("Descend open slopes toward camp") is legitimately shared by unrelated peaks;
// contamination carries a specific — a trailhead, a ranger district, a phone number.
const BOILERPLATE = [
  /^reverse the (route|scramble)/i, /^retreat down/i, /^limited bail/i,
  /^no cell (coverage|service)/i, /^same as approach/i, /^descend the (route|ascent)/i,
  // Generic retreat phrasings that carry no place-specific content. Measured
  // 2026-07-29: these were the ONLY two cross-region `bail` blobs in the whole
  // catalog (5 WA routes) -- "Reversible at any point on the nontechnical
  // terrain." on Earl Peak + Goat Mountain, and "Descend open slopes toward
  // camp" on Blizzard, Claywood and Worthington. Both are true of any
  // non-technical scramble, so they are shared vocabulary, not a mis-targeted
  // write. Kept deliberately narrow: real contamination names a place, a number
  // or a trailhead, and a looser "short string" rule would hide it.
  /^reversible\b/i, /^descend (open|easy|low.angle|broad) slopes/i,
  /^no fixed anchors/i, /^walk off/i,
];
// Placeholder route names that repeat within one crag by design (OpenBeta import).
// Import-artifact names that legitimately repeat within one crag. Widened after a full-
// catalog run showed 16 of 17 "real" duplicate-name collisions were actually these:
// "unnamed route", "unknown route", "unnamed v0", "unnamed 5.10", "5.12 face", "v2",
// "closed project", "un-named", "_delete". Deliberately anchored so a genuine route
// name that merely CONTAINS one of these words is still treated as real.
const PLACEHOLDER = new RegExp([
  '^\\s*$',                                   // blank
  '^_?delete$',                               // al_delete scaffolding
  '^un-?named(\\s+(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v\\d+|5\\.\\d+[a-d]?|\\d+))?$',   // unnamed / unnamed route / unnamed v0 / unnamed prow / unnamed lfc
  '^unknown(\\s+(route|climb|problem|boulder|line|prow|arete|crack|slab|face|corner|dihedral|lfc|v\\d+|5\\.\\d+[a-d]?|\\d+))?$',     // unknown / unknown route -- but NOT "Unknown Soldier"
  '^(open|closed) project$',
  '^project$', '^route$', '^no name$', '^nameless$', '^tbd$', '^n/?a$', '^\\?+$',
  '^v\\d+[+-]?$',                             // v2
  '^5\\.\\d+[a-d]?(\\s+(face|slab|crack|prow|arete|dihedral|corner))?$',   // 5.12 face
  '^[\\d\\W]+$',                              // punctuation/number-only
].join('|'), 'i');

const norm = s => (s || "").trim().toLowerCase();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const hash = v => crypto.createHash("md5").update(JSON.stringify(v)).digest("hex").slice(0, 10);
// An object whose every value is a no-data placeholder ({"fees":"N/A","permit":"N/A",...})
// is shared by design, not by contamination. Without this, one such stub on 9 unrelated
// crags outranks the single genuine hit in the same column.
const NODATA = /^\s*(n\/?a|none|unknown|null|-|—|)\s*$/i;
const isPlaceholderObj = v => v && typeof v === "object" && !Array.isArray(v) &&
  Object.values(v).length > 0 && Object.values(v).every(x => x == null || (typeof x === "string" && NODATA.test(x)));
// Short arrays of bare hazard vocabulary (["loose rock"], ["rockfall","exposure"]) are
// shared vocabulary, not copied prose. Real contamination carries specifics — a place
// name, a phone number, a trailhead. Anything with a multi-word phrase still counts.
const GENERIC_TAG = /^(loose ?rock|rock ?fall|exposure|route ?finding|routefinding|avalanche|crevasse|serac|icefall|cornice|weather|scree|talus|moat|whiteout|altitude|remoteness|afternoon weather|verglas|wet rock)$/i;
const isGenericTags = v => Array.isArray(v) && v.length > 0 && v.length <= 4 &&
  v.every(x => typeof x === "string" && GENERIC_TAG.test(x.trim()));
// A BOILERPLATE prefix only earns an exemption if the WHOLE value stays generic.
// Prefix-anchored patterns alone are a masking risk: "Reverse the route." is shared
// vocabulary, but "Reverse the route to Dinner Ledge, then rappel the Kor Roof."
// is peak-specific beta and must still be compared across regions. Contamination
// always carries specifics -- a proper noun, a number, a trailhead -- so a value
// with an interior capitalised word or any digit is never boilerplate.
const GENERIC_PROSE = s => {
  const t = s.trim();
  if (t.length > 120 || /\d/.test(t)) return false;
  // Skip the leading word: a sentence legitimately starts with a capital.
  return !t.split(/\s+/).slice(1).some(w => /^[A-Z][a-z]{2,}/.test(w));
};
const isBoilerplate = v =>
  (typeof v === "string" && BOILERPLATE.some(re => re.test(v.trim())) && GENERIC_PROSE(v)) ||
  isPlaceholderObj(v) || isGenericTags(v);

// Comparative or referential mentions are not jurisdiction claims: "unlike Mount Rainier",
// "nearest ranger station", "no climbing fee like Mount Adams".
const COMPARATIVE = /\b(not|unlike|other than|rather than|as opposed to|compared to|versus|vs\.?|nearest|nearby|closest|no\b[^.]{0,30}\bfee\b[^.]{0,10}like)\b[^.]{0,40}$/i;

// Big pages: the default 60 would be ~3,400 round trips over the 200k-row routes table.
const PAGE = { pageSize: 1000 };

const areasList = await selectAll("areas", "id,name,parent_id,area_type,elevation_ft", null, PAGE);
const areas = new Map(areasList.map(a => [a.id, a]));

function ancestry(id) {
  const out = [];
  let cur = id;
  for (let i = 0; cur && i < 12; i++) {
    const a = areas.get(cur);
    if (!a) break;
    out.push(a);
    cur = a.parent_id;
  }
  return out;
}
// Region = the broad bucket under the state, which is what makes "these two routes are
// 200 miles apart" legible without needing coordinates.
function regionOf(areaId) {
  const ch = ancestry(areaId);
  return ch.length > 2 ? ch[ch.length - 3].name : (ch[0] ? ch[0].name : "?");
}
function stateOf(areaId) {
  const ch = ancestry(areaId).map(a => norm(a.name));
  return ch.length > 1 ? ch[ch.length - 2] : (ch[0] || "?");
}

// NUMERIC is fetched alongside ENRICHED: checks 6 and 7 read those columns, and a select
// that omits them yields undefined for every row — which reads as "clean" rather than as
// an error. Both checks silently reported 0 findings until this list was widened.
const NUMERIC = ["gain_ft", "loss_ft", "dist_km", "length_m", "high_point_ft"];
const routes = await selectAll("routes", ["id", "name", "area_id", ...ENRICHED, ...NUMERIC].join(","), null, PAGE);
const scoped = STATE
  ? routes.filter(r => stateOf(r.area_id).startsWith(STATE) || String(r.id).startsWith(`${STATE}_`))
  : routes;

console.log(`routes examined: ${scoped.length}${STATE ? ` (state=${STATE})` : ""}`);
console.log("");

// ---------------------------------------------------------------- 1. id scoping
const orphan = scoped.filter(r => !(r.area_id && String(r.id).startsWith(`${r.area_id}_`)));
const families = new Map();
for (const r of orphan) {
  const base = String(r.id).replace(/_\d+$/, "");
  if (!families.has(base)) families.set(base, []);
  families.get(base).push(r);
}
// A family is only a collision risk if the same name-derived base spans >1 peak.
const collisions = [...families.entries()]
  .map(([base, rs]) => [base, rs, new Set(rs.map(r => r.area_id)).size])
  .filter(([, , peaks]) => peaks > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log("1. ROUTE ID SCOPING");
console.log(`   peak-scoped ids            : ${scoped.length - orphan.length}`);
console.log(`   name-derived ids           : ${orphan.length}`);
console.log(`   collision families (>1 peak): ${collisions.length}`);
for (const [base, rs, peaks] of collisions.slice(0, 10)) {
  const names = [...new Set(rs.map(r => (areas.get(r.area_id) || {}).name))].slice(0, 4);
  console.log(`     ${base.padEnd(26)} x${String(rs.length).padStart(3)} across ${peaks} peaks: ${names.join(", ")}`);
}
console.log("");

// ------------------------------------------------- 2. cross-region duplicate values
// A permit rule is SUPPOSED to be identical on every route in its land unit, and land
// units cross the app's geographic region buckets freely — Alpine Lakes Wilderness spans
// two, the Northwest Forest Pass spans six. Flagging those as contamination put 408
// routes on the work list, none of them wrong.
//
// What made the real bug real was different: a Mount Adams permit block sitting on 18
// peaks that are not Mount Adams. So the test is whether the text names a specific PEAK
// that the carrying route does not belong to. A wilderness/park/forest designation names
// a container, and a container legitimately holds many peaks.
const LAND_UNIT_SUFFIX = /\s+(wilderness|national\s+park|national\s+forest|state\s+park|np\b|nf\b)/i;
// Multi-word names only, and long enough to be distinctive: matching a bare "Baker" or
// "The Fin" against prose would fire constantly on ordinary words.
const peakNames = [...new Set(areasList
  .filter(a => a.area_type === "peak" && a.name && a.name.length >= 8 && /\s/.test(a.name))
  .map(a => a.name.trim()))];
const peakByName = new Map(areasList.filter(a => a.area_type === "peak" && a.name)
  .map(a => [a.name.trim().toLowerCase(), a.id]));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PEAK_RE = peakNames.length
  ? new RegExp(`\\b(${peakNames.map(esc).sort((a, b) => b.length - a.length).join("|")})\\b`, "gi")
  : null;

// True when the value names a peak that is NOT this route's own area or an ancestor of it.
function namesForeignPeak(value, route) {
  if (!PEAK_RE) return false;
  const txt = typeof value === "string" ? value : JSON.stringify(value);
  const own = new Set(ancestry(route.area_id).map(a => a.id));
  own.add(route.area_id);
  PEAK_RE.lastIndex = 0;
  let m;
  while ((m = PEAK_RE.exec(txt))) {
    // "Glacier Peak Wilderness" is a land unit even though "Glacier Peak" is a summit.
    if (LAND_UNIT_SUFFIX.test(txt.slice(m.index + m[0].length, m.index + m[0].length + 24))) continue;
    const id = peakByName.get(m[0].toLowerCase());
    if (id && !own.has(id)) return true;
  }
  return false;
}

console.log("2. CROSS-REGION DUPLICATE FIELD VALUES  (the contamination fingerprint)");
const contamination = [];
for (const col of ENRICHED) {
  const blobs = new Map();
  for (const r of scoped) {
    const v = r[col];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (isBoilerplate(v)) continue;
    const h = hash(v);
    if (!blobs.has(h)) blobs.set(h, []);
    blobs.get(h).push(r);
  }
  const susp = [...blobs.entries()].filter(([, rs]) =>
    new Set(rs.map(r => r.area_id)).size > 1 && new Set(rs.map(r => regionOf(r.area_id))).size > 1 &&
    // Keep the blob only if at least one carrier is somewhere the text does not describe.
    // A shared value that names no foreign peak is shared vocabulary, not a mis-target.
    rs.some(r => namesForeignPeak(rs[0][col], r)));
  const routesInvolved = susp.reduce((n, [, rs]) => n + rs.length, 0);
  console.log(`   ${col.padEnd(14)} ${String(susp.length).padStart(3)} blob(s)  ${String(routesInvolved).padStart(4)} route(s)`);
  // EVERY suspicious blob goes into the report — the console listing below is truncated
  // for readability, but `--json` is used as a work list and must be complete. Recording
  // only the top 3 per column is how a cleanup pass missed 12 contaminated routes
  // (Mount Tom / North Cascades text on Mt. Lyell, Mt. Jefferson, Kagevah Peak...).
  for (const [h, rs] of susp.sort((a, b) => b[1].length - a[1].length)) {
    contamination.push({ column: col, blob: h, routes: rs.map(r => r.id),
                         names: [...new Set(rs.map(r => r.name))],
                         regions: [...new Set(rs.map(r => regionOf(r.area_id)))] });
  }
}
console.log("");
for (const c of contamination.slice(0, 8)) {
  console.log(`   ${c.column} ${c.blob}: ${c.routes.length} routes / ${c.regions.length} regions`);
  console.log(`      names  : ${c.names.slice(0, 4).join(" | ")}`);
  console.log(`      regions: ${c.regions.slice(0, 4).join(" | ")}`);
  console.log(`      ids    : ${c.routes.slice(0, 6).join(", ")}`);
}
console.log("");

// --------------------------------------------------------- 3. duplicate route rows
console.log("3. DUPLICATE ROUTES  (same name on the same area — what a UNIQUE index would block)");
const byKey = new Map();
for (const r of scoped) {
  if (!r.area_id) continue;
  const k = `${r.area_id} ${norm(r.name)}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(r);
}
const dupes = [...byKey.entries()].filter(([, rs]) => rs.length > 1);
const realDupes = dupes.filter(([k]) => !PLACEHOLDER.test(k.split(" ")[1]));
console.log(`   duplicate (area, name) pairs : ${dupes.length}`);
console.log(`     placeholder names (fine)   : ${dupes.length - realDupes.length}`);
console.log(`     REAL collisions (suspect)  : ${realDupes.length}`);
for (const [k, rs] of realDupes) {
  const [aid, nm] = k.split(" ");
  console.log(`     x${rs.length}  ${((areas.get(aid) || {}).name || "?").slice(0, 28).padEnd(28)} | ${nm.slice(0, 30).padEnd(30)} | ${rs.map(r => r.id).join(", ")}`);
}
console.log("");

// -------------------------------------------- 4. id-prefix blind spot for state queries
// `id like 'wa_%'` is the reflex filter, and it silently misses legacy ids such as
// `stuart_west_ridge`. Any coverage percentage computed that way understates its own
// denominator.
if (STATE) {
  const inTree = routes.filter(r => stateOf(r.area_id).startsWith(STATE));
  const missed = inTree.filter(r => !String(r.id).startsWith(`${STATE}_`));
  console.log(`4. ID-PREFIX BLIND SPOT for id=like.${STATE}_*`);
  console.log(`   routes in the ${STATE} subtree : ${inTree.length}`);
  console.log(`   missed by the prefix filter    : ${missed.length}`);
  for (const r of missed.slice(0, 20)) {
    console.log(`     ${r.id.padEnd(40)} ${((areas.get(r.area_id) || {}).name || "?").slice(0, 22)} / ${r.name}`);
  }
  console.log("");
}

// ------------------------------------------- 5. one state's place names on another's routes
// A stronger, blob-independent version of check 2. Contamination that reached only ONE
// route in a region produces no duplicate blob at all, and a blob ranked below the listing
// cutoff is easy to skim past — but "Mount Tom area, North Cascades" on Mt. Lyell in
// California is wrong on its face, whatever it is or isn't duplicated with. This is the
// check that would have caught all 122 routes cleaned on 2026-07-29 in one pass.
//
// Only state-EXCLUSIVE names qualify. "Northwest Forest Pass" is valid in Oregon too,
// there is a Mount Adams in New Hampshire, and bare "Cascade" matches Cascade Canyon in
// the Tetons — none of those can carry the inference.
const STATE_ONLY = [
  ["Washington", /North Cascades|Gifford Pinchot|Okanogan-?Wenatchee|Alpine Lakes Wilderness|Mount Index|Methow|Washington Pass|Baker-?Snoqualmie|Snoqualmie Ranger|Rainy Pass trailhead|Mount Tom area/i],
  ["California", /Yosemite|Inyo National Forest|Tuolumne|High Sierra Ranger|Mount Whitney Ranger/i],
  ["Colorado",   /Rocky Mountain National Park|San Isabel National Forest|Arapaho.{0,24}Roosevelt/i],
  ["Wyoming",    /Grand Teton National Park|Bridger-?Teton|Wind River Ranger/i],
];
const leaks = [];
for (const r of scoped) {
  const st = (stateOf(r.area_id) || "").toLowerCase();
  for (const col of ENRICHED) {
    const v = r[col];
    if (v == null || v === "") continue;
    const txt = JSON.stringify(v);
    for (const [owner, re] of STATE_ONLY) {
      if (owner.toLowerCase() !== st && re.test(txt)) {
        leaks.push({ id: r.id, name: r.name, state: stateOf(r.area_id), column: col, claims: owner });
        break;
      }
    }
  }
}
console.log(`5. OUT-OF-STATE PLACE NAMES  (${leaks.length} field(s))`);
for (const l of leaks.slice(0, 20)) {
  console.log(`   ${l.id.padEnd(42)} in ${l.state.padEnd(12)} ${l.column} claims ${l.claims}`);
}
if (leaks.length > 20) console.log(`   ... ${leaks.length - 20} more`);
console.log("");

// ------------------------------------------------- 6. impossible summit elevations
// A route cannot top out higher than the peak it is on. Unlike "lower than the summit"
// (legitimate — the route ends at a sub-summit), an overshoot is unambiguously wrong,
// and in practice it is the contamination fingerprint in numeric form: on 2026-07-29
// eleven WA routes carried another mountain's elevation because they shared its route
// NAME — Mount Baker's 10781 on five unrelated "North Ridge" routes, Mount Goode's 9220
// on four "Northeast Buttress" routes, Mount Adams' 12281 on Whatcom Peak's South Spur.
//
// Traverses are exempt: a traverse legitimately tops out on the higher peak it crosses,
// which is why Torment-Forbidden (8815 = Forbidden) and Tooth-Chair (6238 = Chair) are
// correct as stored and must not be "fixed".
const SUMMIT_TOL = 50; // summit-block / datum spread
const impossible = [];
for (const r of scoped) {
  const peak = areas.get(r.area_id);
  if (!peak || peak.area_type !== "peak" || !peak.elevation_ft || !r.high_point_ft) continue;
  if (/traverse|enchainment|link-?up/i.test(r.name || "")) continue;
  if (r.high_point_ft > peak.elevation_ft + SUMMIT_TOL)
    impossible.push({ id: r.id, name: r.name, peak: peak.name,
                      stored: r.high_point_ft, peakElev: peak.elevation_ft,
                      over: r.high_point_ft - peak.elevation_ft });
}
impossible.sort((a, b) => b.over - a.over);
console.log(`6. IMPOSSIBLE SUMMIT ELEVATIONS  (${impossible.length} route(s) claim a summit above their own peak)`);
for (const i of impossible.slice(0, 20)) {
  console.log(`   ${i.id.padEnd(44)} ${String(i.stored).padStart(6)} vs peak ${String(i.peakElev).padStart(6)} on ${i.peak}  (+${i.over})`);
}
if (impossible.length > 20) console.log(`   ... ${impossible.length - 20} more`);
console.log("");

// --------------------------------------- 7. numeric contamination by shared route name
// Check 2 inspects only prose columns, so the same bug hiding in the numbers went unseen:
// "North Ridge" carries gain_ft 7150 on seven unrelated peaks and "Northeast Buttress"
// carries 5800 on six. Exact-value matching alone is too noisy here — round figures
// coincide honestly — so this additionally requires the ROUTE NAME to match, which is the
// mechanism by which the value travelled in the first place.
// 7150 or 12.55 is a measurement; 4500 or 10 is a guess many peaks can share honestly.
// Round figures are still reported, but ranked below the specific ones.
//
// Roundness has to be judged in the unit the figure was WRITTEN in, not the unit it
// happens to be stored in. length_m and dist_km hold metric values converted from
// imperial sources, so "1,000 ft" is stored as 305 and "25 mi" as 40.23 — both of which
// look like precise measurements to a metric-only test. That mislabelled 36 of 41
// findings as high-signal and buried the two that were real. Two routes both described
// as "about 1,000 ft" is a coincidence, not contamination.
const nearMultiple = (v, step, tol) => Math.abs(v / step - Math.round(v / step)) * step <= tol;
// Only the metric columns need the second opinion; gain_ft, loss_ft and high_point_ft
// are already stored in the unit they were written in.
const ROUND_AS_SOURCED = {
  length_m: v => nearMultiple(v * 3.28084, 50, 2),        // whole 50 ft, ±2 ft of rounding slop
  // Whole/half miles, and whole/half kilometres — dist_km is small enough that the
  // %100 rule below (calibrated for feet) never fires on a legitimately round figure.
  dist_km: v => nearMultiple(v / 1.609344, 0.5, 0.05) || nearMultiple(v, 0.5, 0.02),
};
const isRound = (v, col) => {
  if (Number.isInteger(v) ? v % 100 === 0 : Number.isInteger(v * 10)) return true;
  return ROUND_AS_SOURCED[col] ? ROUND_AS_SOURCED[col](v) : false;
};
const numericContam = [];
for (const col of NUMERIC) {
  const groups = new Map();
  for (const r of scoped) {
    const v = r[col];
    if (v == null || v === 0) continue;
    const k = `${norm(r.name)} ${v}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const [k, rs] of groups) {
    if (new Set(rs.map(r => r.area_id)).size < 2) continue;
    const [nm, val] = k.split(" ");
    if (PLACEHOLDER.test(nm)) continue;
    numericContam.push({ column: col, name: nm, value: Number(val),
                         peaks: new Set(rs.map(r => r.area_id)).size,
                         round: isRound(Number(val), col), routes: rs.map(r => r.id),
                         peakNames: [...new Set(rs.map(r => (areas.get(r.area_id) || {}).name))] });
  }
}
// specific values first, then breadth — a non-round figure on 7 peaks is the strong signal
numericContam.sort((a, b) => (a.round - b.round) || (b.peaks - a.peaks));
const strong = numericContam.filter(n => !n.round);
console.log(`7. NUMERIC CONTAMINATION  (${numericContam.length} value(s) shared by a same-named route across peaks; ${strong.length} non-round)`);
for (const n of numericContam.slice(0, 12)) {
  console.log(`   ${n.column.padEnd(14)} "${n.name}" = ${n.value}${n.round ? "   (round — may be coincidence)" : ""}`);
  console.log(`      ${n.peaks} peaks: ${n.peakNames.slice(0, 6).join(", ")}`);
}
if (numericContam.length > 12) console.log(`   ... ${numericContam.length - 12} more`);

// ------------------------- 8. a jurisdiction's permit text on land it does not govern
// Check 5 compares STATES, so contamination staying inside one is invisible to it: Olympic
// National Park text on a North Cascades peak is both-in-Washington and slips through, and
// check 2 misses it too unless the text is duplicated across regions. Live risk, not
// hypothetical — Steeple Rock is in Olympic NP while Whatcom, Cutthroat and Primus are in
// the North Cascades, yet all four share the id family `wa_north_ridge*`.
//
// Judged by GEOGRAPHY, deliberately not by area-tree branch names. Two earlier attempts
// failed: resolving place names against the area tree flagged correct data (the tree is not
// a gazetteer — route text names real places like "Hurricane Ridge" that aren't areas), and
// a hand-written map of which branches each jurisdiction covers produced 299 false
// positives because the real tree vocabulary differs from what I guessed. A centre and a
// generous radius needs no vocabulary and no maintenance.
const R_EARTH = 3958.8;
const milesBetween = (a, b) => { const p1 = a.lat*Math.PI/180, p2 = b.lat*Math.PI/180, dp = p2-p1, dl = (b.lng-a.lng)*Math.PI/180;
  return 2*R_EARTH*Math.asin(Math.sqrt(Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2)); };
function coordOf(areaId) { for (const a of ancestry(areaId)) if (a.lat != null && a.lng != null) return { lat: a.lat, lng: a.lng }; return null; }
// Radii exceed each real boundary so a route merely near the edge is never flagged.
const JURISDICTION = [
  ["Olympic National Park",        { lat: 47.80, lng: -123.60 },  60],
  ["Gifford Pinchot",             { lat: 46.20, lng: -121.70 },  70],
  ["Adams Climbing",              { lat: 46.20, lng: -121.49 },  40],
  ["North Cascades National Park",{ lat: 48.70, lng: -121.20 },  70],
  ["Okanogan-?Wenatchee",         { lat: 47.80, lng: -120.60 }, 110],
  ["Alpine Lakes Wilderness",     { lat: 47.50, lng: -121.15 },  50],
  ["Mount Rainier National Park", { lat: 46.85, lng: -121.76 },  40],
  ["Mount Baker-?Snoqualmie",     { lat: 47.90, lng: -121.60 }, 130],
];
const wrongJuris = [];
for (const r of scoped) {
  const own = coordOf(r.area_id);
  if (!own) continue;
  for (const col of ENRICHED) {
    const v = r[col];
    if (v == null || v === "") continue;
    const txt = JSON.stringify(v);
    for (const [cue, centre, radius] of JURISDICTION) {
      const m = txt.match(new RegExp(cue, "i"));
      if (!m) continue;
      if (COMPARATIVE.test(txt.slice(Math.max(0, m.index - 60), m.index))) continue;
      const d = milesBetween(own, centre);
      if (d <= radius) continue;
      wrongJuris.push({ id: r.id, column: col, cites: m[0], miles: Math.round(d),
                        area: (areas.get(r.area_id) || {}).name });
      break;
    }
  }
}
console.log(`8. PERMIT TEXT FROM THE WRONG JURISDICTION  (${wrongJuris.length} field(s))`);
for (const w of wrongJuris.slice(0, 20)) {
  console.log(`   ${w.id.padEnd(40)} on ${String(w.area).slice(0, 22).padEnd(22)} ${w.column} cites ${w.cites} (${w.miles} mi away)`);
}
if (wrongJuris.length > 20) console.log(`   ... ${wrongJuris.length - 20} more`);console.log("");

// ------------------------------------- 9. gain that cannot fit in the distance recorded
// Checks 6 and 7 compare a value against other rows. This one needs no comparison: a
// route's own gain_ft and dist_km can be impossible together. Johannesburg's NE Buttress
// held 4,720 ft against a 1.6 km approach — 1.6 km is exactly 1.0 mile, the length of the
// CLIMB, in a column that holds the one-way distance. Neither number looks wrong on its
// own; the pair is.
//
// dist_km is ONE-WAY. The app is unambiguous about it — ClimbMatch.jsx computes
// `roundTripKm = distKm * 2`, and its own average-grade readout divides the ascent by
// `distKm * 1000`, the full value. Use the same denominator here. Halving it as well (as
// this check first shipped) doubles every grade and flagged 25 routes where 3 qualify.
const GRADE_LIMIT = 0.7;
const steep = [];
for (const r of scoped) {
  if (!(r.gain_ft > 1500) || !(r.dist_km > 0)) continue;
  const grade = (r.gain_ft * 0.3048) / (r.dist_km * 1000);
  if (grade > GRADE_LIMIT) steep.push({ id: r.id, gain: r.gain_ft, dist: r.dist_km, grade,
                                        area: (areas.get(r.area_id) || {}).name });
}
steep.sort((a, b) => b.grade - a.grade);
console.log(`9. GAIN TOO LARGE FOR THE DISTANCE  (${steep.length} route(s) — usually dist_km holding one leg, not the whole one-way approach)`);
for (const s of steep.slice(0, 20)) {
  console.log(`   ${s.id.padEnd(44)} ${String(s.area).slice(0, 20).padEnd(20)} ${s.gain} ft over ${s.dist} km  → avg grade ${s.grade.toFixed(2)}`);
}
if (steep.length > 20) console.log(`   ... ${steep.length - 20} more`);
console.log("");

const report = {
  examined: scoped.length,
  idScoping: { peakScoped: scoped.length - orphan.length, nameDerived: orphan.length,
               collisionFamilies: collisions.map(([b, rs]) => ({ base: b, ids: rs.map(r => r.id) })) },
  contamination,
  duplicateRoutes: realDupes.map(([k, rs]) => ({ areaId: k.split(" ")[0], name: k.split(" ")[1], ids: rs.map(r => r.id) })),
  outOfStatePlaceNames: leaks,
  impossibleSummits: impossible,
  numericContamination: numericContam,
  wrongJurisdiction: wrongJuris,
  gainExceedsDistance: steep,
};
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log(`wrote ${OUT}`); }

const problems = contamination.length + realDupes.length + leaks.length + impossible.length + strong.length + wrongJuris.length + steep.length;
console.log(problems ? `FOUND ${problems} thing(s) to look at.` : "Clean.");
