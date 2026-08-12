// What can actually drive a per-section confidence chip? Read-only survey of the
// columns that claim to carry confidence, over the alpine scope the product targets.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const K = anonKey();
const H = headers(K);

async function count(filter) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&${filter}`, {
    method: "HEAD",
    headers: headers(K, { Prefer: "count=exact", Range: "0-0" }),
  });
  return Number((r.headers.get("content-range") || "/0").split("/")[1]);
}
async function sample(sel, filter, n = 3) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&${filter}&limit=${n}`, { headers: H });
  return r.ok ? r.json() : [{ err: `${r.status} ${await r.text()}` }];
}

const WA = "id=like.wa_*";
const total = await count(WA);
console.log(`WA-prefixed routes: ${total}\n`);

for (const col of ["data_quality", "gear_confidence", "auto_generated", "verif", "source"]) {
  const nn = await count(`${WA}&${col}=not.is.null`);
  console.log(`${col.padEnd(16)} populated on ${String(nn).padStart(6)} / ${total}  (${((nn / total) * 100).toFixed(1)}%)`);
}

console.log("\n--- data_quality shape (3 samples) ---");
for (const r of await sample("id,data_quality", `${WA}&data_quality=not.is.null`))
  console.log(" ", r.id, JSON.stringify(r.data_quality).slice(0, 300));

console.log("\n--- gear_confidence distinct-ish values ---");
for (const r of await sample("id,gear_confidence", `${WA}&gear_confidence=not.is.null`, 8))
  console.log(" ", r.id, JSON.stringify(r.gear_confidence));

console.log("\n--- does anything carry a PER-SECTION rating? ---");
for (const r of await sample("id,data_quality", `${WA}&data_quality=not.is.null`, 25)) {
  const dq = r.data_quality;
  if (dq && typeof dq === "object") {
    const keys = Object.keys(dq);
    if (keys.length > 3) { console.log(" ", r.id, "keys:", keys.join(",")); break; }
  }
}
