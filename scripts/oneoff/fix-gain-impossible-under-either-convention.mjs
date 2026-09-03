// A gain figure no reading of the column can make true, on a peak where eleven siblings agree.
//
// wa_liberty_bell_serpentine_crack stores gain_ft 918. Its own two pins are the Blue Lake Trailhead at
// 5,200 ft and the Liberty Bell summit at 7,720 ft, so a party doing this route gains 2,520 ft, and its
// own loss_ft says 2,400. Eleven other Liberty Bell rows sharing those exact pins store 2,400-2,546.
// gain_ft drives scarfHrs, so the planner was costing this route's walk at roughly a third of its real
// height and reporting an Est. summit and Est. return to match.
//
// THE COLUMN HOLDS TWO CONVENTIONS AND THIS IS WRONG UNDER BOTH, which is what makes it settleable
// without choosing between them. CLAUDE.md records that gain_ft is sometimes the whole trailhead-to-
// summit rise and sometimes the APPROACH gain alone, with the climbing vertical accounted separately —
// check:gain-floor-stated credits pitches x 35 m before judging. Run both readings:
//     whole outing   2,520 ft   (the row's own pins)
//     approach only  2,061 ft   (2,520 minus 4 pitches x 35 m = 459 ft)
// 918 is below both, by more than the 300 ft slack audit:gain uses. There is no reading of the column
// under which it can be right.
//
// TWO SIBLINGS WERE CHECKED AND ARE NOT DEFECTS, and finding that out is what stopped this being a
// three-row sweep:
//   wa_liberty_bell_thin_red_line stores 1,312 against an approach-only floor of 2,520 - (11 x 35 m) =
//     1,257 ft. It CLEARS that floor, so 1,312 is a plausible approach gain and the row is simply using
//     the other convention. Left alone.
//   wa_liberty_traverse stores 2,001, which equals its length_m (610 m) and the sum of its
//     pitch_detail lengths EXACTLY — the "gain_ft holds the CLIMB's height" case CLAUDE.md names by
//     this route's own id. Left alone.
// A sweep on "gain is far below the pins' rise" would have rewritten both.
//
// THE VALUE IS THE ROW'S OWN loss_ft, not a number I chose. On an outing that returns to its start the
// two must be equal, and 2,400 is independently what two siblings store for gain on the same pins. The
// script reads it off the row at apply time and refuses if it stops being corroborated.
//
// The direction is also the conservative one: raising gain makes scarfHrs return MORE time, so Est.
// summit and Est. return move later and the after-dark warning becomes more likely rather than less.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_liberty_bell_serpentine_crack";
const SLACK = 300;                       // audit:gain's own tolerance
const el = w => { const e = Number(w.elev ?? w.elevFt); return Number.isFinite(e) && e > 0 ? e : null; };
const isT = (w, re) => re.test(String(w.type || "")) || re.test(String(w.name || ""));

const r = (await selectAll("routes", "id,area_id,gain_ft,loss_ft,pitches,length_m,pitch_detail,waypoints", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }

const wps = r.waypoints || [];
const th = wps.filter(w => isT(w, /trailhead/i)).map(el).filter(Boolean);
const su = wps.filter(w => isT(w, /summit/i)).map(el).filter(Boolean);
if (!th.length || !su.length) { console.error("the row no longer carries both a trailhead and a summit pin — refusing"); process.exit(1); }
const rise = Math.max(...su) - Math.min(...th);
const climbFt = Number(r.pitches) > 0 ? Number(r.pitches) * 35 * 3.28084 : 0;
const approachFloor = rise - climbFt;
const gain = Number(r.gain_ft), loss = Number(r.loss_ft);

console.log(`pins: trailhead ${Math.min(...th)} ft, summit ${Math.max(...su)} ft  ->  rise ${Math.round(rise)} ft`);
console.log(`climbing vertical credited: ${Math.round(climbFt)} ft (${r.pitches} pitches x 35 m)`);
console.log(`  whole-outing floor : ${Math.round(rise)} ft`);
console.log(`  approach-only floor: ${Math.round(approachFloor)} ft`);
console.log(`stored gain_ft ${gain}   stored loss_ft ${loss}`);

if (!Number.isFinite(gain)) { console.error("no gain_ft — refusing"); process.exit(1); }
if (gain >= approachFloor - SLACK) { console.log("\nnothing to do — the stored gain clears the approach-only floor, so it is a valid reading."); process.exit(0); }
// it must not BE the climb's height under any measure — that is a different, legitimate convention
const pdFt = Array.isArray(r.pitch_detail) ? r.pitch_detail.reduce((a, d) => a + (Number(d && d.lengthM) || 0), 0) * 3.28084 : 0;
const lenFt = Number(r.length_m) ? Number(r.length_m) * 3.28084 : 0;
for (const [what, v] of [["length_m", lenFt], ["pitches x 35 m", climbFt], ["sum(pitch_detail)", pdFt]]) {
  if (v > 0 && Math.abs(gain - v) / v <= 0.03) { console.error(`REFUSING: gain_ft is within 3% of ${what} (${Math.round(v)} ft) — this row is storing the CLIMB's height, a different convention`); process.exit(1); }
}
if (!Number.isFinite(loss) || loss <= 0) { console.error("no loss_ft to donate a value — refusing"); process.exit(1); }
if (Math.abs(loss - rise) > SLACK * 2) { console.error(`REFUSING: loss_ft ${loss} is not close to the pins' rise ${Math.round(rise)} — it is not a sound donor`); process.exit(1); }

// corroboration: a sibling on the same area storing that same figure as its GAIN
const sibs = await selectAll("routes", "id,area_id,gain_ft", `area_id=eq.${r.area_id}`, { pageSize: 100 });
const agree = sibs.filter(s => s.id !== TARGET && Math.abs(Number(s.gain_ft) - loss) <= 1).map(s => s.id);
console.log(`\nsiblings on this area storing ${loss} as their own gain_ft: ${agree.length}${agree.length ? " — " + agree.slice(0, 3).join(", ") : ""}`);
if (!agree.length) { console.error("REFUSING: no sibling corroborates that figure"); process.exit(1); }

console.log(`\n  ${TARGET}.gain_ft   ${gain}  ->  ${loss}   (the row's own loss_ft)`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { gain_ft: loss });
const a = (await selectAll("routes", "id,gain_ft,loss_ft", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
console.log(Number(a.gain_ft) === loss
  ? `verified: gain_ft is now ${a.gain_ft}, matching this row's own loss_ft and clearing the rise its own pins demand`
  : `NOT APPLIED — reads ${a.gain_ft}`);
