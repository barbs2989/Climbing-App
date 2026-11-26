// Does every climb on a named tick-list have a FULL route page, or a thin one?
//
// audit:list-coverage answers "can each list entry be ticked" (an area exists and a route sits on
// it). This asks the next question: once a climber opens that route, is the page worth reading?
// A Bulger whose only route has no approach, no descent and no gain is a tick-list objective
// nobody can plan from.
//
// Read-only. Rosters come from lib/lists.js (the module the Challenges screen reads), so the set
// measured here is the set the screen lists. For a PEAK list the page is the peak's FULLEST route
// (its standard route, in practice): a peak with one full page and three thin variations is not a
// gap. The Fifty Classics is a ROUTE list, so each of its routes is measured on its own.
//
//   node scripts/audit-list-pages.mjs              # summary per list, then each thin page
//   node scripts/audit-list-pages.mjs --json out.json   # the per-page rows for a research worklist
//   node scripts/audit-list-pages.mjs --list bulgers    # one list
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "./lib/supabase-env.mjs";
import { PEAK_ROSTERS, FIFTY_CLASSICS } from "../lib/lists.js";

const args = process.argv.slice(2);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const only = args.includes("--list") ? args[args.indexOf("--list") + 1] : null;
const key = requireServiceKey();

// The sections a mountain route page is planned from, and what counts as present. Text floors are
// "says something a party can act on", not word counts to hit: a one-line descent ("descend the
// route") is the thin case the owner's notes keep naming.
const len = v => (typeof v === "string" ? v.trim().length : 0);
const arr = v => (Array.isArray(v) ? v.length : 0);
const wpTypes = r => new Set((Array.isArray(r.waypoints) ? r.waypoints : []).map(w => String((w && (w.type || w.kind)) || "").toLowerCase()));
const FIELDS = {
  description: r => len(r.description) >= 200 || len(r.overview) >= 200,
  approach: r => len(r.approach) >= 150 || arr(r.approach_variants) > 0,
  descent: r => len(r.descent_text) >= 100 || len(r.descent) >= 100,
  // The page draws gain and distance from a recorded track or the pins' own leg distances when the
  // columns are empty (TRIP PROFILE), so those count as present.
  gain: r => r.gain_ft > 0 || arr(r.elev_pts) > 10,
  distance: r => Number(r.dist_km) > 0 || arr(r.gpx) > 10 || (Array.isArray(r.waypoints) && r.waypoints.some(w => w && Number(w.distMi) > 0)),
  season: r => len(r.season) > 0 || len(r.best_season) > 0,
  hazards: r => arr(r.hazards) > 0 || (r.obj_haz && Object.keys(r.obj_haz).length > 0),
  gear: r => arr(r.rack_items) > 0 || len(r.detailed_rack) > 0 || arr(r.what_to_bring) > 0 || (r.gear && Object.keys(r.gear).length > 0) || arr(r.rack) > 0,
  trailhead: r => { const t = wpTypes(r); return [...t].some(x => x.includes("trailhead") || x === "th" || x.includes("parking")); },
  summit_pin: r => wpTypes(r).has("summit"),
};
const SEL = "id,area_id,name,grade,discipline,description,overview,approach,approach_variants,descent,descent_text,gain_ft,dist_km,season,best_season,hazards,obj_haz,rack_items,detailed_rack,what_to_bring,gear,rack,waypoints,gpx,elev_pts";

async function read(col, ids) {
  const out = [];
  const all = [...ids];
  for (let i = 0; i < all.length; i += 40) {
    const q = `${SUPABASE_URL}/rest/v1/routes?select=${SEL}&${col}=in.(${all.slice(i, i + 40).map(encodeURIComponent).join(",")})`;
    const t0 = Date.now();
    const r = await fetch(q, { headers: headers(key) });
    if (!r.ok) { console.error(`FAIL: routes read ${r.status} ${(await r.text()).slice(0, 160)}`); process.exit(1); }
    out.push(...(await r.json()));
    if (Date.now() - t0 > 10000) { console.error("database slow (>10 s for one page) — stopping rather than pressing it"); process.exit(2); }
    await new Promise(res => setTimeout(res, 250));
  }
  return out;
}

const score = r => Object.values(FIELDS).filter(f => f(r)).length;
const missing = r => Object.entries(FIELDS).filter(([, f]) => !f(r)).map(([k]) => k);
const pages = [];

for (const [k, roster] of Object.entries(PEAK_ROSTERS)) {
  if (only && only !== k) continue;
  const ids = new Set(); for (const p of roster) { ids.add(p.id); for (const a of p.also || []) ids.add(a); }
  const rows = await read("area_id", ids);
  for (const p of roster) {
    const mine = rows.filter(r => r.area_id === p.id || (p.also || []).includes(r.area_id));
    // The page a peak-bagger opens is a way to the SUMMIT, so a walk-up, scramble or alpine line
    // outranks an ice route in a gulch below it (Quandary's McCullough Gulch ice), then fullness.
    const summitish = r => /^(scrambling|mountaineering|alpine|hiking|snow)$/.test(String(r.discipline || "")) ? 1 : 0;
    const best = mine.slice().sort((a, b) => summitish(b) - summitish(a) || score(b) - score(a))[0];
    pages.push({ list: k, peak: p.name, peakId: p.id, routes: mine.length, route: best ? best.id : null, routeName: best ? best.name : null, missing: best ? missing(best) : ["NO ROUTE"] });
  }
}
if (!only || only === "fifty") {
  const live = FIFTY_CLASSICS.filter(e => e.id && !e.closed);
  const rows = await read("id", live.map(e => e.id));
  for (const e of live) {
    const r = rows.find(x => x.id === e.id);
    pages.push({ list: "fifty", peak: e.peak, peakId: r ? r.area_id : null, routes: r ? 1 : 0, route: e.id, routeName: e.route, missing: r ? missing(r) : ["NO ROUTE"] });
  }
}

const NF = Object.keys(FIELDS).length;
console.log(`=== list route pages: ${pages.length} entries, ${NF} sections each ===\n`);
console.log("list".padEnd(10) + "entries".padEnd(9) + "full".padEnd(6) + "thin".padEnd(6) + "no route  most-missed sections");
for (const k of [...new Set(pages.map(p => p.list))]) {
  const P = pages.filter(p => p.list === k);
  const full = P.filter(p => !p.missing.length).length, none = P.filter(p => p.missing[0] === "NO ROUTE").length;
  const tally = {}; for (const p of P) for (const m of p.missing) if (m !== "NO ROUTE") tally[m] = (tally[m] || 0) + 1;
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m, n]) => `${m} ${n}`).join(", ");
  console.log(k.padEnd(10) + String(P.length).padEnd(9) + String(full).padEnd(6) + String(P.length - full - none).padEnd(6) + String(none).padEnd(10) + top);
}
const thin = pages.filter(p => p.missing.length);
console.log(`\n${thin.length} of ${pages.length} list pages are missing at least one section.`);
if (!jsonOut) for (const p of thin) console.log(`  ${p.list.padEnd(8)} ${p.peak} — ${p.route || "-"}: ${p.missing.join(", ")}`);
if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(pages, null, 1)); console.log(`wrote ${jsonOut}`); }
