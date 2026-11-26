// Eldorado Peak is NOT in Boston Basin (owner note, 2026-11-26). NPS files them as separate
// cross-country zones with separate trailheads on Cascade River Road. A canned North Cascades
// access blob told Eldorado-area routes (and ~30 others nowhere near Boston Basin) a Boston Basin
// camping rule NPS does not publish ("two designated sites, Low Camp ~5,300 / High Camp ~6,400"),
// named group-size zones NPS does not use ("Mount Shuksan, Eldorado Peak and Forbidden Peak"),
// two Eldorado routes put the Eldorado trailhead and the Boston Basin pullout together at
// "mile 20-21.7", and Boston Peak's West Face used the Eldorado trailhead as its trailhead.
//
// Every replacement below is an exact old string; a row whose live text no longer matches is
// REFUSED and reported, never guessed at. Dry run by default; --apply writes (paced by patchRow).
//   node scripts/fix-eldorado-boston-basin-2026-11-26.mjs [--apply]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "./lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const BB_OLD = " Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft, High Camp ~6,400 ft).";
const BB_NEW = " In Boston Basin, camp on snow, rock or bare ground, never on the meadows or within 100 ft of water, and use the composting toilets at the lower and upper camps.";
const ELD_CAMP = " Camp on snow, rock or bare ground, never on meadows or within 100 ft of water. The park asks climbers not to camp in Eldorado Basin or on Hammered Ridge, and the bivy sites below the East Ridge are for Eldorado-zone permits only.";
const CANS_OLD = " Bear canisters required in some zones — free loaners at permit offices.";
const ELD_CANS = " An approved bear canister is required in the Eldorado zone — free loaners at permit offices.";
const G_SIX = "Group size capped at 6 in off-trail cross-country zones (12 in on-trail corridors).";
const G_ZONES_OLD = "Group size limit is 12 in trail corridors and camps and in the Mount Shuksan, Eldorado Peak and Forbidden Peak cross-country zones, which this route is in; 6 in the remaining cross-country zones. Limits include people and stock.";
const G_ELD = "Group size limit is 12, people and stock counted together, in trail corridors and in the Eldorado and Inspiration cross-country zones this route crosses; 6 in most other cross-country zones.";
const G_FORB = "Group size limit is 12, people and stock counted together, in trail corridors and in the Boston Basin and Forbidden cross-country zones this route crosses; 6 in most other cross-country zones.";

const ELDORADO = ["wa_direct_southwest_buttress", "wa_dorado_needle_east_ridge", "wa_northwest_ridge", "wa_southwest_buttress", "wa_eldorado_peak_east_ridge", "wa_eldorado_peak_eldorado_glacier_nw", "wa_eldorado_peak_northeast_face", "wa_eldorado_peak_west_arete", "wa_main_peak_tepeh_towers", "wa_south_ridge_4"];
// Boston Basin approaches keep a (true) Boston Basin camping line; routes from Cascade Pass drop it.
const BB_APPROACH = ["wa_north_ridge_7", "wa_south_ridge_6", "wa_buckner_mountain_north_face", "wa_northwest_ridge_2", "wa_mount_torment_south_ridge", "wa_mount_torment_torment_forbidden_traverse", "wa_southeast_face", "wa_sahale_mountain_r1", "wa_sharkfin_tower_southeast_ridge"];
const CASCADE_PASS = ["wa_buckner_mountain_southwest_face", "wa_sahale_mountain_sahale_glacier"];
const ELSEWHERE = ["wa_direct_north_buttress", "wa_booker_mountain_northeast_face", "wa_booker_mountain_northwest_route", "wa_booker_mountain_south_ridge", "wa_hurry_up_peak_south_ridge", "wa_jack_mountain_south_face", "wa_blood_orgy", "wa_hail_satan", "wa_magic_mountain_south_ridge", "wa_woodland_critter_christmas", "wa_mix_up_peak_east_face", "wa_goode_mountain_megalodon_ridge", "wa_goode_mountain_northeast_face", "wa_goode_mountain_southwest_couloir", "wa_mount_formidable_south_face", "wa_mount_goode_northeast_buttress", "wa_mount_logan_fremont_glacier", "wa_mount_logan_r1", "wa_mount_logan_r2", "wa_northeast_face_direct", "wa_north_ridge_4", "wa_ruby_mountain_northwest_ridge", "wa_ruby_mountain_south_ridge", "wa_the_devils_club", "wa_storm_king_southwest_scramble", "wa_tricouni_peak_southwest_slopes"];

// [old, new] pairs applied to the rules text wherever it sits (access, and any copy inside approach_variants).
function rulePairs(id) {
  if (ELDORADO.includes(id)) return [[G_ZONES_OLD, G_ELD], [BB_OLD, ELD_CAMP], [CANS_OLD, ELD_CANS]];
  if (id === "wa_austera_peak") return [[G_SIX, G_ELD], [BB_OLD, ELD_CAMP], [CANS_OLD, ELD_CANS]];
  if (id === "wa_forbidden_peak_east_ridge") return [[G_ZONES_OLD, G_FORB], [BB_OLD, BB_NEW]];
  if (BB_APPROACH.includes(id)) return [[BB_OLD, BB_NEW]];
  if (CASCADE_PASS.includes(id) || ELSEWHERE.includes(id)) return [[BB_OLD, ""]];
  return null;
}

const ROAD_NAME_OLD = "Cascade River Road (from Marblemount) to Boston Basin/Eldorado trailhead area";
const ROAD_NAME_NEW = "Cascade River Road (from Marblemount) to the Eldorado trailhead";
const ROAD_ST_OLD = "the final miles to the Eldorado TH/Boston Basin pulloff (~mile 20-21.7)";
const ROAD_ST_NEW = "the final miles to the Eldorado trailhead (~mile 20); the Boston Basin pullout is a separate stop about two miles farther up";

