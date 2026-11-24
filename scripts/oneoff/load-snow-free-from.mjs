// Loads the seasonal snow review into routes.snow_free_from (migration 0532), with the snow_in_season /
// glacier_travel answers that review settled (research-data/glacier-travel-2026-11-23/SEASONAL-RULE.md).
//
// Owner, 2026-11-24: "Forbidden West Ridge for example has 2 routes to get to the ridge and one of them is the
// couloir which is early season snow only, and then when it melts out you have to take the Cat Scratch Gully."
//   seasonal/final-seasonal.json  one row per route: { id, glacier_travel, snow_in_season, snow_free_from }
//                                 (built by seasonal/merge.mjs + seasonal/apply-web.mjs; null = not settled)
//
//   node scripts/oneoff/load-snow-free-from.mjs --dry   # what would change, no writes
//   node scripts/oneoff/load-snow-free-from.mjs         # write (paced by patchRow), then re-read and reconcile
//
// Re-runnable: a row already holding its target is skipped. scripts/oneoff/load-glacier-travel.mjs applies the same
// file on top of final.json, so re-running that older load does not undo this one.
import "../lib/load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const COLS = ["glacier_travel", "snow_in_season", "snow_free_from"];
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, "research-data", "glacier-travel-2026-11-23", "seasonal", "final-seasonal.json"), "utf8"));
const want = new Map();
for (const r of rows) {
  if (r.snow_free_from != null && !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(r.snow_free_from)) throw new Error(r.id + ": bad date " + r.snow_free_from);
  if (r.snow_free_from && r.snow_in_season !== "yes") throw new Error(r.id + ": a snow-free date needs snow_in_season yes");
  if (r.glacier_travel === "yes" && r.snow_in_season !== "yes") throw new Error(r.id + ": glacier yes needs snow yes");
  want.set(r.id, Object.fromEntries(COLS.map((c) => [c, r[c] == null ? null : r[c]])));
}
console.log(`targets: ${want.size} routes, ${rows.filter((r) => r.snow_free_from).length} with a snow-free date`);

async function read(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const list = ids.slice(i, i + 100).map((x) => `"${x}"`).join(",");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${COLS.join(",")}&id=in.(${encodeURIComponent(list)})`, { headers: headers(key) });
    const got = await res.json();
    if (!res.ok || !Array.isArray(got)) throw new Error("read -> " + res.status + " " + JSON.stringify(got).slice(0, 200));
    got.forEach((r) => out.set(r.id, r));
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}
const same = (have, w) => have && COLS.every((c) => (have[c] || null) === w[c]);

const ids = [...want.keys()];
const before = await read(ids);
const missing = ids.filter((id) => !before.has(id));
const todo = ids.filter((id) => before.has(id) && !same(before.get(id), want.get(id)));
console.log(`in the catalog: ${before.size}; no longer there: ${missing.length}${missing.length ? " (" + missing.slice(0, 8).join(", ") + ")" : ""}; already at target: ${before.size - todo.length}; to write: ${todo.length}`);
if (DRY) { for (const id of todo.slice(0, 12)) console.log("  ", id, JSON.stringify(before.get(id)), "->", JSON.stringify(want.get(id))); console.log("--dry: nothing written."); process.exit(0); }

if (todo.length) {
  const rb = path.join(ROOT, "scripts", "oneoff", `rollback-snow-free-from-${Date.now()}.json`);
  fs.writeFileSync(rb, JSON.stringify(todo.map((id) => ({ id, before: Object.fromEntries(COLS.map((c) => [c, before.get(id)[c] ?? null])), after: want.get(id) })), null, 1));
  console.log("rollback:", path.relative(ROOT, rb));
  let n = 0;
  for (const id of todo) {
    await patchRow("routes", id, want.get(id), { filter: `select=id,${COLS.join(",")}` });
    if (++n % 50 === 0) console.log(`  ${n}/${todo.length}`);
  }
}

// A 200 is not evidence the data changed: re-read every target and reconcile.
const after = await read(ids);
const wrong = ids.filter((id) => after.has(id) && !same(after.get(id), want.get(id)));
console.log(`re-read ${after.size} rows: ${[...after.values()].filter((r) => r.snow_free_from).length} hold a snow-free date`);
if (wrong.length) { console.error(`RECONCILE FAILED: ${wrong.length} rows do not hold their target (${wrong.slice(0, 8).join(", ")})`); process.exit(1); }
console.log("reconciled: every row in the catalog holds its target.");
