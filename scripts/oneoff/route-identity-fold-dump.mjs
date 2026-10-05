// Read-only: prints the prose columns of the six held fold-in pairs (drop row, then kept row) so
// the fold can be written by hand. See route-identity-fold.mjs.
//   node scripts/oneoff/route-identity-fold-dump.mjs [id-substring]
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
export const PAIRS = [
  ["wa_davis_peak_nc_southwest", "wa_davis_peak_nc_south_slope_and_ridge"],
  ["wa_little_tahoma_cowlitz_ingraham_glaciers", "wa_little_tahoma_east_shoulder"],
  ["wa_whatcom_peak_southwest_route", "wa_south_spur"],
  ["wa_whitehorse_mountain_r1", "wa_whitehorse_mountain_nw_shoulder"],
  ["wa_bears_breast_mountain_se_mega_slab", "wa_bears_breast_mountain_infinite_beauty"],
  ["wa_southwest_scramble", "wa_pinnacle_peak_tatoosh_r1"],
];
const COLS = "id,name,grade,season,best_season,overview,beta,approach,descent_text,approach_variants,climbing_route,pitch_detail,seasonal_guidance,watch_out,pro_tips,gain_ft,dist_km,timing";
const f = process.argv[2] || "";
for (const pair of PAIRS.filter(p => p.some(id => id.includes(f)))) {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=in.(${pair.join(",")})`, { headers: headers(key) })).json();
  for (const id of pair) {
    const r = rows.find(x => x.id === id);
    console.log(`\n===== ${id === pair[0] ? "DROP" : "KEEP"} ${id}`);
    for (const [k, v] of Object.entries(r || {})) if (v != null && v !== "" && k !== "id") console.log(`-- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
}
