// check:generic-area-names — is any area named only by DISCIPLINE, not by place?
//
// 2026-10-07, the owner: "I notice in many areas that an area will be just called bouldering, ice
// climbing, mixed, etc. these are too generic. The climbs need to be in specific named areas not just
// generic names." Measured that day: 147 areas — "Bouldering" (37 of them), "Other Climbs", "Misc",
// "Routes", "Ice", "Boulders, The", and seven STATE buckets ("CO Ice & Mixed" 1,163 climbs, "CT
// Bouldering" 1,823, "NH Ice and Mixed", "VT Ice and Mixed", "Ontario Ice and Mixed", "Quebec Ice,
// Mixed & Alpine", "CT Ice Climbing"). Worst case: Illinois > Ice Climbing > Jackson Falls — the
// state's biggest ROCK area, 566 climbs, filed under an ice bucket. The fold re-homed every one (see
// the migration that cites this guard); this asks the same rule of every area, daily, while the import
// is still adding states.
//
// The rule is ONE function, scripts/lib/generic-area-name.mjs, shared with the importer (which steps
// THROUGH a generic level of the source's path rather than re-creating it). What it deliberately does
// NOT call generic is written there: a name that also names a place ("Smith Rock Bouldering"), a single
// feature ("Sport Wall", "Dry Wall"), a name with a number ("Boulder 3").
//
// EXEMPT, listed with a reason each: scripts/data/generic-area-names-exempt.json — names the rule
// matches that are, on reading, the place's real name ("The General" at Dedham, beside The Captain,
// The Colonel, The Major and The Private). An exempt id whose name changed is reported, so the list
// cannot silently cover a different name.
//
// What it cannot see: a generic word the vocabulary lacks, a bucket spelled with a feature noun
// ("Alpine Rock" — Colorado's was folded by hand; elsewhere "Alpine Rock" is a real formation), and a
// generic level the importer CREATES under a different spelling.
//
//   npm run check:generic-area-names        exit 1 on a generic name not on the exempt list
//
// Credentials: anon key; `areas` is publicly readable. No DB link needed, so it runs daily in CI.
import fs from "fs";
import path from "path";
import { selectAll } from "./lib/supabase-env.mjs";
import { genericAreaName } from "./lib/generic-area-name.mjs";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const EXEMPT = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/data/generic-area-names-exempt.json"), "utf8")).exempt;

await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1 });   // cold start: see check-area-counts.mjs
const areas = await selectAll("areas", "id,name,parent_id,route_count", "", { pageSize: 1000 });
if (areas.length < 40000) { console.error(`check:generic-area-names: read only ${areas.length} areas — an empty read is not a clean catalog`); process.exit(2); }

const byId = new Map(areas.map(a => [a.id, a]));
const ancestors = a => { const out = []; for (let p = byId.get(a.parent_id), n = 0; p && n < 40; p = byId.get(p.parent_id), n++) out.push(p.name); return out; };
const crumb = a => ancestors(a).reverse().concat(a.name).join(" > ");
const generic = areas.map(a => ({ a, why: genericAreaName(a.name, ancestors(a)) })).filter(x => x.why);
const fresh = generic.filter(({ a }) => !(a.id in EXEMPT && EXEMPT[a.id].name === a.name));
const stale = Object.entries(EXEMPT).filter(([id, e]) => !byId.has(id) || byId.get(id).name !== e.name);

console.log(`areas=${areas.length}  generic names=${generic.length}  (exempt, read as real names: ${generic.length - fresh.length})`);
if (stale.length) console.log(`  exempt ids gone or renamed — remove them from the list: ${stale.map(([id]) => id).join(", ")}`);
if (fresh.length) {
  console.error(`\ncheck:generic-area-names FAILED — ${fresh.length} area(s) named only by discipline:`);
  for (const { a, why } of fresh.slice(0, 60)) console.error(`  ${a.id}  (${a.route_count} climbs)  ${crumb(a)}   — ${why}`);
  if (fresh.length > 60) console.error(`  … and ${fresh.length - 60} more`);
  console.error(`\nRe-home their climbs in the named place they are at (fold a sub-area grouping into its parent;
research a catch-all's climbs onto their real walls/boulders). If the name IS the place's real name,
add it to scripts/data/generic-area-names-exempt.json with the reason. If an import created it, the
importer is not stepping through generic levels (scripts/lib/generic-area-name.mjs).`);
  process.exit(1);
}
console.log("check:generic-area-names: ok — every area is named for a place.");
