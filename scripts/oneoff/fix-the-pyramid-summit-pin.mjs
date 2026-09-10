// `audit:summit-pins` section 1 — a route's SUMMIT pin and its peak's own `areas` row disagreeing
// while stating the same elevation — has two survivors in WA, and only one is decidable.
//
// THE PYRAMID (Southern Pickets). The two records are 479 m apart and both state 7,920 ft, and
// the ground separates them by 1,275 ft:
//
//   areas row  48.77144,-121.29193   ground 7,984 ft   a LOCAL MAXIMUM      64 ft from the stated 7,920
//   route pin  48.768,-121.288       ground 6,709 ft   NOT a maximum, 4 of 8 ring neighbours higher
//
// The pin is also the ONLY three-decimal coordinate on a route whose other six pins carry five or
// six — the coarse-coordinate fingerprint this repo records for "the eight 3-decimal Picket
// summits", which `audit:waypoints`' COORD_DP gate was kept for.
//
// REYNOLDS PEAK IS THE OTHER ONE AND IS DELIBERATELY LEFT. Its two records are 340 m apart and
// BOTH are local maxima, 194 ft apart on the ground — under the 250 ft bar this family uses,
// which is `audit:waypoint-elevations`' own FLOOR_FT for "inside the 3DEP grid's noise". Its pin
// is named "Reynolds Peak (true/south summit)", which is what a genuine two-summit peak looks
// like. A verdict there would be the instrument reading its own noise.
//
// DECLARE A WINNER, NEVER A COORDINATE: the surviving latitude and longitude are read off the
// `areas` row at run time. There is no third route on this peak to act as a donor, so the two
// records ARE the pin and the area row, and copying one onto the other is the whole move.
// The stated elevation is untouched — both records already say 7,920 ft.
//
// AND IT CARRIES THE SKETCHED LINE, because #1660 did not and cost four routes a stranded vertex:
// 203 of 578 WA routes with a track store a line drawn THROUGH their own waypoints, so a pin that
// moves without its vertex leaves the line running to a place no pin occupies. Checked here
// before writing, not afterwards.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { summitProbe } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const AREA = "wa_the_pyramid_picket";
const ROUTE = "wa_the_pyramid_picket_south_route";
const PIN = "The Pyramid";
const WAS = { lat: 48.768, lng: -121.288 };
const AREA_AT = { lat: 48.77144, lng: -121.29193 };
const MIN_DROP_FT = 250;
const DONOR_TOL_FT = 200;

const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const KEY = APPLY ? requireServiceKey() : anonKey();
const ar = await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${AREA}&select=id,name,lat,lng,elevation_ft`, { headers: headers(KEY) });
const area = (await ar.json())[0];
const rr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ROUTE}&select=id,area_id,waypoints,gpx`, { headers: headers(KEY) });
const route = (await rr.json())[0];
if (!area || !route) { console.error("REFUSED - a declared row is missing"); process.exit(1); }

