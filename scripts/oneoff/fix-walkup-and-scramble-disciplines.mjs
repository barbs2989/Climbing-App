// Ruby Mountain's South Ridge — a Class 2 abandoned way trail to a walked summit — was filed
// `scrambling`, and its two siblings (Happy Creek, Northwest Ridge: winter snowshoe routes) were
// filed `trad`. The user's rule (memory: discipline-classification, glacier-means-mountaineering):
// mountaineering is "only routes you just have to walk up" (Class 1-2, snow slog, snowshoe) or any
// route that must cross a glacier without a required 5.x pitch; scrambling is ropeless Class 3-4;
// alpine is any REQUIRED roped technical grade.
//
// Scope: the 1,086 routes with enriched prose, restricted to WA peak areas not already
// mountaineering (906 rows). A text detector (max class, a 5.x grade — excluding "5.2 miles"-style
// distances, which put Ruby itself in the wrong bucket on the first pass — glacier gear, walk
// language) picked 112 candidates; each was then researched ONLINE (SummitPost, WTA, The
// Mountaineers, Wikipedia/Peakbagger, trip reports). Only medium/high-confidence verdicts are
// applied.
//
// While this was researched, #1846 relabelled every WA `trad` route on a peak (132) as `alpine`
// wholesale. 21 of those are rows below — researched here as ropeless Class 2-4, so they are
// scrambling or mountaineering, not alpine; their `from` is the post-#1846 value. The four this
// audit also found to be roped 5th class (Golden Horn SW, Bears Breast Mega Slab, Chopping Block
// NW, Mount Washington Winter Direct) #1846 already made alpine, so they are not listed.
//
// Researched and deliberately NOT changed:
//   Sentinel Peak Standard (disputed low 5th + Le Conte Glacier — alpine either way);
//   Guye SE Gully (to 70-degree snow, pickets) and Deception's Honeymoon Route (50-60 degrees, two tools) —
//     steep snow is not a walk-up;
//   Storm King SW (Class 3-4 on paper, nearly every party ropes it);
//   Booker NW, Hagan S, Trapper S, Sky Mtn S, Sefrit SW — not confirmable online;
//   Bonanza "West Ridge Approach" — no such Class 2 route exists online; the row itself needs review;
//   Seven Fingered Jack SW, Noyes, Buckskin SW, Blizzard, Mount Dana, Cosho, Sundial — Class 2-3
//     borderline or glacier not actually crossed; kept scrambling.
// Chelan Butte REVERSES fix-misfiled-crag-disciplines.mjs, which moved it off mountaineering
// because there is no hiking discipline; the walk-up rule decides it the other way, consistently
// with Table Mountain, Mount Townsend, Winchester and the other trail summits below.
//
// Assert-then-set: a row that no longer holds `from` is skipped, not overwritten. --dry writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");

