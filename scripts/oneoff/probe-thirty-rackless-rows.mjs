// The 30 written-up-but-rackless roped WA routes, in full. Research has to be grounded in what
// the row already says — the grade, the pitch count, the description — or it is just a guess
// with a citation attached. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const IDS = ["wa_batskins","wa_bobcat_cringe","wa_bowl_packer","wa_bowling_to_biscuits","wa_clay",
"wa_commandho_pillar","wa_curious_poses","wa_east_corner_of_the_mole","wa_freedom_fighter_2",
"wa_gnostic_diversions","wa_house_of_the_7th_bobcat","wa_hozomeen_mountain_south_peak_north_ridge",
"wa_hozomeen_mountain_south_peak_southwest_route","wa_hozomeen_mountain_southwest_buttress",
"wa_ignorant_bliss","wa_narrow_arrow_overhang","wa_ne_arete","wa_ne_chimney","wa_princely_ambitions",
"wa_sagittarius","wa_sisu","wa_southeast_arete","wa_southwest_rib_of_the_mole","wa_spoil_ill",
"wa_starfish_enterprise","wa_technicians_of_the_sacred","wa_the_pyramid_picket_east_ridge",
"wa_true_grit","wa_west_face","wa_west_face_of_the_mole"];

const SEL = "id,name,area_id,discipline,grade,pitches,length_m,overview,description,beta,pitch_detail,what_to_bring,prot_rating,crux";
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${IDS.join(",")})`, { headers: headers(k) });
if (!res.ok) { console.error(`read failed ${res.status} ${await res.text()}`); process.exit(1); }
const rows = await res.json();

// The area name matters: "Batskins" means nothing, "Batskins at Index Town Walls" is researchable.
const aids = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,path&id=in.(${aids.join(",")})`, { headers: headers(k) })).json();
const aOf = (id) => areas.find((a) => a.id === id);

console.log(`${rows.length} of ${IDS.length} rows read\n`);
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const a = aOf(r.area_id);
  console.log(`\n############ ${r.id}`);
  console.log(`  name:   ${r.name}`);
  console.log(`  area:   ${a ? `${a.name}  [${a.path}]` : r.area_id}`);
  console.log(`  disc:   ${r.discipline}   grade: ${r.grade || "-"}   pitches: ${r.pitches ?? "-"}   length_m: ${r.length_m ?? "-"}`);
  for (const c of ["overview", "description", "beta", "prot_rating", "crux", "what_to_bring", "pitch_detail"]) {
    const v = r[c];
    if (v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) continue;
    console.log(`  ${c}: ${typeof v === "string" ? v.slice(0, 600) : JSON.stringify(v).slice(0, 600)}`);
  }
}
