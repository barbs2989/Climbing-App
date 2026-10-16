// What does what_to_bring actually contain, and how much of it duplicates the standard
// per-discipline kit the gear box already prints? Read-only — this decides how the merge
// has to dedupe, since a normalise-and-compare that is too loose merges real distinctions
// ("60m rope" vs "two 60m ropes") and one too tight prints Helmet twice.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,what_to_bring&what_to_bring=not.is.null&id=like.wa_*&limit=40`,
  { headers: headers(k) }
);
const rows = await res.json();
console.log("rows:", rows.length);
const counts = new Map();
for (const r of rows.slice(0, 12)) {
  console.log(`\n--- ${r.id} (${r.discipline})`);
  const wb = Array.isArray(r.what_to_bring) ? r.what_to_bring : [r.what_to_bring];
  for (const item of wb) console.log("    •", item);
}
for (const r of rows) {
  const wb = Array.isArray(r.what_to_bring) ? r.what_to_bring : [];
  for (const item of wb) {
    const key = String(item).toLowerCase().trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}
console.log("\n=== most repeated entries across the sample ===");
[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([t, n]) => console.log(`  ${n}x  ${t}`));
