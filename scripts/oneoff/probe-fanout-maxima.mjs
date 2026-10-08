#!/usr/bin/env node
// MEASUREMENT: the two unbounded reads that a filter does not bound below max_rows (1000):
//   useAreaChildren -> areas where parent_id = X      (how many DIRECT children can one area have?)
//   useAreaRoutes   -> routes where area_id = X       (how many DIRECT routes can one area have?)
// Tries PostgREST aggregates first; falls back to a paged scan / per-area HEAD counts.
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const svc = requireServiceKey();
const H = (extra) => headers(svc, extra);

async function agg(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H() });
  if (r.status >= 400) return null;
  return r.json();
}

// 1. direct children per parent
let kids = await agg("areas?select=parent_id,count()&order=count.desc&limit=8");
if (!kids) {
  console.log("aggregates unavailable — paging areas(id,parent_id)");
  const by = new Map(); let from = 0;
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,parent_id&order=id`, { headers: H({ Range: `${from}-${from + 999}` }) });
    const rows = await r.json(); if (!Array.isArray(rows) || !rows.length) break;
    for (const a of rows) by.set(a.parent_id, (by.get(a.parent_id) || 0) + 1);
    if (rows.length < 1000) break; from += 1000;
  }
  kids = [...by.entries()].map(([parent_id, count]) => ({ parent_id, count })).sort((a, b) => b.count - a.count).slice(0, 8);
}
console.log("DIRECT CHILDREN per parent, top 8:");
for (const k of kids) {
  const nm = k.parent_id ? await agg(`areas?select=name,area_type&id=eq.${k.parent_id}`) : [{ name: "(roots)" }];
  console.log(`  ${String(k.count).padStart(6)}  ${k.parent_id || "null"}  ${nm && nm[0] ? nm[0].name + " [" + (nm[0].area_type || "") + "]" : ""}`);
}
console.log(`  parents over 1000 direct children: ${kids.filter((k) => k.count > 1000).length} (of the top 8 shown)`);

// 2. direct routes per area
let per = await agg("routes?select=area_id,count()&order=count.desc&limit=8");
if (!per) {
  console.log("\naggregates unavailable — HEAD-counting routes for the 40 areas with the highest route_count");
  const top = await agg("areas?select=id,name,route_count&order=route_count.desc&limit=40");
  per = [];
  for (const a of top) {
    const h = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&area_id=eq.${a.id}`, { method: "HEAD", headers: H({ Prefer: "count=exact" }) });
    const cr = h.headers.get("content-range") || ""; per.push({ area_id: a.id, count: Number(cr.split("/")[1]), name: a.name, route_count: a.route_count });
  }
  per.sort((a, b) => b.count - a.count); per = per.slice(0, 8);
}
console.log("\nDIRECT ROUTES per area, top 8:");
for (const p of per) {
  const nm = p.name ? [{ name: p.name }] : await agg(`areas?select=name,area_type&id=eq.${p.area_id}`);
  console.log(`  ${String(p.count).padStart(6)}  ${p.area_id}  ${nm && nm[0] ? nm[0].name : ""}`);
}
console.log(`  areas over 1000 direct routes: ${per.filter((p) => p.count > 1000).length} (of those shown)`);
console.log(`\nanon key present: ${!!anonKey()}`);
