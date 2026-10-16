#!/usr/bin/env node
// audit:summit-splits — one peak, two summits. Which of them is on the ground?
//
// A peak's own routes each carry a summit waypoint, and those pins are independent recordings of
// ONE point. When they disagree, at least one is wrong — and nothing in this repo could say so,
// because both existing pin audits are scoped past it:
//
//   audit:cross-route-pins   MIN_KM is 2. Verified: it prints NOTHING about North Early Winters
//                            Spire, where the split is 128 m and 613 ft.
//   audit:summit-pins        DIST_TOL is 300 m, and it compares each pin against the AREA row
//                            rather than against the peak's other pins — so it can never notice
//                            that a peak has two summits, only that one pin is far from the area.
//                            Same silence, verified the same way.
//
// DISTANCE CANNOT SAY WHETHER A SPLIT MATTERS, WHICH IS WHY NEITHER SCOPE IS WRONG. 110 m across
// Mount Baker's summit dome is a rounding worth nothing; 128 m on a spire is 613 ft of ground
// between the two pins, one of them standing on the flank. So the instrument is the GROUND — the USGS 3DEP reading under
// each coordinate, a record neither pin derives from — and the finding is a cluster standing
// materially lower than its sibling.
//
// IT DOES NOT PICK A WINNER, and that restraint is the same one audit:cross-route-pins records:
// a majority can be one enrichment pass counted many times. What it does is say the two cannot
// both be right and print what the terrain holds under each, so a reader can settle it in a
// minute instead of deriving the geometry themselves.
//
// THE PRECISION RULE IS THE PIN'S OWN CLAIM, AND IT IS DELIBERATELY NOT A DENY-LIST. A peak
// legitimately has named sub-summits — Liberty Cap on Rainier, Poltergeist Pinnacle, Hozomeen's
// South Peak, Bonanza's Southwest Peak — and a pin naming one is correct data that
// audit:summit-pins already classifies as NOT a finding. Keeping a vocabulary of sub-summit words
// is the shape one more adjective defeats, so instead two pins count as ONE CLAIM when they carry
// the same name OR state the same elevation. Both are needed and neither is enough:
//
//   name only          misses Mount Baker, whose six-route pin is "Mount Baker Summit" against
//                      "Mt. Baker summit (Grant Peak)" — the same summit spelled two ways, and
//                      369 ft apart on the ground.
//   elevation only     misses Burgundy Spire, where both pins ARE called "Burgundy Spire Summit"
//                      and state 8,483 against 8,400.
//
// And the comparison is PAIRWISE rather than per-peak, which a first version got wrong: asking
// whether ALL of a peak's clusters share a name lets one correctly-named sub-summit — Tepeh
// Towers beside three Eldorado summit pins — decide the verdict for the others, and it drives the
// reported drop from a cluster that is part of no disagreement at all.
//
// Read-only, anon key, fails closed on an empty read. NOT a build gate — a property of the DB
// rather than the checkout, and it makes one network call per distinct coordinate; same reasoning
// as check:counts and audit:cross-route-pins.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";
import { elevationAt } from "./lib/terrain.mjs";

