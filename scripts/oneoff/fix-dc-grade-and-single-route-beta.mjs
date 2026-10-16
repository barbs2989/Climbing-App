// Disappointment Cleaver (Rainier): one researched grade, and beta for THIS route only.
//
// GRADE. The row headlined "3rd-4th class" (rock_grade wins displayGrade's precedence) while
// `grade` held "Grade II–III glacier", which no parser reads, so grade_num was null and the route
// sat outside every grade filter. Sources agree the Cleaver is Class 2 with occasional Class 3
// moves — SummitPost "Class 2-3", the NPS route brief and trip reports "class 2 scrambling with
// occasional class 3 moves", Mountain Project "Mod. Snow", The Mountaineers "Basic Glacier Climb".
// Nothing says 4th class. The final grade is the crux: Class 3. ALPINE "III" contradicted
// COMMITMENT "II" on the same chip row; no source gives III, so the duplicate numeral goes.
//
// ONE ROUTE. The APPROACH showed "2 ways in", but the second card (high camp at Ingraham Flats) is
// a camp choice on the same approach — audits/wa-multi-approach/2026-10-01-research.json rules DC
// SINGLE — and with the approach picker it read as a second route with its own base-finding.
// The camp itself already appears under CAMPING & BIVY. Base-finding and hazards described the
// Gibraltar Ledges and Ingraham Direct routes by name; they now say "off route" without
// explaining another line. `rappels` said "Fixed ladders mid-route" against a descent that says
// no fixed gear: ladders cross crevasses, they are not rappels.
//
//   node scripts/oneoff/fix-dc-grade-and-single-route-beta.mjs --dry
//   node scripts/oneoff/fix-dc-grade-and-single-route-beta.mjs
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const ID = "wa_mount_rainier_disappointment_cleaver";
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const COLS = "id,area_id,grade,grade_num,grade_system,rock_grade,alpine_grade,commitment,fa,hazards,rappels,pitch_detail,approach_variants";
const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=eq.${ID}`, { headers: headers(key) })).json())[0];
if (!r || r.area_id !== "wa_mount_rainier") throw new Error("row missing or not on wa_mount_rainier");

const grade = "Class 3";
const body = {
  grade, grade_system: "class", grade_num: gradeNumFrom(grade, "class"),
  rock_grade: "Class 2, with occasional Class 3 moves (loose rock and scree on the Cleaver)",
  alpine_grade: null,
  fa: "Unknown",
  rappels: "None — the route is descended on foot. In a busy season guide services may place ladders over crevasses and hand lines on the Cleaver.",
};

// hazards: drop the other-route clause from the one line that names one
const hz = r.hazards.map(h => /Ingraham Direct/.test(h)
  ? "Bergschrund and large crevasse crossings above Ingraham Flats and near the top of the Cleaver; ladders or fixed lines are sometimes placed in low-snow years."
  : h);
if (hz.join() === r.hazards.join()) throw new Error("hazards: expected the Ingraham Direct line");
body.hazards = hz;

// pitch_detail: the crux entry only
const pd = r.pitch_detail.map(p => p.pitch !== "Disappointment Cleaver" ? p : {
  ...p,
  grade: "Loose rock/scree, Class 2–3",
  notes: "About 1,000–1,200 vertical ft up the rock rib to its top at 12,300 ft: mostly Class 2 on loose rock, scree and snow, with occasional Class 3 moves. No crevasse hazard here, so short-rope and keep the rope off the loose rock. In the dark the lower Cleaver is a maze of rock paths where tired parties go wrong; follow the wands, and if you find yourself on anything harder than an occasional easy 3rd-class move you are off the boot track. Snow cover makes it simpler to follow but more slippery.",
});
if (pd.filter((p, i) => p !== r.pitch_detail[i]).length !== 1) throw new Error("pitch_detail: expected exactly one crux entry");
body.pitch_detail = pd;

// approach_variants: keep the one real approach, without other routes in its base-finding
if (r.approach_variants.length !== 2 || !/Ingraham Flats instead/.test(r.approach_variants[1].name)) throw new Error("approach_variants: unexpected shape");
const av = { ...r.approach_variants[0] };
av.baseFinding = av.baseFinding
  .replace("If instead you are climbing a rock ridgeline immediately northwest of camp, out of the tents, you are on the Cowlitz Cleaver and you are on the Gibraltar Ledges approach, a different route.",
           "If instead you are climbing a rock ridgeline immediately northwest of camp, straight out of the tents, you are off route — go back and cross the Cowlitz.")
  .replace(/\n\nNegative marker: .*$/s,
           "\n\nNegative marker: if the whole way from the Flats stays on snow with the icefall directly overhead and you never touch rock, you have missed the traverse onto the Cleaver.");
if (/Gibraltar|Ingraham Direct/.test(av.baseFinding)) throw new Error("baseFinding still names another route");
body.approach_variants = [av];

if (body.grade_num !== 3) throw new Error("grade_num " + body.grade_num);
const roll = `audits/route-grades/rollback-dc-${Date.now()}.json`;
console.log(JSON.stringify({ ...body, pitch_detail: "(1 entry changed)", approach_variants: "(1 kept)" }, null, 1));
if (DRY) process.exit(0);
fs.mkdirSync("audits/route-grades", { recursive: true });
const before = {}; for (const k of Object.keys(body)) before[k] = r[k];
fs.writeFileSync(roll, JSON.stringify({ [ID]: before }, null, 1));
await patchRow("routes", ID, body);
const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=grade,grade_num,grade_system,rock_grade,alpine_grade,approach_variants&id=eq.${ID}`, { headers: headers(key) })).json())[0];
console.log("re-read:", after.grade, after.grade_num, after.grade_system, "|", after.rock_grade, "| alpine", after.alpine_grade, "| approaches", after.approach_variants.length, "| rollback", roll);
