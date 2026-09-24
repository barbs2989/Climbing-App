#!/usr/bin/env node
// Is 0190 applied, backfilled, and does the DATABASE's spelling rule equal lib/search.js's?
//
// check:search-norm compares the two TABLES statically; this compares OUTPUTS on real names,
// which is the only thing that catches a difference in the parts no table expresses (how
// punctuation splits words, what `lower()` does to a letter JS lowercases differently).
// Read-only, anon key. Exits 1 on any disagreement, on unbackfilled rows, or if the reported
// cases do not come back — and says "NOT APPLIED" rather than failing obscurely if the column
// is missing.
import path from "path";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const { searchNorm } = await import(path.resolve("lib/search.js"));
const H = headers(anonKey());
const get = async (q) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: H });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t);
};
const rpc = async (fn, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t);
};
let bad = 0;
try { await get("areas?select=name_search&limit=1"); }
catch (e) { console.log("NOT APPLIED — areas.name_search is not readable:", e.message); process.exit(1); }

for (const table of ["areas", "routes"]) {
  const nulls = await get(`${table}?select=id&name_search=is.null&limit=5`);
  if (nulls.length) { bad++; console.log(`${table}: rows with name_search NULL remain (backfill incomplete), e.g. ${nulls.map((x) => x.id).join(", ")}`); }
  // Names with punctuation, accents and abbreviations are where the two halves could differ.
  for (const f of ["name=ilike.*'*", "name=ilike.*.*", "name=ilike.*-*", "name=like.*é*", "name=ilike.mt *", "name=ilike.* st.*", "name=ilike.* ne *"]) {
    const rows = await get(`${table}?select=name,name_search&${f}&limit=300`);
    for (const r of rows) {
      if (r.name_search != null && r.name_search !== searchNorm(r.name)) {
        bad++; if (bad < 20) console.log(`${table} DIFFERS: ${JSON.stringify(r.name)} db=${JSON.stringify(r.name_search)} js=${JSON.stringify(searchNorm(r.name))}`);
      }
    }
  }
}
const expect = async (q, want) => {
  const rows = await rpc("areas_in_subtree", { root_id: "washington", q, lim: 5 });
  const hit = rows.findIndex((r) => r.name === want);
  console.log(`areas_in_subtree("${q}") -> ${rows.map((r) => r.name).join(" | ")}`);
  if (hit < 0) { bad++; console.log(`  MISSING: expected "${want}"`); }
};
await expect("mt baker", "Mount Baker");
await expect("mount st helens", "Mount St. Helens");
await expect("mt rainer", "Mount Rainier");
const fz = await rpc("search_names_fuzzy", { q: "shucksan", lim: 3 });
console.log(`search_names_fuzzy("shucksan") -> ${fz.map((x) => x.kind + ":" + x.name).join(" | ")}`);
if (!fz.some((x) => /shuksan/i.test(x.name))) { bad++; console.log("  MISSING: a Shuksan row"); }
console.log(bad ? `FAILED (${bad})` : "OK — 0190 applied, backfilled, and the DB agrees with lib/search.js");
process.exit(bad ? 1 : 0);
