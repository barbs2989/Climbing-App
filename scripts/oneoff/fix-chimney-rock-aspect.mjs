// wa_chimney_rock_west_face: aspect E -> W.
//
// This row has been carried in CLAUDE.md and in the aspect-name triage as "a corroborated IDAHO
// route (Selkirk Crest) filed on a Washington peak", whose repair was therefore a DELETION.
// Reading the row settles it the other way, and it is not close. Its approach names the Pete
// Lake Trailhead off FR 4616, Pete Lake Trail #1323, the Pacific Crest Trail, Chimney Creek,
// Sunrise Knob and the Chimney Glacier — Washington's Chimney Rock in the Alpine Lakes
// Wilderness (47.509, -121.286). Idaho's Selkirk Chimney Rock has neither a glacier nor a Pete
// Lake, and the catalog already holds its own complete Idaho tree (`id_chimney_rock`, 16 routes
// across east and west face crags). Nothing needed moving, and deleting this would have
// destroyed a correct Washington alpine route — the Triple Couloirs shape exactly.
//
// What IS wrong is the aspect. Three records say west and one says east:
//   name            "West Face / South Summit (Standard)"
//   approach        "...roughly 30-40 feet climber's-right of the obvious 'Rappel Chimney'
//                    feature on the west face..."
//   climbing_route  "Pitch 1 — grooves and cracks right of the Rappel Chimney"
//   aspect          "E"                                          <-- the odd one out
// `face` ("South Peak (7,440 ft) summit block") says which summit, not which side, so it does
// not vote. The peak's other two routes are both East Face lines, which is the likeliest source
// of the E. Aspect drives the sun/shade readout, so this is not cosmetic.
//
// Guarded on the exact current value, so a row corrected elsewhere is left alone.
//
//   node scripts/oneoff/fix-chimney-rock-aspect.mjs [--apply]
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const ID = "wa_chimney_rock_west_face";

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,aspect,approach,area_id&id=eq.${ID}`, { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error(`${ID} not found — refusing to guess`);
const r = rows[0];

if (r.area_id !== "wa_chimney_rock") throw new Error(`unexpected area_id ${r.area_id} — the row moved; stop and re-read it`);
if (r.aspect !== "E") { console.log(`aspect is already "${r.aspect}", not "E" — nothing to do`); process.exit(0); }
if (!/west face/i.test(r.name)) throw new Error("the name no longer says west face — the evidence for this change is gone");
if (!/pete lake/i.test(r.approach || "")) throw new Error("the approach no longer names Pete Lake — re-confirm which mountain this is before writing");

console.log(`${ID} — ${r.name}`);
console.log(`  aspect: ${r.aspect} -> W`);
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

await patchRow("routes", ID, { aspect: "W" });

const back = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,aspect&id=eq.${ID}`, { headers: headers(key) });
const [after] = JSON.parse(await back.text());
console.log(after && after.aspect === "W"
  ? "applied and verified by re-read: aspect = W"
  : `MISMATCH — the row reads ${after && after.aspect}`);
process.exit(after && after.aspect === "W" ? 0 : 1);