const argv = process.argv.slice(2);
const arg = (kk, d) => { const i = argv.indexOf(kk); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = String(arg("--state", "wa")).toLowerCase();
/* Below this the two coordinates are the same place written twice. Chosen from the shape of a
   summit rather than from the findings: a pin is hand-placed, and 60 m is roughly the slop
   audit:waypoint-elevations already allows a non-summit pin before it will speak. */
const MIN_M = Number(arg("--min-m", 60));
/* And below THIS the ground does not separate them. Borrowed from audit:waypoint-elevations'
   own FLOOR_FT, where it means "inside the 3DEP grid's noise" — not a threshold fitted here.

   AND audit:peak-coords HAS ALREADY MEASURED WHY IT CANNOT GO MUCH LOWER. Its TOL comment
   records that at 150 ft the WA tail is 21 peaks, 17 of them Stuart, Shuksan, Forbidden, Goode,
   Little Tahoma and friends — sharp summits whose coordinate sits 35-100 m off the top on very
   steep ground, reading a couple of hundred feet low while being essentially right. That is ONE
   phenomenon, not 17 defects, and it is exactly what a lower threshold here would re-report as
   summit splits. */
const MIN_DROP_FT = Number(arg("--min-drop", 250));

const k = anonKey();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function page(table, sel, extra = "") {
  const out = []; let last = "";
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${sel}${extra}&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!r.ok) throw new Error(`read ${table} failed ${r.status} ${await r.text()}`);
    const rows = await r.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

/* SCOPE ON THE AREA, NEVER ON THE ROUTE ID. `id like wa_*` is the reflex filter and it drops the
   four legacy route ids (`rainier_*`, `adams_*`) that this catalog still carries — and dropping a
   row from a COMPARATIVE audit does not merely lose that row's finding, it removes the evidence
   its siblings are judged against, which is the false-pass direction. Both legacy Rainier routes
   carry a summit pin on `wa_mount_rainier`. Areas are safe to filter this way: measured, every
   one of the 2,525 areas under `washington` is `wa_`-prefixed except the state row itself. */
const areas = new Map((await page("areas", "id,name,lat,lng,area_type,elevation_ft", `&id=like.${STATE}_*`)).map((a) => [a.id, a]));
if (!areas.size) { console.error(`FAIL — read 0 areas for state "${STATE}". That is a broken query, not a clean catalog.`); process.exit(1); }
const routes = (await page("routes", "id,area_id,waypoints", `&waypoints=not.is.null`)).filter((r) => areas.has(r.area_id));
if (!routes.length) { console.error(`FAIL — read 0 routes for state "${STATE}". That is a broken query, not a clean catalog.`); process.exit(1); }

const byArea = new Map();
let pinCount = 0;
for (const r of routes) {
  const a = areas.get(r.area_id);
  if (!a || a.area_type !== "peak") continue;
  for (const w of (r.waypoints || []).filter(Boolean)) {
    if (!/summit|topout/i.test(String(w.type || ""))) continue;
    const la = num(w.lat), ln = num(w.lng);
    if (la == null || ln == null) continue;
    pinCount++;
    if (!byArea.has(r.area_id)) byArea.set(r.area_id, []);
    byArea.get(r.area_id).push({ id: r.id, la, ln, nm: String(w.name || ""), ft: num(w.elev) });
  }
}
if (!pinCount) { console.error("FAIL — found 0 placed summit pins on any peak-typed area. The scan broke."); process.exit(1); }

const splits = [];
for (const [aid, pins] of byArea) {
  if (pins.length < 2) continue;
  const g = new Map();
  for (const p of pins) { const key = `${p.la},${p.ln}`; if (!g.has(key)) g.set(key, []); g.get(key).push(p); }
  if (g.size < 2) continue;
  let max = 0;
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) max = Math.max(max, D(pins[i].la, pins[i].ln, pins[j].la, pins[j].ln));
  if (max < MIN_M) continue;
  splits.push({ aid, area: areas.get(aid), spread: max, groups: [...g].map(([key, ps]) => ({ key, ps })) });
}
splits.sort((a, b) => b.spread - a.spread);

console.log(`\n=== one peak, two summits ===`);
console.log(`${routes.length} ${STATE.toUpperCase()} routes with waypoints; ${pinCount} placed summit pins on ${byArea.size} peak-typed areas`);
console.log(`${splits.length} peaks whose own routes place the summit ${MIN_M} m or more apart — measuring the ground under each\n`);

const same = [], differ = [], quiet = [], unread = [];
let done = 0;
for (const s of splits) {
  /* One 3DEP call per distinct coordinate, and the service is slow enough under load that a run
     can be minutes. Progress goes to STDERR so a piped run's report is unchanged. */
  process.stderr.write(`\r  reading the ground … ${++done}/${splits.length}   `);
  const rows = [];
  for (const g of s.groups) {
    const [la, ln] = g.key.split(",").map(Number);
    rows.push({ ...g, la, ln, ground: await elevationAt(la, ln),
      names: new Set(g.ps.map((p) => norm(p.nm))),
      fts: new Set(g.ps.map((p) => p.ft).filter((f) => f != null)) });
  }
  const known = rows.filter((r) => r.ground != null).sort((a, b) => b.ground - a.ground);
  /* A reading that could not be obtained is NOT a clean verdict. Saying so is the whole reason
     terrain.mjs returns null rather than 0. */
  if (known.length < 2) { unread.push({ s, got: known.length, of: rows.length }); continue; }

  /* PAIRWISE, NOT PER-PEAK, and getting that wrong put a real finding in the context bucket.
     Judging a whole peak by "do ALL its clusters share a name" lets one correctly-named
     sub-summit — Tepeh Towers beside three Eldorado summit pins — decide the verdict for the
     others, and it drives the reported drop from a cluster that is not part of any disagreement.
     So every PAIR is considered, and the finding is the same-claim pair furthest apart. */
  let worst = null;
  for (let i = 0; i < known.length; i++) for (let j = i + 1; j < known.length; j++) {
    const a = known[i], b = known[j];
    /* TWO WAYS TO BE ONE CLAIM, because either alone misses a real split. An identical pin name
       is the obvious one (Burgundy Spire, whose two pins state DIFFERENT elevations and are both
       called "Burgundy Spire Summit"). An identical stated ELEVATION is the other: Mount Baker
       carries "Mt. Baker summit (Grant Peak)" and "Mount Baker Summit" — the same summit under
       two spellings, 369 ft apart on the ground, and a name test alone files it as context. */
    /* Compared as SETS, never as the first pin of each cluster: a cluster is grouped by
       coordinate alone, so several routes sharing one point can still spell the pin differently,
       and reading `ps[0]` would make the verdict depend on row order. */
    const sameName = [...a.names].some((n) => b.names.has(n));
    const sameFt = [...a.fts].some((f) => b.fts.has(f));
    if (!sameName && !sameFt) continue;
    const d = a.ground - b.ground;
    if (!worst || d > worst.drop) worst = { drop: d, a, b, why: sameName ? "same pin name" : "same stated elevation" };
  }
  if (!worst) { differ.push({ s, known, drop: known[0].ground - known[known.length - 1].ground }); continue; }
  (worst.drop < MIN_DROP_FT ? quiet : same).push({ s, known, drop: worst.drop, worst });
}

