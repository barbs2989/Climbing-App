// Move a route's recorded track to the way in it was recorded on. Found 2026-11-23 by a read-only census of
// the 287 routes that store a track and ways in: on four, the track starts at one way in's trailhead
// (16-131 m from its pin), but that way in carries no track of its own, so the page either drops the
// recording (North Star, whose default way in is the one it belongs to) or draws it under the OTHER way in,
// among pins 4.7-14 km away.
//
//   wa_north_star_mountain_east_route   Phelps Creek recording; row pins are the Holden / Lyman Lakes way in
//   wa_switchback_mountain_scramble     Crater Creek recording; shown under Foggy Dew Creek
//   wa_cannon_mountain_south_slopes     Stuart Lake / Cannon Creek recording; shown under Snow Lakes
//   wa_blackcap_mountain_scramble       Monument Creek recording; shown under Shellrock Basin
//
// The track and its elevations are written, unchanged, into that way in's `trip` as gpxPts / elevPts (the
// shape wa_mount_logan_r1's Thunder Creek way in already uses, and lib/approaches.js APPROACH_OWNED_KEYS
// reads), and the row's own gpx / elev_pts are cleared, since the stored way in was not where it was walked.
// Owner-approved 2026-11-23 ("move the four tracks").
//
// The dry run replays the page: applyApproach + withRecordedTrackOnly under every way in, and says which
// way in draws the track before and after. A row is skipped unless that comes out as intended.
//
//   node scripts/oneoff/move-tracks-to-their-way-in.mjs                         # dry run
//   node scripts/oneoff/move-tracks-to-their-way-in.mjs --write --rollback DIR  # rollback file in DIR, patch, re-read
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { metresBetween, pointOf, withRecordedTrackOnly } from "../../lib/track.js";
import { approachKeyOf, applyApproach } from "../../lib/approaches.js";

const WRITE = process.argv.includes("--write");
const RB = process.argv.includes("--rollback") ? process.argv[process.argv.indexOf("--rollback") + 1] : null;
if (WRITE && !RB) { console.error("--write needs --rollback DIR (a folder outside git: the before-state holds whole tracks)"); process.exit(2); }
const TARGETS = {
  wa_north_star_mountain_east_route: "phelps-creek-over-spider-gap",
  wa_switchback_mountain_scramble: "crater-creek-and-the-eagle-lakes-side",
  wa_cannon_mountain_south_slopes: "stuart-lake-trailhead-and-the-cannon-creek-basin-the-shorter-rougher-side",
  wa_blackcap_mountain_scramble: "monument-creek-and-the-monument-blackcap-basin",
};
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k), signal: AbortSignal.timeout(30000) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const varsOf = av => (Array.isArray(av) ? av : av && Array.isArray(av.variants) ? av.variants : null);

// Which ways in draw a track on the page, given a row's columns? (the camel fields applyApproach reads)
function drawnUnder(row) {
  const vars = varsOf(row.approach_variants);
  const route = { waypoints: row.waypoints, gpxPts: row.gpx, elevPts: row.elev_pts, bivy: [], approach: row.approach };
  return vars.map((v, i) => {
    const key = approachKeyOf(v, i);
    const stored = !v.viaRouteId && !(v.trip && typeof v.trip === "object");
    const out = withRecordedTrackOnly(applyApproach(route, { key, variant: v, stored }, null));
    const n = Array.isArray(out.gpxPts) ? out.gpxPts.length : 0;
    const aligned = n > 1 && Array.isArray(out.elevPts) && out.elevPts.length === n;
    return { key, drawn: n > 1, profile: aligned };
  });
}

