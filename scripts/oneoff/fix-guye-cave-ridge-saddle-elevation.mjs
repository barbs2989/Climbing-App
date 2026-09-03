// Two routes on Guye Peak record the same col 200 ft apart, and the ground settles it.
//
// wa_guye_peak_r1's "Guye Peak-Cave Ridge saddle" waypoint stores 4,400 ft. Three records disagree:
//   - USGS 3DEP reads 4,616 ft at that waypoint's OWN coordinate, and 4,630 ft on the crest 20 m north
//     (queried directly this session, not taken from a report);
//   - the sibling wa_guye_peak_r2 stores 4,600 ft for the same col;
//   - and r2's own approach prose says "reported around 4,500-4,600 ft".
// Only r1 says 4,400, and it is 216 ft below the ground its own pin sits on.
//
// UNUSUALLY CLEAN FOR AN ELEVATION DISPUTE, which is why it is repaired rather than reported. The
// coordinate is not in question — the pin is 20 m from the measured low point of the crest. A saddle
// is the one landform whose DEM reading is unambiguous: it is a local minimum along a ridge, so
// there is no cliff-vs-smoothed-raster argument of the kind that makes a face pin arguable.
//
// THE VALUE WRITTEN IS THE SIBLING'S, NOT THE DEM'S, and that is deliberate. 4,600 is a figure the
// catalog already holds for this col, published-looking and corroborated by the ground to 17 ft;
// 4,616.4 is a raster sample. Copying a donor keeps this script's rule that a repair may not type a
// number nobody recorded — the same discipline as the trailhead and consensus-pin repairs.
//
// Both premises are re-asserted against the live rows at apply time: r1 must still store 4,400 and r2
// must still store 4,600. If either has moved, this refuses rather than writing.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_guye_peak_r1";
const DONOR = "wa_guye_peak_r2";
const SADDLE = /cave ridge/i;
const FROM = 4400, TO = 4600;
const DEM_AT_PIN = 4616;   // measured this session at the target waypoint's own coordinate

const rows = await selectAll("routes", "id,waypoints", "id=like.wa_guye_peak%2A", { pageSize: 1000 });
const R = new Map(rows.map(r => [r.id, r]));
const t = R.get(TARGET), d = R.get(DONOR);
if (!t || !d) { console.error("target or donor row not found — refusing"); process.exit(1); }

const elev = w => { const v = w.elev ?? w.elevFt ?? w.elev_ft; return Number.isFinite(+v) ? +v : null; };
const tw = (t.waypoints || []).findIndex(w => SADDLE.test(w.name || ""));
const dw = (d.waypoints || []).find(w => SADDLE.test(w.name || ""));
if (tw < 0) { console.error(`${TARGET} has no Cave Ridge saddle waypoint — refusing`); process.exit(1); }
if (!dw) { console.error(`${DONOR} has no Cave Ridge saddle waypoint to donate from — refusing`); process.exit(1); }

const cur = elev(t.waypoints[tw]), don = elev(dw);
console.log(`target ${TARGET}: "${t.waypoints[tw].name}" elev ${cur} at ${t.waypoints[tw].lat},${t.waypoints[tw].lng}`);
console.log(`donor  ${DONOR}: "${dw.name}" elev ${don}`);
console.log(`ground under the target pin (USGS 3DEP, measured this session): ${DEM_AT_PIN} ft`);

if (cur !== FROM) { console.log(`\nnothing to do — the target no longer stores ${FROM}.`); process.exit(0); }
if (don !== TO) { console.error(`\nthe donor no longer stores ${TO} — the premise has moved, refusing`); process.exit(1); }
if (Math.abs(don - DEM_AT_PIN) > 50) { console.error(`\nthe donor value no longer matches the measured ground — refusing`); process.exit(1); }

console.log(`\n  ${TARGET} waypoint[${tw}] elev ${cur} -> ${TO}   (the donor's value; the ground says ${DEM_AT_PIN})`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const wps = t.waypoints.map((w, i) => i !== tw ? w : { ...w, ...(w.elev != null ? { elev: TO } : {}), ...(w.elevFt != null ? { elevFt: TO } : {}) });
await patchRow("routes", TARGET, { waypoints: wps });
const after = (await selectAll("routes", "id,waypoints", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
const now = elev((after.waypoints || [])[tw] || {});
console.log(now === TO ? `verified: ${TARGET}'s saddle now reads ${now} ft` : `NOT APPLIED — reads ${now}`);
