// A route in the Olympics told its cell coverage is unreliable in the North Cascades.
//
// wa_east_ridge sits on Steeple Rock, area path usa.washington.wa_olympics.wa_olympic_np.wa_steeple_rock
// — Olympic National Park. Its `comms` reads:
//
//   "Cell service is unreliable throughout NORTH CASCADES NATIONAL PARK backcountry; a satellite
//    communicator is recommended."
//
// The advice is true and useful; the park is 115 miles away. The row itself knows better: both
// access.land_manager and access.landManager say "National Park Service — Olympic National Park".
//
// FOUND BY audit:identity's SECTION 8, which is worth recording because that audit already existed and
// this was its single new finding for Washington. Its whole output for the state is one item, and this
// is it — a reminder that a report-only audit with a short list is not a quiet audit.
//
// THE CLASS IS ONE, MEASURED. 30 WA rows cite North Cascades National Park in `comms`; 29 are on areas
// genuinely inside a North Cascades subtree, and this is the only foreign one. So no detector is
// warranted — a detector for a class of one is the thing this repo keeps declining to build — and the
// measurement is what makes the single repair safe rather than a guess.
//
// THE PARK NAME IS COPIED FROM THE ROW, not typed: the script reads it out of the row's own
// land_manager fields at apply time, requires BOTH spellings to agree on it, and requires the row's area
// path to place it outside the park `comms` names. So a route legitimately in two jurisdictions, or one
// whose land-manager fields disagree with each other, is refused rather than rewritten.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const PARK = /\b((?:[A-Z][\w'’-]*\s+){1,3}National Park)\b/;
// area-path fragments that place a row inside each park, so "outside" is resolved from the tree
const SUBTREE = {
  "North Cascades National Park": /north_cascades|noca|ross_lake|stephen_mather/,
  "Olympic National Park": /olympic/,
  "Mount Rainier National Park": /rainier/,
};

const rows = await selectAll("routes", "id,area_id,comms,access", "id=like.wa_*", { pageSize: 1000 });
const areas = await selectAll("areas", "id,name,path", "", { pageSize: 1000 });
const A = new Map(areas.map(a => [a.id, a]));
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], held = [];
let citing = 0;
for (const r of rows) {
  const comms = typeof r.comms === "string" ? r.comms : "";
  const m = comms.match(PARK);
  if (!m) continue;
  const named = m[1];
  citing++;
  const path = String(A.get(r.area_id)?.path || "").toLowerCase();
  const re = SUBTREE[named];
  if (!re) { held.push({ id: r.id, why: `no subtree rule for ${named} — cannot say whether the row is in it` }); continue; }
  if (re.test(path)) continue;                       // the row IS in the park it names
  // the row's own two land-manager spellings must AGREE on a different park
  const lm = String(r.access?.land_manager || ""), lmc = String(r.access?.landManager || "");
  const p1 = (lm.match(PARK) || [])[1], p2 = (lmc.match(PARK) || [])[1];
  if (!p1 || !p2 || p1 !== p2) { held.push({ id: r.id, why: "the row's two land-manager fields do not agree on one park" }); continue; }
  if (p1 === named) { held.push({ id: r.id, why: "the land manager names the same park as comms" }); continue; }
  const own = SUBTREE[p1];
  if (!own || !own.test(path)) { held.push({ id: r.id, why: `the area path does not place this row in ${p1} either` }); continue; }
  const after = comms.split(named).join(p1);
  if (after === comms) { held.push({ id: r.id, why: "the substitution changed nothing" }); continue; }
  console.log(`\n  ${r.id}   area: ${A.get(r.area_id)?.name}`);
  console.log(`     path        : ${path.slice(0, 78)}`);
  console.log(`     land_manager: ${JSON.stringify(lm.slice(0, 90))}`);
  console.log(`     landManager : ${JSON.stringify(lmc.slice(0, 90))}`);
  console.log(`     comms from  : ${JSON.stringify(comms.slice(0, 150))}`);
  console.log(`     comms to    : ${JSON.stringify(after.slice(0, 150))}`);
  plan.push({ id: r.id, to: after });
}

console.log(`\nrows whose comms names a national park: ${citing}`);
console.log(`rows to repair: ${plan.length}`);
console.log(`held back: ${held.length}`);
for (const h of held.slice(0, 6)) console.log(`   HELD ${h.id} — ${h.why}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { comms: p.to });
const after = await selectAll("routes", "id,comms", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let ok = 0;
for (const r of after) { const p = plan.find(x => x.id === r.id); if (String(r.comms) === p.to) ok++; else console.log(`NOT APPLIED — ${r.id}`); }
console.log(`\nverified: ${ok} of ${plan.length} rows now name the park their own land manager names`);
