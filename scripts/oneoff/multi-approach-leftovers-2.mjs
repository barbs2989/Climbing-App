// The rest of the multi-approach leftovers, after a second research pass:
//  - Goode Mountain Megalodon Ridge started at Rainy Pass on its card, pin and approach, while its own
//    mileages, road and timing are Bridge Creek's (a mile east, ~4,400 ft). Now Bridge Creek throughout.
//  - Huckleberry Mountain West Route's approach described the EAST route (Huckleberry Flats, the East
//    Ridge buttress, its car-to-car time). Now the PCT to above Joe Lake and up into the west basin.
//  - Jack Mountain East Ridge's approach said "rather than from the Jerry Lakes side" while its own card
//    (and every ascent) goes through Jerry Lakes; it also leaned on who recorded what. Now matches the card.
//  - Windy Peak: the Windy Creek row's "Cathedral Driveway Trailhead" pin was Long Swamp's coordinate.
//    It and the standard row's Cathedral Driveway way in take the Forest Service's trailhead coordinate;
//    the standard row's stored trailhead takes its own Long Swamp waypoint's pin.
//
// Values in ./multi-approach-leftovers-2.json; the rows as they were in ./multi-approach-leftovers-2.before.json.
// Refuses to write if a row no longer matches the before file (someone else changed it).
//
//   node scripts/oneoff/multi-approach-leftovers-2.mjs [--write | --rollback]
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
// `--set 3` applies ./multi-approach-leftovers-3.json the same way: the two other Goode rows' Rainy Pass
// trailhead waypoint becomes Megalodon's Bridge Creek one, and Huckleberry's timing note loses Huckleberry Flats.
// `--set 4`: Adams Wilson Glacier Headwall stops staging from Lunch Counter and descending to Killen Creek (its
// approach, card, camp and car are all on the east side from Cold Springs); Storm King N Face's peak coordinate
// was stored as strings. `--set 5`: Goode Southwest Couloir's way-in card still put that trailhead at 4,875 ft.
// `--set 6`: Windy Peak's standard route gains Iron Gate as its third way in, from the Iron Gate row's own pin and camp.
// `--set 7`: Adams day-1 numbers nobody states are blanked; Huckleberry West Route's text matches its own 5.6 grade;
// Goode's three rows say Bridge Creek parking needs a pass (one said free); Storm King N Face's approach is the
// first ascent's (Park Creek, over the Goode-Storm King saddle) and the second climber's name is spelled right.
// `--set 8`: The Devil's Club (Southeast Mox East Face) is reached by Perry Creek only, so its camp is the Perry
// Creek basin (not the Redoubt Glacier), its Col-of-the-Wild pin from the West Ridge side is gone, and day 1
// no longer names Access Creek. `--set 9`: the same Access Creek slip in its Time-to-Summit leg (`timing`), a
// truncated copy of that day-1 note that set 8 missed.
const SET = process.argv.includes("--set") ? process.argv[process.argv.indexOf("--set") + 1] : "2";
const NEXT = JSON.parse(fs.readFileSync(new URL(`./multi-approach-leftovers-${SET}.json`, import.meta.url), "utf8"));
const BEFORE = JSON.parse(fs.readFileSync(new URL(`./multi-approach-leftovers-${SET}.before.json`, import.meta.url), "utf8"));
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const SOURCEY = /https?:|www\.|\.com\b|\.org\b|mountain ?project|summitpost|peakbagger|wta\b|trails association|cascadeclimbers|caltopo|trip report|guidebook|according to|catalog|research|\baccounts?\b|forest service|\bnps\b/i;
const ids = Object.keys(NEXT);
const cols = [...new Set(ids.flatMap((id) => Object.keys(NEXT[id])))];
const read = async () => selectAll("routes", "id," + cols.join(","), `id=in.(${ids.join(",")})`, { key });

if (process.argv.includes("--rollback")) {
  for (const [id, v] of Object.entries(BEFORE)) await patchRow("routes", id, v);
  console.log("rolled back", Object.keys(BEFORE).length); process.exit(0);
}
const rows = await read(), problems = [], todo = [];
const strings = (x) => typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === "object" ? Object.values(x).flatMap(strings) : [];
for (const id of ids) {
  const r = rows.find((x) => x.id === id);
  if (!r) { problems.push(`${id}: row missing`); continue; }
  if (Object.keys(NEXT[id]).every((k) => same(r[k], NEXT[id][k]))) { console.log(`${id}: SPENT (already written)`); continue; }
  for (const k of Object.keys(NEXT[id])) {
    if (!same(r[k], BEFORE[id][k])) problems.push(`${id}.${k}: changed since the before file was taken`);
    for (const s of strings(NEXT[id][k])) { const m = s.match(SOURCEY); if (m && !strings(BEFORE[id][k]).some((b) => b.includes(s) || b.includes(m[0]))) problems.push(`${id}.${k}: names a source ("${m[0]}")`); }
  }
  todo.push(id);
  console.log(id, "→", Object.keys(NEXT[id]).join(", "));
}
if (problems.length) { console.log("PROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
if (!process.argv.includes("--write")) { console.log(`dry run: ${todo.length} rows would change — pass --write`); process.exit(0); }
for (const id of todo) await patchRow("routes", id, NEXT[id]);
const after = await read();
let bad = 0;
for (const id of todo) for (const k of Object.keys(NEXT[id])) if (!same(after.find((r) => r.id === id)[k], NEXT[id][k])) { bad++; console.log("RE-READ MISMATCH", id, k); }
console.log(`written ${todo.length}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
