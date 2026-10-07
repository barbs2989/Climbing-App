// strip-area-sort-prefixes.mjs — take the source site's SORT LABEL off area names (2026-10-07).
//
// The owner: "In New York, in the Trapps area, those areas within have letters before it … We
// don't want the letters before the name of the area." The Trapps' fifteen walls read "a1. The
// Uberfall - left" … "l. Sleepy Hollow"; the same import left ~3,900 areas in 49 states and
// provinces labelled "B: …", "(3) …", "12 - …", "* …", "- …". The rule is scripts/lib/area-sort-prefix.mjs,
// shared with the importer so the next import still finds every renamed area.
//
// HELD, not renamed: an area whose stripped name is a SIBLING's name ("(a) Hook" beside "Hook",
// "01. West Side" beside "1. West Side" — 230 groups on 2026-10-07, 220 with climbs in every copy).
// Those are duplicate areas the label was hiding; renaming would print two identical rows, and they
// need a fold (move routes, then delete), not a rename. Listed with --held.
//
//   node scripts/oneoff/strip-area-sort-prefixes.mjs            # dry run: counts + samples
//   node scripts/oneoff/strip-area-sort-prefixes.mjs --held     # print the held duplicate groups
//   node scripts/oneoff/strip-area-sort-prefixes.mjs --apply    # write, with a rollback file, then re-read
//
// Writes need the service key (requireServiceKey). The DB's refuse_duplicate_area trigger (0218)
// re-checks a renamed area against same-named areas within 1.5 km; a refusal is reported, not forced.
import fs from "fs";
import path from "path";
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import { stripSortPrefix } from "../lib/area-sort-prefix.mjs";

const APPLY = process.argv.includes("--apply"), HELD = process.argv.includes("--held");
const KEY = requireServiceKey();
const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);

const areas = await selectAll("areas", "id,name,parent_id,path,route_count", "", { pageSize: 1000, key: KEY });
if (areas.length < 40000) { console.error(`read only ${areas.length} areas — refusing to act on a partial read`); process.exit(2); }

const sibKey = s => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const groups = new Map();
for (const a of areas) { const k = a.parent_id + "|" + sibKey(stripSortPrefix(a.name)); (groups.get(k) || groups.set(k, []).get(k)).push(a); }
const held = [...groups.values()].filter(g => g.length > 1 && g.some(a => stripSortPrefix(a.name) !== a.name));
const heldIds = new Set(held.flat().map(a => a.id));

const todo = areas.map(a => ({ id: a.id, from: a.name, to: stripSortPrefix(a.name), state: String(a.path).split(".")[1] }))
  .filter(x => x.to !== x.from && !heldIds.has(x.id));
const byState = {}; for (const x of todo) byState[x.state] = (byState[x.state] || 0) + 1;
console.log(`${areas.length} areas read; ${todo.length} to rename; ${held.length} duplicate groups held (${heldIds.size} areas)`);
console.log(JSON.stringify(byState));
if (HELD) { for (const g of held) console.log(g.map(a => `${a.id} "${a.name}" (${a.route_count || 0} climbs)`).join("  |  ")); process.exit(0); }
for (const x of todo.filter(x => x.state === "new_york").slice(0, 20)) console.log(`  ${x.from}  ->  ${x.to}`);
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }

const rollbackFile = path.join(ROOT, `scripts/rollback-area-sort-prefixes-${Date.now()}.json`);
fs.writeFileSync(rollbackFile, JSON.stringify(todo.map(({ id, from }) => ({ id, name: from })), null, 1));
console.log("rollback:", path.relative(ROOT, rollbackFile));

const failed = [];
let done = 0;
for (const x of todo) {
  // Guarded by the OLD name too, so a row renamed by someone else meanwhile is left alone.
  try { await patchRow("areas", x.id, { name: x.to }, { filter: `name=eq.${encodeURIComponent(x.from)}` }); done++; }
  catch (e) { failed.push({ ...x, error: e.message.slice(0, 300) }); }
  if ((done + failed.length) % 250 === 0) console.log(`  ${done + failed.length}/${todo.length}`);
}
console.log(`patched ${done}, failed ${failed.length}`);
for (const f of failed) console.log(`  FAILED ${f.id} "${f.from}" -> "${f.to}": ${f.error}`);

// A 200 is not evidence the data changed: re-read and reconcile.
const after = new Map((await selectAll("areas", "id,name", "", { pageSize: 1000, key: KEY })).map(a => [a.id, a.name]));
const wrong = todo.filter(x => !failed.some(f => f.id === x.id) && after.get(x.id) !== x.to);
console.log(`re-read: ${todo.length - failed.length - wrong.length} of ${todo.length - failed.length} patched rows carry the new name`);
for (const w of wrong) console.log(`  MISMATCH ${w.id}: expected "${w.to}", found "${after.get(w.id)}"`);
process.exit(wrong.length ? 1 : 0);
