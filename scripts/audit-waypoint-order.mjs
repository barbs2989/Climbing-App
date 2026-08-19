// Are a route's waypoints in a sensible order, and does it list the same place twice?
//
// Two reports drove this: Forbidden Peak's West Ridge lists Trailhead (0 mi), Summit (4.5
// mi), Boston Basin camp (3 mi), West Ridge notch (4.2 mi) — the summit third from the end
// of a walk it is the far point of; and Mount Olympus' Blue Glacier standard route shows two
// summit pins on the map.
//
// Read-only, report-only. The repair lands in normalizeWaypoints() at the DB boundary rather
// than in the rows, so it covers seed routes and future imports too; this script measures how
// much it changes and prints what it would touch.
//
//   node scripts/audit-waypoint-order.mjs                 # whole catalog summary
//   node scripts/audit-waypoint-order.mjs --state wa      # ids under a state prefix
//   node scripts/audit-waypoint-order.mjs --list 30
//
// SIBLING, NOT A DUPLICATE. `scripts/audit-waypoints.mjs` asks a different question of the
// same column; the two were written in parallel under one filename (#789 and #783). This one
// asks whether the LIST is sensible — ordering and duplicate pins — and needs no gpx at all.
// That one asks whether each waypoint is on the route's own GPX TRACK: segment-aware distance
// to the line, whether the trailhead sits at the track's start, whether the track ever reaches
// the summit. Neither subsumes the other — a perfectly ordered list can sit entirely off the
// track, and a list every point of which is on the track can still name the summit third from
// the end. Run both.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { orderWaypoints, dedupeWaypoints } from "../lib/waypoints.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 12);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints&waypoints=not.is.null` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}

const t = { rows: 0, withWp: 0, wp: 0, reordered: 0, deduped: 0, dupPins: 0,
  allHaveDist: 0, partialDist: 0, dupSummits: 0 };
const outOrder = [], outDup = [];

let after = "";
for (;;) {
  const rows = await page(after);
  if (!rows.length) break;
  for (const r of rows) {
    if (STATE && !String(r.id).startsWith(STATE + "_")) continue;
    t.rows++;
    const wps = Array.isArray(r.waypoints) ? r.waypoints : null;
    if (!wps || !wps.length) continue;
    t.withWp++; t.wp += wps.length;
    const named = wps.filter(w => w && w.distMi != null).length;
    if (named === wps.length) t.allHaveDist++; else if (named) t.partialDist++;

    const dd = dedupeWaypoints(wps);
    if (dd.length !== wps.length) {
      t.deduped++; t.dupPins += wps.length - dd.length;
      const sums = wps.filter(w => w && /^(summit|topout)$/i.test(String(w.type || ""))).length;
      if (sums > 1) t.dupSummits++;
      if (outDup.length < LIST) outDup.push({ id: r.id, name: r.name, was: wps.length, now: dd.length,
        types: wps.map(w => (w && w.type) || "?").join(",") });
    }
    const ord = orderWaypoints(dd);
    if (ord.some((w, i) => w !== dd[i])) {
      t.reordered++;
      if (outOrder.length < LIST) outOrder.push({ id: r.id, name: r.name,
        before: dd.map(w => `${(w.type || "?")}@${w.distMi ?? "-"}`).join(" → "),
        after: ord.map(w => `${(w.type || "?")}@${w.distMi ?? "-"}`).join(" → ") });
    }
  }
  after = rows[rows.length - 1].id;
  if (rows.length < 1000) break;
}

console.log("\n=== waypoint audit ===");
console.log("routes read (waypoints not null):", t.rows, " with a non-empty list:", t.withWp, " waypoints total:", t.wp);
console.log("routes where every waypoint has distMi:", t.allHaveDist, " partial:", t.partialDist);
console.log("\nroutes listing the same place twice:", t.deduped, " duplicate pins removed:", t.dupPins,
  " of which had 2+ summit/topout pins:", t.dupSummits);
// This number is ONLY about the routes orderWaypoints can actually order, and saying so is the
// whole point of printing it this way. `orderWaypoints` sorts by distMi and returns the list
// UNTOUCHED unless every pin has a finite one — so for a route missing a single distance the
// app renders the stored order however wrong, and this audit reports it as in-order BY
// CONSTRUCTION. Measured on WA: 435 of 1012 routes are in that state, and 64 of them list an
// approach marker (a trail junction, a water source, a climbing area) AFTER the summit — the
// Amphitheater Mountain cluster reads Trailhead, Summit, Topout, Junction, Climbing area on
// five separate routes. An unqualified "0 out of order" over that population is the
// vacuous-pass shape, so the denominator is stated with the verdict.
const unsortable = t.withWp - t.allHaveDist;
console.log(`routes whose waypoints render out of order: ${t.reordered}` +
  ` — of the ${t.allHaveDist} this can order at all`);
console.log(`  ${unsortable} more cannot be ordered (a pin is missing distMi), so they render in` +
  ` STORED order and are counted as in-order here whatever that order is.`);
console.log("  scripts/oneoff/probe-waypoint-order-coverage.mjs measures what is sitting in that gap.");
if (outDup.length) { console.log("\nduplicates:"); outDup.forEach(o => console.log(` ${o.id} — ${o.name}: ${o.was} → ${o.now} [${o.types}]`)); }
if (outOrder.length) { console.log("\nreordered:"); outOrder.forEach(o => console.log(` ${o.id} — ${o.name}\n    was: ${o.before}\n    now: ${o.after}`)); }
process.exit(0);
