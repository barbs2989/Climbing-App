// Three rows say the road is OPEN in road.status and CLOSED in their own two other fields.
//
// wa_little_sister_north_face, _southeast_ridge and _west_face each carry:
//
//   road.status         "Open as of mid-2026 but see seasonalGate"
//   road.seasonalGate   "... FR 38 washout/barrier at MP 7."
//   access.closures     "... FR 38 washout/barrier at MP 7 ..."
//
// The Mt. Baker-Snoqualmie alert of 27 July 2026 says FSR 38 is closed at Mile Post 7 by a washout,
// blocking Elbow Lake Trail 697 and Ridley Creek Trail 696 — which is the trailhead these routes
// use. So road.status is not merely stale, it is contradicted by the row it sits in.
//
// road.status is the field the route page renders first, beside the road name, and it is the one a
// climber reads to answer "can I drive there". "Open as of mid-2026" is the worst possible wrong
// answer: it is affirmative, and the caveat it offers ("but see seasonalGate") reads like a note
// about SNOW, not like a washout that ends the drive four miles short.
//
// NOTHING IS RESEARCHED INTO THE CATALOG HERE. Every fact written is already in it: the MP 7 washout
// from each row's own seasonalGate, and the alert date and blocked trailhead from
// wa_little_sister_south_couloir, a sibling on the same peak whose road block is exemplary. Both are
// re-asserted at apply time.
//
// A NOTE ON THE AUDIT COUNT: this moves three values from "as-of-period" to "open-ended", because
// the closure genuinely has no announced end. The backlog number may not fall. That is correct —
// the goal is a true statement with a date the reader can judge, not a smaller count.
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const SUBJECTS = ["wa_little_sister_north_face", "wa_little_sister_southeast_ridge", "wa_little_sister_west_face"];
const SIBLING = "wa_little_sister_south_couloir";

const STATUS = "CLOSED at milepost 7 by a washout, per a Mt. Baker-Snoqualmie National Forest alert dated 27 July 2026 — this blocks vehicle access to the Elbow Lake Trailhead. No reopening estimate has been published. See seasonalGate for the FR 12 approach and the winter gates.";

const EDITS = SUBJECTS.map(id => ({ id, col: "road", key: "status",
  find: "Open as of mid-2026 but see seasonalGate", repl: STATUS }));

if (APPLY) requireServiceKey();

const ids = [...SUBJECTS, SIBLING];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;

// 1. The sibling must still carry the alert date and the blocked trailhead.
const sib = [byId[SIBLING].road && byId[SIBLING].road.status, byId[SIBLING].access && byId[SIBLING].access.closures]
  .filter(v => typeof v === "string").join(" ");
const sibOk = /27 July 2026/.test(sib) && /elbow lake trailhead/i.test(sib) && /milepost 7|MP 7/i.test(sib);
console.log(`${sibOk ? "witness ok  " : "REFUSE      "}${SIBLING} — records the 27 July 2026 alert, MP 7, and the blocked trailhead`);
if (!sibOk) ok = false;

// 2. Each subject must still contradict itself — otherwise the premise has moved and this is not
//    the row described above.
for (const id of SUBJECTS) {
  const rd = byId[id].road || {}, ac = byId[id].access || {};
  const own = [rd.seasonalGate, ac.closures].filter(v => typeof v === "string").join(" ");
  const good = /MP 7/.test(own) && /washout/i.test(own);
  console.log(`${good ? "witness ok  " : "REFUSE      "}${id} — its own fields record the MP 7 washout`);
  if (!good) ok = false;
}
if (!ok) { console.error("\nrefusing — the catalog no longer records what this copies"); process.exit(1); }

const patches = [];
for (const e of EDITS) {
  const obj = { ...byId[e.id][e.col] };
  const cur = obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} — road.status is not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (/\bOpen\b/.test(next)) { console.log(`REFUSE ${e.id} — the result still calls the road open`); ok = false; continue; }
  obj[e.key] = next;
  patches.push({ id: e.id, col: e.col, obj });
  console.log(`\n${e.id}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${next}`);
}
console.log(`\n${patches.length} edit(s)`);
if (!ok) { console.error("refusing to apply while any edit is refused"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches) await patchRow("routes", p.id, { [p.col]: p.obj });

const after = await selectAll("routes", "id,road", `id=in.(${SUBJECTS.join(",")})`);
let bad = 0;
for (const id of SUBJECTS) {
  const v = (after.find(x => x.id === id) || {}).road;
  const s = v && v.status;
  if (typeof s !== "string" || /\bOpen\b/.test(s) || !/27 July 2026/.test(s)) { console.log(`NOT WRITTEN  ${id}`); bad++; }
}
console.log(bad ? `\n${bad} edit(s) did not land` : `\nverified: no Little Sister row now calls FR 38 open.`);
process.exit(bad ? 1 : 0);
