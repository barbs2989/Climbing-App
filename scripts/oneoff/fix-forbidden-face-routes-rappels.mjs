// Forbidden Peak's NW Face and NE Face descend by the West Ridge, and each undercounted it from
// the other end.
//
// The West Ridge descent is about 3 rappels on the ridge back to the notch, then about 5 down the
// Cat Scratch gullies: 8 on one 60 m rope (fix-forbidden-west-ridge-rappels.mjs).
//   NW Face — its table held only the ridge stations (the same 3 the West Ridge had), so it said 3.
//   NE Face — its table held only the gully stations, starting "From the West Ridge notch", so it
//             said 5. Its descent_text also printed an internal route id at the climber.
// NW takes the West Ridge's 8 stations. NE keeps its own 5 gully stations, which are more detailed,
// and gains the West Ridge's 3 ridge stations in front of them.
//
//   node scripts/oneoff/fix-forbidden-face-routes-rappels.mjs --dry
//   node scripts/oneoff/fix-forbidden-face-routes-rappels.mjs
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { rappelSummary, rappelHeaderLabel } from "../../lib/rappels.js";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const get = async (id) => {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,area_id,name,rappels,rappel_count_note,rappel_detail,descent,descent_text`, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`expected 1 row for ${id}`);
  if (rows[0].area_id !== "wa_forbidden_peak") throw new Error(`${id} is on ${rows[0].area_id} — refusing`);
  return rows[0];
};

const wr = await get("wa_forbidden_peak_west_ridge");
if (wr.rappel_detail.length !== 8) throw new Error("West Ridge is not the repaired 8-station row — run fix-forbidden-west-ridge-rappels.mjs first");
const ridge = wr.rappel_detail.slice(0, 3);
const nw = await get("wa_forbidden_peak_northwest_face");
const ne = await get("wa_forbidden_peak_northeast_face");
if (nw.rappel_detail.length !== 3 || ne.rappel_detail.length !== 5) {
  console.log("Rows no longer match the state this repair targets — nothing to do.", nw.rappel_detail.length, ne.rappel_detail.length);
  process.exit(DRY ? 0 : 1);
}

const RAPPELS = "~8 single-rope rappels down the West Ridge: about 3 on the ridge back to the notch, mixed with downclimbing, then about 5 down the Cat Scratch gullies to the snowfield below the south face. Late season, expect one or two more in the gullies.";
const NOTE = "Counted for one 60 m rope, which is what most parties carry: about 3 rappels on the ridge and about 5 in the Cat Scratch gullies. The gully count varies by party, from 5 to 7, depending on which chimney you take and how much you downclimb. Early season, while the snow couloir beside the gullies is still filled in, some parties descend the couloir instead, rappelling the steepest snow to the moat and downclimbing the rest. The stations below are the rock line, which works all season. Do not skip stations, and be ready to build one if you cannot find the next.";
const DESCENT_CORE = "From the true summit, downclimb back past the false summit to the crux tower, then work down the West Ridge crest with exposed 3rd/4th-class downclimbing and about 3 rappels off slung horns and blocks, back to the notch between Forbidden and Torment. From the notch, downclimb a short section of 3rd-class rock to the first station of the Cat Scratch gullies, the parallel rock chimneys immediately west of the snow couloir. About 5 single-rope rappels with a 60 m rope, off fixed anchors on the rib on the down-climber's left, bring you to the snowfield below the south face. Some stations are deliberately short, so do not skip one, and be ready to build an anchor if you cannot find the next. Early season, while the couloir still holds good snow, some parties descend it instead, rappelling the steepest snow to the moat and downclimbing the rest.";

const nwBody = {
  rappel_detail: wr.rappel_detail,
  rappels: RAPPELS,
  rappel_count_note: NOTE,
  descent_text: `Do not reverse the Northwest Face; descend by the standard West Ridge. ${DESCENT_CORE} From the base, cross back to Boston Basin camp and hike out the climbers' trail. This means NW Face parties do not re-cross the Boston or Forbidden Glaciers or re-climb Sharkfin Col on the way down.`,
};

const neGully = ne.rappel_detail.map((s, i) => {
  const t = { ...s, n: i + 4 };
  if (i === 4 && typeof t.notes === "string") t.notes = t.notes.replace(/up to 6-7 total\) not captured in this 5-rap average/, "one or two more in the gullies)");
  return t;
});
if (/6-7 total/.test(JSON.stringify(neGully))) throw new Error("NE station 5 note did not take the edit — its wording changed; read it before re-running");
const neBody = {
  rappel_detail: [...ridge, ...neGully],
  rappels: `${RAPPELS} The East Ledges alternative takes about 5 single-rope rappels, roughly 400 ft in all, down the north side.`,
  rappel_count_note: NOTE.replace("The stations below are the rock line", "The stations below are the ridge and then the rock rib beside the couloir, the line"),
  descent_text: `Do not reverse the Northeast Face; descend by the West Ridge. ${DESCENT_CORE} From the base, cross back to Boston Basin camp and hike out the climbers' trail. This is a long day; budget extra time given the remote, less-travelled ascent line.`,
};

for (const [row, body] of [[nw, nwBody], [ne, neBody]]) {
  const after = { ...row, ...body, rappelDetail: body.rappel_detail, rappelCountNote: body.rappel_count_note, descentText: body.descent_text };
  const s = rappelSummary(after), h = rappelHeaderLabel(after);
  console.log(row.id, "|", h, "|", JSON.stringify(s));
  if (s.documented !== 8 || s.disagrees || s.singleRopeExceeds || h !== "RAPPELS · 8 rappels") throw new Error(`${row.id} would still state two counts`);
  if (/wa_[a-z_]+/.test(body.descent_text)) throw new Error(`${row.id} descent_text names an internal id`);
}
if (DRY) { console.log("--dry: not written"); process.exit(0); }
await patchRow("routes", nw.id, nwBody);
await patchRow("routes", ne.id, neBody);
for (const id of [nw.id, ne.id]) {
  const b = await get(id);
  if (b.rappel_detail.length !== 8) throw new Error(`${id} re-read shows ${b.rappel_detail.length} stations`);
}
console.log("written and re-read: both rows now carry 8 stations");
