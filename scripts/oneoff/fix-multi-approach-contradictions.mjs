// The multi-approach research found 10 routes whose own row disagrees with itself about where the
// walk starts (a trailhead name or pin that is not the one the approach, timing or road describe).
// Each patch below was built from a fresh read of the row, so every key it does not touch is kept;
// Liberty Bell East Face is not here — that row was retired into Lexington Tower East Face (#2116).
//
//   node scripts/oneoff/fix-multi-approach-contradictions.mjs [--write | --rollback]
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const PATCHES = JSON.parse(fs.readFileSync(new URL("./fix-multi-approach-contradictions.json", import.meta.url), "utf8")).filter((p) => p.patch && Object.keys(p.patch).length);
const BEFORE = new URL("./fix-multi-approach-contradictions.before.json", import.meta.url);
const key = requireServiceKey();
const SOURCEY = /https?:|www\.|\.com\b|\.org\b|mountain ?project|summitpost|peakbagger|wta\b|trails association|cascadeclimbers|caltopo|trip report|guidebook|according to|research|web ?page|website|\bnps\b/i;
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
const cols = [...new Set(["id", ...PATCHES.flatMap((p) => Object.keys(p.patch))])].join(",");
const ids = PATCHES.map((p) => p.id);
const read = () => selectAll("routes", cols, `id=in.(${ids.join(",")})`, { key });

if (process.argv.includes("--rollback")) {
  const b = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  for (const [id, v] of Object.entries(b)) await patchRow("routes", id, v);
  console.log("rolled back", Object.keys(b).length); process.exit(0);
}
const rows = await read();
const problems = [], before = {};
const walk = (v, path, id) => { if (typeof v === "string") { if (SOURCEY.test(v)) problems.push(`${id}${path}: names a source: "${v.slice(0, 90)}"`); } else if (v && typeof v === "object") for (const k in v) walk(v[k], `${path}.${k}`, id); };
for (const p of PATCHES) {
  const row = rows.find((r) => r.id === p.id);
  if (!row) { problems.push(`${p.id}: row missing`); continue; }
  walk(p.patch, "", p.id);
  before[p.id] = Object.fromEntries(Object.keys(p.patch).map((k) => [k, row[k]]));
  console.log(`${p.id}  [${Object.keys(p.patch).join(", ")}]  ${p.why.slice(0, 150)}`);
}
if (problems.length) { console.log("\nPROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
if (!process.argv.includes("--write")) { console.log(`\ndry run: ${PATCHES.length} rows would change — pass --write`); process.exit(0); }
if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1));
for (const p of PATCHES) await patchRow("routes", p.id, p.patch);
const after = await read();
let bad = 0;
for (const p of PATCHES) {
  const a = after.find((r) => r.id === p.id);
  for (const k of Object.keys(p.patch)) if (JSON.stringify(canon(a[k])) !== JSON.stringify(canon(p.patch[k]))) { bad++; console.log("RE-READ MISMATCH", p.id, k); }
}
console.log(`written ${PATCHES.length}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
