// Forbidden Peak West Ridge: one rappel count, and the accident record in KNOWN HAZARDS.
//
// The row answered "how many rappels" three ways. rappel_detail listed 3 stations — two on the
// ridge and a 30 m snow rappel in the couloir — so the Overview tile and the table header said 3.
// `rappels` said "~5 single-rope raps via East Ledges/NE Face", which is a different descent, and
// rappel_count_note said "about 5 with one rope", so the Plan box said ~5-7. Nothing on the row
// described the Cat Scratch gullies, the rock line most parties actually rappel from the notch.
//
// Reported descents, single 60 m rope: about 3 rappels mixed with downclimbing on the ridge back to
// the notch, then 5 (one party 5-6, one 7) down the Cat Scratch chimneys to the snowfield below the
// south face. The table now lists those 8, and every prose field states the same 8, so every
// reader in lib/rappels.js and RouteDetail.jsx lands on one number.
//
// emergency.notes held a paragraph of fatal-accident history inside EMERGENCY & RESCUE, between
// the ranger station and the hospital. It is hazard information, so it moves into `hazards`,
// which the Safety tab's KNOWN HAZARDS box renders.
//
//   node scripts/oneoff/fix-forbidden-west-ridge-rappels.mjs --dry
//   node scripts/oneoff/fix-forbidden-west-ridge-rappels.mjs
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_forbidden_peak_west_ridge";
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=id,area_id,name,rappels,rappel_count_note,rappel_detail,descent,descent_text,hazards,emergency`, { headers: headers(key) });
const rows = await res.json();
if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`expected 1 row for ${ID}, got ${JSON.stringify(rows).slice(0, 200)}`);
const row = rows[0];
if (!/forbidden/i.test(row.area_id) || !/west ridge/i.test(row.name)) throw new Error(`row ${ID} is ${row.name} on ${row.area_id} — refusing`);

// Precondition: the row still holds the contradiction this script was written against.
if (!/East Ledges/.test(row.rappels || "") || (row.rappel_detail || []).length !== 3) {
  console.log("Row no longer matches the state this repair targets — nothing to do.");
  console.log({ rappels: row.rappels, stations: (row.rappel_detail || []).length });
  process.exit(DRY ? 0 : 1);
}
const accident = row.emergency && row.emergency.notes;
if (!accident || !/fatal accidents/.test(accident)) throw new Error("emergency.notes is not the accident paragraph — refusing");

const GULLY_RIB = "The rappel line follows fixed anchors on the small rib on the down-climber's left of the gullies. Parties that drift into the right-hand gully end up on loose ground with no stations, which is the descent error reported most often here.";
const SHORT = "Some stations are deliberately short and easy to rappel straight past. Do not skip an anchor because you cannot yet see the next one.";
const LOOSE = "Loose rock throughout. Rappel one at a time, and let each climber move out of the fall line before the next one pulls the rope.";

const rappel_detail = [
  { n: 1, lengthM: null,
    station: "On the crux tower at the top of the steep section, roughly 175 ft below the summit. Slings and cord are usually in place; it is the first station most parties use rather than downclimbing.",
    anchor: "natural horn/block, top of the crux tower",
    notes: "Ridge rappel 1 of about 3. Downclimb from the summit back past the false summit to reach it.",
    pull: "Set the knot well clear of the lip and check the pull before committing.",
    hazards: ["The pull angles here are awkward and a rope that is not weighted cleanly off the horn can hang up. Watch the rope over the edge before the last person goes."] },
  { n: 2, lengthM: null,
    station: "Below the crux tower, dropping onto snow on the north side of the ridge. Natural anchors: slung horns and blocks with accumulated tat, not a bolted station.",
    anchor: "natural horn/block",
    notes: "Ridge rappel 2 of about 3, landing on north-side snow.",
    hazards: ["The landing is on snow, and the step from rock to snow is where parties come off the rappel awkwardly. Have crampons and an axe ready before you start down."] },
  { n: 3, lengthM: null,
    station: "On the lower ridge above the notch. Slung horn or block with tat; the 3rd/4th-class steps between here and the stations above are usually downclimbed.",
    anchor: "natural horn/block",
    notes: "Ridge rappel 3 of about 3, back down to the notch between Forbidden and Torment. How many of the ridge steps you rappel rather than downclimb is up to the party.",
    hazards: ["Exposed downclimbing between stations. Stay roped on wet rock."] },
  { n: 4, lengthM: null,
    station: "Top of the Cat Scratch gullies, the rock chimneys immediately west of the snow couloir. From the notch, downclimb a short section of 3rd-class rock to reach it.",
    anchor: "fixed anchor on the rib",
    notes: "Cat Scratch rappel 1 of about 5. Three parallel chimneys all go; parties most often use the one nearest the snow couloir.",
    hazards: [LOOSE] },
  { n: 5, lengthM: null,
    station: "Next station down the same chimney, on the rib on the down-climber's left.",
    anchor: "fixed anchor on the rib",
    notes: "Cat Scratch rappel 2 of about 5.",
    hazards: [GULLY_RIB] },
  { n: 6, lengthM: null,
    station: "Mid-gully, on the rib on the down-climber's left.",
    anchor: "fixed anchor on the rib",
    notes: "Cat Scratch rappel 3 of about 5.",
    hazards: [SHORT] },
  { n: 7, lengthM: null,
    station: "Lower gully, on the rib on the down-climber's left. This is the station most often reported as hard to find: if you cannot see it, stop and look on the rib before continuing.",
    anchor: "fixed anchor on the rib",
    notes: "Cat Scratch rappel 4 of about 5.",
    pull: "Carry enough cord to build an extra station if you cannot find the next one.",
    hazards: [LOOSE] },
  { n: 8, lengthM: null,
    station: "Bottom of the gullies, above the snowfield below Forbidden's south face.",
    anchor: "fixed anchor on the rib",
    notes: "Cat Scratch rappel 5 of about 5, landing on the snowfield. From here, reverse the glacier-remnant and talus traverse back to Boston Basin.",
    hazards: ["The moat where the snow pulls away from the rock reappears at the bottom and can need a step across or a short downclimb. Have crampons and an axe ready for the snow."] },
];

const rappels = "~8 single-rope rappels: about 3 on the West Ridge back to the notch, mixed with downclimbing, then about 5 down the Cat Scratch gullies to the snowfield below the south face. Late season, expect one or two more in the gullies.";

const rappel_count_note = "Counted for one 60 m rope, which is what most parties carry: about 3 rappels on the ridge and about 5 in the Cat Scratch gullies. The gully count varies by party, from 5 to 7, depending on which chimney you take and how much you downclimb. Early season, while the snow couloir beside the gullies is still filled in, some parties descend the couloir instead, rappelling the steepest snow to the moat and downclimbing the rest. The stations below are the rock line, which works all season. Do not skip stations, and be ready to build one if you cannot find the next.";

const descent = "Reverse the ridge to the notch (downclimbing and about 3 rappels), then rappel the Cat Scratch gullies, the rock chimneys just west of the snow couloir, about 5 single-rope rappels to the snowfield, and walk back across to Boston Basin.";

const descent_text = "There is no walk-off. Descend the way you came up as far as the notch, then take the rock gullies beside the couloir. From the true summit, downclimb back past the false summit to the crux tower, then work down the ridge crest with exposed 3rd/4th-class downclimbing and about 3 rappels off slung horns and blocks, back to the notch between Forbidden and Torment. From the notch, downclimb a short section of 3rd-class rock to the first station of the Cat Scratch gullies, the parallel rock chimneys immediately west of the snow couloir. About 5 single-rope rappels with a 60 m rope, off fixed anchors on the rib on the down-climber's left, bring you to the snowfield below the south face. Some stations are deliberately short, so do not skip one, and be ready to build an anchor if you cannot find the next. Early season, while the couloir still holds good snow, some parties descend it instead, rappelling the steepest snow to the moat and downclimbing the rest. Watch for the moat again at the bottom. From the base, reverse the glacier-remnant and talus traverse back to Boston Basin camp and out the climbers' trail to the trailhead. The descent is usually slower than the climb: parties report about 1.5 hours back down the ridge to the notch against about 1 hour up it.";

const accidentHazard = "This is the most heavily travelled route on the peak, and it has had fatal accidents: an unroped fall of about 90 ft on wet slabs above the upper bivy by a climber who had taken off their helmet (August 2018), a fall while rappelling the descent gully after rockfall (2013), and a fall into a crevasse off the end of a rappel rope with no backup (July 2017). Stay roped on wet or loose rock, back up every rappel with an autoblock and knots in the rope ends, and keep your helmet on until you are off the descent.";

const hazards = [...(row.hazards || []).filter((h) => !/fatal accidents/.test(h)), accidentHazard];
const emergency = { ...row.emergency };
delete emergency.notes;

const body = { rappel_detail, rappels, rappel_count_note, descent, descent_text, hazards, emergency };

// Self-check: every count the readers can extract must agree with the table.
const { rappelSummary, rappelHeaderLabel, rappelSingleRopeWarning } = await import("../../lib/rappels.js");
const after = { ...row, ...body, rappelDetail: rappel_detail, rappelCountNote: rappel_count_note, descentText: descent_text };
const sum = rappelSummary(after);
console.log("summary:", sum);
console.log("header:", rappelHeaderLabel(after));
console.log("warning:", rappelSingleRopeWarning(after));
if (sum.documented !== 8 || sum.disagrees || sum.singleRopeExceeds || rappelHeaderLabel(after) !== "RAPPELS · 8 rappels") throw new Error("the repaired row still states two rappel counts");

if (DRY) { console.log("--dry: not written"); process.exit(0); }
await patchRow("routes", ID, body);

const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=rappels,rappel_detail,rappel_count_note,descent_text,hazards,emergency`, { headers: headers(key) })).json();
const b = back[0];
if (b.rappel_detail.length !== 8 || b.rappels !== rappels || b.emergency.notes || !b.hazards.includes(accidentHazard)) throw new Error("re-read does not match what was written");
console.log("written and re-read: 8 stations, accident record in hazards, emergency.notes gone");
