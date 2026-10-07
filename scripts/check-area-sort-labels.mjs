// check:area-sort-labels — does any area name still carry a source site's SORT LABEL?
//
// 2026-10-07, the owner: "In New York, in the Trapps area, those areas within have letters before
// it … We don't want the letters before the name of the area." The Trapps' walls read "a1. The
// Uberfall - left" … "l. Sleepy Hollow" — the export's own ordering label, imported verbatim, and
// ~3,900 areas across 49 states and provinces carried one ("B: …", "(3) …", "12 - …", "* …").
// scripts/oneoff/strip-area-sort-prefixes.mjs took them off; the importer (import-route-grades.mjs)
// strips them as it creates. The rule is ONE function, scripts/lib/area-sort-prefix.mjs, and this
// asks it of every area, daily, while the import is still adding states.
//
// LISTED, not failed: the areas whose stripped name is a SIBLING's name ("(a) Hook" beside "Hook").
// They are duplicate areas the label was hiding and need a fold, not a rename, so they keep the
// label until folded — scripts/data/area-sort-labels-held.json. A LIST, not a count. A listed area
// that no longer carries a label (folded, or renamed) is reported so the list can shrink.
//
// What it cannot see: a label spelling the function does not know, and a ROUTE name — 1,184 route
// names carry a topo number ("(01) Chicken Crack"), but route names also hold real initials
// ("R. Crumb", "T. Rex"), so they were not swept with the same rule.
//
//   npm run check:area-sort-labels                    exit 1 on a labelled area not on the list
//   npm run check:area-sort-labels -- --write-held    re-list today's held areas (only after a fold)
//
// Credentials: anon key; `areas` is publicly readable. No DB link needed, so it runs daily in CI.
import fs from "fs";
import path from "path";
import { selectAll } from "./lib/supabase-env.mjs";
import { stripSortPrefix } from "./lib/area-sort-prefix.mjs";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const HELD = path.join(ROOT, "scripts/data/area-sort-labels-held.json");
const WRITE = process.argv.includes("--write-held");

await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1 });   // cold start: see check-area-counts.mjs
const areas = await selectAll("areas", "id,name,parent_id", "", { pageSize: 1000 });
if (areas.length < 40000) { console.error(`check:area-sort-labels: read only ${areas.length} areas — an empty read is not a clean catalog`); process.exit(2); }

const labelled = areas.filter(a => stripSortPrefix(a.name) !== a.name);
if (WRITE) {
  const sibKey = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const n = new Map(); for (const a of areas) { const k = a.parent_id + "|" + sibKey(stripSortPrefix(a.name)); n.set(k, (n.get(k) || 0) + 1); }
  const held = Object.fromEntries(labelled.filter(a => n.get(a.parent_id + "|" + sibKey(stripSortPrefix(a.name))) > 1).sort((x, y) => x.id < y.id ? -1 : 1).map(a => [a.id, a.name]));
  fs.writeFileSync(HELD, JSON.stringify({ written: new Date().toISOString().slice(0, 10), held }, null, 1) + "\n");
  console.log(`wrote ${Object.keys(held).length} held areas (labelled, and a sibling has the stripped name) to ${path.relative(ROOT, HELD)}`);
  process.exit(0);
}
const held = JSON.parse(fs.readFileSync(HELD, "utf8")).held;
const fresh = labelled.filter(a => !(a.id in held));
const gone = Object.keys(held).filter(id => !labelled.some(a => a.id === id));
console.log(`areas=${areas.length}  labelled=${labelled.length}  (held for a fold ${Object.keys(held).length}, ${gone.length} since gone)`);
if (gone.length) console.log(`  no longer labelled — re-run with --write-held to shrink the list: ${gone.slice(0, 10).join(", ")}${gone.length > 10 ? " …" : ""}`);
if (fresh.length) {
  console.error(`\ncheck:area-sort-labels FAILED — ${fresh.length} area name(s) carry a sort label:`);
  for (const a of fresh.slice(0, 60)) console.error(`  ${a.id}   "${a.name}"  ->  "${stripSortPrefix(a.name)}"`);
  if (fresh.length > 60) console.error(`  … and ${fresh.length - 60} more`);
  console.error(`\nRename them: node scripts/oneoff/strip-area-sort-prefixes.mjs (dry run first). If an import added
them, the importer is not calling stripSortPrefix on the level it created.`);
  process.exit(1);
}
console.log("check:area-sort-labels: ok — no area name carries a sort label beyond the duplicates held for a fold.");
