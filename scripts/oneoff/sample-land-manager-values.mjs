// What does access.land_manager actually hold, and could it drive the permit link better than
// keyword-matching prose?
//
// Context: the permit link picked an agency by running keyword .test() over free text, and got
// 1,308 of 1,941 routes wrong (67%) — 1,282 pointed at Mount Rainier NP on the strength of
// their own text saying "not Mount Rainier NP". That was fixed with negation-aware matching,
// but a STRUCTURED agency field would make the guess unnecessary on any route that has one.
// This asks whether land_manager is that field: is it a small controlled vocabulary, or prose?
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

async function page(cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [500, 300, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,access&access=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return { rows: JSON.parse(await r.text()), limit };
    const b = (await r.text()).slice(0, 70);
    console.log(`  limit=${limit} -> ${r.status} ${b.includes("57014") ? "(timeout, smaller)" : b}`);
  }
  throw new Error("no page size worked");
}
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.rows.length) break; rows.push(...p.rows); cursor = p.rows[p.rows.length - 1].id; if (p.rows.length < p.limit) break; }
console.log("routes with access:", rows.length);
if (!rows.length) { console.error("read zero rows — failing closed"); process.exit(1); }

const vals = new Map(), lens = [];
for (const r of rows) {
  const lm = r.access && r.access.land_manager;
  if (lm == null || lm === "") continue;
  const s = String(lm);
  lens.push(s.length);
  vals.set(s, (vals.get(s) || 0) + 1);
}
lens.sort((a, b) => a - b);
console.log("populated:", lens.length, "| distinct values:", vals.size);
console.log("length: min", lens[0], "median", lens[Math.floor(lens.length / 2)], "max", lens[lens.length - 1]);
console.log("\ntop 25 values:");
for (const [k, v] of [...vals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`  ${String(v).padStart(5)}  ${JSON.stringify(k.slice(0, 90))}`);
}
const singles = [...vals.values()].filter((v) => v === 1).length;
console.log(`\nvalues appearing exactly once: ${singles} (${((singles / vals.size) * 100).toFixed(0)}% of distinct)`);
console.log(`
Reading this: a SMALL distinct count with short values = a controlled vocabulary that can drive
the permit link directly. A large distinct count with long values = prose, and matching it is
the same fragile keyword test that got 67% of permit links wrong — in which case render it and
do NOT route logic through it.`);
