// Re-read every written region from production and compare its blurb to the batch text.
// Usage (worktree root): node audits/area-pages/regions/tools/verify-regions.mjs <fromN> <toN>
import fs from "fs";
import path from "path";
const [from, to] = process.argv.slice(2).map(Number);
const { SUPABASE_URL, headers, anonKey } = await import(path.resolve("scripts/lib/supabase-env.mjs"));
const dir = "audits/area-pages/regions";
const want = {};
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^batch-r(\d+)\.json$/); if (!m || +m[1] < from || +m[1] > to) continue;
  for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))) if (!k.startsWith("_")) want[k] = v.blurb.trim();
}
const ids = Object.keys(want); let ok = 0; const bad = [];
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,blurb&id=in.(${chunk.map(encodeURIComponent).join(",")})`, { headers: headers(anonKey()) });
  const got = Object.fromEntries((await r.json()).map(x => [x.id, x.blurb]));
  for (const id of chunk) (got[id] === want[id] ? ok++ : bad.push(id));
}
console.log(`${ids.length} expected, ${ok} match live, ${bad.length} differ`);
if (bad.length) console.log(bad.join("\n"));
