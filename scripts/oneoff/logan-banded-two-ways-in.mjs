// Mount Logan, Banded Glacier: the approach card on screen described two ways in (owner note 2026-10-28).
// The APPROACH section shows one way in at a time (#2819), and the default card — Thunder Creek, the
// stored row — began "Two ways in…" and narrated Easy Pass as well, so the page read as one approach
// whose description had two. The Easy Pass card was a stub (a trailhead and a camp) that, when picked,
// blanked the road, trip plan, gain and distance — which were Easy Pass's own data.
//
// The row was two approaches welded together. Its road, trip plan, timing, route breakdown, gain and
// distance all describe EASY PASS (SR 20 milepost 151, over the 6,500 ft pass into Fisher Basin); its
// trailhead, pins, recorded track and camp list describe THUNDER CREEK (Colonial Creek Campground,
// milepost 130). The single card's text began "Two ways in…". Researched 2026-10-01 as MULTI_TRAILHEAD
// with Easy Pass the usual way (audits/wa-multi-approach/2026-10-01-research.json), never linked.
//
// So the stored row becomes Easy Pass throughout, and Thunder Creek becomes a switchable way in that
// carries its own trailhead, road, pins, camps and the recorded track (58 points from Colonial Creek
// to the summit). Thunder Creek's gain, distance and trip plan are left empty: none is recorded, and
// the Easy Pass numbers must not be shown under its name. Easy Pass Trailhead: 48.5879, -120.8029,
// ground 3,685 ft (USGS 3DEP), the 3,700 ft guidebooks give.
//
// The itinerary's `cal` note (road season, snow-free date, the year-round alternate, the permit) goes:
// the road season is already GETTING THERE's seasonal gate, the alternate is now its own way in, the
// permit is in access, and the snow line is the Easy Pass card's season.
//
//   node scripts/oneoff/logan-banded-two-ways-in.mjs [--write | --rollback]
import fs from "node:fs";
import { SUPABASE_URL, headers, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ID = "wa_mount_logan_r1";
const COLS = "id,area_id,approach,approach_logistics,approach_variants,waypoints,gpx,bivy,itinerary,road,access,data_quality";
const BEFORE = new URL("./logan-banded-two-ways-in.before.json", import.meta.url);
const key = requireServiceKey();
const read = async () => { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=${COLS}`, { headers: headers(key) }); const j = await r.json(); if (!Array.isArray(j) || j.length !== 1) throw new Error("read failed: " + JSON.stringify(j).slice(0, 200)); return j[0]; };

if (process.argv.includes("--rollback")) { const b = JSON.parse(fs.readFileSync(BEFORE, "utf8")); delete b.id; delete b.area_id; await patchRow("routes", ID, b); console.log("rolled back"); process.exit(0); }

const row = await read();
const problems = [];
if (row.area_id !== "wa_mount_logan") problems.push("area_id is " + row.area_id);
const [card, epOld] = Array.isArray(row.approach_variants) && row.approach_variants.length === 2 ? row.approach_variants : [];
if (!card || !/^Two ways in/.test(card.notes || "")) problems.push("the 'Two ways in' card is not first any more");
if (!epOld || epOld.name !== "Easy Pass and Fisher Basin" || !epOld.trip) problems.push("the second card is not the Easy Pass stub");
const wp = Array.isArray(row.waypoints) ? row.waypoints : [];
const thWp = wp.find((w) => w && w.type === "Trailhead" && /Thunder Creek/.test(w.name || ""));
const neveWp = wp.find((w) => w && /Neve Camp/.test(w.name || ""));
const lakeWp = wp.find((w) => w && /Lake camp below the Banded Glacier/.test(w.name || ""));
const sumWp = wp.find((w) => w && w.type === "Summit");
if (!thWp || !neveWp || !lakeWp || !sumWp || wp.length !== 4) problems.push("waypoints are not the four expected");
if (!Array.isArray(row.gpx) || row.gpx.length !== 58 || Math.abs(row.gpx[0][0] - 48.685336) > 1e-6) problems.push("the recorded track is not the Colonial Creek one");
if (!row.itinerary || !row.itinerary.cal) problems.push("itinerary.cal already gone");
if (!/Easy Pass/.test((row.road && row.road.name) || "")) problems.push("road no longer names Easy Pass");
const lakeCamp = (row.bivy || []).find((c) => /lake camp/i.test(c.name || "")), neveCamp = (row.bivy || []).find((c) => /Neve/.test(c.name || ""));
if (!lakeCamp || !neveCamp) problems.push("bivy is not lake camp + Neve Camp");
if (problems.length) { console.log("PROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }

const EP = { lat: 48.5879, lng: -120.8029, elev: 3700 };
const ABOVE_CAMP = "From the lake camp, climb south-southeast to a low point on the ridge, sometimes called Christmas Tree Col, which may need a rope for steep snow or a short glacier section. Drop onto the Banded Glacier on the far side and ascend it to the Banded-Douglas Col.\n\nThe last two thirds of this route is sustained off-trail goat-path route-finding, and the scree below the glacier is described as moving like a Newtonian fluid: much easier to ascend than to descend. Party size in this NPS zone is capped at six.";
const easyLake = { ...lakeWp, distMi: null, directions: "From Easy Pass, drop into Fisher Basin and follow the Fisher Creek Trail down the valley to just past a handrailed log bridge over the stream that drains the lake. Leave the trail and follow that drainage up to the lake at about 5,160 ft." };
const thunderLake = { ...lakeWp };
const easyTh = { lat: EP.lat, lng: EP.lng, elev: EP.elev, elevFt: EP.elev, name: "Easy Pass Trailhead (SR 20, milepost 151)", type: "Trailhead", distMi: 0, note: "Overnight stays in the park need a North Cascades backcountry permit, reserved on Recreation.gov or picked up at the Wilderness Information Center in Marblemount.", directions: "Drive SR 20, the North Cascades Highway, to the signed Easy Pass pullout on the south side of the road between mileposts 151 and 152, about 45 miles east of Marblemount, at about 3,700 ft. A Northwest Forest Pass is needed to park. The highway is closed here in winter." };
const easySummit = { ...sumWp, distMi: null, distFrom: undefined };
delete easySummit.distFrom;

const easyCard = {
  name: "Easy Pass and Fisher Basin",
  primary: true,
  camps: [lakeCamp.name],
  season: "July to September; the Easy Pass trail usually holds snow until July",
  notes: "The usual way in while SR 20 is open. From the Easy Pass Trailhead near milepost 151, climb about 3.5 miles to the 6,500-ft pass, drop into Fisher Basin, and follow the Fisher Creek Trail down the valley — past a good log bridge with a handrail — to the stream that drains the lake camp near 5,160 ft below the Banded Glacier. About ten miles one way. The trailhead sits inside the highway's winter closure, and the pass is often snowbound until July.\n\n" + ABOVE_CAMP,
  objHaz: epOld.objHaz, hazards: epOld.hazards, baseFinding: card.baseFinding,
};
const thunderCard = {
  name: "Thunder Creek and Fisher Creek",
  camps: [neveCamp.name, lakeCamp.name],
  season: "Whenever SR 20 is closed at Easy Pass, or in the shoulder season",
  notes: "The longer way in, and the one that stays open all year: the Colonial Creek trailhead is west of SR 20's winter closure gates. Take the Thunder Creek Trail from Colonial Creek Campground near 1,200 ft about nine miles to the Fisher Creek Trail junction, then the Fisher Creek Trail about three miles, past the handrailed log bridge, to the stream that drains the lake camp near 5,160 ft. Roughly thirteen miles one way, with Neve Camp under two miles in for a late start.\n\n" + ABOVE_CAMP,
  objHaz: card.objHaz, hazards: card.hazards, baseFinding: card.baseFinding,
  trip: {
    approachLogistics: row.approach_logistics,
    road: { name: "North Cascades Highway (SR 20) to Colonial Creek Campground", status: "Open year-round", driveNote: "Colonial Creek Campground is on Diablo Lake near milepost 130; the Thunder Creek trail starts at the south end of the campground.", seasonalGate: "West of SR 20's winter closure gates (milepost 134 to 171), so this trailhead can be reached all year." },
    access: row.access,
    waypoints: [thWp, neveWp, thunderLake, sumWp],
    gpxPts: row.gpx,
    bivy: [neveCamp, lakeCamp],
    approach: "Follow the Thunder Creek Trail from Colonial Creek Campground (SR 20, milepost 130) about 9 miles to the Fisher Creek Trail junction, then the Fisher Creek Trail about 3 miles to the stream that drains the lake camp near 5,160 ft below the Banded Glacier, and follow it up to the lake.",
  },
};

const next = {
  approach_variants: [easyCard, thunderCard],
  approach_logistics: { ...row.approach_logistics, trailhead: "Easy Pass Trailhead (SR 20, milepost 151)", trailheadLat: EP.lat, trailheadLng: EP.lng, trailheadDirection: "From the Easy Pass pullout on SR 20 between mileposts 151 and 152 (~3,700 ft)" },
  waypoints: [easyTh, easyLake, easySummit],
  gpx: null,
  bivy: [{ ...lakeCamp, notes: "The standard overnight camp below the Banded Glacier, reached down the Fisher Creek Trail from Easy Pass (about ten miles in) or up it from Thunder Creek (about thirteen)." }],
  approach: "From the Easy Pass Trailhead on SR 20 near milepost 151, climb about 3.5 miles to the 6,500-ft pass, descend into Fisher Basin, and follow the Fisher Creek Trail down the valley to the stream that drains the lake camp near 5,160 ft below the Banded Glacier, about 10 miles one way. When SR 20 is closed at Easy Pass, the longer Thunder Creek way in (about 13 miles) starts at Colonial Creek Campground.",
  itinerary: (() => { const it = { ...row.itinerary }; delete it.cal; return it; })(),
  data_quality: { ...row.data_quality, gaps: (row.data_quality.gaps || []).map((g) => /No verified public GPX track/.test(g) ? "The recorded track follows the Thunder Creek way in and is drawn under that choice; no track is on file for Easy Pass." : g) },
};
const before = Object.fromEntries(Object.keys(next).map((k) => [k, row[k]]));
for (const [k, v] of Object.entries(next)) console.log(k, JSON.stringify(v).slice(0, 220));
if (!process.argv.includes("--write")) { console.log("dry run — pass --write"); process.exit(0); }
if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify({ id: ID, area_id: row.area_id, ...before }, null, 1));
await patchRow("routes", ID, next, { filter: "area_id=eq.wa_mount_logan" });
const after = await read();
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
let bad = 0;
for (const k of Object.keys(next)) if (JSON.stringify(canon(after[k])) !== JSON.stringify(canon(JSON.parse(JSON.stringify(next[k]))))) { bad++; console.log("RE-READ MISMATCH", k); }
console.log(`written 1 row, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
