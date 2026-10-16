// Precompute the GROUND's verdict on every waypoint, so the route page can disclose the pins
// that no coordinate-only test can see.
//
// WHY THIS FILE EXISTS. `manufacturedWaypointCaveat` reads the COORDINATES alone — collinearity,
// decimal precision, arithmetic runs — so it catches fabrication that left a structural
// fingerprint and nothing else. Measured 2026-08-20: it captions 180 of the 1,016 routes with
// pins (18%), and of the 107 routes the DEM says carry a pin at the wrong height by more than
// 2,000 ft it captions 29 and is silent about 78. A pin that was manufactured and then ROUNDED to
// surveyed precision is indistinguishable from a real one by any test that reads only the number.
//
// Only the ground separates them, and the ground is ~3,900 USGS requests — it cannot run at
// render time. So it runs HERE, once, and ships as a static index.
//
// NO SCHEMA CHANGE AND NO WRITE TO THE CATALOG. The earlier note that closing this gap "needs the
// verdict precomputed and stored, which is a schema decision" was true only of storing it in the
// database. A file in the repo is precomputed and stored too, it needs no migration, it cannot
// corrupt `waypoints`, and unlike a jsonb key it arrives as a reviewable diff.
//
// THE INDEX SELF-INVALIDATES, which is the part that makes it safe to ship a measurement.
// A stored verdict rots: repair the coordinate and a stale flag starts accusing a good pin, which
// is worse than the silence it replaced. So each entry records the exact inputs it was measured
// FOR — lat, lng and elev — and the reader re-checks that the live pin still carries all three.
// Move the pin, fix the elevation, or delete it, and the entry stops matching and stops being
// shown. It fails to caption rather than captioning wrongly, which is the direction that matters.
//
// IT EMITS A .js MODULE, NOT .json, and that is portability rather than taste. `lib/track.js` is
// imported directly by Node from `audit:synthetic-waypoints`, and a JSON import needs an import
// attribute whose spelling has changed across Node versions (`assert` then `with`). A plain ESM
// module needs none and behaves identically under Vite, esbuild and Node.
//
// The raw DEM readings are cached beside it, so re-running after a wording or threshold change
// costs nothing. ~3,900 requests is thirty minutes; nobody re-measures the ground to reword a
// sentence, so without a cache the sentence is what would stop being re-derived.
//
//   node scripts/oneoff/build-ground-disagreement-index.mjs           # measure, then write lib/ground-checked-pins.js
//   node scripts/oneoff/build-ground-disagreement-index.mjs --cached  # re-derive from the cache, no requests
//   node scripts/oneoff/build-ground-disagreement-index.mjs --dry     # measure, write nothing
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { elevationAt, selfTest } from "../lib/terrain.mjs";

const root = new URL("../..", import.meta.url).pathname;
const env = {};
for (const f of [".env.local", ".env"]) {
  try { for (const l of readFileSync(root + f, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim(); } } catch {}
}
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) { console.error("no Supabase url/anon key — failing closed"); process.exit(1); }

const DRY = process.argv.includes("--dry");
const CACHED = process.argv.includes("--cached");
const CACHE = new URL("../../.ground-readings-cache.json", import.meta.url).pathname;
// Same 2,000 ft as `audit:waypoint-elevations`, and for the same measured reason: at 400 ft that
// audit reported 1,080 pins, most of them the data's own precision. A round-number estimate plus
// ~150 m of positional slop on steep ground reaches 400-600 ft with nothing wrong; it does not
// reach 2,000. Anything the app SAYS OUT LOUD has to clear the higher bar.
const TOL = 2000;
const CONC = 6;

async function get(p, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
      if (r.ok) return r.json(); if (a === tries - 1) return { __err: String(r.status) }; }
    catch (e) { if (a === tries - 1) return { __err: e.message }; }
    await new Promise(s => setTimeout(s, 500 * 2 ** a));
  }
}

// EVERY route with pins, not the three alpine disciplines `audit:waypoint-elevations` scopes to.
// A fabricated pin on a trad route is exactly as wrong, and a scope the app does not state reads
// to a climber as "checked everywhere". Keyset-paginated: PostgREST caps a read at 1,000 rows
// server-side whatever `limit` says, and that cap has already been mistaken here once for a
// catalog (it made `audit:synthetic-waypoints` report 61 findings where the truth was 63).
let rows = [], page, after = "";
do {
  page = await get(`routes?select=id,waypoints&waypoints=not.is.null&order=id.asc&limit=1000` + (after ? `&id=gt.${after}` : ""));
  if (page.__err) { console.error("READ FAILED — failing closed:", page.__err); process.exit(1); }
  rows.push(...page); if (page.length) after = page[page.length - 1].id;
} while (page.length === 1000);
if (!rows.length) { console.error("READ EMPTY — failing closed"); process.exit(1); }

const pins = [];
// Match `normalizeWaypoints`' coercion exactly — contributed rows store these as STRINGS, and an
// index keyed on "47.5" can never match a live pin the reader sees as 47.5.
const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
for (const r of rows) for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
  const lat = num(w && w.lat), lng = num(w && w.lng);
  const elev = num(w && (w.elev != null ? w.elev : w.elevFt != null ? w.elevFt : w.elev_ft));
  if (lat != null && lng != null && elev != null)
    pins.push({ route: r.id, name: String((w && w.name) || ""), type: String((w && w.type) || "?"), lat, lng, elev });
}
if (!pins.length) { console.error("no waypoint carries both a coordinate and an elevation — failing closed"); process.exit(1); }

