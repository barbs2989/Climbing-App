// fix-next-door-walls-2026-11-26b.mjs — the last two walls audit:next-door found split, each READ against MP's page.
//
//   1. Glory Dome, North Face (Joshua Tree): MP's one wall "North Face" (202721077) lists 6 climbs, left to right
//      Glory Days, Morning Glory, No Guts No Glory, Glory Road, Old Glory, Glory Us. We filed 3 under "North Face"
//      (ca_north_face_19) and 3 under "Glory Dome Routes" (ca_glory_dome_climbs, same coordinates), so each card
//      showed half the wall. The 3 move to North Face and all 6 take MP's order; Hope and Glory (not on that wall)
//      stays in Glory Dome Routes.
//   2. The Lighthouse (Red Rock): MP lists the climb (107049733) as the RIGHTMOST of its own wall "The Lighthouse"
//      (123708054 = our nv_the_lighthouse, positions 1-5); ours sat on Spy Cliff at 1, a place from an older MP
//      filing. It moves to The Lighthouse at 6.
//
//   node scripts/pipeline/fix-next-door-walls-2026-11-26b.mjs [--apply]
import { writeFileSync } from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const APPLY = process.argv.includes("--apply"), k = requireServiceKey(), sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async p => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(k) }); const j = await r.json(); if (!Array.isArray(j)) throw new Error(JSON.stringify(j)); return j; };
const NF = "ca_north_face_19";
const PLAN = [
  { id: "ca_glory_days_3", from: NF, to: { sort_order: 1 } },
  { id: "ca_glory_dome_climbs_morning_glory", from: "ca_glory_dome_climbs", to: { area_id: NF, sort_order: 2 } },
  { id: "ca_no_guts_no_glory", from: NF, to: { sort_order: 3 } },
  { id: "ca_glory_road", from: NF, to: { sort_order: 4 } },
  { id: "ca_glory_dome_climbs_old_glory", from: "ca_glory_dome_climbs", to: { area_id: NF, sort_order: 5 } },
  { id: "ca_glory_dome_climbs_glory_us", from: "ca_glory_dome_climbs", to: { area_id: NF, sort_order: 6 } },
  { id: "nv_the_lighthouse", from: "nv_spy_cliff_the", to: { area_id: "nv_the_lighthouse", sort_order: 6 } },
];
const before = await get(`routes?select=id,area_id,name,sort_order&id=in.(${PLAN.map(p => p.id).join(",")})`);
for (const p of PLAN) { const r = before.find(x => x.id === p.id); if (!r || r.area_id !== p.from) throw new Error("not as read: " + p.id + " " + JSON.stringify(r)); }
const lh = await get("routes?select=id,sort_order&area_id=eq.nv_the_lighthouse&sort_order=gte.6");
if (lh.length) throw new Error("The Lighthouse already has a position 6+: " + JSON.stringify(lh));
writeFileSync(`scripts/rollback-next-door-walls-b-${Date.now()}.json`, JSON.stringify(before, null, 1));
for (const p of PLAN) { console.log(APPLY ? "write" : "would write", p.id, JSON.stringify(p.to)); if (APPLY) { await patchRow("routes", p.id, p.to); await sleep(1500); } }
if (APPLY) {
  const after = await get(`routes?select=id,area_id,sort_order&id=in.(${PLAN.map(p => p.id).join(",")})`);
  const bad = PLAN.filter(p => { const r = after.find(x => x.id === p.id); return !r || Object.entries(p.to).some(([c, v]) => r[c] !== v); });
  console.log(bad.length ? "RECONCILE FAILED " + JSON.stringify(bad) : `read back: all ${PLAN.length} rows as planned`);
  for (const a of [NF, "nv_the_lighthouse", "nv_spy_cliff_the"]) console.log(a + ":", (await get(`routes?select=sort_order,name&area_id=eq.${a}&order=sort_order.nullslast`)).map(r => r.sort_order + " " + r.name).join(" | "));
}
