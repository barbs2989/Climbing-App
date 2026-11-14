// Boving Roofs is a VARIATION of the Southwest Rib on South Early Winters Spire (owner's note,
// 2026-10-24): it climbs the rib's pitches 1–3, its own three (5.2, 5.10b roofs, 5.9), then the rib's
// pitches 6–7 to the summit, and descends the South Arete. Its page stood alone — no link to the rib,
// "3 pitches", a 6.5 hr "shorter day than the full Rib", and rappels that "return to the base of the
// route". Mountain Project's own description: "Climb the first three pitches of the Southwest Rib …
// P6 … you are at the top of the bear hug pitch of SW Rib … Finish up to the summit with the rest of
// the pitches of SW Rib" (mountainproject.com/route/110616122). The South Arete's rappels land at the
// foot of the South Arete, and parties walk back to the base of the Southwest Rib
// (thepeakoftheweek.com, 2017-07-03); the stations were moved climber's right of the gully after the
// June 2022 rockfall (NCMG's Larry Goldie, via The Mountaineers).
//
//   node scripts/oneoff/boving-roofs-variation-of-sw-rib.mjs --dry
//   node scripts/oneoff/boving-roofs-variation-of-sw-rib.mjs
//   node scripts/oneoff/boving-roofs-variation-of-sw-rib.mjs --rollback
import fs from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const BEFORE = new URL("./boving-roofs-variation-of-sw-rib.before.json", import.meta.url);
const COLS = "id,area_id,approach_variants,rappel_detail,rappels,descent,descent_text,itinerary";
const IDS = ["wa_boving_roofs", "wa_sews_sw_rib"];
const AREA = "wa_south_early_winters_spire";
const dry = process.argv.includes("--dry");

async function read() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=in.(${IDS.join(",")})`, { headers: headers(requireServiceKey()) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 2) throw new Error("expected 2 rows, got " + JSON.stringify(rows).slice(0, 200));
  for (const x of rows) if (x.area_id !== AREA) throw new Error(x.id + " is filed on " + x.area_id);
  return Object.fromEntries(rows.map((x) => [x.id, x]));
}

if (process.argv.includes("--rollback")) {
  const b = JSON.parse(fs.readFileSync(BEFORE, "utf8"));
  for (const id of IDS) { const { id: _i, area_id: _a, ...body } = b[id]; await patchRow("routes", id, body); console.log("restored", id); }
  process.exit(0);
}

const rows = await read();
if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify(rows, null, 1));

const LAND = "The rappel from it lands at the foot of the South Arete, on the spire's south side — not at the Y-shaped larch where the Southwest Rib starts. Walk back north across the foot of the Southwest Couloir to collect anything you left at the larch, then follow the climbers' trail down through talus and slabs alongside the stream to the Blue Lake Trail.";
const fixRaps = (rd) => {
  const out = JSON.parse(JSON.stringify(rd));
  const last = out[out.length - 1];
  if (!last || !/returns (you )?to the base of the route/.test(last.station + " " + last.notes)) throw new Error("last rappel station text changed; re-read it");
  last.notes = "Final rappel, to the foot of the South Arete — a short walk from where this climb starts, not the same place.";
  last.station = "Lowest chain station. " + LAND;
  return out;
};
const RAPPELS = "3 single-rope rappels on a 60 m rope from bolted chain anchors on the South Arete descent, each under 30 m, with easy downclimbing between them. They start below the summit and land at the foot of the South Arete, a short walk from the Y-shaped larch.";

const bv = rows.wa_boving_roofs, sw = rows.wa_sews_sw_rib;
const av = JSON.parse(JSON.stringify(bv.approach_variants));
if (av.length !== 1) throw new Error("Boving Roofs has " + av.length + " ways in; expected 1");
av[0].viaRouteId = "wa_sews_sw_rib";
av[0].viaPitches = { before: [1, 3], after: [6, 7] };

const it = JSON.parse(JSON.stringify(sw.itinerary));
const day = it.days[0];
const bvItin = {
  cal: it.cal,
  days: [{
    n: 1, title: "Car-to-car climb", objective: "Climb Boving Roofs to the summit and return to the Blue Lake trailhead",
    hours: day.hours, miles: day.miles, gainFt: day.gainFt, lossFt: day.lossFt, packLb: 0,
    note: "Hike the Blue Lake trail to the Y-shaped larch at the base of the Southwest Rib. Climb the rib's first three pitches, go left at the ledge where the two roofs come into view, and climb the three Boving Roofs pitches (5.2, the 5.10b roofs, 5.9) to the top of the rib's Bear Hug pitch. Finish up the rib's last two pitches to the summit — 8 pitches in all — then downclimb part of the South Arete and make 3 rappels to its foot.",
    schedule: [
      { time: "6:00 AM", label: "Leave Blue Lake trailhead", detail: "Popular wall — an early start beats other Southwest Rib parties to the base." },
      { time: null, label: "Reach the Y-shaped larch", detail: "About 1–1.5 hr of steady uphill approach." },
      { time: null, label: "Southwest Rib pitches 1–3", detail: "5.8+, 5.8, 5.6 to the ledge below the roofs." },
      { time: null, label: "Boving Roofs pitches", detail: "Left at the ledge: 5.2, the 5.10b roofs, then 5.9 to the top of the Bear Hug." },
      { time: null, label: "Southwest Rib pitches 6–7 to the summit", detail: "" },
      { time: null, label: "Descend the South Arete", detail: "Downclimbing, then 3 rappels to the foot of the South Arete; walk back to the larch for anything left there." },
      { time: null, label: "Back at trailhead", detail: "" },
    ],
  }],
  totalNote: "Plan on at least the full Southwest Rib's day, about " + day.hours + " hr car-to-car: this line climbs 8 pitches to the rib's 7, three of them harder. No published time exists for the variation itself.",
};

const bvBody = {
  approach_variants: av,
  rappel_detail: fixRaps(bv.rappel_detail),
  rappels: RAPPELS,
  descent: "Finish up the Southwest Rib's last two pitches to the summit, then descend the South Arete.",
  descent_text: "Do not reverse the roofs: rappelling back through an overhanging roof is awkward and not the documented practice. Climb the Southwest Rib's last two pitches (its 6th and 7th) to the true summit, then take the standard South Arete descent: downclimb the arete to the Rabbit Ears, then 3 single-rope rappels (60 m rope) from the bolted chain stations climber's right of the gully. They land at the foot of the South Arete, not at the Y-shaped larch where you started — walk back north across the foot of the Southwest Couloir for anything left there, then down the climbers' trail to the Blue Lake Trail. So the 3 rappels are the descent from the summit, not a way down from the roofs. If bailing below the roofs, natural gear anchors would be needed since no fixed rappel line down the roof pitch itself was documented.",
  itinerary: bvItin,
};
const swBody = { rappel_detail: fixRaps(sw.rappel_detail), rappels: RAPPELS };

if (dry) { console.log(JSON.stringify({ wa_boving_roofs: bvBody, wa_sews_sw_rib: swBody }, null, 1)); process.exit(0); }
await patchRow("routes", "wa_boving_roofs", bvBody);
await patchRow("routes", "wa_sews_sw_rib", swBody);
const after = await read();
const ok = after.wa_boving_roofs.approach_variants[0].viaRouteId === "wa_sews_sw_rib" && /foot of the South Arete/.test(after.wa_sews_sw_rib.rappel_detail.at(-1).station) && after.wa_boving_roofs.itinerary.days[0].note.includes("8 pitches");
console.log(ok ? "re-read: both rows changed as written" : "RE-READ MISMATCH");
if (!ok) process.exit(1);
