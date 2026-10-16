// Batch 1 of the WA multi-approach worklist (audits/wa-multi-approach): the 3 FINISH routes and the
// 46 routes the research marked MULTI_TRAILHEAD with high confidence.
//
// Almost every one of these already DESCRIBED its second way in as a prose card, so the climber
// read "or from Trinity over Buck Creek Pass" and then every number, pin and camp on the page was
// the Phelps Creek one. This gives each such card the data the picker needs (lib/approaches.js):
//   - a `trip` with the way in's own trailhead (name + coordinate), and its distance/gain where the
//     research found a figure — never computed, never borrowed from the other way in;
//   - `viaRouteId` where the way in IS another catalog route (Golden Age, the Gendarme, the Fury
//     ridge traverse);
//   - the row's own camps that belong to that way in, copied by name, so its camp list follows the
//     pick instead of going blank.
// Where the research named a way in the row had no card for, a short card is added.
//
// Trailhead coordinates come from the catalog's own pins first (another route already pins the
// same trailhead), else from researched trailhead pages; four places with no confident coordinate
// get a name and no pin. A coordinate more than 45 km from the climb is refused.
//
//   node scripts/oneoff/link-multi-approach-batch1.mjs            # dry run, prints every change
//   node scripts/oneoff/link-multi-approach-batch1.mjs --write    # write + re-read
//   node scripts/oneoff/link-multi-approach-batch1.mjs --rollback # restore the saved before-state
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const TH = {
  CHIL: { trailhead: "Chilliwack Lake road, south end (British Columbia)" },
  ALPENTAL: { trailhead: "Alpental / Snow Lake Trailhead (I-90 Exit 52)", trailheadLat: 47.44542, trailheadLng: -121.42353 },
  STUARTLAKE: { trailhead: "Stuart Lake Trailhead (Trail #1599)", trailheadLat: 47.5282, trailheadLng: -120.82036 },
  HARTS: { trailhead: "Harts Pass Trailhead (end of FR-5400)", trailheadLat: 48.7204, trailheadLng: -120.6698, trailheadElevFt: 6180 },
  DRIVEWAY: { trailhead: "Cathedral Driveway Trailhead (Toats Coulee Road)", trailheadLat: 48.8555, trailheadLng: -119.9453 },
  THIRTYMILE: { trailhead: "Thirtymile Trailhead (end of the Chewuch River Road)", trailheadLat: 48.8231, trailheadLng: -120.0197, trailheadElevFt: 3400 },
  ANDREWS: { trailhead: "Andrews Creek Trailhead (Trail #504)", trailheadLat: 48.7842, trailheadLng: -120.1088 },
  MINERAL: { trailhead: "Mineral Creek Trailhead (Trail #1331, end of FR-46)", trailheadLat: 47.4176, trailheadLng: -121.2373 },
  TRINITY: { trailhead: "Trinity Trailhead (end of Chiwawa River Road)", trailheadLat: 48.07197, trailheadLng: -120.84999 },
  HOLDEN: { trailhead: "Holden Village (Railroad Creek)", trailheadLat: 48.1993, trailheadLng: -120.7741 },
  CUTTHROATPULL: { trailheadLat: 48.5162, trailheadLng: -120.6836 },
  RAINY: { trailhead: "Rainy Pass PCT North Trailhead", trailheadLat: 48.5181, trailheadLng: -120.7331 },
  CASCADEPASS: { trailhead: "Cascade Pass Trailhead (end of Cascade River Road)", trailheadLat: 48.47549, trailheadLng: -121.07504 },
  WATSON: { trailhead: "Watson Lakes Trailhead (FR-1107)", trailheadLat: 48.6746, trailheadLng: -121.6147 },
  EASTBANK: { trailhead: "East Bank Trailhead (SR-20 near milepost 138)", trailheadLat: 48.708, trailheadLng: -120.9779 },
  ROSSDAM: { trailhead: "Ross Dam Trailhead (SR-20 milepost 134)", trailheadLat: 48.7278, trailheadLng: -121.0628 },
  WHITERIVER: { trailhead: "White River Campground", trailheadLat: 46.9022, trailheadLng: -121.6442 },
  CUTTHROATLAKE: { trailhead: "Cutthroat Lake Trailhead (FR-400, SR-20)", trailheadLat: 48.55635, trailheadLng: -120.65475 },
  GRAVES: { trailhead: "Graves Creek Trailhead (East Fork Quinault)", trailheadLat: 47.5728, trailheadLng: -123.5699, trailheadElevFt: 550 },
  SWITCHBACK: { trailhead: "Switchback Trailhead (Hurricane Ridge Road)", trailheadLat: 47.9866, trailheadLng: -123.4609 },
  HEATHER: { trailhead: "Heather Park Trailhead (Heart O' the Hills)", trailheadLat: 48.039, trailheadLng: -123.4314 },
  HRVC: { trailheadLat: 47.97, trailheadLng: -123.495, trailheadElevFt: 5240 },
  SLATE: { trailhead: "South Fork Slate Creek road end (over Harts Pass)" },
  WFMETHOW: { trailhead: "West Fork Methow Trailhead (Trail #480)", trailheadLat: 48.6515, trailheadLng: -120.5623, trailheadElevFt: 2680 },
  GREENMTN: { trailhead: "Green Mountain Trailhead (FR-2680 off Suiattle River Road)", trailheadLat: 48.268, trailheadLng: -121.2371, trailheadElevFt: 3200 },
  ELLLOWER: { trailhead: "Lower Trailhead (FR-2419)", trailheadLat: 47.5071, trailheadLng: -123.2317, trailheadElevFt: 2600 },
  ELLUPPER: { trailheadLat: 47.5105, trailheadLng: -123.2479, trailheadElevFt: 3500 },
  ENTIAT: { trailhead: "Entiat River Trailhead (Cottonwood, end of Entiat River Road)", trailheadLat: 48.0246, trailheadLng: -120.6508, trailheadElevFt: 3070 },
  SWAMP: { trailhead: "Swamp Creek pullout (SR-20, about 2 miles west of Rainy Pass)", trailheadElevFt: 3950 },
  ROCKMTN: { trailhead: "Rock Mountain Trailhead (US-2 near milepost 73)", trailheadLat: 47.7757, trailheadLng: -120.9581, trailheadElevFt: 2675 },
  PARKCREEK: { trailhead: "Park Creek Trailhead (Stehekin Valley Road)", trailheadLat: 48.4282, trailheadLng: -120.9158 },
  EASYPASS: { trailhead: "Easy Pass Trailhead (SR-20)", trailheadLat: 48.5879, trailheadLng: -120.8029 },
  WHISKEY: { trailhead: "Whiskey Bend Trailhead (Elwha)", trailheadLat: 47.968, trailheadLng: -123.583 },
  DEPOT: { trailhead: "Depot Creek Road washout (via Chilliwack Lake, BC)", trailheadLat: 49.033, trailheadLng: -121.4025 },
  COMET: { trailhead: "Comet Falls Trailhead (Longmire–Paradise road)", trailheadLat: 46.779, trailheadLng: -121.7823, trailheadElevFt: 3650 },
  LAKEANN: { trailhead: "Lake Ann Trailhead (SR-542)", trailheadLat: 48.85002, trailheadLng: -121.68616 },
  WHITESALMON: { trailheadLat: 48.8595, trailheadLng: -121.648 },
  LENA: { trailhead: "Lena Lake Trailhead (Hamma Hamma Road, FR-25)", trailheadLat: 47.5997, trailheadLng: -123.1509 },
  PUTVIN: { trailheadLat: 47.5835, trailheadLng: -123.234 },
  ESMERALDA: { trailhead: "Esmeralda Basin Trailhead (FR-9737)", trailheadLat: 47.43656, trailheadLng: -120.93697 },
  PHELPS: { trailhead: "Phelps Creek Trailhead (Trail #1511)", trailheadLat: 48.0829, trailheadLng: -120.835 },
  SNOWLAKES: { trailhead: "Snow Lakes Trailhead (Icicle Creek Road)", trailheadLat: 47.5441, trailheadLng: -120.7095 },
  BEDAL: { trailhead: "Bedal Creek Trailhead (FR-4096)", trailheadLat: 48.0719, trailheadLng: -121.3764 },
  SLOANPULL: { trailheadLat: 48.0863, trailheadLng: -121.3084, trailheadElevFt: 1900 },
  TUNNEL: { trailhead: "Tunnel Creek Trailhead (FR-6095 off US-2)", trailheadLat: 47.7094, trailheadLng: -121.1065 },
  SURPRISE: { trailhead: "Surprise Creek Trailhead", trailheadLat: 47.7078, trailheadLng: -121.1567 },
  MM166: { trailhead: "SR-20 pullout near milepost 166 (Washington Pass)", trailheadLat: 48.549, trailheadLng: -120.630965 },
};

