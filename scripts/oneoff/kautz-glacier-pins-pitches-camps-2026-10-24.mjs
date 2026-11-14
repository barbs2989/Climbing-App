// Kautz Glacier (wa_mount_rainier_kautz_glacier). The owner's note, 2026-10-24: the route showed a
// pitch-by-pitch section with "1 of 2" ice pitches, its map waypoints were "way off", and its camps
// needed checking against the route.
//
// What was wrong, and what this writes:
//   - ROUTE BREAKDOWN counted the ROCK STEP (graded "5th class", anchor "fixed rope") and the UPPER
//     ice step as the two roped pitches, and drew the LOWER ice step as a travel leg, because it
//     carried no grade or anchor. So the route's two ice pitches read as one. The lower step is now
//     AI2 on ice screws, and the Rock Step (a short rappel or belayed down-climb on a fixed line, and
//     only climbed coming back) is a leg. The two roped pitches are now the two ice steps, which
//     matches `pitches: 2`.
//   - Five pins, two with NO coordinate, so the map drew Paradise → Glacier Vista → summit. The
//     summit sat 130 m north of Columbia Crest and the trail distances were round-trip numbers
//     (Camp Hazard "7 mi", summit "13 mi"). The pins are now the places on the climb, at coordinates
//     taken from a public recorded GPS track of the route (CalTopo map D092, June 2020, its named
//     markers agreeing with the track to within 40 m). Each one was checked against USGS ground
//     elevation and matches the height the route's guide text gives, within 40 ft. Distances are
//     measured along that track's ascent. The track itself (226 points, every vertex at least 40 m
//     from the last) replaces the two-point "track".
//   - CAMPING & BIVY listed Camp Hazard FIRST and the Castle camps (no height, no pin) LAST, though
//     the walk in reaches the Castle first. It also printed Camp Hazard at "7 mi" (it is about 4.7).
//     The Castle entry is split into Lower and Upper Castle, each with a height and a pin. Wilson
//     Moraine and the Rock Step bivy sites are added as other options: both are named in the route's
//     own approach text, and both are on this line. The Comet Falls way in joins at Upper Castle, so
//     its own list drops the camps below that.
//
// Refuses unless the stored waypoints and pitch_detail are still the ones this was written against.
// Rollback file: scripts/rollback-kautz-glacier-<ts>.json (the four columns as they were).
//   node scripts/oneoff/kautz-glacier-pins-pitches-camps-2026-10-24.mjs --dry
import fs from "fs";
import { patchRow, selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const DRY = process.argv.includes("--dry");
const ID = "wa_mount_rainier_kautz_glacier";
const TRACK = new URL("./kautz-glacier-track-2026-10-24.json", import.meta.url);

const key = requireServiceKey();
const [row] = await selectAll("routes", "id,waypoints,pitch_detail,bivy,approach_variants,gpx", `id=eq.${ID}`, { key });
if (!row) throw new Error("route not found");
if (row.waypoints.length !== 5 || row.waypoints[4].distMi !== 13 || row.pitch_detail[3].grade !== "Steep snow to alpine ice")
  throw new Error("row changed since this was written — re-read it before writing");

const g = async (lat, lng) => Math.round((await elevationAt(lat, lng)) / 10) * 10;
const wp = row.waypoints;
const byName = (n) => wp.find((w) => w.name === n);

const NISQ = { lat: 46.80399, lng: -121.73653 };
const GULLY = { lat: 46.81616, lng: -121.74678 };
const waypoints = [
  byName("Paradise Parking Area"),
  { ...byName("Glacier Vista"), distMi: 1.3 },
  { ...NISQ, elev: await g(NISQ.lat, NISQ.lng), name: "Nisqually Glacier crossing", type: "Hazard", distMi: 1.5,
    directions: "From Glacier Vista follow the climbers' path down the moraine to about 6,300 ft, where boot paths drop onto the Nisqually Glacier. Rope up here: the crossing threads crevassed ground under icefall and is dangerous in poor visibility." },
  { ...GULLY, elev: await g(GULLY.lat, GULLY.lng), name: "Wilson Gully", type: "Hazard", distMi: 2.75,
    directions: "Take the line of least resistance across the glacier to its far side and the distinct low-angle snow gully there, then climb it to the bench above at roughly 7,300 to 7,400 ft. Keep well left of The Fan, the gully further down the glacier, which carries avalanche and rockfall. Move through this stretch early and do not stop in it." },
  { lat: 46.82442, lng: -121.75674, elev: 9200, name: "Lower Castle", type: "Campsite", distMi: 4.05,
    directions: "From the bench, snow slopes lead up past the Wilson Moraine camps (8,200 to 8,600 ft) to the ridge and Lower Castle, a few closely spaced rock rings at about 9,200 ft." },
  { lat: 46.82613, lng: -121.75806, elev: 9480, name: "Upper Castle", type: "Campsite", distMi: 4.2,
    directions: "A short way on up the ridge. Large rock rings, and where most parties spend the first night; running water is usually close by from mid-June. The Comet Falls way in joins here." },
  { lat: 46.8321, lng: -121.76196, elev: 10800, name: "Camp Hazard", type: "Campsite", distMi: 4.7,
    directions: "Above the Castle the Turtle snowfield leads to Camp Hazard: sun-cupped firm snow and glacier ice, so keep an ice tool in hand. Stay to the west side of the snowfield, because its centre and east flank are raked by rock and ice off the Kautz Ice Cliff." },
  { lat: 46.83477, lng: -121.76306, elev: 11280, name: "Rock Step", type: "Landmark", distMi: 4.9,
    directions: "From the top bivy sites a climbers' trail leads up and left to a notch on the ridge with a fixed rope on rock anchors. Rappel, or down-climb on belay, the short rock step below it into the gully under the ice cliff. You climb it again on the way back." },
  { lat: 46.83601, lng: -121.7637, elev: 11390, name: "Kautz Ice Chute (base)", type: "Base", distMi: 5.4,
    directions: "From the foot of the step, traverse west under the Kautz Ice Cliff to the foot of the chute. This is the deposition zone under the ice cliff and the reason for the alpine start: cross it moving and do not stop." },
  { lat: 46.83811, lng: -121.76297, elev: 12020, name: "Top of the ice chute", type: "Landmark", distMi: 5.9,
    directions: "The chute is two steps of ice separated by easier snow: the lower step AI2, the upper step the AI3 crux. Each is anything from a short pitch to a few hundred feet depending on the year, bare and hard in a lean year." },
  { ...byName("Columbia Crest"), lat: 46.85285, lng: -121.76044, distMi: 7.2,
    directions: "Regroup above the chute and rope for glacier travel: the upper Kautz holds some of the mountain's biggest crevasses. Trend up and right to Wapowety Cleaver near 13,000 ft, watching for moats along the rock, then onto the upper Nisqually and past a large bergschrund near the crater rim before the flat walk to the top." },
];
if (waypoints.some((w) => !w)) throw new Error("a stored pin was not found by name");

const pd = row.pitch_detail.map((p) => ({ ...p }));
const rock = pd.find((p) => p.pitch === "Rock Step");
rock.grade = "Short rock step, rappelled"; delete rock.anchor;
const lower = pd.find((p) => p.pitch === "Kautz ice chute (lower)");
lower.pitch = "Lower ice step"; lower.grade = "AI2"; lower.anchor = "ice screws";
const upper = pd.find((p) => p.pitch === "Kautz ice chute (upper)");
upper.pitch = "Upper ice step";

const old = row.bivy;
const hazard = old.find((c) => c.name === "Camp Hazard");
const castle = old.find((c) => /^Castle camps/.test(c.name));
const permit = castle.permit;
const bivy = [
  { name: "Wilson Moraine", type: "camp", role: "route", elev: 8400, permit,
    notes: "Sites on the moraine between about 8,200 and 8,600 ft, below the Castle. Lower than most parties sleep, so a longer summit day." },
  { name: "Lower Castle", type: "camp", role: "route", elev: 9200, permit, water: "Melt snow",
    capacity: "A few closely spaced rock rings for small parties",
    notes: "On the ridge below Wapowety Cleaver at the edge of the Wilson Glacier, about 9,200 ft. Wind-exposed." },
  { name: "Upper Castle", type: "camp", role: "main", elev: 9480, permit,
    water: "Running water close by from about mid-June; otherwise melt snow",
    capacity: "Large rock rings behind old windbreaks",
    notes: "Where most parties camp, at about 9,400 to 9,500 ft, and where the Comet Falls way in joins. Wind-exposed." },
  hazard,
  { name: "Rock Step bivy sites", type: "bivy", role: "route", elev: 11250, permit,
    notes: "A few small sites by the notch above the Rock Step, right beside the morning rappel. Little room, and under the same ice cliff as Camp Hazard." },
];
const av = row.approach_variants.map((v) => ({ ...v }));
av[0].camps = bivy.map((c) => c.name);
if (av[1].name !== "Comet Falls and Van Trump Park") throw new Error("variant order changed");
av[1].trip = { ...av[1].trip, bivy: bivy.filter((c) => ["Upper Castle", "Camp Hazard", "Rock Step bivy sites"].includes(c.name)) };

const gpx = JSON.parse(fs.readFileSync(TRACK, "utf8"));
if (gpx.length < 100) throw new Error("track too short");

const body = { waypoints, pitch_detail: pd, bivy, approach_variants: av, gpx };
console.log(JSON.stringify({ waypoints: waypoints.map((w) => [w.name, w.type, w.lat, w.lng, w.elev, w.distMi]), pitches: pd.map((p) => [p.pitch, p.grade, p.anchor || ""]), bivy: bivy.map((c) => [c.name, c.elev, c.role]), comet: av[1].trip.bivy.map((c) => c.name), gpx: gpx.length }, null, 1));
if (DRY) process.exit(0);
const rb = `scripts/rollback-kautz-glacier-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify({ id: ID, waypoints: row.waypoints, pitch_detail: row.pitch_detail, bivy: row.bivy, approach_variants: row.approach_variants, gpx: row.gpx }));
await patchRow("routes", ID, body);
const [after] = await selectAll("routes", "id,waypoints,pitch_detail,bivy,gpx", `id=eq.${ID}`, { key });
if (after.waypoints.length !== waypoints.length || after.gpx.length !== gpx.length || after.bivy.length !== bivy.length) throw new Error("re-read does not match the write");
console.log("written and re-read; rollback in", rb);