const WF = "wa_boston_peak_west_face";
const CP = { lat: 48.4754, lng: -121.0751, elev: 3600, name: "Cascade Pass Trailhead", type: "Trailhead", directions: "Drive Cascade River Road from Marblemount about 23 miles to its end at the Cascade Pass trailhead (about 3,600 ft). From late autumn into early summer the park gates the road lower down, in recent seasons near the Eldorado trailhead at milepost 20, so expect up to three extra miles of road on foot, bike or skis; check the park's road page before you go." };

function replaceAll(text, pairs, misses, where) {
  let out = text;
  for (const [o, n] of pairs) { if (!out.includes(o)) { misses.push(`${where}: missing «${o.slice(0, 60)}»`); continue; } out = out.split(o).join(n); }
  return out;
}

const key = requireServiceKey();
const ids = [...ELDORADO, "wa_austera_peak", "wa_forbidden_peak_east_ridge", ...BB_APPROACH, ...CASCADE_PASS, ...ELSEWHERE, WF];
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,area_id,access,approach_variants,road,waypoints,approach_logistics`, { headers: headers(key), signal: AbortSignal.timeout(30000) });
if (!res.ok) throw new Error(`read ${res.status} ${await res.text()}`);
const rows = await res.json();
console.log(`read ${rows.length}/${ids.length} rows`);
const missingIds = ids.filter(i => !rows.find(r => r.id === i)); if (missingIds.length) console.log("NOT FOUND:", missingIds);
fs.writeFileSync(`scripts/rollback-eldorado-boston-basin-${Date.now()}.json`, JSON.stringify(rows, null, 1));

const plans = [];
for (const r of rows) {
  const patch = {}, misses = [];
  const pairs = rulePairs(r.id);
  if (pairs) {
    const rules = r.access && r.access.rules;
    const done = typeof rules === "string" && !rules.includes(BB_OLD) && pairs.every(([, n]) => !n || rules.includes(n.trim()));
    if (done) { /* already fixed by an earlier run */ }
    else if (typeof rules !== "string" || !rules.includes(BB_OLD)) misses.push("access.rules: Boston Basin sentence not present");
    else patch.access = { ...r.access, rules: replaceAll(rules, pairs, misses, "access.rules") };
    const av = JSON.stringify(r.approach_variants || null);
    if (av.includes(JSON.stringify(BB_OLD).slice(1, -1))) {
      let s = av; for (const [o, n] of pairs) s = s.split(JSON.stringify(o).slice(1, -1)).join(JSON.stringify(n).slice(1, -1));
      patch.approach_variants = JSON.parse(s);
    }
  }
  if (r.id === "wa_main_peak_tepeh_towers" || r.id === "wa_south_ridge_4" || r.id === "wa_austera_peak") {
    const rd = r.road || {};
    if (rd.name === ROAD_NAME_NEW) { /* already fixed */ } else if (rd.name !== ROAD_NAME_OLD || !String(rd.status || "").includes(ROAD_ST_OLD)) misses.push("road: text changed since the snapshot");
    else patch.road = { ...rd, name: ROAD_NAME_NEW, status: rd.status.split(ROAD_ST_OLD).join(ROAD_ST_NEW) };
  }
  if (r.id === WF) {
    const wp = r.waypoints || [];
    if (wp[0] && wp[0].name === CP.name) { /* already fixed */ } else if (!wp[0] || wp[0].name !== "Eldorado Creek trailhead (Cascade River Road mile 20)") misses.push("waypoints[0] changed");
    else patch.waypoints = [CP, ...wp.slice(1)];
    const al = r.approach_logistics || {};
    if (al.trailhead === "Cascade Pass Trailhead (Cascade River Road)") { /* already fixed */ } else if (al.trailhead !== "Eldorado Creek trailhead (Cascade River Road mile 20)") misses.push("approach_logistics changed");
    else patch.approach_logistics = { ...al, trailhead: "Cascade Pass Trailhead (Cascade River Road)", trailheadLat: CP.lat, trailheadLng: CP.lng, trailheadDirection: "Drive Cascade River Road to its end at the Cascade Pass trailhead; in winter the road is gated lower down, near the Eldorado trailhead at milepost 20 in recent seasons." };
  }
  plans.push({ id: r.id, patch, misses });
}
for (const p of plans) console.log(p.misses.length ? "REFUSE" : "ok    ", p.id, Object.keys(p.patch).join(","), p.misses.join("; "));
if (process.argv.includes("--show")) for (const p of plans) if (p.patch.access) console.log("\n", p.id, "\n  ", p.patch.access.rules);
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }
let n = 0;
for (const p of plans) { if (p.misses.length || !Object.keys(p.patch).length) continue; await patchRow("routes", p.id, p.patch); n++; }
// Reconcile: re-read and prove every write landed.
const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,access,approach_variants,road,waypoints,approach_logistics`, { headers: headers(key) })).json();
let bad = 0;
for (const r of back) { const s = JSON.stringify(r); if (s.includes(BB_OLD.trim()) || s.includes("Mount Shuksan, Eldorado Peak and Forbidden Peak") || s.includes("Eldorado TH/Boston Basin pulloff") || (r.id === WF && s.includes("\"trailhead\":\"Eldorado Creek"))) { bad++; console.log("STILL OLD:", r.id); } }
console.log(`wrote ${n}; reconcile: ${bad} rows still carry old text`);