// t = give an EXISTING card (by index) a trip; add = a NEW card; fill = the row's own trailhead
// gains what it lacks (its stored numbers already describe that way in); via = link a card to a route.
const ANDREWS_CARDS = {
  thirty: { name: "Thirtymile Trailhead and the Chewuch River trail toward Remmel Lake", th: "THIRTYMILE", camps: ["Remmel", "Upper Cathedral"], notes: "Follow the Chewuch River trail north from the Thirtymile Trailhead nearly to Remmel Lake, then climb to the Cathedral Lakes basin. A longer way round than Andrews Creek, used when combining the Remmel Lake country with the climb." },
  driveway: { name: "Cathedral Driveway trail #510A from Loomis via Toats Coulee", th: "DRIVEWAY", gainFt: 3700, camps: ["Upper Cathedral"], notes: "From the Cathedral Driveway Trailhead on the Toats Coulee road out of Loomis, the trail drops to join the Chewuch trail and then climbs the valley to the Cathedral Lakes basin. The eastern way in, with less climbing than Andrews Creek." },
};
const PLAN = {
  wa_bear_mountain_chilliwack_north_buttress: { t: { 1: { th: "CHIL" } } },
  wa_direct_north_buttress: { t: { 1: { th: "CHIL" } } },
  wa_bryant_peak_southeast_slopes: { t: { 1: { th: "ALPENTAL" } } },
  wa_cannon_mountain_south_slopes: { t: { 1: { th: "STUARTLAKE", camps: ["Coney", "Mountaineer"] } } },
  wa_castle_peak_pasayten_scramble: { t: { 1: { th: "HARTS", distMi: 27 } } },
  wa_cathedral_peak_last_rites: { fill: "ANDREWS", t: { 1: { th: "DRIVEWAY", gainFt: 3700, camps: ["Upper Cathedral"] } }, add: [ANDREWS_CARDS.thirty] },
  wa_cathedral_peak_pasayten_se_buttress: { t: { 1: { th: "DRIVEWAY", fromCard: true, camps: ["Upper Cathedral"] } }, add: [ANDREWS_CARDS.thirty] },
  wa_cathedral_peak_southwest_route: { fill: "ANDREWS", add: [ANDREWS_CARDS.driveway, ANDREWS_CARDS.thirty] },
  wa_ne_ridge: { add: [ANDREWS_CARDS.driveway, ANDREWS_CARDS.thirty] },
  wa_south_face_10: { t: { 1: { th: "DRIVEWAY", gainFt: 3700, camps: ["Upper Cathedral"] } }, add: [ANDREWS_CARDS.thirty] },
  wa_chikamin_peak_southeast_slopes: { storedRow: 0, t: { 1: { th: "MINERAL", camps: ["Park Lake", "Glacier Lake"] } } },
  wa_cloudy_peak_southwest_slopes: { t: { 1: { th: "TRINITY", camps: ["Buck Creek"] }, 2: { th: "HOLDEN", camps: ["Lyman"] } } },
  wa_north_ridge_3: { fill: "CUTTHROATPULL", add: [{ name: "Rainy Pass and Porcupine Creek into the basin northwest of the peak", th: "RAINY", notes: "From Rainy Pass, follow the PCT north for about twenty minutes and leave it before the Porcupine Creek bridge, climbing through timber into the basin northwest of the peak. Two or three short low-fifth pitches reach the North Ridge notch. Longer than the south-side basin, but on cleaner rock to the notch; parties camped near Rainy Pass or combining objectives use it." }] },
  wa_dome_peak_dome_glacier: { t: { 1: { th: "CASCADEPASS" } } },
  wa_hagan_mountain_south: { t: { 0: { th: "WATSON" } } },
  wa_jack_mountain_nohokomeen_headwall: { fill: "EASTBANK", t: { 1: { th: "ROSSDAM" } } },
  wa_liberty_cap_ptarmigan_ridge_finish: { t: { 1: { th: "WHITERIVER" } } },
  wa_golden_age: { via: { 0: "wa_the_tiger", 1: "wa_ellen_pea" }, add: [{ name: "Up the gully to its own ledge", th: "MM166", primary: true, notes: "From the pullout near milepost 166, hike the gully below the wall for about an hour and follow a narrow ledge back right to the start, a prominent left-arching wide corner. The direct way, and the most practical when the gully is in shape." }], unprimary: [0], first: true },
  wa_north_ridge_west_side: { add: [
    { name: "Rainy Pass, the PCT north and the ridge above Porcupine Creek", primary: true, storedRow: true, notes: "Follow the PCT north from Rainy Pass about a mile and a half, to just before the Porcupine Creek bridge, then climb the ridge northeast for about two miles to the base. The shorter way, with the cleaner gully to the base." },
    { name: "Cutthroat Lake and Cutthroat Pass", th: "CUTTHROATLAKE", distMi: 6.5, gainFt: 2300, camps: ["Cutthroat"], notes: "The eastern way: on trail most of the way, to Cutthroat Lake and up to Cutthroat Pass, then south along the crest for about a mile." },
  ] },
  wa_mount_anderson_eel_glacier: { t: { 1: { th: "GRAVES", camps: ["Enchanted", "O'Neil"] } } },
  wa_mount_angeles_standard: { fill: "HRVC", add: [
    { name: "Switchback Trail up to Klahhane Ridge", th: "SWITCHBACK", notes: "A steep, short trail from the Hurricane Ridge Road up to the Klahhane Ridge trail, then the same climbers' path to the summit." },
    { name: "Heather Park trail from Heart O' the Hills", th: "HEATHER", notes: "The long way from low on the Hurricane Ridge Road: the Heather Park trail climbs around the west side of the peak to join the climbers' path." },
  ] },
  wa_mount_ballard_south: { t: { 1: { th: "SLATE" } }, add: [{ name: "West Fork Methow and the PCT", th: "WFMETHOW", camps: ["Horse Heaven"], notes: "Up the West Fork Methow to the Pacific Crest Trail and over to the Mill Creek side. Longer, and usually chosen for combined trips." }] },
  wa_mount_buckindy_scramble: { add: [
    { name: "Kindy Ridge from the Kindy Creek road", storedRow: true, notes: "Up Kindy Ridge from the Kindy Creek road off the Cascade River Road, then south through the Buckindy high country to below the north side. A longer two-to-three-day approach." },
    { name: "Green Mountain trail and the Horse Lake saddle", th: "GREENMTN", primary: true, camps: ["Green Mountain", "Horse Lake"], notes: "The usual way: up the Green Mountain trail off the Suiattle River Road, then cross-country east and southeast along the ridges past Misch to Buckindy's north side. Check the Suiattle River Road before you go; it has been closed to vehicles for long stretches." },
  ] },
  wa_mount_ellinor_standard: { fill: "ELLUPPER", t: { 1: { th: "ELLLOWER", fromCard: true } } },
  wa_mount_fernow_southeast_face: { add: [
    { name: "Holden Village and Copper Basin", th: "HOLDEN", camps: ["Copper"], notes: "From Holden Village up to the Copper–Entiat divide and the east ridge. The most direct way to the standard east-side line, and climbable in a day from Holden, but it depends on the Lake Chelan boat." },
    { name: "Entiat River from Cottonwood", th: "ENTIAT", camps: ["Entiat Meadows"], notes: "Up the Entiat River trail toward the Entiat Glacier and the east ridge. The longest way in, with less gain and little avalanche exposure." },
  ] },
  wa_ridge_traverse_from_east_fury: { via: { 0: "wa_mount_fury_east_southeast_glaciers" } },
  wa_mount_hardy_snow_scramble: { t: { 1: { th: "SWAMP", gainFt: 4100 } } },
  wa_mount_howard_south_slope: { t: { 1: { th: "ROCKMTN", camps: ["Rock Lake"] } } },
  wa_mount_logan_fremont_glacier: { add: [{ name: "Stehekin and the Park Creek trail to Park Creek Pass", th: "PARKCREEK", camps: ["Park Creek Pass"], notes: "From the Park Creek Trailhead on the Stehekin Valley Road, the Park Creek trail climbs to Park Creek Pass and joins the Thunder Creek line there. It needs the Lake Chelan boat and the Stehekin shuttle to reach the trailhead." }] },
  wa_mount_logan_r1: { add: [{ name: "Easy Pass and Fisher Basin", th: "EASYPASS", camps: ["Fisher"], notes: "From the Easy Pass Trailhead on SR-20, over the 6,500 ft pass into Fisher Basin, then down the Fisher Creek trail to the lake outlet and the same camp as the Thunder Creek way." }] },
  wa_mount_maude_r1: { t: { 1: { th: "ENTIAT", distMi: 14.5, camps: ["Ice Lake"] } } },
  wa_mount_noyes_standard: { add: [{ name: "Elwha River to Low Divide", th: "WHISKEY", distMi: 28, camps: ["Low Divide"], notes: "The Elwha trail about 28 miles to Low Divide, plus the closed road walk at each end. Much longer, and used for traverses from the north." }] },
  wa_mount_rahm_south_side: { fill: "DEPOT", add: [
    { name: "Depot Creek from the Canadian side", primary: true, storedRow: true, camps: ["Ouzel"], notes: "The unmaintained Depot Creek trail crosses the border to Ouzel Lake, then the bench leads east to the south side. The easiest and most used way, but it means crossing the border on foot away from a port of entry, so confirm the entry rules first, and the road needs high clearance." },
    { name: "Silver Creek from Ross Lake", th: "ROSSDAM", camps: ["Silver Lake"], notes: "The all-US way: a water taxi up Ross Lake to the mouth of Silver Creek, then a long bushwhack up Silver Creek to Silver Lake and north to the upper terrace. Harder and much brushier." },
  ] },
  wa_mount_rainier_kautz_glacier: { t: { 1: { th: "COMET", camps: ["Van Trump"] } } },
  wa_mount_rainier_kautz_headwall: { add: [{ name: "Comet Falls and Van Trump Park", th: "COMET", camps: ["Van Trump"], notes: "Climbs from the Comet Falls trailhead past Van Trump Park and up the moraine beside the remnant Van Trump Glacier, joining the Paradise line around the Castle and the base of the Turtle. Preferred late in the season: it never crosses the Nisqually and has running water low down, but it starts about 1,700 ft lower and the descent is easy to lose in the trees." }] },
  wa_mount_shuksan_hanging_glacier: { fill: "WHITESALMON", t: { 1: { th: "LAKEANN" } } },
  wa_mount_spickard_silver_glacier: { fill: "DEPOT", t: { 0: { th: "ROSSDAM", camps: ["Silver Lake"] } } },
  wa_mount_spickard_southwest: { fill: "DEPOT", t: { 1: { th: "ROSSDAM", camps: ["Silver Lake"] } } },
  wa_mount_stone_lake_of_angels: { t: { 1: { th: "LENA", camps: ["Lena"] } } },
  wa_mount_stone_putvin: { fill: "PUTVIN", t: { 1: { th: "LENA", camps: ["Lena"] } } },
  wa_mount_stuart_north_ridge: { t: { 1: { th: "ESMERALDA", fromCard: true, camps: ["Goat Pass", "Ingalls"] } } },
  wa_mount_stuart_the_gendarme: { addVia: [
    { name: "Climb the whole North Ridge from its toe", viaRouteId: "wa_mount_stuart_north_ridge", primary: true },
    { name: "Climb the Upper North Ridge from the notch", viaRouteId: "wa_upper_north_ridge_w_great_gendarme" },
    { name: "Climb the Direct North Ridge", viaRouteId: "wa_the_direct_north_ridge_w_gendarme" },
  ] },
  wa_the_direct_north_ridge_w_gendarme: { t: { 0: { th: "STUARTLAKE", camps: ["Mountaineer"] } } },
  wa_north_star_mountain_east_route: { add: [{ name: "Phelps Creek over Spider Gap", th: "PHELPS", camps: ["Spider", "Lyman"], notes: "The Phelps Creek trail to Spider Meadow, over Spider Gap and down to Lyman Lakes, then the same basin to the south flank. No boat needed." }] },
  wa_phantom_peak_south_route: { t: { 1: { th: "ROSSDAM", camps: ["Luna"] } } },
  wa_prusik_peak_west_ridge: { add: [{ name: "Snow Lakes and the lower Enchantments to Prusik Pass", th: "SNOWLAKES", camps: ["Snow Lake", "Viviane"], notes: "From the Snow Lakes Trailhead, climb past Snow Lakes and Lake Viviane to the Gnome Tarn and Prusik Pass area below the peak. More gain than Aasgard Pass but no steep snow or talus headwall." }] },
  wa_sloan_peak_corkscrew: { storedRow: 1, fill: "SLOANPULL", t: { 0: { th: "BEDAL", camps: ["Bedal"] } } },
  wa_slippery_slab_tower_ne_face: { fill: "TUNNEL", renameStored: true, t: { 1: { th: "SURPRISE", camps: ["Surprise", "Glacier Lake"] } } },
  wa_north_ridge_2: { t: { 1: { th: "ROSSDAM", distMi: 16, camps: ["Little Beaver", "Twin Rocks"] } } },
};