console.log(`${rows.length} routes with pins · ${pins.length} pins carry a coordinate AND an elevation\n`);

if (CACHED) {
  if (!existsSync(CACHE)) { console.error(`--cached but no ${CACHE} — nothing to re-derive from. Failing closed.`); process.exit(1); }
  const hit = new Map(JSON.parse(readFileSync(CACHE, "utf8")).map(r => [`${r.lat},${r.lng}`, r.ground]));
  let miss = 0;
  for (const p of pins) { const g = hit.get(`${p.lat},${p.lng}`); if (g === undefined) miss++; else p.ground = g; }
  console.log(`re-derived from cache: ${pins.length - miss} of ${pins.length} pins had a stored reading`);
  // A cache built before the catalog moved describes pins that no longer exist. Below 90% it is
  // not a cache of THIS data any more, and re-deriving from it would publish a stale measurement.
  if (miss > pins.length * 0.1) { console.error(`${miss} pins are not in the cache — it is stale. Re-run without --cached.`); process.exit(1); }
} else {
  console.log(`terrain probe calibration — "no findings" is also what a BROKEN probe prints:`);
  try { console.log(await selfTest()); } catch (e) { console.error("\n" + e.message); process.exit(1); }
  let done = 0;
  const queue = pins.slice();  // NOT `pins` — the workers shift() it empty and every result loses its home
  async function work(q) { for (;;) { const p = q.shift(); if (!p) return;
    p.ground = await elevationAt(p.lat, p.lng);
    if (++done % 50 === 0) process.stderr.write(`  ${done}/${pins.length}\r`); } }
  await Promise.all(Array.from({ length: CONC }, () => work(queue)));
  process.stderr.write("".padEnd(28) + "\r");
  writeFileSync(CACHE, JSON.stringify(pins.filter(p => p.ground != null)
    .map(p => ({ lat: p.lat, lng: p.lng, ground: p.ground }))));
  console.log(`cached ${pins.filter(p => p.ground != null).length} readings for --cached re-runs`);
}

const read = pins.filter(p => p.ground != null);
if (!read.length) { console.error("the DEM answered for NO pin — failing closed"); process.exit(1); }
if (read.length < pins.length * 0.9) {
  console.error(`the DEM answered for only ${read.length} of ${pins.length} pins — too thin to publish. Failing closed.`);
  process.exit(1);
}

// A metres-for-feet mix-up reads exactly like a badly misplaced pin and needs the OPPOSITE repair
// (a conversion, not a coordinate). Excluded, or the caption would tell a climber the pin is
// suspect when the pin is fine. Same split `audit:waypoint-elevations` already makes.
const M2FT = 3.280839895;
const isUnit = p => Math.abs(p.elev * M2FT - p.ground) < Math.min(200, Math.abs(p.elev - p.ground) / 3);

const disagreements = {};
let flagged = 0, unit = 0;
for (const p of read) {
  if (isUnit(p)) { unit++; continue; }
  const gap = Math.round(p.elev - p.ground);
  if (Math.abs(gap) <= TOL) continue;
  (disagreements[p.route] ||= []).push({ lat: p.lat, lng: p.lng, elev: p.elev, ground: Math.round(p.ground) });
  flagged++;
}
const routeCount = Object.keys(disagreements).length;
console.log(`${flagged} pins on ${routeCount} routes disagree with the ground by more than ${TOL} ft`);
console.log(`${unit} excluded as a metres-for-feet mix-up (the coordinate is fine; the unit is not)`);
console.log(`${pins.length - read.length} the DEM could not answer for — no evidence, never agreement\n`);

if (!routeCount) { console.error("ZERO routes flagged — that is not this catalog. Failing closed."); process.exit(1); }

const sorted = Object.fromEntries(Object.entries(disagreements).sort((a, b) => a[0] < b[0] ? -1 : 1));
const body =
`// GENERATED by scripts/oneoff/build-ground-disagreement-index.mjs — do not hand-edit.
//
// Waypoints whose recorded elevation disagrees with the ground at their own coordinate by more
// than ${TOL} ft. Either the point is in the wrong place or its elevation is wrong; nothing here
// says which, and the caption in lib/track.js does not claim to know.
//
// Each entry records the lat/lng/elev it was measured FOR. lib/track.js re-checks all three
// against the live pin before showing anything, so repairing a pin retires its entry by itself
// instead of leaving a stale accusation against a coordinate that is now correct.
//
// Measured over ${read.length} pins on ${rows.length} routes.
export const GROUND_TOLERANCE_FT = ${TOL};
export const GROUND_PINS_MEASURED = ${read.length};
export const GROUND_ROUTES_MEASURED = ${rows.length};
export const GROUND_DISAGREEMENTS = {
${Object.entries(sorted).map(([id, ps]) =>
  ` ${JSON.stringify(id)}: [${ps.map(p => `{lat:${p.lat},lng:${p.lng},elev:${p.elev},ground:${p.ground}}`).join(",")}],`).join("\n")}
};
`;
const dest = root + "lib/ground-checked-pins.js";
if (DRY) { console.log(`--dry: would write ${dest} (${body.length} bytes)`); process.exit(0); }
writeFileSync(dest, body);
console.log(`wrote ${dest}  (${(body.length / 1024).toFixed(1)} kB, ${routeCount} routes, ${flagged} pins)`);