process.stderr.write("\r" + " ".repeat(40) + "\r");

const show = (list, title, blurb) => {
  console.log(`\n=== ${title} (${list.length}) ===`);
  if (blurb) console.log(blurb);
  for (const { s, known, drop, worst } of list) {
    console.log(`\n  ${Math.round(drop)} ft apart on the ground — ${s.area.name} (${s.aid}) states ${s.area.elevation_ft ?? "-"} ft, pins ${Math.round(s.spread)} m apart`);
    if (worst) console.log(`      the two that make the SAME CLAIM (${worst.why}) are marked >>`);
    for (const r of known) {
      const fromArea = (s.area.lat != null && s.area.lng != null) ? `${String(Math.round(D(r.la, r.ln, num(s.area.lat), num(s.area.lng)))).padStart(4)} m from the area row` : "   -";
      const mark = worst && (r === worst.a || r === worst.b) ? ">>" : "  ";
      console.log(`   ${mark} ${String(Math.round(r.ground)).padStart(6)} ft ground   ${r.key.padEnd(30)} x${String(r.ps.length).padStart(2)}  ${fromArea}`);
      /* PRINT EVERY DISTINCT NAME AND ELEVATION IN THE CLUSTER, not the first pin's. A cluster is
         grouped by coordinate alone and routes really do disagree inside one — Guye Peak has
         three routes on 47.442,-121.411, two calling it "Guye Peak" at 5,168 ft and one calling
         it "Blood Sport crag" at 3,400. Showing only the first hid the pins that made the
         finding, so the row read as a mismatch the reader could not see. */
      const seen = new Map();
      for (const p of r.ps) {
        const key = `${norm(p.nm)}\x00${p.ft}`;
        if (!seen.has(key)) seen.set(key, { nm: p.nm, ft: p.ft, ids: [] });
        seen.get(key).ids.push(p.id);
      }
      for (const v of seen.values())
        console.log(`          states ${String(v.ft ?? "-").padStart(6)} ft  "${v.nm.slice(0, 46)}"   ${v.ids.slice(0, 4).join(", ")}${v.ids.length > 4 ? ` … +${v.ids.length - 4}` : ""}`);
    }
  }
};

show(same, "ONE CLAIM, TWO PLACES",
  `  Two pins claiming the same thing — the same name, or the same stated elevation — standing\n` +
  `  on ground ${MIN_DROP_FT} ft apart. They cannot both be right. WHICH is wrong is not decided here: read\n` +
  `  the ground beside the peak's own stated elevation, and check the area row as a third record.`);
show(differ, "NO TWO PINS MAKE THE SAME CLAIM — context, not findings",
  `  A named sub-summit or a neighbouring feature is correct data, and audit:summit-pins already\n` +
  `  classifies it as such. Printed because a wrong pin sometimes hides here too, never counted.`);

console.log(`\n${quiet.length} split(s) under ${MIN_DROP_FT} ft on the ground — the terrain does not separate them, so no verdict.`);
if (unread.length) {
  console.log(`\n${unread.length} split(s) NOT MEASURED — the ground could not be read:`);
  for (const u of unread) console.log(`   ${u.s.area.name} (${u.got}/${u.of} coordinates read)`);
  console.log(`   No evidence is not the same as agreement. Re-run these before treating the sweep as complete.`);
}
console.log(`\nOne-sided about nothing: a split says the two records disagree, never which is wrong.`);
console.log(`Report only; nothing was changed.`);
