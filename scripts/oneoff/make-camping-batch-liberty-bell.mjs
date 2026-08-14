// Build the CAMPING batch for the LIBERTY BELL GROUP — Liberty Bell, Concord Tower, Lexington
// Tower, Minuteman Spire, North and South Early Winters Spires.
//
// The research unit is the TRAILHEAD, not the peak. Every route in this group starts from the
// Blue Lake trailhead just west of Washington Pass, so one camping story is true for all of
// them; writing it per-peak would be the same paragraph six times, and writing it per-ZONE any
// wider would be wrong — the wider "Washington Pass" subtree also holds Silver Star (Burgundy
// Col), Black Peak (Rainy Pass) and McGregor Mountain, which is reached from Stehekin by boat.
//
// Rules this content follows, all of them the repo's own:
//   * Enrichment is NOT testimony — nothing is attributed to a climber or written as an account.
//   * The prose is written here, not lifted from any guidebook or trip report.
//   * Where a figure is not sourced it is OMITTED rather than estimated. The basin sites carry
//     no `elev` for that reason; a plausible invented number is worse than a blank.
//   * `type` is camp | bivy | hut — the field the panel renders as a chip.
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import fs from "fs";

const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const get = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
  return r.json();
};

// Highway 20 shuts for the winter, so every option here is road-dependent. Stated once per
// site rather than assumed, because it is the fact that decides whether any of this is reachable.
const SITES = [
  {
    name: "Blue Lake trailhead roadside bivy",
    type: "bivy",
    elev: 5400,
    capacity: "Informal, at the parking area — no prepared sites",
    water: "None at the trailhead. Carry what you need.",
    permit: "Northwest Forest Pass required to park",
    notes: "The usual answer for a car-to-car day on this group, and the start of every west-side approach, roughly half a mile west of Washington Pass. Parties routinely sleep at the lot or at the highway hairpin rather than walking in, because the approaches are short enough that a high camp buys little. There are no facilities and no water; it is a place to sleep in or beside the car, not a campsite. Highway 20 is closed through the winter, so this is unavailable until the road reopens.",
  },
  {
    name: "Liberty Bell basin dispersed sites",
    type: "camp",
    capacity: "Scattered dispersed sites, small parties",
    water: "Snowmelt and seasonal runoff in the basin — unreliable once the snow has gone",
    permit: "No permit for dispersed camping; this is national forest, not the national park",
    notes: "Sites in the basin on the west side of the group, reached by following the Blue Lake trail and then the signed climbers' path that branches off it toward the group. Worth it if you want to be under the west-side routes at first light rather than walking up from the road. Note the separate restriction around Blue Lake itself, where overnight camping is not allowed within a quarter mile of the lake — the basin sites are the ones to aim for, not the lakeshore. No elevation is recorded here because none is reliably sourced; treat it as a basin camp below the spires rather than a fixed spot.",
  },
  {
    name: "Lone Fir Campground",
    type: "camp",
    elev: 3600,
    capacity: "27 sites, first come first served",
    water: "Early Winters Creek runs through the campground",
    permit: "Standard national forest campground fee",
    notes: "The closest developed campground, about a ten-minute drive east down the highway from the Blue Lake trailhead, in the trees along Early Winters Creek. No reservations, so it is a gamble on a summer weekend. Its season runs roughly from late spring into autumn and is decided by snow rather than by a date.",
  },
  {
    name: "Klipchuck Campground",
    type: "camp",
    elev: 2900,
    capacity: "First come first served",
    water: "Piped water, sinks and flush toilets",
    permit: "Standard national forest campground fee",
    notes: "Further east and lower than Lone Fir, which means it opens earlier in the season when the higher options are still under snow — the practical choice for an early-season trip. It sits far enough off the highway to be quiet and has more plumbing than anything nearer the climbing. The trade is a longer drive to the trailhead each morning. Check current status before relying on it; the highway-corridor campgrounds take periodic maintenance closures.",
  },
];

const GROUP = (await get(`areas?select=id,name,path&id=eq.wa_liberty_bell_group`))[0];
const kids = await get(`areas?select=id,name&path=cd.${GROUP.path}&limit=100`);
const ids = kids.map(a => a.id);
const routes = await get(`routes?select=id,name,area_id,discipline,bivy&area_id=in.(${ids.join(",")})&limit=500`);

const batch = {};
let skipped = 0;
for (const r of routes) {
  if (!["alpine", "mountaineering", "scrambling"].includes(r.discipline)) { skipped++; continue; }
  // Never overwrite existing camping data — this pass only fills blanks.
  if (r.bivy != null) { skipped++; continue; }
  batch[r.id] = { area: r.area_id, bivy: SITES };
}
fs.writeFileSync("enrichment-wip/camping_liberty_bell_group_2026_08_13.json", JSON.stringify(batch, null, 1));
console.log(`wrote wp-liberty-bell-camping.json — ${Object.keys(batch).length} routes, ${skipped} skipped (wrong discipline or already had bivy)`);
const byArea = {};
for (const r of routes) if (batch[r.id]) byArea[r.area_id] = (byArea[r.area_id] || 0) + 1;
const nm = Object.fromEntries(kids.map(a => [a.id, a.name]));
for (const [k, n] of Object.entries(byArea)) console.log(`  ${(nm[k] || k).padEnd(32)} ${n}`);
