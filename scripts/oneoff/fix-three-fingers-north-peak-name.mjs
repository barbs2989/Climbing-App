// `wa_three_fingers_r1` is named "North Peak (Lookout route)". The Three Fingers lookout stands
// on the SOUTH summit, not the north one, and a separate correct row already describes the
// ladder route to it (`wa_three_fingers_south_peak_lookout`, "South Peak via Lookout").
//
// The row itself is a genuine NORTH PEAK route — its own approach climbs "to the col between
// Middle and North Peak" and then a ramp and chimney to that summit block, and its beta says
// parties combine it WITH the South Peak lookout climb. So the route is real and only the
// parenthetical is false.
//
// That parenthetical is not cosmetic: a climber looking for the lookout would be sent to a
// Class 4 / low-fifth chimney on a different summit of the same mountain.
//
// Fix is minimal on purpose — drop the false claim rather than mint a new qualifier. Inventing
// a replacement parenthetical would be a larger claim than the evidence supports.
//
// --dry prints and writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const ID = "wa_three_fingers_r1";
const OLD = "North Peak (Lookout route)";
const NEW = "North Peak";

requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id", `area_id=eq.wa_three_fingers`, { pageSize: 50 });
if (!rows.length) { console.log("FAIL: read no routes on wa_three_fingers — refusing to conclude anything"); process.exit(1); }
console.log(`routes on wa_three_fingers: ${rows.map(r => `${r.id}="${r.name}"`).join(", ")}`);

const row = rows.find(r => r.id === ID);
if (!row) { console.log(`FAIL: ${ID} not found`); process.exit(1); }
if (row.name === NEW) { console.log("already correct"); process.exit(0); }
if (row.name !== OLD) { console.log(`FAIL: name is ${JSON.stringify(row.name)}, not the string this fix was written against`); process.exit(1); }

// A rename must not collide with a sibling on the same peak — (area_id, name) is the identity
// that actually means "the same climb".
const clash = rows.find(r => r.id !== ID && r.name === NEW);
if (clash) { console.log(`FAIL: ${clash.id} already carries the name ${JSON.stringify(NEW)} on this area`); process.exit(1); }

console.log(`${DRY ? "would rename" : "renaming"} ${ID}: ${JSON.stringify(OLD)} -> ${JSON.stringify(NEW)}`);
if (DRY) process.exit(0);

await patchRow("routes", ID, { name: NEW });
const after = await selectAll("routes", "id,name", `id=eq.${ID}`, { pageSize: 5 });
const ok = after.length === 1 && after[0].name === NEW;
console.log(ok ? `verified — ${ID} now reads ${JSON.stringify(after[0].name)}` : `FAIL: re-read says ${JSON.stringify(after[0] && after[0].name)}`);
process.exit(ok ? 0 : 1);
