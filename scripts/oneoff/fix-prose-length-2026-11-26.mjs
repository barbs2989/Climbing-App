// The researched repairs from the second audit:prose-length run (2026-11-26), after the MP pitch-count
// fill (#3998) put Mountain Project's HEADER count beside descriptions that itemise a different number.
// Dry by default; --apply writes. Compare-and-set: every row is re-read and must still hold one of the
// OLD values (the fill may or may not have reached it yet), or an exact prose substring, else refused.
// Rollback before the first PATCH; every row re-read afterwards. Evidence: docs/guards/route-prose.md.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");

// set: { column: [[acceptable current values], new value] }
const B = [0, null];   // blank: 0 and null both mean "not recorded" (0074)
const FIX = [
  // the description itemises P1..Pn and states that total; the stored count is MP's header (or blank)
  { id: "ak_3rd_4th_the_curtain_the_mammoth", set: { pitches: [[8], 7] } },
  { id: "ak_south_buttress", set: { pitches: [[...B, 10], 8] } },
  { id: "bc_slesse_mountain_station_d_peak_north_buttress", set: { pitches: [[7], 9] } },
  { id: "ca_wind_shear", set: { pitches: [[...B, 13], 14] } },
  { id: "co_highwayman_ffa_of_ne_face_route", set: { pitches: [[...B, 12], 13] } },
  { id: "nh_weissners_butress", set: { pitches: [[...B, 6], 7] } },
  { id: "ut_wishful_thinking", set: { pitches: [[...B, 5], 6], length_m: [[null], 142] } },
  { id: "ut_taivallista", set: { pitches: [[...B, 4], 3] } },
  { id: "ut_hail_mary", set: { pitches: [[...B, 4], 2] } },
  { id: "wy_crucify_the_dread", set: { pitches: [[...B, 4], 3] } },
  { id: "wy_northwest_arete", set: { pitches: [[...B, 10], 12] } },
  { id: "ca_the_starlight_dihedral", set: { pitches: [B, 11] } },
  { id: "co_optical_illusions", set: { pitches: [B, 2] } },
  // a one-pitch 55 m pillar: the stored 30 m disagrees with the route's only description
  { id: "ca_stanislaus_crag_east_corridor_echo_location", set: { length_m: [[30], 55] } },
  // the whole route's length, stated in the description, with nothing stored
  { id: "ak_the_chase", set: { length_m: [[null], 457] } },
  { id: "bc_amon_r_dh_kolibri_crack", set: { length_m: [[null], 275] } },
  { id: "ca_mount_harwood_north_face_couloir_1", set: { length_m: [[null], 671] } },
  { id: "co_the_flying_dutchman", set: { length_m: [[null], 488] } },
  // a four-pitch 5.12- trad line filed as a boulder problem on the V scale
  { id: "ak_half_mile_high", set: { pitches: [B, 4], length_m: [[null], 91], discipline: [["bouldering"], "trad"], grade_system: [["v"], "yds"], grade_num: [[12], 12.25] } },
  // prose wrong: the route's own pitch list gives the stored count
  { id: "co_cajun_capers", prose: ["a five-pitch route where", "a six-pitch route where"] },
  { id: "co_southeast_face_5", prose: ["A wandering four-pitch line on Sheep's Nose", "A wandering line of four or five pitches on Sheep's Nose"] },
];

const COLS = "id,pitches,length_m,overview,discipline,grade_system,grade_num";
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=${COLS}`, { headers: headers(key) })).json())[0];
const plan = [], refused = [], rollback = [];
for (const f of FIX) {
  const r = await read(f.id);
  if (!r) { refused.push(`${f.id}: not found`); continue; }
  const body = {};
  for (const [col, [from, to]] of Object.entries(f.set || {})) {
    if (r[col] === to) continue;
    if (!from.includes(r[col] ?? null)) { refused.push(`${f.id}.${col}: expected ${JSON.stringify(from)}, found ${r[col]}`); continue; }
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
  await new Promise(res => setTimeout(res, 300));
}
for (const [id, b] of plan) console.log(`${APPLY ? "PATCH" : "would PATCH"} ${id}`, JSON.stringify(b).slice(0, 160));
for (const x of refused) console.log("REFUSED", x);
if (APPLY && plan.length) {
  const rb = `audits/prose-length/rollback-${Date.now()}.json`;
  fs.writeFileSync(rb, JSON.stringify(rollback, null, 1));
  console.log("rollback:", rb);
  for (const [id, b] of plan) { await patchRow("routes", id, b); await new Promise(res => setTimeout(res, 1000)); }
  for (const [id, b] of plan) {   // a 200 is not evidence: re-read and reconcile
    const r = await read(id);
    for (const [k, v] of Object.entries(b)) if (r[k] !== v) { console.log(`DID NOT LAND ${id}.${k}: ${r[k]}`); process.exitCode = 1; }
    await new Promise(res => setTimeout(res, 300));
  }
  console.log(process.exitCode ? "FAIL" : `applied and re-read: ${plan.length} rows`);
}
