// fix-next-door-walls-2026-11-26.mjs — two wall-order defects audit:next-door found, each READ against MP's page.
//
//   1. The Praying Monk (AZ): MP lists two climbs named "East Face" — 5.3 at index 4 and 5.6 at index 6, with
//      "East Face Variation" (5.7) at 5 between them. We hold one, the 5.6, but its position put it LEFT of the
//      variation. It goes right of it: az_east_face 5 -> 6, the variation 6 -> 5.
//   2. The Pit (MN, Interstate State Park): one rock wall in two areas 20 m apart. MP's rock page "The Pit"
//      (105813125) lists 8 climbs, positions 1-8; we filed 2 under "Pit, The" (mn_pit_the) and 6 under the
//      BOULDERING copy "Pit (AKA Arm Pit), The", so each page's NEXT DOOR showed part of the wall. The 6 roped
//      climbs move to mn_pit_the, keeping their MP positions; the boulder problems stay where they are.
//
//   node scripts/pipeline/fix-next-door-walls-2026-11-26.mjs [--apply]
import { writeFileSync } from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const APPLY = process.argv.includes("--apply");
const k = requireServiceKey();
const get = async p => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(k) }); const j = await r.json(); if (!Array.isArray(j)) throw new Error(JSON.stringify(j)); return j; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PLAN = [
  { id: "az_east_face", area: "az_praying_monk_the", from: { sort_order: 5 }, to: { sort_order: 6 } },
  { id: "az_praying_monk_the_east_face_variation", area: "az_praying_monk_the", from: { sort_order: 6 }, to: { sort_order: 5 } },
  ...["mn_armpit", "mn_dihedral", "mn_the_overhang_face", "mn_corner_staircase", "mn_one_thin_fish_aka_one_slim_fish", "mn_boob"]
    .map(id => ({ id, area: "mn_pit_aka_arm_pit_the", from: { area_id: "mn_pit_aka_arm_pit_the" }, to: { area_id: "mn_pit_the" } })),
];
const before = await get(`routes?select=id,area_id,name,discipline,sort_order&id=in.(${PLAN.map(p => p.id).join(",")})`);
const by = new Map(before.map(r => [r.id, r]));
for (const p of PLAN) {
  const r = by.get(p.id);
  if (!r || r.area_id !== p.area || Object.entries(p.from).some(([c, v]) => r[c] !== v)) throw new Error("not as read: " + p.id + " " + JSON.stringify(r));
}
writeFileSync(`scripts/rollback-next-door-walls-${Date.now()}.json`, JSON.stringify(before, null, 1));
for (const p of PLAN) {
  console.log(APPLY ? "write" : "would write", p.id, JSON.stringify(p.to));
  if (APPLY) { await patchRow("routes", p.id, p.to); await sleep(1500); }
}
if (APPLY) {
  const after = await get(`routes?select=id,area_id,sort_order&id=in.(${PLAN.map(p => p.id).join(",")})`);
  const bad = PLAN.filter(p => { const r = after.find(x => x.id === p.id); return !r || Object.entries(p.to).some(([c, v]) => r[c] !== v); });
  console.log(bad.length ? "RECONCILE FAILED " + JSON.stringify(bad) : `read back: all ${PLAN.length} rows as planned`);
  const wall = await get("routes?select=sort_order,name,discipline&area_id=eq.mn_pit_the&order=sort_order");
  console.log("The Pit now:", wall.map(r => r.sort_order + " " + r.name).join(" | "));
}
