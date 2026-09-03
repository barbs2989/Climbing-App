// Finishing a repair I half-made: the loss now matched the gain, and the gain was the wrong outing's.
//
// fix-outback-loss-equals-gain.mjs set wa_horseshoe_peak_scramble's loss_ft to its gain_ft of 4,200 on
// a sound invariant — a party returning to where it started descends what it climbed, and this route's
// own 496-point track is closed to 10 m. Its header said plainly that it asserts the INVARIANT and not
// that gain_ft is accurate, and "loss inherits whatever gain is". A research pass then checked exactly
// that and found gain_ft is not accurate: 4,200 ft sits BELOW the route's own trailhead-to-summit rise
// of 4,821 ft (Cascade Pass Trailhead pin 3,660 -> Horseshoe Peak pin 8,481), which no party starting
// at the trailhead can achieve. So both figures were consistent and both were low.
//
// THE APP ALREADY SAYS SO, and that is worth stating because it bounds the harm: gainBelowOwnPins fires
// here (4,821 rise, minus 115 ft of climbing credit for the row's single pitch, against a stored
// 4,200), so the route page already carries the caveat that its times rest on a gain the route's own
// pins contradict. This repair removes the need for it rather than papering over it.
//
// THREE RECORDS INSIDE AND AROUND THE ROW AGREE ON ~5,900, and none is this script's invention:
//   - the row's own itinerary day gains, 4,000 + 1,900 = 5,900, with a totalNote describing exactly
//     that two-day shape;
//   - a USGS 3DEP profile along the row's own gpx, return half only so the Buckner spur is excluded,
//     measured at 5,788-5,826 ft;
//   - the row's own approach text, which climbs to Sahale Glacier Camp at ~3,940 ft, drops into
//     Horseshoe Basin near 6,600 and regains the 8,480 ft summit.
// 4,200 is the Cascade Pass / Sahale Arm DAY HIKE's figure — WTA gives that hike as 12.0 mi round trip,
// 4,000 ft, high point 7,570 ft, and it never enters Horseshoe Basin. dist_km 9.5 is the same
// substitution and is left alone here: this script changes the two fields it can source from the row's
// own itinerary, and a distance repair wants its own evidence.
//
// THE DONOR IS THE ROW'S OWN ITINERARY, so nothing is typed. The script recomputes that sum at run
// time and refuses if it is not what it expects, if the result would still sit below the pin rise, or
// if either field has moved since.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_horseshoe_peak_scramble";
const FROM = 4200;

const rows = await selectAll("routes", "id,gain_ft,loss_ft,pitches,waypoints,itinerary", `id=eq.${TARGET}`, { pageSize: 10 });
const r = rows[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }
if (+r.gain_ft !== FROM || +r.loss_ft !== FROM) { console.log(`nothing to do — gain/loss are ${r.gain_ft}/${r.loss_ft}, not ${FROM}/${FROM}.`); process.exit(0); }

// the donor: the row's own itinerary day gains
const days = (r.itinerary && r.itinerary.days) || [];
const TO = days.reduce((s, d) => s + (+d.gainFt || 0), 0);
if (!days.length || !(TO > 0)) { console.error("the row's itinerary carries no day gains to donate — refusing"); process.exit(1); }

// the floor: the route's own pins, crediting the climbing the way gainBelowOwnPins does
const elev = w => { const v = w.elev ?? w.elevFt ?? w.elev_ft; return Number.isFinite(+v) ? +v : null; };
const wp = r.waypoints || [];
const th = wp.filter(w => /trailhead/i.test(w.type || "")).map(elev).filter(n => n !== null);
const su = wp.filter(w => /summit/i.test(w.type || "")).map(elev).filter(n => n !== null);
if (!th.length || !su.length) { console.error("no trailhead/summit pin elevations to check the floor against — refusing"); process.exit(1); }
const rise = Math.max(...su) - Math.min(...th);
const climb = (+r.pitches > 0 ? +r.pitches : 0) * 35 * 3.28084;
const floor = rise - climb;

console.log(`current gain_ft/loss_ft : ${r.gain_ft} / ${r.loss_ft}`);
console.log(`the row's own itinerary : ${days.map(d => d.gainFt).join(" + ")} = ${TO}`);
console.log(`rise between its own pins: ${rise} ft, less ${Math.round(climb)} ft of climbing credit -> floor ${Math.round(floor)} ft`);
if (TO <= floor) { console.error(`\nthe donor value ${TO} is still at or below the floor — refusing`); process.exit(1); }
if (TO <= FROM) { console.error(`\nthe donor value ${TO} is not greater than the stored ${FROM} — refusing`); process.exit(1); }

console.log(`\n  gain_ft ${FROM} -> ${TO}\n  loss_ft ${FROM} -> ${TO}   (closed track, so the two must agree)`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { gain_ft: TO, loss_ft: TO });
const a = (await selectAll("routes", "id,gain_ft,loss_ft", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
console.log(+a.gain_ft === TO && +a.loss_ft === TO
  ? `verified: ${TARGET} now stores ${TO} ft both ways, above its own ${Math.round(floor)} ft floor`
  : `NOT APPLIED — reads ${a.gain_ft}/${a.loss_ft}`);
