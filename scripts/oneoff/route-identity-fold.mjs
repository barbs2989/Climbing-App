// The six fold-ins held back by route-identity-merge.mjs: write what only the duplicate said into the
// kept page, then delete the duplicate. Each kept page already covered most of its duplicate; only the
// genuinely new material moves, rewritten (no source named), into the column that renders it:
//   - beta paragraphs for a finish/season variation (Davis SW face, Whitehorse early-season snow/ice,
//     Pinnacle's chute), watch_out / pro_tips additions;
//   - the kept page's EXISTING approach variant for the same way in is filled out from the duplicate's
//     (Little Tahoma from Paradise, Whatcom's low orbit) rather than a second copy added. Primary flags
//     are left as they are.
// Every route-id table is re-checked before a delete; full rows and the kept rows' before-values are
// saved first.
//   node scripts/oneoff/route-identity-fold.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const get = async (path) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) }); if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`); return r.json(); };
const REFS = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "route_difficulty_ratings", "topo_lines", "user_itineraries"];
const para = (s, add) => `${(s || "").trimEnd()}\n\n${add}`;

const FOLDS = [
  { drop: "wa_davis_peak_nc_southwest", keep: "wa_davis_peak_nc_south_slope_and_ridge", build: (k) => ({
    beta: para(k.beta, "The southwest face is now the more popular finish, especially on snow. The whole lower mountain is shared with the ridge route; near the 5,700 ft saddle, leave the south ridge and traverse west into the main southwest-face gully and bowl, then climb it to the summit crest. It avoids the 65-degree notch on the old ridge line, and its steepest snow is about 40 degrees. Skiers worked it out as a descent, and with good snow cover it makes the peak a non-technical objective."),
    watch_out: [...k.watch_out, "In shoulder season the slopes around Point 5872 have held avalanche-prone snow that turned parties back. Stay left (north) of it rather than committing to its slopes."],
  }) },
  { drop: "wa_little_tahoma_cowlitz_ingraham_glaciers", keep: "wa_little_tahoma_east_shoulder", build: (k, d) => {
    const src = d.approach_variants[0];
    const av = k.approach_variants.map(v => v.name !== "From Paradise across the Cowlitz and Ingraham glaciers" ? v : {
      ...v, notes: src.notes, season: "Nov-May, while the White River road to Summerland is shut", hazards: src.hazards, baseFinding: src.baseFinding,
    });
    if (av.filter(v => v.name === "From Paradise across the Cowlitz and Ingraham glaciers" && v.hazards).length !== 1) throw new Error("Little Tahoma: Paradise variant not found");
    return { approach_variants: av };
  } },
  { drop: "wa_whatcom_peak_southwest_route", keep: "wa_south_spur", build: (k, d) => {
    const src = d.approach_variants[0];
    const i = k.approach_variants.findIndex(v => v.name.startsWith("The low-orbit traverse from Whatcom Pass"));
    if (i < 0) throw new Error("Whatcom: low-orbit variant not found");
    const v = k.approach_variants[i];
    const av = [...k.approach_variants];
    av[i] = { ...v, camps: src.camps, notes: para(v.notes, src.notes),
      hazards: [...v.hazards, "A steep, brushy, root-and-timber climbers' path above Graybeal Camp", "The creek near Graybeal can run dry by late summer"] };
    return { approach_variants: av };
  } },
  { drop: "wa_whitehorse_mountain_r1", keep: "wa_whitehorse_mountain_nw_shoulder", build: (k) => ({
    beta: para(k.beta, "Early in the season, roughly April to June, the same line is climbed as a continuous snow and ice route. Parties stay on snow higher on the shoulder and face instead of threading the rock bands that appear later, keep climber's right on the glacier to avoid the worst crevassing, and meet a steep, sometimes icy rollover of about 50-55 degrees, the crux in these conditions. It is a popular ski and splitboard objective: many skin or boot the glacier basin and switch to crampons only for the final steep pitch below the summit, then ski back toward High Pass and Lone Tree Pass. Once deep snow has buried the brush, some parties go more directly up Snow Gulch from near the trailhead and stash skis around 2,500 ft for the descent."),
    watch_out: [...k.watch_out, "In early season the route is avalanche terrain nearly the whole way, the entry couloir and the glacier headwall above all. Go on a refrozen, consolidating snowpack, check the NWAC forecast, and start before dawn."],
  }) },
  { drop: "wa_bears_breast_mountain_se_mega_slab", keep: "wa_bears_breast_mountain_infinite_beauty", build: (k) => ({
    approach: `From Cle Elum, drive WA-903 north about 19 miles to the Salmon La Sac Campground entrance and bear right on the gravel road, not into the campground, about 1/4 mile to the Salmon La Sac Trailhead (~2,500 ft). ${k.approach}`,
    pro_tips: [...k.pro_tips, "Camp at the PCT bridge over the Waptus River to split the approach. From the slab's base to the southeast shoulder took one party about 80 minutes in trail runners."],
  }) },
  { drop: "wa_southwest_scramble", keep: "wa_pinnacle_peak_tatoosh_r1", build: (k) => ({
    beta: para(k.beta, "The usual line is the obvious chute just east of the peak's westernmost rock prominence, about a quarter mile along the boot path from the saddle toward the west side of the south face. Reach it over scree and loose rock along or below the ridge. The chute gets steeper and more exposed as it climbs, but the rock is better cleaned higher up. Protection is limited to a few horns and trees near the top that can be slung, and some parties back off the short top step on one."),
  }) },
];

