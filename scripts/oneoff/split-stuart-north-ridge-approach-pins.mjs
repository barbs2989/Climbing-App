// Mount Stuart North Ridge (Complete): give each way in its own pins.
//   The stored list (the PRIMARY, north way in) ran Stuart Lake Trailhead -> Longs Pass -> Goat Pass -> Stuart Glacier
//   Crossing -> North Ridge Base: the north trailhead followed by the SOUTH approach, which the row's own variant notes
//   describe as "from the Esmeralda Basin trailhead ... over Longs Pass and up Ingalls Creek to Goat Pass, then traverse
//   east beneath the Stuart Glacier ... to the toe". The north notes go up Mountaineer Creek to the Sherpa basin and never
//   touch either pass. So:
//   - North (stored): Longs Pass, Goat Pass and the glacier crossing move out. North Ridge Base keeps its name and its
//     6,600 ft (the row's baseFinding) but loses its coordinate: (47.47, -120.91) is south of the summit at ground 6,912 ft,
//     while the toe is north of it, between the Stuart and Ice Cliff glaciers.
//   - South (approach_variants[1].trip.waypoints, read by lib/approaches.js): Esmeralda Basin Trailhead from the variant's
//     own approachLogistics, Longs Pass at USGS GNIS 1528411 (47.4492901612129, -120.92510312500812), Goat Pass (no GNIS
//     entry, so no coordinate), the glacier crossing without its coordinate ((47.465, -120.911) is 1.6 km south of the
//     Stuart Glacier), the base, the Great Gendarme and the summit.
//   - Every distMi past a trailhead goes to null: they were measured along a chain that started at the wrong trailhead.
//   - The 5-point sketched gpx ran from (47.427, -120.892) through the two convicted coordinates, so it is cleared.
//   node scripts/oneoff/split-stuart-north-ridge-approach-pins.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const ID = "wa_mount_stuart_north_ridge", AREA = "wa_mount_stuart";
const LONGS = { lat: 47.4492901612129, lng: -120.92510312500812 }; // USGS GNIS gaz_id 1528411, "Longs Pass", Chelan
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/stuart-split-rollback.json", import.meta.url);
const EXPECT = ["Trailhead|Stuart Lake Trailhead", "Pass|Longs Pass", "Junction|Goat Pass", "Hazard|Stuart Glacier Crossing",
  "Junction|North Ridge Base", "Hazard|Great Gendarme", "Summit|Mount Stuart Summit"];

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints,approach_variants,gpx&id=eq.${ID}`, { headers: headers(KEY) })).json())[0];

const row = await get();
if (!row || row.area_id !== AREA) throw new Error(`${ID}: not on ${AREA}`);
const south = row.approach_variants && row.approach_variants[1];
if (!south || !/Esmeralda/.test(south.name) || !south.trip) throw new Error("variant 1 is not the Esmeralda way in");
if (Array.isArray(south.trip.waypoints)) { console.log("already applied"); process.exit(0); }
const sigs = row.waypoints.map(sig);
if (JSON.stringify(sigs) !== JSON.stringify(EXPECT)) throw new Error(`waypoints are ${JSON.stringify(sigs)}`);
const [th, longs, goat, glacier, base, gendarme, summit] = structuredClone(row.waypoints);
if (base.lat !== 47.47 || base.lng !== -120.91 || glacier.lat !== 47.465 || glacier.lng !== -120.911) throw new Error("base/glacier coordinates moved");
if (!Array.isArray(row.gpx) || row.gpx.length !== 5 || row.gpx[0][0] !== 47.427) throw new Error("gpx is not the 5-point sketch");

const pin = (w, extra) => ({ ...structuredClone(w), distMi: null, ...extra });
const al = south.trip.approachLogistics;
const north = [th, pin(base, { lat: null, lng: null }), pin(gendarme), pin(summit)];
const southWps = [
  { type: "Trailhead", name: al.trailhead, lat: al.trailheadLat, lng: al.trailheadLng, distMi: 0, note: "" },
  pin(longs, LONGS), pin(goat, { lat: null, lng: null }), pin(glacier, { lat: null, lng: null }),
  pin(base, { lat: null, lng: null }), pin(gendarme), pin(summit),
];
const variants = structuredClone(row.approach_variants);
variants[1].trip.waypoints = southWps;
console.log("north:", north.map(sig).join(" -> "));
console.log("south:", southWps.map(sig).join(" -> "));
console.log("gpx: 5-point sketch -> null");
if (!APPLY) { console.log("DRY RUN"); process.exit(0); }

if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify({ [ID]: { waypoints: row.waypoints, approach_variants: row.approach_variants, gpx: row.gpx } }, null, 1));
await patchRow("routes", ID, { waypoints: north, approach_variants: variants, gpx: null });
const re = await get();
const good = re.waypoints.length === 4 && re.gpx == null && re.approach_variants[1].trip.waypoints.length === 7
  && re.approach_variants[1].trip.waypoints[1].lat === LONGS.lat && re.approach_variants[0].name === row.approach_variants[0].name;
console.log(good ? "verified: re-read shows 4 north pins, 7 south pins, gpx cleared" : "MISMATCH on re-read");
if (!good) process.exit(1);