const W = new URL("../../", import.meta.url).pathname;
const BEFORE = new URL("./link-multi-approach-batch1.before.json", import.meta.url);
const key = requireServiceKey();
const ids = Object.keys(PLAN);
const rows = [];
for (let i = 0; i < ids.length; i += 25) rows.push(...(await selectAll("routes", "id,area_id,name,approach_variants,approach_logistics,bivy,waypoints", `id=in.(${ids.slice(i, i + 25).join(",")})`, { key })));

if (process.argv.includes("--rollback")) {
  const before = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  for (const [id, b] of Object.entries(before)) await patchRow("routes", id, b);
  console.log("rolled back", Object.keys(before).length);
  process.exit(0);
}

const kmBetween = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const anchorOf = (row) => { const al = row.approach_logistics || {}; const s = (row.waypoints || []).find((w) => /summit/i.test(w?.type || "")); return s && s.lat != null ? [+s.lat, +s.lng] : al.peakLat != null ? [+al.peakLat, +al.peakLng] : null; };
const campsFor = (row, words) => (Array.isArray(row.bivy) ? row.bivy : []).filter((c) => c && c.name && (words || []).some((w) => c.name.toLowerCase().includes(w.toLowerCase())));
const problems = [];
const tripOf = (row, spec, card) => {
  const al = { ...TH[spec.th] };
  if (!al.trailhead) throw new Error(`${row.id}: ${spec.th} has no name`);
  const a = anchorOf(row);
  if (a && al.trailheadLat != null) { const d = kmBetween(a[0], a[1], al.trailheadLat, al.trailheadLng); if (d > 45) problems.push(`${row.id}: ${spec.th} is ${d.toFixed(0)} km from the climb`); }
  const t = { approachLogistics: al };
  const mi = spec.distMi ?? (spec.fromCard && card && card.distMi != null ? card.distMi : null);
  const ft = spec.gainFt ?? (spec.fromCard && card && card.gainFt != null ? card.gainFt : null);
  if (mi != null) { t.distKm = +(mi * 1.609344).toFixed(2); t.outingShape = "outback"; }
  if (ft != null) { t.gainFt = ft; t.gainM = Math.round(ft / 3.28084); }
  const camps = campsFor(row, spec.camps);
  if (camps.length) t.bivy = camps;
  return t;
};

