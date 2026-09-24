// ROUND 2 of the walk-up audit (round 1: fix-walkup-and-scramble-disciplines.mjs, #1849).
// Round 1 researched online only the 112 routes a text detector flagged. This round researched
// ONLINE the 194 it did not: every WA enriched peak route still filed `scrambling` whose own text
// claimed Class 3-4 or a 5.x grade (a Class 3 phrase often describes a DIFFERENT route on the same
// peak), plus the 15 round 1 left unresolved. Same rules: mountaineering = Class 1-2 walk-up /
// snowshoe / glacier with no required 5.x; scrambling = ropeless Class 3-4; alpine = a REQUIRED
// roped technical grade. Medium/high-confidence verdicts only.
//
// Two findings run the OTHER way from the ask and are applied too: routes named "... Scramble"
// whose every summit line is roped 5th class (Monte Cristo 5.6 chimney, Tupshin 5.4, The Horn and
// The Fin, Temple 5.3, Half Moon, Garfield, Horseshoe, Lundin W Ridge, Forbidden East Ledges).
//
// Researched and deliberately NOT changed: Cosho and Sentinel (round 1 and round 2 research
// DISAGREE on whether the standard route crosses a glacier / needs 5th class); Big Craggy (sources
// split Class 2 vs 3); Magic Mtn SW Cirque, Mount Olson, Mount Lawson, Mount Saul (single thin
// source); the many Class 2-3 borderline routes the Mountaineers run as scrambles (Courtney,
// Carru, Red Mtn, Eagle Rock, La Bohn, Noyes, Seven Fingered Jack, Buckskin). Not found online at
// all, rows need review: Bonanza "West Ridge Approach", Mount Maude "Nothing Couloir", Little
// Sister "olivine scramble", Skookum "Twin Sisters Olivine Scramble", Mount Lyall S, Massie W,
// Rimrock Ridge, Duckabush, The Incisor.
//
// Assert-then-set, read back, then the same peak-label sync as round 1. --dry writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");

