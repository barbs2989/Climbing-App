// Batch 1, second pass: every camp on the 49 linked routes goes with the way(s) in that use it.
//
// The first pass copied camps onto a way in by NAME match, and left the way in the row itself
// describes showing the row's whole camp list — which on these routes was written for the whole
// climb, so it held the other way in's camps too (Stuart's North Ridge listed Goat Pass, the
// south-side camp, under the Mountaineer Creek approach). Each camp was read against each way in
// and assigned to every way in that uses it; a shared high camp goes on all of them.
//   - a way in with its own trailhead (`trip`) gets `trip.bivy` = its camps, copied whole;
//   - the way in the row describes gets `camps` = the names it keeps (lib/approaches.js);
//   - a camp no way in uses (a descent camp) stays on every one — it is still on the trip.
//
//   node scripts/oneoff/multi-approach-batch1-camps.mjs [--write | --rollback]
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const MAP = JSON.parse(fs.readFileSync(new URL("./multi-approach-batch1-camps.json", import.meta.url), "utf8"));
const BEFORE = new URL("./multi-approach-batch1-camps.before.json", import.meta.url);
const key = requireServiceKey();
const ids = Object.keys(MAP);
const rows = [];
for (let i = 0; i < ids.length; i += 25) rows.push(...(await selectAll("routes", "id,approach_variants,bivy", `id=in.(${ids.slice(i, i + 25).join(",")})`, { key })));
if (process.argv.includes("--rollback")) {
  const b = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  for (const [id, v] of Object.entries(b)) await patchRow("routes", id, { approach_variants: v });
  console.log("rolled back", Object.keys(b).length); process.exit(0);
}
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
const problems = [], next = {}, before = {};
for (const id of ids) {
  const row = rows.find((r) => r.id === id);
  const camps = Array.isArray(row.bivy) ? row.bivy : [];
  const vars = (row.approach_variants || []).map((v) => ({ ...v, ...(v.trip ? { trip: { ...v.trip } } : {}) }));
  const m = MAP[id];
  for (const n of Object.keys(m)) if (!camps.some((c) => c && c.name === n)) problems.push(`${id}: no camp named "${n}"`);
  for (const c of camps) if (c && c.name && !(c.name in m)) problems.push(`${id}: camp "${c.name}" not classified`);
  const usedBy = (i) => camps.filter((c) => c && c.name && (m[c.name] || []).length === 0 || (m[c.name] || []).includes(i));
  const si = vars.findIndex((v) => v.storedRow === true), pi = vars.findIndex((v) => v.primary === true);
  const main = si >= 0 ? si : pi >= 0 ? pi : 0;
  const lines = [];
  vars.forEach((v, i) => {
    if (v.viaRouteId) return;
    const mine = usedBy(i);
    if (v.trip) { if (mine.length) v.trip.bivy = mine; else delete v.trip.bivy; lines.push(`   [${i}] ${v.name.slice(0, 60)} → ${mine.map((c) => c.name).join(" / ") || "(none)"}`); }
    else if (i === main && vars.some((x) => x.trip || x.viaRouteId)) { v.camps = mine.map((c) => c.name); lines.push(`   [${i}]* ${v.name.slice(0, 60)} → ${v.camps.join(" / ") || "(none)"}`); }
  });
  if (JSON.stringify(canon(vars)) === JSON.stringify(canon(row.approach_variants))) continue;
  before[id] = row.approach_variants; next[id] = vars;
  console.log(`\n${id}\n${lines.join("\n")}`);
}
if (problems.length) { console.log("\nPROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
if (!process.argv.includes("--write")) { console.log(`\ndry run: ${Object.keys(next).length} rows — pass --write`); process.exit(0); }
if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1));
for (const [id, v] of Object.entries(next)) await patchRow("routes", id, { approach_variants: v });
const after = [];
for (let i = 0; i < ids.length; i += 25) after.push(...(await selectAll("routes", "id,approach_variants", `id=in.(${ids.slice(i, i + 25).join(",")})`, { key })));
let bad = 0;
for (const [id, v] of Object.entries(next)) if (JSON.stringify(canon(after.find((r) => r.id === id).approach_variants)) !== JSON.stringify(canon(v))) { bad++; console.log("RE-READ MISMATCH", id); }
console.log(`written ${Object.keys(next).length}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
