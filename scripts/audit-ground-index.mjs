// Is `lib/ground-checked-pins.js` still describing THIS catalog?
//
// That file is a measurement of the ground under 3,947 waypoints, shipped so the route page can
// disclose pins no coordinate-only test can see. A measurement is true of the data it was taken
// from, and this data moves: `scripts/oneoff/waypoint-repair/` is an active programme replacing
// fabricated coordinates with researched ones, aimed at exactly the pin types the index is full of
// (junctions, fords, trailheads, summits). Four routes dropped out of the flagged set in the 46
// minutes between two runs on 2026-08-20.
//
// NOTHING ELSE ASKS THIS. The caption degrades SAFELY — each entry records the lat/lng/elev it was
// measured for and retires itself when the live pin stops matching — so a repaired pin quietly
// loses its caption and no guard goes red. That is the right failure direction and it is also
// invisible: coverage can fall from 256 routes to 200 with every check still green. This is the
// thing that says so out loud.
//
// TWO KINDS OF STALENESS, AND IT CAN ONLY SEE ONE. Read this before trusting a clean run:
//
//   RETIRED   — a pin was repaired, so its entry no longer matches. Detectable here, no DEM
//               needed: the entry carries the exact values it was measured for.
//   UNMEASURED — a pin the ground has never been asked about, because it was added or moved
//               after the index was built. Whether it disagrees is UNKNOWABLE without re-running
//               the elevation probe. This audit counts them and refuses to guess.
//
// So a run reporting "0 retired" is not a clean bill of health; it is half of one. The unmeasured
// count is the half that decides whether to regenerate.
//
// Read-only, anon key, no elevation requests. Report-only, exit 0 — a property of the database,
// not the checkout, so no code change can cause or fix it. Same reasoning as `check:counts`.
//
//   npm run audit:ground-index
import { readFileSync } from "node:fs";
import { groundDisagreements } from "../lib/track.js";
import { GROUND_DISAGREEMENTS, GROUND_TOLERANCE_FT, GROUND_PINS_MEASURED,
         GROUND_ROUTES_MEASURED } from "../lib/ground-checked-pins.js";

const root = new URL("..", import.meta.url).pathname;
const env = {};
for (const f of [".env.local", ".env"]) {
  try { for (const l of readFileSync(root + f, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim(); } } catch {}
}
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) { console.error("no Supabase url/anon key — failing closed"); process.exit(1); }

async function get(p, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
      if (r.ok) return r.json(); if (a === tries - 1) return { __err: String(r.status) }; }
    catch (e) { if (a === tries - 1) return { __err: e.message }; }
    await new Promise(s => setTimeout(s, 500 * 2 ** a));
  }
}

const ids = Object.keys(GROUND_DISAGREEMENTS);
if (!ids.length) { console.error("the shipped index is EMPTY — that is a broken build, not a clean catalog."); process.exit(1); }

// Keyset-paginated: PostgREST caps a read at 1,000 rows server-side whatever `limit` says, and
// that cap has already been mistaken for a catalog once in this family of scripts.
let rows = [], page, after = "";
do {
  page = await get(`routes?select=id,waypoints&waypoints=not.is.null&order=id.asc&limit=1000` + (after ? `&id=gt.${after}` : ""));
  if (page.__err) { console.error("READ FAILED — failing closed:", page.__err); process.exit(1); }
  rows.push(...page); if (page.length) after = page[page.length - 1].id;
} while (page.length === 1000);
if (!rows.length) { console.error("READ EMPTY — failing closed"); process.exit(1); }
if (rows.length % 1000 === 0) { console.error(`read exactly ${rows.length} rows — that is a cap, not a catalog. Failing closed.`); process.exit(1); }

const byId = new Map(rows.map(r => [r.id, r.waypoints]));

