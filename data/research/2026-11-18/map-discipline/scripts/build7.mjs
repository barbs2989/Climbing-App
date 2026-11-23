import fs from "fs";
const usfs = JSON.parse(fs.readFileSync("usfs-trailheads.json", "utf8"));
const found = Object.fromEntries(JSON.parse(fs.readFileSync("found7.json", "utf8")).map(r => [r.id, r]));
const area = {}; for (const f of fs.readdirSync("chunks7")) for (const r of JSON.parse(fs.readFileSync("chunks7/" + f, "utf8"))) area[r.id] = r.peak ? r.peak.id : (r.area_id || r.areaId || null);
const D = "2026-11-23";
const U = site => { const t = usfs.find(x => x.site === site); if (!t) throw new Error("no usfs " + site); return { lat: +t.lat.toFixed(6), lng: +t.lng.toFixed(6), ev: { url: `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_InfraRecreationSites_01/MapServer/0/query?where=site_cn%3D%27${t.cn}%27&outFields=site_name&f=json`, fact: `${t.name} ${t.lat.toFixed(5)},${t.lng.toFixed(5)}`, retrieved_at: D, official: true } }; };
const NPS = (poi, lat, lng) => ({ lat, lng, ev: { url: `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_POIs_Geographic/FeatureServer/0/query?where=POINAME%3D%27${encodeURIComponent(poi)}%27&outFields=POINAME&f=json`, fact: `${poi} ${lat.toFixed(5)},${lng.toFixed(5)}`, retrieved_at: D, official: true } });
const OSM = (ref, name, lat, lng) => ({ lat, lng, ev: { url: "https://www.openstreetmap.org/" + ref, fact: `${name} ${lat.toFixed(5)},${lng.toFixed(5)}`, retrieved_at: D } });
const CAT = (n, lat, lng, eg) => ({ lat, lng, ev: null, cat: `the catalog already stores this pin on ${n} neighbouring routes (e.g. ${eg})` });
const stuart = U("STUART LAKE"), rachel = U("RACHEL LAKE"), wp = U("WHITNEY PORTAL TH");
const E = {
  ca_devils_crag_1_standard_route: ["South Lake Trailhead (Bishop Pass trail)", U("SO LAKE, BISHOP PASS, TREASURE LAKES TH")],
  ca_disappointment_peak_standard_route: ["Big Pine Creek South Fork Trailhead (Glacier Lodge)", U("BIG PINE CREEK SO FORK TH")],
  ca_mount_baldwin_via_convict_canyon_and_bright_dot_lake: ["Convict Lake Trailhead", null],
  ca_mount_maclure_standard_route: ["Lyell Canyon Trailhead (Dog Lake parking, Tuolumne Meadows)", NPS("Dog Lake Trailhead Parking", 37.878162, -119.338857)],
  ca_mount_mcadie_via_arc_pass: ["Whitney Portal Trailhead", wp],
  ca_tunnabora_peak_south_slope_from_tulainyo_lake: ["Whitney Portal Trailhead", wp],
  ca_muah_mountain_via_mulkey_pass: ["Cottonwood Pass Trailhead (Horseshoe Meadow)", null],
  ca_red_kaweah_west_face: ["Sawtooth Pass Trailhead, Mineral King", NPS("Sawtooth", 36.453305, -118.596761)],
  ca_striped_mountain_standard_route: ["Taboose Pass Trailhead", U("TABOOSE PASS TH")],
  ca_black_hawk_mountain_via_summit_creek_and_mosquito_pass: ["Kennedy Meadows Trailhead parking (Highway 108)", OSM("way/833681727", "Kennedy Meadows Trailhead Parking", 38.316876, -119.747038)],
  ca_mokelumne_peak_standard_route: ["Tanglefoot Trailhead", OSM("node/3939274836", "Tanglefoot Trailhead", 38.523551, -120.173510)],
  wa_colchuck_balanced_rock_east_route: ["Stuart Lake Trailhead", stuart], wa_colchuck_balanced_rock_south_route: ["Stuart Lake Trailhead", stuart],
  wa_colchuck_peak_northeast_gully: ["Stuart Lake Trailhead", stuart], wa_dragontail_peak_colchuck_col_buttress: ["Stuart Lake Trailhead", stuart],
  wa_hibox_mountain_south_face: ["Rachel Lake Trailhead", rachel], wa_hibox_mountain_southeast_ridge: ["Rachel Lake Trailhead", rachel],
  wa_dome_peak_indian_summer: ["Downey Creek Trailhead (Trail #768, Suiattle River Road)", U("DOWNEY CREEK")],
  wa_klawatti_peak_north_ridge: ["Eldorado Creek trailhead (Cascade River Road mile 20)", CAT(17, 48.4926, -121.1222, "wa_austera_peak")],
  wa_mixup_peak_pbs_late_night_special: ["Cascade Pass Trailhead (Cascade River Road)", CAT(16, 48.4755, -121.07503, "wa_buckner_mountain_southwest_face")],
  wa_sharkfin_tower_flakes_and_chimneys_south_face: ["Boston Basin climbers' trailhead (Cascade River Road)", CAT(10, 48.48055, -121.07979, "wa_boston_peak_southeast_face")],
  wa_chianti_spire_lichen_bouquet: ["SR-20 Wine Spires pullout (milepost 166)", CAT(9, 48.549, -120.63097, "wa_burgundy_spire_north_face")],
  wa_mount_rahm_custer_traverse: ["Depot Creek Road washout (via Chilliwack Lake, BC)", CAT(2, 49.033, -121.4025, "wa_mount_rahm_south_side")],
  wa_northwest_mox_peak_northeast_ridge: ["Depot Creek Road washout (via Chilliwack Lake, BC)", CAT(4, 49.033, -121.4025, "wa_mount_spickard_southwest")],
};
// placements carried by the agents for the two with a looser site name
const usfsNear = (lat, lng) => usfs.map(t => [Math.hypot((t.lat - lat) * 111000, (t.lng - lng) * 88000), t]).sort((a, b) => a[0] - b[0])[0];
E.ca_mount_baldwin_via_convict_canyon_and_bright_dot_lake[1] = U(usfsNear(37.600105, -118.853813)[1].site);
E.wa_chianti_spire_lichen_bouquet = ["SR 20 pullout near milepost 166 (Burgundy Col trail)", U(usfsNear(48.551406, -120.630895)[1].site)];
E.ca_muah_mountain_via_mulkey_pass[1] = U(usfsNear(36.448305, -118.170612)[1].site);
const out = {};
for (const [id, [name, p]] of Object.entries(E)) {
  const f = found[id]; if (!f) throw new Error("not found " + id); if (!area[id]) throw new Error("no area " + id);
  const v = { trailhead: name, trailheadLat: p.lat, trailheadLng: p.lng };
  const ev = []; if (p.ev) ev.push(p.ev);
  const ib = f.trailhead.identifiedBy || {}; let pu = ib.url; if (id === "wa_mixup_peak_pbs_late_night_special") pu = "https://www.wta.org/go-hiking/hikes/cascade-pass"; if (pu) ev.push({ url: pu, fact: "Start: " + name, retrieved_at: D });
  if (!ev.length) throw new Error("no evidence " + id);
  out[id] = { area: area[id], set: { approach_logistics: v }, ledger: [{ field: "approach_logistics", value: v, method: "single-source", level: "unconfirmed", evidence: ev }], review: { identifiedBy: { kind: "research", fact: (p.cat ? p.cat + "; " : "") + "start named on the cited page or in the route text" }, chunk: "round7" } };
}
fs.writeFileSync("batch-r7.json", JSON.stringify(out, null, 1));
for (const [id, e] of Object.entries(out)) console.log(id, "|", e.area, "|", e.set.approach_logistics.trailhead, e.set.approach_logistics.trailheadLat, e.set.approach_logistics.trailheadLng, "| ev", e.ledger[0].evidence.length, e.ledger[0].evidence.map(x => x.url.slice(0, 45)).join(" , "));