const FIXES = [
  { id: "wa_jack_mountain_east_ridge", from: "scrambling", to: "mountaineering", why: "class 4, east glacier traverse to reach ridge" },
  { id: "wa_tomyhoi_peak_southeast_ridge", from: "alpine", to: "scrambling", why: "class 3 summit block, no rope" },
  { id: "wa_goat_mountain_south_ridge", from: "alpine", to: "mountaineering", why: "trail + class 2 heather" },
  { id: "wa_lichtenberg_mountain_southeast_ridge", from: "scrambling", to: "mountaineering", why: "class 2 max" },
  { id: "wa_mount_norton_scramble", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_mount_wilder_scramble", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_ruby_mountain_south_ridge", from: "scrambling", to: "mountaineering", why: "class 2 way trail walk-up" },
  { id: "wa_switchback_mountain_west_ridge", from: "alpine", to: "mountaineering", why: "boot path class 2" },
  { id: "wa_winchester_mountain_south_trail", from: "scrambling", to: "mountaineering", why: "trail to lookout" },
  { id: "wa_lundin_peak_east_ridge", from: "alpine", to: "scrambling", why: "class 3, one class 4 step" },
  { id: "wa_black_peak_east_buttress", from: "alpine", to: "scrambling", why: "class 3-4 gullies" },
  { id: "wa_castle_peak_pasayten_south_route", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_east_ridge_6", from: "alpine", to: "scrambling", why: "class 3 + 20ft class 4 chimney" },
  { id: "wa_hozomeen_mountain_north_peak_north_route", from: "alpine", to: "scrambling", why: "3rd w/ bits of 4th" },
  { id: "wa_magic_mountain_northwest_ridge", from: "alpine", to: "scrambling", why: "class 4 chimney" },
  { id: "wa_mount_larrabee_south_ridge", from: "alpine", to: "scrambling", why: "Mountaineers alpine scramble" },
  { id: "wa_ruby_mountain_northwest_ridge", from: "alpine", to: "mountaineering", why: "winter snowshoe ridge" },
  { id: "wa_southwest_scramble", from: "alpine", to: "scrambling", why: "class 3-4 ropeless" },
  { id: "wa_klawatti_peak_north_ridge", from: "scrambling", to: "mountaineering", why: "Eldorado/Inspiration/McAllister glaciers required" },
  { id: "wa_north_ridge_2", from: "alpine", to: "scrambling", why: "class 3, no glacier" },
  { id: "wa_alpine_lookout_round_mountain_trail", from: "scrambling", to: "mountaineering", why: "maintained trail" },
  { id: "wa_osceola_peak_scramble", from: "scrambling", to: "mountaineering", why: "class 2 south slope" },
  { id: "wa_table_mountain_standard_scramble", from: "scrambling", to: "mountaineering", why: "FS trail 681" },
  { id: "wa_windy_peak_iron_gate_trail", from: "scrambling", to: "mountaineering", why: "trail all the way" },
  { id: "wa_buckner_mountain_southwest_face", from: "alpine", to: "mountaineering", why: "class 3, Sahale Glacier on standard approach" },
  { id: "wa_cathedral_peak_southwest_route", from: "alpine", to: "scrambling", why: "class 4 step" },
  { id: "wa_esmeralda_peaks_east_gully", from: "alpine", to: "scrambling", why: "class 3-4" },
  { id: "wa_hozomeen_mountain_northeast_buttress", from: "alpine", to: "scrambling", why: "class 3-4" },
  { id: "wa_mount_constance_north_chimney", from: "alpine", to: "scrambling", why: "class 3 (3-4 moves)" },
  { id: "wa_mount_seattle_noyes_basin", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_scramble_route", from: "alpine", to: "scrambling", why: "Eagle Peak class 3-4" },
  { id: "wa_wing_peak_northwest_ridge", from: "alpine", to: "scrambling", why: "class 3-4" },
  { id: "wa_magic_mountain_northeast_couloir", from: "alpine", to: "mountaineering", why: "class 3 couloir via Yawning Glacier" },
  { id: "wa_fifth_of_july_mountain_scramble", from: "scrambling", to: "mountaineering", why: "class 2 walk-up from Larch Lakes" },
  { id: "wa_iron_peak_teanaway_scramble", from: "scrambling", to: "mountaineering", why: "trail + broad ridge, no scrambling" },
  { id: "wa_mount_mccausland_n_route", from: "scrambling", to: "mountaineering", why: "climber's path, brief class 2" },
  { id: "wa_mount_townsend_standard", from: "scrambling", to: "mountaineering", why: "class 1 maintained trail" },
  { id: "wa_ruby_mountain_happy_creek", from: "alpine", to: "mountaineering", why: "winter snowshoe/ski ascent" },
  { id: "wa_white_mountain_olympics_scramble", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_chelan_butte_chelan_butte_trail", from: "scrambling", to: "mountaineering", why: "class 1 road/trail walk (reverses earlier fix)" },
  { id: "wa_big_four_mountain_dry_creek_route", from: "alpine", to: "scrambling", why: "class 4 slabs" },
  { id: "wa_cashmere_mountain_se_route", from: "alpine", to: "scrambling", why: "class 3 gully" },
  { id: "wa_davis_peak_nc_south_slope_and_ridge", from: "alpine", to: "scrambling", why: "class 3, brief 4" },
  { id: "wa_lewis_creek_route", from: "alpine", to: "scrambling", why: "Gunn Peak class 3, short 4" },
  { id: "wa_mount_johnson_standard", from: "alpine", to: "scrambling", why: "class 4" },
  { id: "wa_mount_triumph_west_route", from: "alpine", to: "scrambling", why: "class 4" },
  { id: "wa_south_twin_sister_west_ridge", from: "alpine", to: "scrambling", why: "class 3-4, no rope needed" },
  { id: "wa_ghost_peak_south_route", from: "alpine", to: "mountaineering", why: "class 4 + Pickets glacier approach" },
  { id: "wa_luahna_peak_east_slopes", from: "scrambling", to: "mountaineering", why: "Richardson Glacier crossing" },
  { id: "wa_south_spur", from: "alpine", to: "scrambling", why: "class 3, no glacier on south side" },
  { id: "wa_baldy_standard", from: "scrambling", to: "mountaineering", why: "trail/way-trail" },
  { id: "wa_enchantment_peak_east_ridge", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_indian_mountain_baker_scramble", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_mount_herman_standard_scramble", from: "scrambling", to: "mountaineering", why: "heather walk-up" },
  { id: "wa_mount_steel_first_divide", from: "scrambling", to: "mountaineering", why: "class 1-2" },
  { id: "wa_preacher_mountain_scramble", from: "scrambling", to: "mountaineering", why: "ridge walk" },
  { id: "wa_snoqualmie_mountain_standard_route", from: "scrambling", to: "mountaineering", why: "nontechnical climbers' trail" },
  { id: "wa_union_peak_se_route", from: "scrambling", to: "mountaineering", why: "ridge walk" },
  { id: "wa_windy_peak_windy_creek_trail", from: "scrambling", to: "mountaineering", why: "maintained trail" },
  { id: "wa_cashmere_mountain_northeast_ridge", from: "alpine", to: "scrambling", why: "class 4, 5th step bypassable" },
  { id: "wa_classic_route_3", from: "alpine", to: "scrambling", why: "Lane Peak class 3" },
  { id: "wa_greenwood_mountain_west_ridge", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_lena_lake_to_mt_stone_traverse", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_mount_constance_terrible_traverse", from: "alpine", to: "scrambling", why: "class 3 exposed traverse" },
  { id: "wa_south_ridge_3", from: "alpine", to: "scrambling", why: "Black Peak class 3-4" },
  { id: "wa_east_ridge_2", from: "alpine", to: "mountaineering", why: "Snowking class 2 heather/slabs + 30deg snow" },
  { id: "wa_little_big_chief_mountain_northeast_face", from: "alpine", to: "scrambling", why: "class 3-4" },
  { id: "wa_arrowhead_mountain_south_route", from: "scrambling", to: "mountaineering", why: "snowshoe/walk, no hands-on rock" },
  { id: "wa_earl_peak_standup_creek_route", from: "scrambling", to: "mountaineering", why: "class 2 boulder hop" },
  { id: "wa_gray_wolf_ridge_se_slopes", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_mount_barnes_scramble", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_philadelphia_mountain_scramble", from: "scrambling", to: "mountaineering", why: "at worst class 2" },
  { id: "wa_tye_peak_e_route", from: "scrambling", to: "mountaineering", why: "bushwhack/snow, no rock" },
  { id: "wa_windy_peak_trail", from: "scrambling", to: "mountaineering", why: "trail to summit" },
  { id: "wa_cadet_peak_ne_ridge", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_chalangin_peak_southwest_face", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_goat_mountain_east_peak", from: "alpine", to: "mountaineering", why: "class 2 heather/gully" },
  { id: "wa_indian_head_peak_southwest_slopes", from: "alpine", to: "mountaineering", why: "class 2" },
  { id: "wa_mount_constance_north_chute", from: "alpine", to: "scrambling", why: "class 3" },
  { id: "wa_mount_seattle_seattle_creek", from: "alpine", to: "scrambling", why: "class 3" },
];

const key = requireServiceKey();
const ids = FIXES.map(f => f.id);
const read = () => selectAll("routes", "id,name,discipline", `id=in.(${ids.join(",")})`, { key, pageSize: 200 });
const rows = await read();
if (rows.length !== FIXES.length) {
  console.log(`FAIL: expected ${FIXES.length} rows, read ${rows.length} — ${ids.filter(i => !rows.some(r => r.id === i)).join(", ")} missing`);
  process.exit(1);
}
const byId = new Map(rows.map(r => [r.id, r]));

let changed = 0, skipped = 0;
for (const f of FIXES) {
  const r = byId.get(f.id);
  if (r.discipline === f.to) { console.log(`  already ${f.to}: ${f.id}`); skipped++; continue; }
  if (r.discipline !== f.from) { console.log(`  SKIP ${f.id} — is ${JSON.stringify(r.discipline)}, not ${JSON.stringify(f.from)}`); skipped++; continue; }
  console.log(`${DRY ? "would set" : "setting"} ${f.id}  "${r.name}"  ${f.from} -> ${f.to}  (${f.why})`);
  if (!DRY) await patchRow("routes", f.id, { discipline: f.to });
  changed++;
}
console.log(`\n${DRY ? "would change" : "changed"} ${changed}; ${skipped} skipped`);
if (DRY || !changed) process.exit(0);

const after = await read();
const wrong = after.filter(r => r.discipline !== FIXES.find(x => x.id === r.id).to);
console.log(wrong.length ? `FAIL: ${wrong.length} row(s) did not take: ${wrong.map(r => `${r.id}=${r.discipline}`).join(", ")}` : `verified — all ${FIXES.length} disciplines stored`);
if (wrong.length) process.exit(1);
await syncAreas();

// Since 0197 a PEAK keeps its dominant_discipline once it is a mountain type — the routes trigger
// no longer moves it. So Ruby Mountain still read `scrambling` with all three of its routes now
// `mountaineering`. Only a label that NONE of the area's own routes holds is replaced (by the
// routes' most common discipline); a label that some route still agrees with is left alone, since
// 0197 treats it as researched. Measured on first run: 35 of 67 touched areas.
async function syncAreas() {
  const aids = [...new Set((await selectAll("routes", "id,area_id", `id=in.(${ids.join(",")})`, { key, pageSize: 200 })).map(r => r.area_id))];
  const q = () => selectAll("areas", "id,dominant_discipline", `id=in.(${aids.join(",")})`, { key, pageSize: 200 });
  const routes = await selectAll("routes", "id,area_id,discipline", `area_id=in.(${aids.join(",")})`, { key, pageSize: 1000 });
  const want = new Map();
  for (const a of await q()) {
    const c = {};
    for (const r of routes) if (r.area_id === a.id && r.discipline) c[r.discipline] = (c[r.discipline] || 0) + 1;
    if (!Object.keys(c).length || a.dominant_discipline in c) continue;
    const mode = Object.entries(c).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
    console.log(`area ${a.id}: dominant_discipline ${a.dominant_discipline} -> ${mode}  ${JSON.stringify(c)}`);
    await patchRow("areas", a.id, { dominant_discipline: mode });
    want.set(a.id, mode);
  }
  const bad = (await q()).filter(a => want.has(a.id) && a.dominant_discipline !== want.get(a.id));
  console.log(bad.length ? `FAIL: ${bad.length} area(s) did not take` : `verified — ${want.size} area label(s) now agree with their routes`);
  process.exit(bad.length ? 1 : 0);
}
