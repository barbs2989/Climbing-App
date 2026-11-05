// Re-read every written tier-20 area from production and compare blurb to the batch text.
// Usage: node verify.mjs <worktree> <fromN> <toN>
import fs from "fs";
import path from "path";
const [wt, from, to] = process.argv.slice(2);
const { SUPABASE_URL, headers, anonKey } = await import(path.join(wt, "scripts/lib/supabase-env.mjs"));
const dir = path.join(wt, "audits/area-pages/tier10");
const want = {};
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^batch-v(\d+)-/); if (!m || +m[1] < +from || +m[1] > +to) continue;
  for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))) if (!k.startsWith("_")) want[k] = v.blurb;
}
const ids = Object.keys(want); let ok = 0, bad = [];
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,blurb&id=in.(${chunk.map(encodeURIComponent).join(",")})`, { headers: headers(anonKey()) });
  const rows = await r.json();
  const got = Object.fromEntries(rows.map(x => [x.id, x.blurb]));
  for (const id of chunk) (got[id] === want[id] ? ok++ : bad.push(id));
}
console.log(`${ids.length} expected, ${ok} match live, ${bad.length} differ`);
if (bad.length) console.log(bad.join("\n"));
