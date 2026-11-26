// Adds the Methow Mountains' MARTIN PEAK (8,375 ft), a Bulger the catalog never held, with its
// standard route (owner note on peak lists, 2026-11-26). The catalog's only "Martin Peak" is the
// Entiat Mountains one near Holden, 40 km away, which is ALSO a Bulger; the published list counts both.
// catalog_find_area('Martin Peak','Washington',48.19,-120.35) returned only that row (2026-11-26).
//   node scripts/oneoff/add-martin-peak-methow.mjs [--dry]
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const H = extra => headers(key, { "Content-Type": "application/json", Prefer: "return=representation", ...extra });

const AREA = {
  id: "wa_martin_peak_methow", name: "Martin Peak", parent_id: "wa_sawtooth_chelan", area_type: "peak",
  elevation_ft: 8375, lat: 48.1885, lng: -120.3509,
};
const ROUTE = {
  id: "wa_martin_peak_methow_north_ridge", area_id: AREA.id, name: "North Ridge from Martin Lakes",
  discipline: "scrambling", grade: "Class 2", grade_system: "class", grade_num: 2,
  overview: "A long day scramble in the Chelan Sawtooth. A good trail climbs to the Martin Lakes basin, and from there the line leaves the path for talus, scree and easy ledges up the north ridge, moving onto the west side just below the crest. A few class 3 moves on solid rock guard the top; the rest is class 1 and 2.",
  approach: "From the Twisp River valley take Gold Creek road to Forest Road 4340 and its 4340-300 spur, ending at the Crater Creek trailhead near 4,760 ft. Follow the Eagle Creek and then the Martin Creek trails to the Martin Lakes basin, about 7 miles in. Pass both lakes, then go cross-country over talus to the small pond under the north ridge and climb onto the crest.",
  descent_text: "The quicker way down is the east ridge and the southeast slope, which ends in a steep chute dropping back to the Martin Lakes basin. From the lakes retrace the trail to Crater Creek. The round trip is about 16 miles, so plan on a long day.",
  season: "Jul-Sep",
  hazards: [
    "Loose talus and scree on the north ridge and across the off-trail basin",
    "A few exposed class 3 moves just below the summit",
    "Eagle Creek is a rock-hop where the old bridge is gone, and snow lingers on the trail into early summer",
  ],
  permit: "Northwest Forest Pass or an Interagency pass at the trailhead",
};

const get = async q => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key) }); if (!r.ok) throw new Error(q + " -> " + r.status + " " + (await r.text()).slice(0, 200)); return r.json(); };
if ((await get(`areas?select=id&id=eq.${AREA.id}`)).length) { console.log("area already exists — nothing to do"); process.exit(0); }
const near = await get(`areas?select=id,name,lat,lng&name=ilike.*martin*&lat=gte.48.1&lat=lte.48.3&lng=gte.-120.45&lng=lte.-120.25`);
if (near.length) { console.error("REFUSING: an area named like Martin within ~10 km already exists:", JSON.stringify(near)); process.exit(1); }
if (!(await get(`areas?select=id&id=eq.${AREA.parent_id}`)).length) { console.error("REFUSING: parent missing"); process.exit(1); }
if (DRY) { console.log("--dry: would insert", AREA.id, "and", ROUTE.id); process.exit(0); }
for (const [t, row] of [["areas", AREA], ["routes", ROUTE]]) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: "POST", headers: H(), body: JSON.stringify(row) });
  const txt = await r.text();
  if (!r.ok) { console.error(`${t} insert -> ${r.status} ${txt.slice(0, 300)}`); process.exit(1); }
  await new Promise(res => setTimeout(res, 1200));
}
const back = await get(`routes?select=id,area_id,name,season&id=eq.${ROUTE.id}`);
const area = await get(`areas?select=id,route_count,path&id=eq.${AREA.id}`);
console.log(back.length === 1 && area.length === 1 ? "verified on re-read" : "MISMATCH", JSON.stringify(area), JSON.stringify(back));
