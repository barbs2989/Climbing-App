#!/usr/bin/env node
// audit:approach-hazards — does every way in a climber can pick show ITS OWN hazards?
//
// KNOWN HAZARDS follows the picked way in (lib/approaches.js overlayHazards). A switchable way in
// with no `hazards` list of its own silently shows the row's list, which describes whichever way in
// its author walked. This audit reads the catalog and reports:
//   1. MISSING   — a switchable variant (viaRouteId or trip) with no `hazards` list.
//   2. IDENTICAL — two ways in on one route whose hazard lists are the same text: picking either
//                  shows the same warnings, so the choice hides a difference.
// Read-only. Exit 1 when MISSING or IDENTICAL is non-empty. Whether a list is RIGHT for its way in is
// a reading job, not a count: the apply run's unsure flags are the place to look for that.
//
// Usage: node scripts/audit-approach-hazards.mjs [--json]

import { selectAll } from "./lib/supabase-env.mjs";
import { approachOptions } from "../lib/approaches.js";

const asJson = process.argv.includes("--json");
// Keyset-paged: an OFFSET scan with a filter on the 315k-row table times out (500).
const rows = (await selectAll("routes", "id,name,hazards,approach_variants", null, { pageSize: 1000 }))
  .filter((r) => Array.isArray(r.approach_variants) && r.approach_variants.length);

const missing = [];
const identical = [];
let switchableRoutes = 0, switchableWays = 0;
for (const row of rows) {
  const opts = approachOptions({ ...row, approachVariants: row.approach_variants });
  if (!opts.length) continue;
  switchableRoutes++;
  const lists = [];
  for (const o of opts) {
    const v = o.variant;
    if (!o.switchable) continue; // the stored main way in is audited through its row, below
    switchableWays++;
    if (!Array.isArray(v.hazards) || !v.hazards.length) missing.push({ id: row.id, way: v.name || o.key });
  }
  for (const o of opts) {
    if (Array.isArray(o.variant.hazards) && o.variant.hazards.length) lists.push({ way: o.variant.name || o.key, text: JSON.stringify(o.variant.hazards.map((h) => String(h).trim().toLowerCase())) });
  }
  const seen = new Map();
  for (const l of lists) {
    if (seen.has(l.text)) identical.push({ id: row.id, ways: [seen.get(l.text), l.way] });
    else seen.set(l.text, l.way);
  }
}

const out = { switchableRoutes, switchableWays, missing, identical };
if (asJson) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`audit:approach-hazards — ${switchableRoutes} routes with a way in you can pick, ${switchableWays} switchable ways in`);
  console.log(`  MISSING its own hazard list: ${missing.length}`);
  for (const m of missing.slice(0, 40)) console.log(`    ${m.id} · ${m.way}`);
  console.log(`  IDENTICAL lists on two ways in: ${identical.length}`);
  for (const d of identical.slice(0, 40)) console.log(`    ${d.id} · ${d.ways.join(" = ")}`);
}
process.exit(missing.length || identical.length ? 1 : 0);