const ids = FOLDS.flatMap(f => [f.drop, f.keep]);
const rows = Object.fromEntries((await get(`routes?select=*&id=in.(${ids.join(",")})`)).map(r => [r.id, r]));
const refs = {};
for (const t of REFS) for (const x of await get(`${t}?select=route_id&route_id=in.(${FOLDS.map(f => f.drop).join(",")})`)) refs[x.route_id] = (refs[x.route_id] || 0) + 1;
for (const l of await get(`user_lists?select=route_ids&route_ids=ov.{${FOLDS.map(f => f.drop).join(",")}}`)) for (const id of l.route_ids) refs[id] = (refs[id] || 0) + 1;

const go = [];
for (const f of FOLDS) {
  const d = rows[f.drop], k = rows[f.keep];
  if (!d || !k) throw new Error(`${f.drop}/${f.keep} missing`);
  if (refs[f.drop]) throw new Error(`${f.drop}: ${refs[f.drop]} rows point at it`);
  const body = f.build(k, d);
  go.push({ ...f, d, body, before: Object.fromEntries(Object.keys(body).map(c => [c, k[c] ?? null])) });
  console.log(`\n## ${f.drop} -> ${f.keep}`);
  for (const [c, v] of Object.entries(body)) console.log(`  ${c}: ${JSON.stringify(v).length - JSON.stringify(k[c] ?? "").length >= 0 ? "+" : ""}${JSON.stringify(v).length - JSON.stringify(k[c] ?? "").length} chars`);
}
if (DRY) process.exit(0);

const rb = `audits/route-grades/deep/rollback-folds-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify({ deleted_rows: go.map(g => g.d), kept_before: Object.fromEntries(go.map(g => [g.keep, g.before])) }, null, 1));
console.log("rollback", rb);
for (const g of go) {
  await patchRow("routes", g.keep, g.body);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${g.drop}`, { method: "DELETE", headers: { ...headers(key), Prefer: "return=representation" } });
  const out = r.ok ? await r.json() : null;
  if (!r.ok || out.length !== 1) throw new Error(`delete ${g.drop}: ${r.status}`);
}
const after = Object.fromEntries((await get(`routes?select=*&id=in.(${ids.join(",")})`)).map(r => [r.id, r]));
let bad = 0;
for (const g of go) {
  if (after[g.drop]) { bad++; console.log("STILL PRESENT", g.drop); }
  for (const [c, v] of Object.entries(g.body)) if (JSON.stringify(after[g.keep]?.[c]) !== JSON.stringify(v)) { bad++; console.log("MISMATCH", g.keep, c); }
}
console.log(`folded ${go.length}; re-read mismatches ${bad}`);
