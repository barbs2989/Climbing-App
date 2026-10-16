// Clears `watch_out` on three out-of-state ROCK routes whose whole value belongs to other climbs
// (found by the 2026-09-25 tag audit, #1942). Every line is about a mixed/ice route:
//   co_highrise_buttress_left (CO, 5.10+) and ca_weasel_buttress_left (CA, 5.10a trad) carry a
//     Leavenworth list — "Eightmile Buttress faces east/north", NWAC observations, a GPS fix at
//     47.548,-120.75, "Mixed climbing (M2)", and Bridge Creek Wall's eagle closure;
//   il_hubba_hubba (IL, 5.12d sport) carries an ice-and-avalanche list — "between Doctor Creek
//     and Victoria Creek", rotten ice, melting pillars — plus the same Bridge Creek closure.
// None of these blobs appears on any other route. Nulled, never replaced: the rows hold no
// other prose to write a true hazard from. (Top Gun, the fourth route the audit named, was
// already repaired by #1909 and is not touched.)
//
//   node scripts/oneoff/fix-foreign-watch-out.mjs          (dry run)
//   node scripts/oneoff/fix-foreign-watch-out.mjs --apply
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const FIX = [
  ["co_highrise_buttress_left", "Highrise Buttress Left", "Eightmile Buttress faces east/north"],
  ["ca_weasel_buttress_left", "Weasel Buttress Left", "Eightmile Buttress faces east/north"],
  ["il_hubba_hubba", "Hubba Hubba", "between Doctor Creek and Victoria Creek"],
];
const apply = process.argv.includes("--apply");
const key = requireServiceKey();
const here = path.dirname(fileURLToPath(import.meta.url));

async function read() {
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,name,watch_out&id=in.(${FIX.map(f => f[0]).join(",")})`;
  const res = await fetch(q, { headers: headers(key) });
  const j = await res.json();
  if (!res.ok || !Array.isArray(j)) throw new Error(`read -> ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
  return new Map(j.map(r => [r.id, r]));
}

const live = await read();
if (live.size !== FIX.length) throw new Error(`expected ${FIX.length} rows, read ${live.size} — refusing`);
const todo = [];
for (const [id, name, needle] of FIX) {
  const r = live.get(id);
  if (r.name !== name) throw new Error(`${id}: name is "${r.name}", expected "${name}" — refusing`);
  if (r.watch_out == null) { console.log(`skip  ${id}: already null`); continue; }
  if (!JSON.stringify(r.watch_out).includes(needle)) throw new Error(`${id}: watch_out no longer holds "${needle}" — someone changed it; re-read before clearing`);
  todo.push(id);
  console.log(`${apply ? "clear" : "would clear"} ${id}.watch_out (${JSON.stringify(r.watch_out).length} chars)`);
}
if (!apply) { console.log(`\ndry run: ${todo.length} rows. Re-run with --apply.`); process.exit(0); }
if (!todo.length) process.exit(0);

const backup = path.join(here, `foreign-watch-out-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(backup, JSON.stringify(todo.map(id => ({ id, watch_out: live.get(id).watch_out })), null, 1));
console.log(`backup: ${path.relative(process.cwd(), backup)}`);
for (const id of todo) await patchRow("routes", id, { watch_out: null });

const after = await read();
const bad = todo.filter(id => after.get(id).watch_out != null);
console.log(bad.length ? `NOT LANDED: ${bad.join(", ")}` : `verified: ${todo.length} rows re-read, watch_out is null`);
process.exit(bad.length ? 1 : 0);
