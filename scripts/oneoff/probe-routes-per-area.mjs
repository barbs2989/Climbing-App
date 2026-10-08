#!/usr/bin/env node
// MEASUREMENT: DIRECT routes per area (areas.route_count is the SUBTREE total, so it cannot answer
// this). Pages routes(area_id) 1000 at a time with the service key and counts in memory.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const svc = requireServiceKey();
const by = new Map(); let from = 0, pages = 0;
for (;;) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=area_id&order=id`, { headers: headers(svc, { Range: `${from}-${from + 999}` }) });
  const rows = await r.json(); if (!Array.isArray(rows)) { console.log("stopped:", r.status, JSON.stringify(rows).slice(0, 200)); break; }
  pages++; for (const x of rows) by.set(x.area_id, (by.get(x.area_id) || 0) + 1);
  if (rows.length < 1000) break; from += 1000;
}
const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(`${pages} pages; ${[...by.values()].reduce((a, b) => a + b, 0)} routes over ${by.size} areas`);
console.log("DIRECT ROUTES per area, top 12:");
for (const [id, n] of top) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=name,area_type,state&id=eq.${id}`, { headers: headers(svc) });
  const a = (await r.json())[0] || {};
  console.log(`  ${String(n).padStart(6)}  ${id}  ${a.name} [${a.area_type}] ${a.state || ""}`);
}
const over = [...by.values()].filter((n) => n > 1000).length, over500 = [...by.values()].filter((n) => n > 500).length;
console.log(`areas with > 1000 direct routes: ${over}; > 500: ${over500}`);