const plan = [];
for (const [id, key] of Object.entries(TARGETS)) {
  await sleep(1000);
  const r = (await get(`routes?select=id,name,gpx,elev_pts,waypoints,approach,approach_variants&id=eq.${id}`))[0];
  if (!r) { console.log(`${id}: NOT FOUND, skipped`); continue; }
  const vars = varsOf(r.approach_variants);
  const vi = vars ? vars.findIndex((v, i) => approachKeyOf(v, i) === key) : -1;
  if (vi < 0) { console.log(`${id}: no way in "${key}" now, skipped`); continue; }
  const v = vars[vi];
  if (!v.trip || typeof v.trip !== "object") { console.log(`${id}: "${key}" is not a trip way in, skipped`); continue; }
  if (Array.isArray(v.trip.gpxPts) && v.trip.gpxPts.length) { console.log(`${id}: "${key}" already carries a track, skipped`); continue; }
  if (!Array.isArray(r.gpx) || r.gpx.length < 2 || !Array.isArray(r.elev_pts) || r.elev_pts.length !== r.gpx.length) { console.log(`${id}: no track with matching elevations on the row now, skipped`); continue; }
  // The track must still start (or end) at THIS way in's trailhead.
  const al = v.trip.approachLogistics || {};
  const thW = Array.isArray(v.trip.waypoints) ? v.trip.waypoints.find(w => /trailhead/i.test(String(w.type || ""))) : null;
  const th = thW ? pointOf(thW) : al.trailheadLat != null ? { lat: al.trailheadLat, lng: al.trailheadLng } : null;
  const g = r.gpx.map(pointOf);
  const d = th ? Math.min(metresBetween(th, g[0]), metresBetween(th, g[g.length - 1])) : Infinity;
  if (!(d < 300)) { console.log(`${id}: the track does not start at "${key}"'s trailhead (${Math.round(d)} m), skipped`); continue; }

  const newVars = vars.map((x, i) => (i === vi ? { ...x, trip: { ...x.trip, gpxPts: r.gpx, elevPts: r.elev_pts } } : x));
  const newAv = Array.isArray(r.approach_variants) ? newVars : { ...r.approach_variants, variants: newVars };
  const before = drawnUnder(r), after = drawnUnder({ ...r, gpx: null, elev_pts: null, approach_variants: newAv });
  const fmt = a => a.map(x => `${x.key.slice(0, 28)}:${x.drawn ? (x.profile ? "track+profile" : "track") : "-"}`).join("  ");
  const ok = after.every(x => (x.key === key ? x.drawn && x.profile : !x.drawn));
  console.log(`${id} (${r.name}): track starts ${Math.round(d)} m from "${key}"'s trailhead, ${r.gpx.length} points\n   before  ${fmt(before)}\n   after   ${fmt(after)}${ok ? "" : "\n   -> NOT as intended, skipped"}`);
  if (!ok) continue;
  plan.push({ id, before: { gpx: r.gpx, elev_pts: r.elev_pts, approach_variants: r.approach_variants }, after: { gpx: null, elev_pts: null, approach_variants: newAv } });
}
if (!WRITE) { console.log(`\ndry run: ${plan.length} row(s) would change. --write --rollback DIR to apply.`); process.exit(0); }
fs.mkdirSync(RB, { recursive: true });
const rbFile = path.join(RB, "rollback-move-tracks-to-their-way-in.json");
fs.writeFileSync(rbFile, JSON.stringify({ note: "gpx, elev_pts and approach_variants before move-tracks-to-their-way-in.mjs; restore with patchRow('routes', id, before)", at: new Date().toISOString(), rows: plan.map(p => ({ id: p.id, before: p.before })) }));
for (const p of plan) { await patchRow("routes", p.id, p.after); await sleep(1000); }
const back = await get(`routes?select=id,gpx,elev_pts,approach_variants&id=in.(${plan.map(p => p.id).join(",")})`);
// jsonb stores object keys in its own order, so compare with keys sorted: a plain JSON.stringify comparison
// reported all four "NOT AS WRITTEN" on the run of 2026-11-23 although every row was exactly as written.
const canon = x => JSON.stringify(x, (key, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(kk => [kk, v[kk]])) : v));
let bad = 0;
for (const p of plan) {
  const b = back.find(x => x.id === p.id);
  const same = b && b.gpx === null && b.elev_pts === null && canon(b.approach_variants) === canon(p.after.approach_variants);
  if (!same) { bad++; console.log(`  NOT AS WRITTEN: ${p.id}`); }
}
console.log(`\n${plan.length - bad} of ${plan.length} written and re-read. Rollback: ${rbFile}`);
process.exit(bad ? 1 : 0);