const FIXES = [
  { id: "wa_dot_mountain_scramble", from: "scrambling", to: "mountaineering", why: "class 1-2 ridge walk" },
  { id: "wa_forbidden_peak_east_ledges", from: "scrambling", to: "alpine", why: "5 rappels + low-5th gully; summit only reached technically" },
  { id: "wa_hoodoo_peak_sawtooth_scramble", from: "scrambling", to: "mountaineering", why: "class 2 boulder hop" },
  { id: "wa_mount_la_crosse_scramble", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_trapper_mountain_south_slopes", from: "alpine", to: "scrambling", why: "class 3, no rope or glacier" },
  { id: "wa_garfield_mountain_scramble", from: "scrambling", to: "alpine", why: "easiest summit 5.3; rope + rack mandatory" },
  { id: "wa_monte_cristo_peak_scramble", from: "scrambling", to: "alpine", why: "required 5.6 chimney on North Col" },
  { id: "wa_oval_peak_scramble", from: "scrambling", to: "mountaineering", why: "class 2 unexposed talus" },
  { id: "wa_switchback_mountain_scramble", from: "scrambling", to: "mountaineering", why: "class 1-2 SE ridge" },
  { id: "wa_tupshin_peak_scramble", from: "scrambling", to: "alpine", why: "7 roped pitches, 5.4 crux" },
  { id: "wa_carne_mountain_trail_route", from: "scrambling", to: "mountaineering", why: "maintained trail to summit" },
  { id: "wa_lichtenberg_mountain_se_route", from: "scrambling", to: "mountaineering", why: "class 2 max gully" },
  { id: "wa_mount_ellinor_standard", from: "scrambling", to: "mountaineering", why: "trail 812 to summit" },
  { id: "wa_plummer_peak_r1", from: "scrambling", to: "mountaineering", why: "boot path, few class 2 spots" },
  { id: "wa_esmeralda_peaks_scramble", from: "scrambling", to: "mountaineering", why: "class 2 scree/talus" },
  { id: "wa_mount_cameron_standard", from: "scrambling", to: "mountaineering", why: "class 2" },
  { id: "wa_mount_fricaba_standard", from: "scrambling", to: "mountaineering", why: "class 2 scree walking" },
  { id: "wa_storm_king_southwest_scramble", from: "alpine", to: "scrambling", why: "class 3-4, downclimbed (Abegg)" },
  { id: "wa_wolframite_mountain_scramble", from: "scrambling", to: "mountaineering", why: "class 2 west side" },
  { id: "wa_earl_peak_southwest_ridge", from: "scrambling", to: "mountaineering", why: "class 2 boot path" },
  { id: "wa_mount_sefrit_southwest_ridge", from: "alpine", to: "scrambling", why: "class 3-4, no required 5th" },
  { id: "wa_horseshoe_peak_scramble", from: "scrambling", to: "alpine", why: "short roped class 5 step; Basic Alpine Climb" },
  { id: "wa_mount_claywood_standard", from: "scrambling", to: "mountaineering", why: "class 2 hiking via Hayden Pass" },
  { id: "wa_the_fin_scramble", from: "scrambling", to: "alpine", why: "every summit route roped ~5.4" },
  { id: "wa_north_gardner_mountain_southwest", from: "scrambling", to: "mountaineering", why: "easy class 2 per Mountaineers" },
  { id: "wa_the_horn_scramble", from: "scrambling", to: "alpine", why: "SE and SW routes 5.5" },
  { id: "wa_blizzard_peak_standard", from: "scrambling", to: "mountaineering", why: "class 1-2 from Frosty Pass" },
  { id: "wa_mount_hopper_standard", from: "scrambling", to: "mountaineering", why: "class 2 valley/slopes" },
  { id: "wa_lundin_peak_west_ridge", from: "scrambling", to: "alpine", why: "easy 5th slab crux, roped" },
  { id: "wa_mount_steel_standard", from: "scrambling", to: "mountaineering", why: "class 1 Marmot Lake route" },
  { id: "wa_four_brothers_southwest_route", from: "scrambling", to: "mountaineering", why: "class 2 heather/slab slopes" },
  { id: "wa_half_moon_southwest_slopes", from: "scrambling", to: "alpine", why: "no easy route; easiest is class 5" },
  { id: "wa_navaho_peak_south_slopes", from: "scrambling", to: "mountaineering", why: "class 2 hiking, no scrambling" },
  { id: "wa_remmel_mountain_southeast_slope", from: "scrambling", to: "mountaineering", why: "class 1 climbers' trail to lookout site" },
  { id: "wa_buckhorn_marmot_pass", from: "scrambling", to: "mountaineering", why: "boot path, easy unexposed class 2" },
  { id: "wa_little_annapurna_south_slopes", from: "scrambling", to: "mountaineering", why: "steep class 2 hike" },
  { id: "wa_mount_ferry_standard", from: "scrambling", to: "mountaineering", why: "class 2 scree from Ferry Basin" },
  { id: "wa_sky_mountain_s_route", from: "scrambling", to: "mountaineering", why: "non-technical climbers' paths, snowshoe objective" },
  { id: "wa_ptarmigan_peak_pasayten_scramble", from: "scrambling", to: "mountaineering", why: "a walk; easiest Bulger" },
  { id: "wa_rock_mountain_west_route", from: "scrambling", to: "mountaineering", why: "maintained trail to lookout" },
  { id: "wa_spinnaker_peak_s_route", from: "scrambling", to: "mountaineering", why: "snowshoe via col, no class 3 rock" },
  { id: "wa_the_temple_south_ridge", from: "scrambling", to: "alpine", why: "easiest route 5.3, rappels" },
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
if (DRY) process.exit(0);

const after = await read();
const wrong = after.filter(r => r.discipline !== FIXES.find(x => x.id === r.id).to);
console.log(wrong.length ? `FAIL: ${wrong.length} row(s) did not take: ${wrong.map(r => `${r.id}=${r.discipline}`).join(", ")}` : `verified — all ${FIXES.length} disciplines stored`);
if (wrong.length) process.exit(1);
await syncAreas();

// Since 0197 a PEAK keeps its dominant_discipline once it is a mountain type — the routes trigger
// no longer moves it. So Ruby Mountain still read `scrambling` with all three of its routes now
// `mountaineering`. Only a label that NONE of the area's own routes holds is replaced (by the
// routes' most common discipline); a label that some route still agrees with is left alone, since
// 0197 treats it as researched. (Round 1 measured 35 of 67 touched areas.)
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
