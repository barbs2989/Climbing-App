// Beverly Creek: the window is in access.closures and the two flagged fields do not cite it.
//
// The same shape as FR 6200 and Suiattle — a row that already holds the closure's own end date in
// one field, while the fields audit:expiring-closures flags say only "currently" and "as of 2026".
// Copying the date across makes those claims SELF-LIMITING, which is the form the audit accepts.
//
// The window matters more here than in the other two clusters, because this order expires soonest:
// the 2025 Labor Mountain Fire order runs 20 May - 31 Dec 2026, so "currently closed" has about four
// months of life left in it. A reader in 2027 has no way to tell.
//
// THE WIDER TEANAWAY PICTURE IS DELIBERATELY NOT WRITTEN HERE, and the reason is on the record:
// a Three Queens Fire closure (order 06-17-03-2026-32, through 31 Oct 2026) is currently shutting
// trails in this drainage, and writing a moving fire closure into a column nothing re-reads is the
// exact defect audit:expiring-closures exists to catch. Same refusal as the Little Giant Fire order
// on FR 6200. [[stale-closure-grind-is-half-viable-and-blind-to-missing-ones]]
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const WINDOW = "effective May 20 through December 31, 2026";

// Each edited row is its OWN witness: the date being copied is already in that row's access.closures,
// so nothing is carried in from outside the record being edited.
const SUBJECTS = ["wa_argonaut_peak_east_ridge", "wa_south_face_12"];
const WITNESS_RE = /May 20\s*[-–—]\s*Dec(?:ember)? 31,? 2026/i;

const EDITS = SUBJECTS.flatMap(id => [
  { id, col: "road", key: "status",
    find: "Currently closed (see closures);",
    repl: `Closed under the 2025 Labor Mountain Fire order, ${WINDOW} (see closures);` },
  { id, col: "road", key: "seasonalGate",
    find: "as of 2026 the road and trail are also closed for wildfire-damage repair.",
    repl: `the road and trail are also closed for Labor Mountain Fire damage repair, ${WINDOW}.` },
]);

if (APPLY) requireServiceKey();

const rows = await selectAll("routes", "id,road,access", `id=in.(${SUBJECTS.join(",")})`);
if (rows.length !== SUBJECTS.length) { console.error(`read ${rows.length} of ${SUBJECTS.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;
for (const id of SUBJECTS) {
  const v = byId[id].access && byId[id].access.closures;
  const good = typeof v === "string" && WITNESS_RE.test(v);
  console.log(`${good ? "witness ok  " : "REFUSE      "}${id} access.closures — records the order's own window`);
  if (!good) ok = false;
}
if (!ok) { console.error("\nrefusing — the row no longer records the window this copies"); process.exit(1); }

const patches = new Map();
for (const e of EDITS) {
  const key = `${e.id}|${e.col}`;
  const working = patches.get(key) || { id: e.id, col: e.col, obj: { ...byId[e.id][e.col] } };
  const cur = working.obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (!/December 31, 2026/.test(next)) { console.log(`REFUSE ${e.id} — result carries no end date`); ok = false; continue; }
  working.obj[e.key] = next;
  patches.set(key, working);
  console.log(`\n${e.id}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${next}`);
}
console.log(`\n${EDITS.length} edit(s) across ${patches.size} row-object(s)`);
if (!ok) { console.error("refusing to apply while any edit is refused"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches.values()) await patchRow("routes", p.id, { [p.col]: p.obj });

const after = await selectAll("routes", "id,road", `id=in.(${SUBJECTS.join(",")})`);
let bad = 0;
for (const e of EDITS) {
  const r = after.find(x => x.id === e.id);
  const v = r && r.road && r.road[e.key];
  if (typeof v !== "string" || !/December 31, 2026/.test(v)) { console.log(`NOT WRITTEN  ${e.id} road.${e.key}`); bad++; }
}
console.log(bad ? `\n${bad} edit(s) did not land` : `\nverified: both rows now state the order's own end date.`);
process.exit(bad ? 1 : 0);
