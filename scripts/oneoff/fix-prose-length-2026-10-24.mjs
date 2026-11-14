// The nine researched repairs from the first audit:prose-length run (2026-10-24): a route's
// description and its stats gave two answers to "how long / how many pitches". Dry by default;
// --apply writes. Compare-and-set: every row is re-read and must still hold the OLD value (an
// exact substring for prose), or it is refused. Writes a rollback file before the first PATCH.
// Evidence per row is in docs/guards/route-prose.md under audit:prose-length.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");

const FIX = [
  // stats wrong: the description itemises the pitches, and the stored length already agrees
  { id: "ky_velo_crag_dual_track_w_extension", set: { pitches: [1, 2] } },
  { id: "qc_cap_trinit_expresso", set: { pitches: [1, 9] } },
  { id: "wy_3_stringer_slow_turning_area_stringer", set: { pitches: [2, 4], length_m: [49, 120] } },
  // second-source pass: the first ascensionist's AAJ report gives 200 m of climbing above the couloir
  { id: "bc_mount_athelstan_stokeman_pillar", set: { pitches: [5, 6], length_m: [183, 200] } },
  // prose wrong: the stats agree with the published route
  { id: "nl_blow_me_down_leviathan", prose: ["A ten-pitch trad line", "A nine-pitch trad line"] },
  { id: "az_the_headwall_doug_s_dandy_lower", prose: ["A scrambly four-pitch outing", "A scrambly three-pitch outing"] },
  { id: "ca_charlotte_dome_stop_that_train", prose: ["A 12-pitch line on the South Face", "An 11-pitch line on the South Face"] },
  { id: "ca_mount_robinson_lichen_arete", prose: ["An eight-pitch arete", "A nine-pitch arete"] },
  { id: "ut_3d_air_kentucky", prose: ["A 200 ft sky route that can only be reached by rappel.", "A sky route 200 ft off the ground that can only be reached by rappel."] },
];

const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,pitches,length_m,overview`, { headers: headers(key) })).json())[0];
const plan = [], refused = [], rollback = [];
for (const f of FIX) {
  const r = await read(f.id);
  if (!r) { refused.push(`${f.id}: not found`); continue; }
  const body = {};
  for (const [col, [from, to]] of Object.entries(f.set || {})) {
    if (r[col] === to) continue;
    if (Math.round(r[col] ?? -1) !== from) { refused.push(`${f.id}.${col}: expected ${from}, found ${r[col]}`); continue; }
    body[col] = to;
  }
  if (f.prose) {
    const [from, to] = f.prose;
    if (!r.overview.includes(to)) {
      if (r.overview.split(from).length !== 2) refused.push(`${f.id}.overview: "${from}" not found exactly once`);
      else body.overview = r.overview.replace(from, to);
    }
  }
  if (Object.keys(body).length) { plan.push([f.id, body]); rollback.push({ id: f.id, ...Object.fromEntries(Object.keys(body).map(k => [k, r[k]])) }); }
}
for (const [id, b] of plan) console.log(`${APPLY ? "PATCH" : "would PATCH"} ${id}`, JSON.stringify(b).slice(0, 160));
for (const x of refused) console.log("REFUSED", x);
if (APPLY && plan.length) {
  const rb = `audits/prose-length/rollback-${Date.now()}.json`;
  fs.writeFileSync(rb, JSON.stringify(rollback, null, 1));
  console.log("rollback:", rb);
  for (const [id, b] of plan) { await patchRow("routes", id, b); await new Promise(res => setTimeout(res, 250)); }
  for (const [id, b] of plan) {   // a 200 is not evidence: re-read and reconcile
    const r = await read(id);
    for (const [k, v] of Object.entries(b)) if (r[k] !== v) { console.log(`DID NOT LAND ${id}.${k}`); process.exitCode = 1; }
  }
  console.log(process.exitCode ? "FAIL" : `applied and re-read: ${plan.length} rows`);
}
