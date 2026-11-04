// Add each candidate route's own text (description, approach, descent; trimmed) to
// peaks-to-research.json, so a reviewer can compare our LINE with the FKT track's, and split the
// peaks into research batches. Light primary-key reads, 100 ids per request, paced.
// Usage: node peaks-add-text.mjs [peaks per batch]
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
const SIZE = +process.argv[2] || 8;
const peaks = JSON.parse(fs.readFileSync(`${D}/peaks-to-research.json`, "utf8"));
const ids = [...new Set(peaks.flatMap(p => p.routes.map(r => r.id)))];
const text = {};
for (let i = 0; i < ids.length; i += 100) {
  const q = ids.slice(i, i + 100).map(encodeURIComponent).join(",");
  const t0 = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${q})&select=id,description,approach,descent_text`, { headers: headers(anonKey()) });
  if (!r.ok) { console.log(`chunk ${i / 100 + 1}: HTTP ${r.status} — stopping`); process.exit(1); }
  for (const row of await r.json()) text[row.id] = row;
  if (Date.now() - t0 > 10000) { console.log("a chunk took over 10 s — stopping to spare the database"); process.exit(1); }
  await new Promise(s => setTimeout(s, 1000));
}
const cut = (s, n) => String(s || "").slice(0, n);
for (const p of peaks) for (const r of p.routes) { const t = text[r.id] || {}; r.description = cut(t.description, 400); r.approach = cut(t.approach, 400); r.descent = cut(t.descent_text, 250); }
let n = 0;
for (let i = 0; i < peaks.length; i += SIZE) fs.writeFileSync(`${D}/peak-batch-${++n}.json`, JSON.stringify(peaks.slice(i, i + SIZE), null, 1));
console.log(`${ids.length} routes' text read; ${peaks.length} peaks in ${n} batches of ${SIZE}`);
