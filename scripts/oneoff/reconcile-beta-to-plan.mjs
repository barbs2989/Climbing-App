#!/usr/bin/env node
/* Re-read every route apply-beta-to-plan.mjs wrote (the ids in scripts/rollback-beta-to-plan-*.json) and
   confirm each patched column now differs from its saved before-value: a 200 is not evidence a row changed. */
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const K = requireServiceKey();
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x);
const rb = fs.readdirSync("scripts").filter((f) => /^rollback-beta-to-plan-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join("scripts", f), "utf8")));
const ids = rb.map((x) => x.id); let ok = 0; const bad = [];
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,beta,approach,descent,descent_text,rack_items,detailed_rack,rack,bolts,anchor,location,bivy&id=in.(${b.map(encodeURIComponent).join(",")})`, { headers: headers(K), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`read ${r.status}`);
  const rows = await r.json();
  for (const x of rb.filter((y) => b.includes(y.id))) {
    const row = rows.find((q) => q.id === x.id); if (!row) { bad.push(x.id + " missing"); continue; }
    const same = Object.keys(x.before).filter((k) => canon(row[k] ?? null) === canon(x.before[k] ?? null));
    if (same.length) bad.push(x.id + " unchanged: " + same.join(",")); else ok++;
  }
  await new Promise((res) => setTimeout(res, 300));
}
console.log(`rows written ${ids.length} · distinct ${new Set(ids).size} · every patched column changed on ${ok} · problems ${bad.length}`);
for (const b of bad) console.log("  " + b);