// ── 1. retired entries ────────────────────────────────────────────────────────
let livePins = 0, indexPins = 0, liveRoutes = 0;
const silent = [];
for (const id of ids) {
  const entries = GROUND_DISAGREEMENTS[id];
  indexPins += entries.length;
  const wps = byId.get(id);
  const n = wps ? groundDisagreements(id, wps).length : 0;
  livePins += n;
  if (n) liveRoutes++;
  else silent.push({ id, gone: !byId.has(id), pins: entries.length });
}

console.log(`ground index: ${ids.length} routes / ${indexPins} pins, measured over ${GROUND_PINS_MEASURED} pins on ${GROUND_ROUTES_MEASURED} routes at ${GROUND_TOLERANCE_FT} ft\n`);
console.log(`RETIRED — a pin was repaired, so the caption correctly disappeared:`);
console.log(`  routes still captioning : ${liveRoutes} of ${ids.length}`);
console.log(`  pins still matching     : ${livePins} of ${indexPins}`);
if (silent.length) {
  console.log(`  went silent             : ${silent.length}`);
  for (const s of silent.slice(0, 25))
    console.log(`      ${s.id.padEnd(46)} ${s.gone ? "route no longer has waypoints" : `${s.pins} pin(s) repaired or moved`}`);
  if (silent.length > 25) console.log(`      … ${silent.length - 25} more`);
}

// ── 2. pins the ground has never been asked about ─────────────────────────────
//
// The index does not carry the 3,947 coordinates it measured — that would be a large file to
// serve every reader for a fact only this audit wants. So "unmeasured" is derived from the
// COUNTS the index does carry. That is coarser than a per-pin answer and it is honest about the
// direction: a catalog that has grown or been re-enriched since the measurement holds pins the
// ground has not seen, and this cannot say which.
const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
let nowPins = 0, nowRoutes = 0;
for (const r of rows) {
  let any = 0;
  for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
    const lat = num(w && w.lat), lng = num(w && w.lng);
    const elev = num(w && (w.elev != null ? w.elev : w.elevFt != null ? w.elevFt : w.elev_ft));
    if (lat != null && lng != null && elev != null) { nowPins++; any++; }
  }
  if (any) nowRoutes++;
}
const drift = nowPins - GROUND_PINS_MEASURED;
console.log(`\nCOVERAGE — comparable pins the ground could be asked about:`);
console.log(`  when measured : ${GROUND_PINS_MEASURED} pins on ${GROUND_ROUTES_MEASURED} routes`);
console.log(`  now           : ${nowPins} pins on ${rows.length} routes  (${drift >= 0 ? "+" : ""}${drift})`);
console.log(`  a pin added or moved since is UNMEASURED — whether it disagrees needs the elevation probe, not this.`);

// ── 3. verdict ────────────────────────────────────────────────────────────────
//
// 10% is not a new number: the generator's own `--cached` mode already refuses to re-derive from
// a cache missing more than 10% of pins. One threshold, used the same way in both places.
const retiredPct = indexPins ? (100 * (indexPins - livePins)) / indexPins : 0;
const driftPct = GROUND_PINS_MEASURED ? (100 * Math.abs(drift)) / GROUND_PINS_MEASURED : 0;
console.log(`\nverdict:`);
const reasons = [];
if (retiredPct > 10) reasons.push(`${retiredPct.toFixed(1)}% of index pins have been repaired`);
if (driftPct > 10) reasons.push(`the comparable-pin count has moved ${driftPct.toFixed(1)}%`);
if (reasons.length) {
  console.log(`  REGENERATE — ${reasons.join("; ")}.`);
  console.log(`  node scripts/oneoff/build-ground-disagreement-index.mjs    (~3,900 requests, ~25 min)`);
} else {
  console.log(`  the index still describes this catalog (${retiredPct.toFixed(1)}% retired, ${driftPct.toFixed(1)}% pin drift).`);
  console.log(`  NOT a clean bill of health — see the header: an UNMEASURED pin cannot be judged without the probe.`);
}
console.log(`\nreport-only: exit 0 regardless.`);