const refusals = [];
const aLat = num(area.lat), aLng = num(area.lng), aFt = num(area.elevation_ft);
if (!near(aLat, AREA_AT.lat) || !near(aLng, AREA_AT.lng)) refusals.push(`${AREA}: the area row has moved (now ${aLat},${aLng})`);
if (route.area_id !== AREA) refusals.push(`${ROUTE}: filed on ${route.area_id}`);
const wps = Array.isArray(route.waypoints) ? route.waypoints : null;
if (!wps) refusals.push(`${ROUTE}: waypoints is not an array`);
const hits = (wps || []).map((w, i) => ({ w, i })).filter(({ w }) => String((w || {}).name || "").trim() === PIN && /summit|topout/i.test(String((w || {}).type || "")));
if (hits.length !== 1) refusals.push(`${ROUTE}: expected exactly 1 summit pin named "${PIN}", found ${hits.length}`);
const p = hits[0];
if (p && (!near(num(p.w.lat), WAS.lat) || !near(num(p.w.lng), WAS.lng))) {
  refusals.push(`${ROUTE}: pin has moved (now ${num(p.w.lat)},${num(p.w.lng)}) — already repaired, or a different fix has run`);
}
if (p && num(p.w.elev) !== aFt) refusals.push(`${ROUTE}: the pin states ${p.w.elev} ft and the area ${aFt} — this repair is for two records that AGREE on the elevation`);
if (refusals.length) { console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  ")); process.exit(1); }

/* Re-measured, not quoted from the header. A reading that cannot be obtained REFUSES. */
const gA = await summitProbe(aLat, aLng, 12);
const gP = await summitProbe(WAS.lat, WAS.lng, 12);
if (gA.centre == null || gP.centre == null) {
  console.error(`REFUSED - the ground could not be read (${gA.note} / ${gP.note}). 3DEP goes unavailable under load; re-run rather than weakening the gate.`);
  process.exit(1);
}
console.log(`\n${area.name} states ${aFt} ft`);
console.log(`  areas row  ${aLat},${aLng}   ground ${Math.round(gA.centre)} ft   ${gA.note}`);
console.log(`  route pin  ${WAS.lat},${WAS.lng}   ground ${Math.round(gP.centre)} ft   ${gP.note}`);
console.log(`  the ground separates them by ${Math.round(gA.centre - gP.centre)} ft; the pin moves ${Math.round(D(WAS.lat, WAS.lng, aLat, aLng))} m`);
if (!(gA.centre >= aFt - DONOR_TOL_FT)) { console.error(`REFUSED - the area row stands on ${Math.round(gA.centre)} ft against a stated ${aFt}; it is not the summit either.`); process.exit(1); }
if (!(gA.centre - gP.centre >= MIN_DROP_FT)) { console.error(`REFUSED - the ground separates them by only ${Math.round(gA.centre - gP.centre)} ft.`); process.exit(1); }
if (gP.isMax === true) { console.error(`REFUSED - the pin is a LOCAL MAXIMUM on the ground, which is what a summit looks like.`); process.exit(1); }
if (gA.isMax !== true) { console.error(`REFUSED - the area row is not a local maximum either, so this is not a two-record question with a winner.`); process.exit(1); }

/* CARRY THE SKETCHED LINE. */
const pts = Array.isArray(route.gpx) ? route.gpx : null;
let nextGpx = null, moved = 0;
if (pts && pts.length) {
  nextGpx = pts.map((q) => {
    const la = Array.isArray(q) ? q[0] : q.lat, ln = Array.isArray(q) ? q[1] : (q.lng != null ? q.lng : q.lon);
    if (la == null || ln == null) return q;
    if (D(Number(la), Number(ln), WAS.lat, WAS.lng) > 1) return q;
    moved++;
    return Array.isArray(q) ? [aLat, aLng, ...q.slice(2)] : Object.assign({}, q, { lat: aLat, ...(q.lng != null ? { lng: aLng } : { lon: aLng }) });
  });
  console.log(`  the line has ${pts.length} vertex/vertices; ${moved} sat on the old pin and move with it`);
} else {
  console.log(`  no line stored — nothing to carry`);
}

const nextWps = wps.slice();
nextWps[p.i] = Object.assign({}, p.w, { lat: aLat, lng: aLng });
console.log(`\nNOT touched: Reynolds Peak — both its records are local maxima 194 ft apart, under the 250 ft bar.`);
if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

await patchRow("routes", ROUTE, nextGpx ? { waypoints: nextWps, gpx: nextGpx } : { waypoints: nextWps });
const v = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ROUTE}&select=id,waypoints,gpx`, { headers: headers(KEY) });
const after = (await v.json())[0];
const ap = (after.waypoints || []).find((w) => String((w || {}).name || "").trim() === PIN);
let bad = 0;
if (!ap) { console.error(`PIN LOST`); bad++; }
else {
  if (!(D(num(ap.lat), num(ap.lng), aLat, aLng) < 1)) { console.error(`NOT APPLIED: still ${Math.round(D(num(ap.lat), num(ap.lng), aLat, aLng))} m away`); bad++; }
  if (num(ap.elev) !== aFt) { console.error(`ELEVATION CHANGED: now ${ap.elev}, expected ${aFt}`); bad++; }
}
if ((after.waypoints || []).length !== wps.length) { console.error(`WAYPOINTS LOST: had ${wps.length}, now ${(after.waypoints || []).length}`); bad++; }
if (pts && (after.gpx || []).length !== pts.length) { console.error(`VERTICES LOST: had ${pts.length}, now ${(after.gpx || []).length}`); bad++; }
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: the pin sits on the area row, its elevation is unchanged, and no waypoint or vertex was lost.`);
process.exit(bad ? 1 : 0);
