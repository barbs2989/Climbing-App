#!/usr/bin/env node
// Is the closure wa_glacier_peak_kennedy_glacier states the SAME order wa_sitkum_spire_standard
// records as still in force? If it is, correcting the expired clause is a COPY of a fact the
// catalog already holds, not research. If it is not, it is research and stays reported.
//
// Verified rather than assumed, because "same road, same milepost" is exactly the kind of
// near-identity this catalog has been burned by.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,area_id,road,access,approach",
  "or=(road.not.is.null,access.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

// Every value anywhere in the catalog that talks about FS/FR 23, the White Chuck road, or MP 3.7.
const RE = /white ?chuck|fs-?\s?road\s?23|fsr?\s?23\b|fr\s?23\b|road\s?23\b|06-05-25-02|milepost 3\.7|mp\s?3\.7/i;
const FIELDS = [["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"], ["road", "name"],
                ["access", "closures"], ["access", "seasonal"], ["access", "permit"]];

const hits = [];
for (const r of rows) {
  for (const [col, key] of FIELDS) {
    const t = r[col] && r[col][key];
    if (typeof t !== "string" || !RE.test(t)) continue;
    hits.push({ id: r.id, field: `${col}.${key}`, t: t.replace(/\s+/g, " ") });
  }
}
console.log(`${hits.length} value(s) across the catalog mention FS Road 23 / White Chuck / MP 3.7:\n`);
for (const h of hits) {
  console.log(`── ${h.id}  ${h.field}`);
  console.log(`   ${h.t.slice(0, 420)}\n`);
}

// Do any two of them name the SAME order number?
const ORD = /\b\d{2}-\d{2}-\d{2}(?:-\d{2,4})?\b/g;
const byOrder = new Map();
for (const h of hits) for (const m of h.t.matchAll(ORD)) {
  if (!byOrder.has(m[0])) byOrder.set(m[0], []);
  byOrder.get(m[0]).push(`${h.id} ${h.field}`);
}
console.log("order numbers cited, and by whom:");
for (const [o, who] of byOrder) console.log(`   ${o}  ->  ${who.join(" | ")}`);
if (!byOrder.size) console.log("   (none cite an order number)");