const next = {}, before = {}, log = [];
for (const id of ids) {
  const row = rows.find((r) => r.id === id);
  if (!row) { problems.push(`${id}: row missing`); continue; }
  const p = PLAN[id];
  const vars = (Array.isArray(row.approach_variants) ? row.approach_variants : []).map((v) => ({ ...v }));
  if (vars.some((v) => v.trip || v.viaRouteId)) { log.push(`${id}: SPENT (already linked)`); continue; }
  const patch = {};
  for (const [i, spec] of Object.entries(p.t || {})) { if (!vars[i]) { problems.push(`${id}: no card ${i}`); continue; } vars[i].trip = tripOf(row, spec, vars[i]); }
  for (const [i, rid] of Object.entries(p.via || {})) { if (!vars[i]) { problems.push(`${id}: no card ${i}`); continue; } vars[i].viaRouteId = rid; }
  for (const i of p.unprimary || []) delete vars[i].primary;
  if (p.storedRow != null) vars[p.storedRow].storedRow = true;
  const added = (p.add || []).map((c) => { const v = { name: c.name, notes: c.notes }; if (c.primary) v.primary = true; if (c.storedRow) v.storedRow = true; if (c.th) v.trip = tripOf(row, c, null); return v; });
  const addedVia = (p.addVia || []).map((c) => ({ name: c.name, viaRouteId: c.viaRouteId, ...(c.primary ? { primary: true } : {}) }));
  let out = p.first || p.addVia ? [...added, ...addedVia, ...vars] : [...vars, ...added];
  if (added.some((v) => v.primary)) out = out.map((v) => (added.includes(v) || !v.primary ? v : (({ primary, ...rest }) => rest)(v)));
  if (addedVia.some((v) => v.primary)) out = out.map((v) => (addedVia.includes(v) || !v.primary ? v : (({ primary, ...rest }) => rest)(v)));
  patch.approach_variants = out;
  if (p.fill) {
    const al = { ...(row.approach_logistics || {}) }, f = TH[p.fill];
    if (al.trailheadLat == null && f.trailheadLat != null) { al.trailheadLat = f.trailheadLat; al.trailheadLng = f.trailheadLng; }
    if (al.trailheadElevFt == null && f.trailheadElevFt != null) al.trailheadElevFt = f.trailheadElevFt;
    if ((!al.trailhead || p.renameStored) && f.trailhead) al.trailhead = f.trailhead;
    const a = anchorOf(row);
    if (a && al.trailheadLat != null) { const d = kmBetween(a[0], a[1], al.trailheadLat, al.trailheadLng); if (d > 45) problems.push(`${id}: stored trailhead ${d.toFixed(0)} km from the climb`); }
    patch.approach_logistics = al;
  }
  before[id] = { approach_variants: row.approach_variants, ...(p.fill ? { approach_logistics: row.approach_logistics } : {}) };
  next[id] = patch;
  log.push(`\n${id}  (${row.name})` + (p.fill ? `\n   stored trailhead → ${patch.approach_logistics.trailhead} @ ${patch.approach_logistics.trailheadLat ?? "-"},${patch.approach_logistics.trailheadLng ?? "-"}` : "") +
    out.map((v) => `\n   ${v.primary ? "★" : " "}${v.storedRow ? "S" : " "} ${v.name}` + (v.viaRouteId ? `  → via ${v.viaRouteId}` : "") + (v.trip ? `  → ${v.trip.approachLogistics.trailhead}${v.trip.approachLogistics.trailheadLat != null ? " ●" : " (no pin)"}${v.trip.distKm ? " " + v.trip.distKm + "km" : ""}${v.trip.gainFt ? " ↑" + v.trip.gainFt : ""}${v.trip.bivy ? " camps:" + v.trip.bivy.map((c) => c.name).join("/") : ""}` : "")).join(""));
}
console.log(log.join("\n"));
if (problems.length) { console.log("\nPROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
if (!process.argv.includes("--write")) { console.log(`\ndry run: ${Object.keys(next).length} rows would change — pass --write`); process.exit(0); }

if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1));
for (const [id, patch] of Object.entries(next)) await patchRow("routes", id, patch);
const after = [];
for (let i = 0; i < ids.length; i += 25) after.push(...(await selectAll("routes", "id,approach_variants,approach_logistics", `id=in.(${ids.slice(i, i + 25).join(",")})`, { key })));
let bad = 0;
// jsonb stores object keys in its own order, so compare canonically or every row reads as a mismatch.
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
for (const [id, patch] of Object.entries(next)) {
  const a = after.find((r) => r.id === id);
  if (!same(a.approach_variants, patch.approach_variants) || (patch.approach_logistics && !same(a.approach_logistics, patch.approach_logistics))) { bad++; console.log("RE-READ MISMATCH", id); }
}
console.log(`written ${Object.keys(next).length}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
