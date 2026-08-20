// Find which column(s) hold a given phrase, across every routes column. Read-only.
//   node scripts/oneoff/probe-find-phrase.mjs "high-occupancy"
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();
const one = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=like.wa_*&approach=not.is.null&limit=1`, { headers: headers(k) })).json();
const cols = Object.keys(one[0] || {});
const NEEDLE = process.argv[2];
if (!NEEDLE) throw new Error("give a phrase");
console.log("searching", cols.length, "columns for:", NEEDLE);
for (const c of cols) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,${c}&${c}=ilike.*${encodeURIComponent(NEEDLE)}*&limit=500`;
  const res = await fetch(url, { headers: headers(k) });
  if (!res.ok) continue;
  const rows = await res.json();
  if (!rows.length) continue;
  console.log(`\n[${c}] ${rows.length} rows`);
  for (const r of rows.slice(0, 3)) {
    const v = r[c];
    const s = typeof v === "string" ? v : JSON.stringify(v);
    console.log(`   ${r.id}: ${String(s).slice(0, 500)}`);
  }
}
