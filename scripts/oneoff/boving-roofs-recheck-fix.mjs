// Owner's note recheck (2026-11-26) of Boving Roofs / Southwest Rib after #2744. Text that #2744's
// rewrite did not reach, or a later pass re-introduced:
//  - Boving `beta` (beta-to-plan batch 031) ended "joining the upper Southwest Rib/South Arete descent":
//    the variation rejoins at the top of the rib's Bear Hug pitch and climbs the rib's P6-7 to the summit
//    (mountainproject.com/route/110616122). `rope_note` called it a "3-pitch trad line".
//  - Southwest Rib `descent`, itinerary note/schedule and timing still rappelled "back to the base"; the
//    South Arete rappels land at the foot of the South Arete, not at the rib's larch (#2744's sources).
//    `rappel_count_note` said sources give "no tally", contradicting its own three listed stations.
//
//   node scripts/oneoff/boving-roofs-recheck-fix.mjs --dry
//   node scripts/oneoff/boving-roofs-recheck-fix.mjs
//   node scripts/oneoff/boving-roofs-recheck-fix.mjs --rollback
import fs from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const BEFORE = new URL("./boving-roofs-recheck-fix.before.json", import.meta.url);
const COLS = "id,area_id,beta,rope_note,descent,descent_text,rappel_count_note,itinerary,timing";
const IDS = ["wa_boving_roofs", "wa_sews_sw_rib"];
const AREA = "wa_south_early_winters_spire";
const dry = process.argv.includes("--dry");

async function read() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=in.(${IDS.join(",")})`, { headers: headers(requireServiceKey()) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 2) throw new Error("expected 2 rows, got " + JSON.stringify(rows).slice(0, 200));
  for (const x of rows) if (x.area_id !== AREA) throw new Error(x.id + " is filed on " + x.area_id);
  return Object.fromEntries(rows.map((x) => [x.id, x]));
}
function swap(s, from, to) { if (typeof s !== "string" || !s.includes(from)) throw new Error("anchor missing: " + from); return s.replace(from, to); }

if (process.argv.includes("--rollback")) {
  const b = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  for (const id of IDS) { const { id: _i, area_id: _a, ...body } = b[id]; await patchRow("routes", id, body); console.log("restored", id); }
  process.exit(0);
}

const cur = await read();
if (!dry) fs.writeFileSync(BEFORE, JSON.stringify(cur, null, 1));
const bov = cur.wa_boving_roofs, rib = cur.wa_sews_sw_rib;

const bovPatch = {
  beta: swap(bov.beta, "to a ledge with great position, joining the upper Southwest Rib/South Arete descent.",
    "to a ledge with great position at the top of the Southwest Rib's Bear Hug pitch. From there, finish on the rib's last two pitches to the summit and descend the South Arete."),
  rope_note: "Boving's own three pitches sit inside an 8-pitch day: the Southwest Rib's first three, these three, then the rib's last two to the summit. Standard alpine rack to 3 in, with doubles of 0.5-3 in cams for the roofs. Descend the South Arete from the summit: downclimbing, then 3 single-rope rappels on a 60 m rope.",
};

const itin = structuredClone(rib.itinerary);
itin.days[0].note = swap(itin.days[0].note, "make 3 rappels from bolted stations back to the base.", "make 3 rappels from bolted stations to the foot of the arete, a short walk from the larch.");
const sd = itin.days[0].schedule.find((s) => s.label === "Begin descent");
if (!sd) throw new Error("no Begin descent row");
sd.detail = swap(sd.detail, "3 rappels from bolted stations to the base.", "3 rappels from bolted stations to the foot of the arete.");
const timing = structuredClone(rib.timing);
timing.sectionBreakdown[0].note = swap(timing.sectionBreakdown[0].note, "rappel back to the base.", "rappel to the foot of the arete.");

const ribPatch = {
  descent: "Descend the South Arete: downclimb to the Rabbit Ears, then 3 rappels to the foot of the arete and a short walk back to the Y-shaped larch.",
  descent_text: swap(rib.descent_text, "from bolted chain anchors back toward the Blue Lake basin.",
    "from bolted chain anchors. They land at the foot of the South Arete, on the spire's south side, a short walk from the Y-shaped larch where this route starts."),
  rappel_count_note: "The South Arete descent mixes 3rd/4th-class downclimbing with rappels, so a party that downclimbs more can rig fewer than three. The three bolted stations listed here are the standard line, moved climber's right of the gully after the June 2022 rockfall, and they land at the foot of the South Arete. This is the whole peak's descent line, so expect queues at the stations on a busy weekend.",
  itinerary: itin,
  timing,
};

for (const [id, p] of [["wa_boving_roofs", bovPatch], ["wa_sews_sw_rib", ribPatch]]) {
  for (const [k, v] of Object.entries(p)) console.log(id, k, "\n  -", JSON.stringify(cur[id][k]).slice(0, 400), "\n  +", JSON.stringify(v).slice(0, 400));
  if (!dry) { await patchRow("routes", id, p); await new Promise((r) => setTimeout(r, 1500)); }
}
if (!dry) {
  const after = await read();
  for (const [id, p] of [["wa_boving_roofs", bovPatch], ["wa_sews_sw_rib", ribPatch]])
    for (const [k, v] of Object.entries(p)) if (JSON.stringify(after[id][k]) !== JSON.stringify(v)) throw new Error("did not land: " + id + "." + k);
  console.log("reconciled: all fields landed");
}
