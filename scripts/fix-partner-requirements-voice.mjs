// One-off (2026-11-26): the Find tab's PARTNER REQUIREMENTS printed the research pipeline talking
// ("not confirmed in sources", "per prior research", "(one estimate)", "reports cite", "one documented
// party", "No route-specific approach time found") and six Fitness specs held grade/rack/length fields
// that printed as "Grade Grade III, ...". Each string was READ and rewritten by hand in our own words,
// same facts (scripts/data/partner-requirements-voice-2026-11-26.json). This applies them.
//
// Per row: read fresh with the service key, save it to a rollback file, set each path, patchRow
// (exactly one row or it throws), pause 1 s, re-read and compare. --dry prints the diff only.
import { readFileSync, writeFileSync } from "node:fs";
import { requireServiceKey, selectAll, patchRow } from "./lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const EDITS = JSON.parse(readFileSync(new URL("./data/partner-requirements-voice-2026-11-26.json", import.meta.url), "utf8"));
const key = requireServiceKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setPath(obj, path, val) {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let t = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (t[parts[i]] == null || typeof t[parts[i]] !== "object") throw new Error(`path ${path}: ${parts[i]} is not an object`);
    t = t[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (!(last in t)) throw new Error(`path ${path}: no ${last} to replace`);
  t[last] = val;
}

const byId = {};
for (const [id, path, val] of EDITS) (byId[id] = byId[id] || []).push([path, val]);
const ids = Object.keys(byId).sort();
const rollback = [];
let done = 0;
for (const id of ids) {
  const rows = await selectAll("routes", "id,partner_requirements", `id=eq.${encodeURIComponent(id)}`, { key });
  if (rows.length !== 1 || !rows[0].partner_requirements) throw new Error(`${id}: expected one row with partner_requirements, got ${rows.length}`);
  const before = rows[0].partner_requirements;
  const after = JSON.parse(JSON.stringify(before));
  for (const [path, val] of byId[id]) setPath(after, path, val);
  if (DRY) { console.log(id, JSON.stringify(byId[id].map((e) => e[0]))); continue; }
  rollback.push({ id, partner_requirements: before });
  writeFileSync(new URL(`./rollback-partner-requirements-voice-${process.env.RUN_TS}.json`, import.meta.url), JSON.stringify(rollback, null, 1));
  await patchRow("routes", id, { partner_requirements: after }, { key });
  await sleep(1000);
  const re = await selectAll("routes", "id,partner_requirements", `id=eq.${encodeURIComponent(id)}`, { key });
  if (JSON.stringify(re[0].partner_requirements) !== JSON.stringify(after)) throw new Error(`${id}: re-read does not match what was written`);
  done++;
  console.log(`ok ${id} (${byId[id].length} field${byId[id].length > 1 ? "s" : ""})`);
}
console.log(DRY ? `dry: ${ids.length} routes` : `wrote and re-read ${done} of ${ids.length} routes`);
