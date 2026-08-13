// Preflight for 0137. check:sql only inspects UPDATE/DELETE, so an INSERT migration gets no
// coverage from it at all — this asks the three questions that would make 0137 fail or, worse,
// half-apply: are the new ids free, do the parents exist, and can those parents take children?
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import fs from "node:fs";

const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const H = headers(KEY);
const g = async (p) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`); return r.json(); };
await g("areas?select=id&limit=1");

const sql = fs.readFileSync("supabase/migrations/0137_colorado_fourteeners.sql", "utf8");
const areaIds = [...sql.matchAll(/^\s*\('(co_[a-z0-9_]+)',\s*'[^']+',\s*'([a-z0-9_]+)'/gm)].map(m => ({ id: m[1], parent: m[2] }));
const routeIds = [...sql.matchAll(/^\s*\('(co_[a-z0-9_]+)',\s*'(co_[a-z0-9_]+)',\s*'[^']*',\s*'(?:scrambling|mountaineering)'/gm)].map(m => ({ id: m[1], area: m[2] }));
if (!areaIds.length || !routeIds.length) { console.error("FAIL: parsed nothing out of the migration — refusing to report it safe."); process.exit(1); }
console.log(`parsed ${areaIds.length} area inserts, ${routeIds.length} route inserts\n`);

let bad = 0;
// 1. Nothing may already exist. A collision is where a duplicate mountain comes from.
for (const a of areaIds) {
  const hit = await g(`areas?select=id,name&id=eq.${a.id}`);
  if (hit.length) { console.log(`  ALREADY EXISTS  ${a.id} — ${hit[0].name}`); bad++; }
}
for (const r of routeIds) {
  const hit = await g(`routes?select=id&id=eq.${r.id}`);
  if (hit.length) { console.log(`  ALREADY EXISTS  ${r.id}`); bad++; }
}
console.log(bad ? `\n${bad} id(s) already present` : "  ok — every new id is free");

// 2. Every parent referenced must exist, or the FK rejects the row.
const created = new Set(areaIds.map(a => a.id));
const parents = [...new Set(areaIds.map(a => a.parent))].filter(p => !created.has(p));
console.log("\nexternal parents referenced:");
for (const p of parents) {
  const hit = await g(`areas?select=id,name,route_count&id=eq.${p}`);
  if (!hit.length) { console.log(`  MISSING  ${p}`); bad++; continue; }
  // 3. trg_areas_leaf_xor: a parent holding DIRECT routes cannot also hold children.
  const direct = await g(`routes?select=id&area_id=eq.${p}&limit=1`);
  const ok = direct.length === 0;
  console.log(`  ${ok ? "ok    " : "BLOCKED"} ${p.padEnd(28)} direct routes: ${direct.length}${ok ? "" : "  <- leaf/parent invariant would reject children"}`);
  if (!ok) bad++;
}

// Every route's area must be one this migration creates, or already exist.
console.log("\nroute targets:");
for (const r of routeIds) {
  if (created.has(r.area)) continue;
  const hit = await g(`areas?select=id&id=eq.${r.area}`);
  if (!hit.length) { console.log(`  MISSING AREA  ${r.area} for ${r.id}`); bad++; }
}
console.log(bad ? "" : "  ok — every route lands on an area this migration creates");

console.log(bad ? `\nPREFLIGHT FAILED: ${bad} problem(s)` : "\npreflight ok — 0137 is safe to apply");
process.exit(bad ? 1 : 0);
