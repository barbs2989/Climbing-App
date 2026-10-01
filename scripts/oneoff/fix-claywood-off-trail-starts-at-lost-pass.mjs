// wa_mount_claywood_standard said in two places that off-trail travel starts beyond CAMERON Pass.
// Its own records say Lost Pass, unanimously:
//   approach      "continues to Lost Pass (5,570 ft) ... At Lost Pass leave the trail ... Everything
//                  beyond Lost Pass is unmarked and off-trail"
//   beta          "From Lost Pass (5,570 ft) the route leaves the trail"
//   climbing_route"Leave the trail at Lost Pass"
//   pitch_detail, descent_text, itinerary and obj_haz ("difficult off-trail route-finding beyond
//                  Lost Pass") agree; between Cameron Pass and Lost Pass there is a primitive trail
//                  through Lost Basin.
// Found while reading the KNOWN HAZARDS box, which printed both versions on one route.
//
// Nothing is typed: the replacement name is the one the row's own approach uses. Each target string
// must be present verbatim, exactly once, or the script refuses. Only the KNOWN HAZARDS line and the
// gear item change; everything else on the row is untouched.
//
//   node scripts/oneoff/fix-claywood-off-trail-starts-at-lost-pass.mjs [--apply]
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_mount_claywood_standard";
const EDITS = [
  ["hazards", "sustained off-trail travel and route-finding beyond Cameron Pass — no maintained trail to the summit",
              "sustained off-trail travel and route-finding beyond Lost Pass — no maintained trail to the summit"],
  ["gear", "map & compass/GPS (extensive off-trail navigation required beyond Cameron Pass)",
           "map & compass/GPS (extensive off-trail navigation required beyond Lost Pass)"],
];
const key = requireServiceKey();
const read = async () => { const j = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,hazards,gear,approach&id=eq.${ID}`, { headers: headers(key) })).json(); if (j.length !== 1) throw new Error(`${ID}: ${j.length} rows`); return j[0]; };

const row = await read();
if (!/Everything beyond Lost Pass is unmarked and off-trail/.test(row.approach || "")) throw new Error("the row's own approach no longer says off-trail begins at Lost Pass — re-read before editing");
const body = {};
for (const [col, from, to] of EDITS) {
  const arr = row[col];
  if (!Array.isArray(arr)) throw new Error(`${col} is not an array`);
  const n = arr.filter(x => x === from).length;
  if (n !== 1) throw new Error(`${col}: expected the old line exactly once, found ${n}`);
  body[col] = arr.map(x => x === from ? to : x);
}
console.log(JSON.stringify({ before: Object.fromEntries(Object.keys(body).map(c => [c, row[c]])), after: body }, null, 1));
if (!process.argv.includes("--apply")) { console.log("dry run — pass --apply to write"); process.exit(0); }
await patchRow("routes", ID, body);
const now = await read();
const ok = EDITS.every(([col, from, to]) => now[col].includes(to) && !now[col].includes(from));
console.log(ok ? "written and re-read: both lines now say Lost Pass" : "MISMATCH after write");
process.exit(ok ? 0 : 1);
