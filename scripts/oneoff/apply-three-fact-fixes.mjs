// Apply the three verified 2026-09-25 fact fixes. Dry by default; --apply writes.
//  1. Lake Serene: the basin bivy's elev 2520 is the LAKE's height, inside the quarter-mile no-camping
//     ring the entry's own permit text states. Drop the number rather than guess the base of the walls.
//  2. Kautz: Camp Hazard is ~10,800 ft (pin said 12,500); Castle is 9,250 / 9,400-9,500 ft.
//  3. Storm closures: routes whose OWN trailhead sits beyond a closed road but whose access.closures
//     said nothing about it. Per-row write (access is a crag-level blob), compare-and-set on the old value.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x);
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,bivy,waypoints,access`, { headers: headers(key) })).json())[0];

const SERENE = "Lake Serene basin and the talus under the Norwegian Buttresses";
const HAZARD_NOTES = "On the climber's left of the Turtle Snowfield at about 10,800 ft: three large rock rings below the Kautz Ice Cliff, and the highest regular camp on the route. It shortens summit day. The original Camp Hazard, nearer 11,000 ft, sits in the fall line of ice from the cliff and is not used.";
const CASTLE = "Castle camps on Wapowety Cleaver";
const CASTLE_OLD = "Lower and Upper Castle sit on the crest of Wapowety Cleaver at the edge of the Wilson Glacier, roughly 9,000 to 10,000 ft. The most-used high camp on the south side west of the Nisqually. Wind-exposed.";
const CASTLE_NEW = "Two camp areas on the ridge below Wapowety Cleaver at the edge of the Wilson Glacier. Lower Castle, about 9,250 ft, has a few closely spaced rock rings for small parties; Upper Castle, 9,400 to 9,500 ft, has large rock rings and is where most parties camp. Wind-exposed.";
const HEADWALL_HAZARD_OLD = "The highest camp on the Kautz side, at the top of Wapowety Cleaver below the Kautz Ice Cliff. Shortens summit day but is exposed to icefall from the cliff above.";

const SUIATTLE = "CLOSED RIGHT NOW: Suiattle River Road (FR 26) is washed out and closed to vehicles at about milepost 4.5 after the December 2025 flood, under a closure order running to 1 January 2028 unless lifted sooner, so the Downey Creek Trailhead cannot be reached by car. The Downey Creek Trail itself is also closed through 31 December 2026 under a separate fire closure. Call the Darrington Ranger District, (360) 436-1155, before planning a trip.";
const chiwawa = th => `CLOSED RIGHT NOW: Chiwawa River Road (FR 6200) is closed to vehicles beyond Atkinson Flat Campground after December 2025 storm damage, under closure order 06-17-07-2026-11 in effect through 31 December 2027 unless lifted sooner, so the ${th} cannot be reached by car. Check with the Wenatchee River Ranger District before planning a trip.`;
const HOLDEN = "Holden Village and the only access road (FSR 8301) are closed to all hikers and vehicles under USFS order #06-17-05-26-04, in effect 28 January 2026 through 31 December 2027, after Dec 2025 flood/landslide damage; the Lucerne-Holden boat shuttle is also suspended. Confirm current Forest Service and Holden Village access alerts before planning this climb.";
// id -> [expected current closures (undefined = key absent), new closures]
const CLOSURES = {
  wa_accidental_discharge_east_face: [undefined, SUIATTLE], wa_gunrunner: [undefined, SUIATTLE], wa_south_ridge: [undefined, SUIATTLE],
  wa_west_face: [undefined, SUIATTLE], wa_west_face_2: [undefined, SUIATTLE],
  wa_fortress_mountain_northeast_face: ["Access road unplowed in winter", chiwawa("Trinity Trailhead") + " In winter the road is unplowed in any case."],
  wa_massie_peak_west_route: [undefined, chiwawa("Trinity Trailhead")],
  wa_mount_maude_r2: ["Access road and trail can be affected by seasonal snow or storm damage - check current Okanogan-Wenatchee NF alerts before driving", chiwawa("Phelps Creek Trailhead")],
  wa_mount_maude_r3: ["Access road and trail can be affected by seasonal snow or storm damage - check current Okanogan-Wenatchee NF alerts before driving", chiwawa("Phelps Creek Trailhead")],
  wa_copper_peak_south_route: [undefined, HOLDEN], wa_north_star_mountain_east_route: [undefined, HOLDEN],
};

const plan = {}; // id -> {bivy?, waypoints?, access?}
const rows = {};
const load = async id => rows[id] ??= await read(id);
const want = (id, k, v) => { (plan[id] ??= {})[k] = v; };
const mismatch = []; const note = (id, m) => mismatch.push(id + ": " + m);

for (const id of ["wa_hourglass_gully_winter", "wa_j_tnar", "wa_mount_index_north_norwegian_buttress", "wa_mount_index_north_peak_traverse", "wa_mount_index_northeast_buttress", "wa_traverse_of_mount_index"]) {
  const r = await load(id); const b = r.bivy.find(x => x.name === SERENE);
  if (!b) { note(id, "no Serene entry"); continue; }
  if (b.elev === undefined) continue; if (b.elev !== 2520) { note(id, "Serene elev " + b.elev); continue; }
  want(id, "bivy", (plan[id]?.bivy || r.bivy).map(x => x.name === SERENE ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== "elev")) : x));
}
for (const id of ["wa_mount_rainier_kautz_glacier", "wa_mount_rainier_kautz_headwall", "wa_mount_rainier_fuhrer_finger", "wa_mount_rainier_fuhrer_thumb"]) {
  const r = await load(id); let bivy = plan[id]?.bivy || r.bivy, touched = false;
  bivy = bivy.map(x => {
    if (x.name === CASTLE) { if (x.notes === CASTLE_OLD) { touched = true; return { ...x, notes: CASTLE_NEW }; } if (x.notes !== CASTLE_NEW) note(id, "Castle notes drifted"); }
    if (x.name === "Camp Hazard") {
      if ((x.notes === "" || x.notes === HEADWALL_HAZARD_OLD) || x.elev !== 10800) { if (x.notes && x.notes !== HEADWALL_HAZARD_OLD && x.notes !== HAZARD_NOTES) { note(id, "Hazard notes drifted"); return x; } touched = true; return { ...x, notes: HAZARD_NOTES, elev: 10800 }; }
    }
    return x;
  });
  if (touched) want(id, "bivy", bivy);
  if (id === "wa_mount_rainier_kautz_glacier") {
    const w = r.waypoints.find(x => x.name === "Camp Hazard");
    if (w && w.elev === 12500) want(id, "waypoints", r.waypoints.map(x => x === w ? { ...x, elev: 10800 } : x));
    else if (!w || w.elev !== 10800) note(id, "Hazard pin elev " + w?.elev);
  }
}
for (const [id, [oldV, newV]] of Object.entries(CLOSURES)) {
  const r = await load(id); const cur = (r.access || {}).closures;
  if (cur === newV) continue;
  if (!(cur === oldV || (oldV === undefined && cur == null))) { note(id, "closures drifted: " + String(cur).slice(0, 60)); continue; }
  want(id, "access", { ...(r.access || {}), closures: newV });
}

for (const [id, p] of Object.entries(plan)) console.log(id, Object.keys(p).join(","));
if (mismatch.length) console.log("MISMATCH (not written):\n  " + mismatch.join("\n  "));
if (!APPLY) { console.log({ mode: "DRY", rows: Object.keys(plan).length }); process.exit(0); }
const rollback = [];
for (const [id, p] of Object.entries(plan)) {
  const r = rows[id]; rollback.push({ id, ...Object.fromEntries(Object.keys(p).map(k => [k, r[k]])) });
  fs.writeFileSync("enrichment-wip/camping-roles/three-facts-rollback-" + process.pid + ".json", JSON.stringify(rollback));
  await patchRow("routes", id, p);
  const after = await read(id);
  for (const k of Object.keys(p)) if (canon(after[k]) !== canon(p[k])) throw new Error("RECONCILE FAILED " + id + "." + k);
}
console.log({ mode: "APPLY", rows: Object.keys(plan).length });
