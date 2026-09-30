// Build the pin-research inputs: audits/route-leftovers/pins/in/pNN.json, each {id, name, area_id, findings, row, gpx_summary}.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const A = new URL("../../../audits/route-leftovers", import.meta.url).pathname;
const findings = JSON.parse(fs.readFileSync(`${A}/pin-cands-half1.json`));
const extra = {
  wa_poltergeist_pinnacle: "Trailhead pin is named Hannegan Pass Trailhead but sits near Ross Dam.",
  wa_primus_peak_south_ridge: "Trailhead/camp pins sit at the wrong place (research note).",
  wa_buckner_mountain_north_face: "Trailhead/camp pins sit at the wrong place (research note).",
  wa_grotto_mountain_e_route: "Trailhead/camp pins sit at the wrong place (research note).",
  wa_trapper_mountain_south_slopes: "Trailhead/camp pins sit at the wrong place (research note).",
  wa_hibox_mountain_standard: "A pin named 'Rampart Lakes' sits at the wrong place (research note).",
  wa_mount_skokomish_standard: "Waypoints sit on the Mildred Lakes trail; the route now uses the Putvin trail / Lake of the Angels approach.",
  wa_mount_terror_north_face: "waypoints[5] 'Terror Glacier crossing' is pinned on the Terror Glacier south of the summit; the crossing to the north-face base is on the Mustard Glacier.",
  wa_cinderella_peak_scramble: "An 'Elbow Lake' waypoint the route never reaches (the lake is ~3.5 mi in).",
  wa_liberty_bell_independence_route: "3 waypoints (stream crossing, climbers path junction, west face bench) were copied from a west-face route; this is an east-face climb.",
  wa_mount_baker_cockscomb_ridge: "Approach is now Heliotrope Ridge, but the trailhead coordinates are still at Artist Point.",
  wa_mount_baker_boulder_park_cleaver: "Camp pins (e.g. high camp) may sit on the wrong side of the mountain.",
  wa_liberty_bell_thin_red_line: "Waypoints 1-3 describe the Blue Lake west-face approach, not this climb's approach.",
  wa_whistler_mountain_scramble: "Trailhead pin is the Rainy Pass PCT lot; the itinerary now starts at the SR-20 turnout 3.1 mi east.",
  wa_iceman: "Ice Box: road/trailhead pin says Cutthroat/Blue Lake, not the SR-20 hairpin; approach text describes the Alpenkuhl crag.",
  wa_route_c: "Ice Box: road/trailhead pin says Cutthroat/Blue Lake, not the SR-20 hairpin; approach text describes the Alpenkuhl crag.",
  wa_route_d: "Ice Box: road/trailhead pin says Cutthroat/Blue Lake, not the SR-20 hairpin; approach text describes the Alpenkuhl crag.",
  wa_bearpaw_mountain_scramble: "Approach now says the trail passes the EAST side of the lake; waypoint[3] pin still sits west of the lake.",

};
const ids = [...new Set([...Object.keys(findings), ...Object.keys(extra)])].filter(id => id.startsWith("wa_"));
const out = [];
for (const id of ids) {
  const [row] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${id}`, { headers: headers(key) })).json();
  if (!row) { console.log("missing", id); continue; }
  const g = Array.isArray(row.gpx) ? row.gpx : null;
  const onPins = g ? (row.waypoints || []).filter(w => g.some(p => Math.abs(p[0] - w.lat) < 1e-6 && Math.abs(p[1] - w.lng) < 1e-6)).length : 0;
  const { gpx, name_search, ...rest } = row;
  out.push({ id, name: row.name, area_id: row.area_id, findings: [...(findings[id] || []), ...(extra[id] ? [extra[id]] : [])],
    gpx_summary: g ? `${g.length} points; ${onPins} of ${(row.waypoints || []).length} pins sit exactly on a vertex` : "no drawn line", row: rest });
}
fs.mkdirSync(`${A}/pins/in`, { recursive: true }); fs.mkdirSync(`${A}/pins/out`, { recursive: true });
const N = 5; for (let i = 0; i * N < out.length; i++) fs.writeFileSync(`${A}/pins/in/p${String(i + 1).padStart(2, "0")}.json`, JSON.stringify(out.slice(i * N, i * N + N), null, 1));
console.log(out.length, "routes ->", Math.ceil(out.length / N), "files");
