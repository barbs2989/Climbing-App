// A trailhead pin inherited the coordinate of the waypoint above it, and the right one is in the row.
//
// wa_inner_constance_standard's "Lake Constance Trailhead" pin sits 5 metres from its own "Dosewallips
// Road washout parking" pin, on ground the USGS DEM reads at 529 ft while the pin itself claims 1,425.
// The two are 5.8 road-miles apart: WTA describes driving 8.5 miles of the Dosewallips Road to the
// washout and then hiking or biking "the remaining 5+ miles" to the trailhead.
//
// THE CORRECT COORDINATE IS ALREADY IN THIS ROW, as gpx[0]: 47.7296, -123.1417. Three checks agree it
// is the trailhead — WTA publishes exactly 47.7296, -123.1417 for the Lake Constance trailhead; the DEM
// there reads 1,448 ft, within 24 ft of the pin's own stated 1,425; and it is the first point of the
// route's own track, which is where a track of this route starts.
//
// IT IS MOST, BUT NOT ALL, OF A MEASURED IMPOSSIBILITY — and that distinction is the honest part. From
// the stored position the chord to the next pin, "Creekside Camp Bench", is 5.76 km against a 1.61 km
// step of claimed trail. From the real trailhead it is 1.96 km, still 1.22x over. The residual belongs
// to that next pin, which is independently suspect: it carries 17 decimal places, the residue of
// interpolation, and sits on ground the DEM reads 1,338 ft above its own stated elevation. Two defects
// on one chain; repairing the trailhead does not excuse the other, and the script says so rather than
// letting a partial fix read as a complete one.
//
// NOTHING IS INVENTED AND NOTHING IS INTERPOLATED. The new coordinate is copied from the row's own
// gpx[0], the same donor discipline the trailhead and consensus-pin repairs use. That matters here
// especially: the tempting alternative — placing the pin along the track at its stated distMi — is
// exactly the fabrication that produced the 346 computed coordinates this catalog already carries, and
// CLAUDE.md forbids it by name.
//
// The elevation is left alone. It was never wrong: 1,425 ft is right for the trailhead and is what
// corroborates the move.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_inner_constance_standard";
const PIN = /lake constance trailhead/i;
const NEAR_M = 50;      // the pin must currently sit on top of another pin to qualify
const MOVE_MIN_M = 2000; // and the donor must be a long way off, or this is not the defect

const rad = x => x * Math.PI / 180;
const km = (a, b) => { const R = 6371, dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const pts = g => Array.isArray(g) ? g.map(p => Array.isArray(p) ? [+p[0], +p[1]] : [+(p.lat ?? p[0]), +(p.lng ?? p[1])]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];

const r = (await selectAll("routes", "id,waypoints,gpx", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }
const wps = r.waypoints || [];
const i = wps.findIndex(w => PIN.test(w.name || ""));
if (i < 0) { console.error("no Lake Constance Trailhead waypoint — refusing"); process.exit(1); }
const cur = [+wps[i].lat, +wps[i].lng];
if (!Number.isFinite(cur[0])) { console.error("the pin has no coordinate — refusing"); process.exit(1); }

const track = pts(r.gpx);
if (!track.length) { console.error("no gpx to donate from — refusing"); process.exit(1); }
const donor = track[0];

// premise 1: the pin currently sits on top of a DIFFERENT waypoint
let onTop = null;
wps.forEach((w, j) => {
  if (j === i || !Number.isFinite(+w.lat)) return;
  const d = km(cur, [+w.lat, +w.lng]) * 1000;
  if (d < NEAR_M) onTop = { name: w.name, d: Math.round(d) };
});
console.log(`stored pin : ${cur.map(v => v.toFixed(4)).join(",")}   elev ${wps[i].elev ?? wps[i].elevFt}`);
console.log(`gpx[0]     : ${donor.map(v => v.toFixed(4)).join(",")}`);
console.log(`sits on top of another waypoint: ${onTop ? `"${onTop.name}" at ${onTop.d} m` : "no"}`);
if (!onTop) { console.error("\nthe pin does not coincide with another waypoint — the premise is gone, refusing"); process.exit(1); }

// premise 2: the donor is far enough away that this is the defect, not noise
const move = km(cur, donor) * 1000;
console.log(`distance from the stored pin to gpx[0]: ${Math.round(move)} m`);
if (move < MOVE_MIN_M) { console.error("\nthe donor is too close to the stored pin to be this defect — refusing"); process.exit(1); }

// premise 3: the move must materially REDUCE the impossibility (see the note below on why not 'fix')
const next = wps[i + 1];
if (next && Number.isFinite(+next.lat) && Number.isFinite(+next.distMi) && Number.isFinite(+wps[i].distMi)) {
  const step = (+next.distMi - +wps[i].distMi) * 1.609344;
  const before = km(cur, [+next.lat, +next.lng]), after = km(donor, [+next.lat, +next.lng]);
  console.log(`\nnext pin "${next.name}" is ${step.toFixed(2)} km of claimed trail away`);
  console.log(`  chord from the stored pin : ${before.toFixed(2)} km  ${before > step ? "IMPOSSIBLE" : "ok"}`);
  console.log(`  chord from gpx[0]         : ${after.toFixed(2)} km  ${after > step ? "STILL IMPOSSIBLE" : "ok"}`);
  if (!(before > step)) { console.error("\nthe segment is not impossible as stored — the premise is gone, refusing"); process.exit(1); }
  // THE SEGMENT TEST IS CORROBORATION, NOT THE BASIS, and the first version of this gate demanded the
  // move FIX it outright — which refused a correct repair. The evidence for gpx[0] is external and
  // independent of the segment: WTA publishes 47.7296,-123.1417 for this trailhead, and the DEM there
  // reads 1,448 ft against the pin's own stated 1,425. The residual impossibility after the move
  // (1.96 km of chord against 1.61 km of trail) belongs to the NEXT pin, "Creekside Camp Bench", which
  // is independently suspect: it carries 17 decimal places and sits on ground the DEM reads 1,338 ft
  // above its own stated elevation. Two defects on one chain, and fixing one does not excuse the other.
  // So the gate requires a large improvement rather than a complete fix, and says what is left.
  if (after >= before) { console.error("\nthe move does not reduce the chord — refusing"); process.exit(1); }
  if (after > step) console.log(`  NOTE: still ${(after / step).toFixed(2)}x after the move — the residual belongs to "${next.name}", not to the trailhead`);
}

console.log(`\n  ${TARGET} waypoint[${i}] "${wps[i].name}"`);
console.log(`     ${cur.map(v => v.toFixed(6)).join(", ")}  ->  ${donor.map(v => v.toFixed(6)).join(", ")}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const next2 = wps.map((w, j) => j !== i ? w : { ...w, lat: donor[0], lng: donor[1] });
await patchRow("routes", TARGET, { waypoints: next2 });
const a = (await selectAll("routes", "id,waypoints", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
const now = (a.waypoints || [])[i];
console.log(Math.abs(+now.lat - donor[0]) < 1e-9 && Math.abs(+now.lng - donor[1]) < 1e-9
  ? "verified: the trailhead pin is now at the coordinate the route's own track starts from"
  : `NOT APPLIED — reads ${now.lat},${now.lng}`);
