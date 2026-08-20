// The remaining two RE-HOMING candidates, each asked the question that decides whether a copy is
// possible at all — which is NOT "is there a sibling block?" but "does a sibling block describe the
// road THIS route's own prose names?".
//
// wa_little_annapurna_south_face is the two-trailhead shape stated outright by the row itself: its
// overview says it uses "the seldom-used Ingalls Creek/Crystal Creek side RATHER THAN the
// Enchantments basin". If its one sibling block is the Enchantments approach, copying it would be
// the coin flip the gate exists to prevent — and would be wrong in the direction that sends a party
// to the wrong trailhead.
//
// wa_upper_castle_toprope_wall names US-2 in Tumwater Canyon at milepost 96.5. Castle Rock is split
// into sub-areas, so a donor may sit one area over rather than on this one — that is a question
// about the tree, not about the road.
import { selectAll } from "../lib/supabase-env.mjs";

const leaves = (v, out = []) => {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
};

async function siblingBlocks(label, targetId, areaId, parentDepth) {
  const a = (await selectAll("areas", "id,name,path,area_type", `id=eq.${areaId}`, { pageSize: 5 }))[0];
  if (!a) { console.error(`FAIL — area ${areaId} returned no row`); process.exit(1); }
  const segs = String(a.path).split(".");
  const scope = segs.slice(0, Math.max(1, segs.length - parentDepth)).join(".");
  console.log(`\n${"=".repeat(92)}\n${label}\n   area ${areaId} "${a.name}" (${a.area_type})\n   path ${a.path}\n   scope for donors: ${scope}`);

  const areas = await selectAll("areas", "id,name,path", `path=cd.${scope}`, { pageSize: 1000 });
  if (!areas.length) { console.error(`FAIL — zero areas under ${scope}; broken scan.`); process.exit(1); }
  const areaBy = Object.fromEntries(areas.map((x) => [x.id, x]));
  const idlist = areas.map((x) => x.id);

  let rows = [];
  for (let i = 0; i < idlist.length; i += 100) {
    rows = rows.concat(await selectAll("routes", "id,name,area_id,discipline,road", `area_id=in.(${idlist.slice(i, i + 100).join(",")})`, { pageSize: 1000 }));
  }
  const withRoad = rows.filter((r) => r.id !== targetId && r.road && leaves(r.road).length);
  console.log(`   ${areas.length} area(s) in scope, ${rows.length} route(s), ${withRoad.length} carrying a road block`);

  const byBlock = {};
  for (const r of withRoad) {
    const k = JSON.stringify(r.road);
    (byBlock[k] = byBlock[k] || { n: 0, sample: r, areas: new Set() });
    byBlock[k].n++; byBlock[k].areas.add(r.area_id);
  }
  for (const [k, g] of Object.entries(byBlock).sort((x, y) => y[1].n - x[1].n).slice(0, 8)) {
    const ar = areaBy[g.sample.area_id];
    console.log(`\n   -- ${g.n} route(s) / ${g.areas.size} area(s); sample ${g.sample.id} on ${g.sample.area_id} "${ar ? ar.name : "?"}"`);
    for (const [kk, vv] of Object.entries(JSON.parse(k))) if (typeof vv === "string" && vv.trim()) console.log(`      ${kk}: ${vv.slice(0, 200)}`);
  }
}

await siblingBlocks("wa_little_annapurna_south_face — is the sibling block Ingalls Creek, or the Enchantments?", "wa_little_annapurna_south_face", "wa_little_annapurna", 0);
await siblingBlocks("wa_upper_castle_toprope_wall — does a Castle Rock sub-area carry a US-2 Tumwater block?", "wa_upper_castle_toprope_wall", "wa_upper_castle", 1);
