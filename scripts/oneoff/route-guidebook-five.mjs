// The five low-confidence route-identity items (audits/route-grades/deep/IDENTITY-DECISIONS.md), settled
// against the published guidebooks (owner rule: the guidebook wins unless it is outdated; access is not
// touched). Every string written is our own wording, and none names a source. GRADES are the exception
// (owner, 2026-10-02): keep the HIGHER of ours and the book's, since older guides graded easier. So the
// book raised Fortress and Jack, but did not lower Chopping Block (stays 5.5) or Lincoln (stays Class 4).
//   - Fortress NE face: NOT a duplicate of East Ridge. The guide has a separate Northeast Face (Grade II,
//     5.6) from the Fortress-Chiwawa col; this row describes it but was named "Northeast Ridge", Class 4.
//   - Chopping Block "South Route": the 1932 first-ascent line is the Southeast Face, class 3-4 (a 200-ft
//     chimney, then slab), descended by about seven low-angle rappels. Not 5.4/5.5, not one rappel.
//   - Jack Mountain Northeast Glacier: reached over the serrated col E of the Southeast Ridge, ~250 ft down
//     onto the glacier, finishing on the North Ridge (Class 4). The row carried the Nohokomeen route's
//     hazards, camps and May Creek descent.
//   - Mount Lincoln: the row is the Flapjack Lakes / north ridge route (I, class 3), mislabelled South Ridge,
//     Class 4, and credited with the class-2 line that starts lower in the valley.
//   - The Incisor: one route, II 5.4, from a block at the SE corner across to the low N end and along the
//     knife-edge ridge; FA party named. Elevation (book: ca. 7,350 ft vs our 7,440) is NOT changed.
// String edits in JSON columns are exact-substring replacements that throw if the substring is missing.
//   node scripts/oneoff/route-guidebook-five.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const get = async (path) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key) }); if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`); return r.json(); };
// Replace an exact substring inside any column (string or JSON); throws when it is not there.
const sub = (v, from, to) => { const s = typeof v === "string" ? v : JSON.stringify(v); if (!s.includes(from)) throw new Error(`missing: ${from.slice(0, 60)}`); const out = s.split(from).join(to); return typeof v === "string" ? out : JSON.parse(out); };
const subs = (v, pairs) => pairs.reduce((acc, [a, b]) => sub(acc, a, b), v);

const FIX = {
  wa_fortress_mountain_northeast_face: { area: "wa_fortress_mountain", build: (r) => ({
    name: "Northeast Face", face: "Northeast Face", commitment: "II",
    grade: "5.6", grade_system: "yds", grade_num: gradeNumFrom("5.6", "yds"),
    rock_grade: "5.6 (a slabby step in the lower rock band, then a chimney)",
    overview: "Fortress's technical line from the col it shares with Chiwawa Mountain: a short band of rock with a slabby crux and a chimney, then a snow slope that steepens as it climbs to the Southeast Ridge, and a ridge finish to the true summit.",
    beta: "Start at the Fortress-Chiwawa col. The rock band directly above is the only real climbing: a slabby move is the crux, then a chimney on the left breaks through. Above it a long snow slope steepens gradually toward the Southeast Ridge. Aim for the crest to the left of the point that looks like the summit, which is not the top, and follow the ridge to the high point. It is a mixed rock-and-snow route rather than a scramble, so bring a rope for the rock band.",
    pitch_detail: [
      { pitch: "Lower rock band", grade: "5.6", notes: "From the col, a slabby move is the crux, then a chimney on the left leads through the band." },
      { pitch: "Snow slope", grade: "Steep snow", notes: "A long slope that steepens steadily toward the Southeast Ridge; aim left of the false summit." },
      { pitch: "Ridge to the summit", grade: "Class 2-3", notes: "Follow the crest to the true summit. Can be corniced early in the season." },
    ],
    descent_text: sub(r.descent_text, "locate the 4th-class chimney carefully", "locate the chimney carefully"),
  }) },
  // Grade kept at 5.5: the book says class 3-4, and the owner rule is to keep the HIGHER grade (older
  // guides graded easier). Name, line, descent and rappels follow the book.
  wa_the_chopping_block_south_route: { area: "wa_the_chopping_block", build: (r) => ({
    name: "Southeast Face", face: "Southeast Face", aspect: "SE",
    rock_grade: "5.5 (a 200-ft chimney, then a slabby face)",
    beta: "From the high camp, traverse beneath the steep east face to the southeast side of the peak, where a hidden gully gives easy access to the face. Climb a chimney about 200 ft high, then a slabby face. Below the summit slab there are a few harder moves where the route mixes face and ridge climbing, with some scrubby vegetation. Allow about three hours from timberline. Because the Pickets guard several summits from a shared basin, parties often combine this peak with Mount Degenhardt, Mount Terror, or Inspiration Peak on the same trip.",
    pitch_detail: [
      { pitch: "Chimney", grade: "Class 4 to low 5th", notes: "Reached by a hidden gully on the southeast side, after traversing under the steep east face. The chimney is about 200 ft high." },
      { pitch: "Slabby face to the summit", grade: "Low 5th (5.5)", notes: "Part face and part ridge climbing, with some scrubby vegetation and a few harder moves below the summit slab." },
    ],
    rappels: "Seven low-angle rappels, over some loose rock, are the usual way down the face.",
    descent: "Seven low-angle rappels",
    descent_text: "Descend the face by about seven low-angle rappels, watching for loose rock. Parties combining the Chopping Block with Mount Degenhardt or the Twin Needles typically continue along the Barrier/Chopping Block Ridge rather than dropping straight back to camp.",
    detailed_rack: "A light rack is enough: a 200-ft chimney and a slabby face, low fifth class at most. A small set of nuts and cams plus slings covers belays on the exposed sections, and the descent needs gear for about seven rappels.",
    pro_needs: "A light alpine rack for the chimney and the slab, plus slings and cord for about seven rappels on the descent.",
    rope_note: "Low-fifth-class alpine rock route (5.5, Grade II): a 200-ft chimney and a slabby face, reached by a hidden gully on the southeast side. A light rack covers it; the descent is about seven low-angle rappels.",
    partner_requirements: sub(r.partner_requirements, "low 5th class rock scrambling (5.4)", "low 5th class rock (5.5)"),
    timing: subs(r.timing, [["via South Route", "via Southeast Face"]]),
    itinerary: subs(r.itinerary, [["via South Route", "via Southeast Face"], ["a couple of short, exposed low-5th-class moves near the summit plateau", "a 200-ft chimney and a slabby face with a few low-5th-class moves below the summit"]]),
    waypoints: sub(r.waypoints, "a common high camp for the South Route", "a common high camp for the Southeast Face"),
    seasonal_hazards: sub(r.seasonal_hazards, "on the South Route itself", "on the Southeast Face itself"),
    corrections: "Settled 2026-10-02 against the published guide: this is the 1932 first-ascent line, the Southeast Face (a 200-ft chimney, then slab), descended by about seven low-angle rappels; the south-face description and the single rappel were replaced. The guide rates it class 3-4; the 5.5 grade is kept because older guides graded easier (owner rule: keep the higher grade).",
  }) },
  wa_jack_mountain_northeast_glacier: { area: "wa_jack_mountain", build: (r) => ({
    grade: "Class 4", grade_num: gradeNumFrom("Class 4", "class"), rock_grade: "Class 4 (the North Ridge finish)",
    overview: "A seldom-climbed glacier line on Jack's northeast side. From the basin east of the mountain you cross a jagged rock col east of the Southeast Ridge, drop onto a small, chaotic glacier, and work up its narrow northern part, using the buttress on its right where the ice is too broken, to the notch below the summit. The last stretch follows the North Ridge to the top.",
    beta: "From the upper basin east of Jack, climb moraine and snow to the serrated rock col just east of the Southeast Ridge. Cross a little west of its lowest point; elsewhere the far side is too steep. Downclimb roughly 250 ft of broken rock and snow gullies onto the glacier, then traverse to its narrow northern part and find a way through. The glacier is chaotic and usually only goes in early summer. The first party had to leave it for snow and rock on the buttress to its right, then traversed back across the ice to the notch below the summit. From the notch, finish as for the North Ridge. Allow about six hours from camp.",
    hazards: ["Crevasses and icefall on a small, chaotic glacier", "Wind slab on the upper snow slopes", "Remote location with a long, difficult retreat"],
    approach: sub(r.approach, "From camp, climb and traverse around onto the north face to the foot of a narrow, badly broken glacier: that is the Northeast Glacier.", "From camp, climb to the serrated rock col east of the Southeast Ridge and drop about 250 ft on its far side onto the Northeast Glacier."),
    approach_variants: sub(r.approach_variants, "Summit day starts with a climbing traverse around onto the north face to reach the glacier.", "Summit day starts by crossing the rock col east of the Southeast Ridge and downclimbing onto the glacier."),
    descent: "Reverse the route: down the summit ridge to the notch, back across the glacier, and up the gullies to the rock col east of the Southeast Ridge, then down into the east-side basin and out over the pass between Crater Mountain's summits. Descending a ridge instead puts you on another side of the mountain from camp, so scout any such plan before committing.",
    bivy: [{ elev: 6000, name: "Camp on the east side of Jack", role: "main", type: "camp", notes: "Reached over the pass between Crater Mountain's summits and down past the Jerry Glacier. Leaves the col crossing and the glacier for summit day.", water: "Snowmelt early in the season", capacity: "Open basin; room for a few tents" }],
    comms: sub(r.comms, "No cell coverage on the East Bank Trail or anywhere on the north side of Jack Mountain.", "No cell coverage on the approach or anywhere on the north side of Jack Mountain."),
    bail: sub(r.bail, "retreat is a bushwhack back down to the East Bank Trail", "retreat is back over the rock col to the east-side basin"),
    best_season: "Early summer, while the glacier is still filled in. It is broken and chaotic in places and later in the season may not go at all; the first ascent, in mid-July, found it badly broken and left the ice for the buttress beside it.",
    pro_tips: subs(r.pro_tips, [["Go early in the season when the glacier is filled in; the Nohokomeen parties on the same side of the mountain consistently report that the schrund becomes the crux by June.", "Go early in the season when the glacier is filled in; it is chaotic in places, and its bergschrund and crevasses worsen as summer goes on."]]),
  }) },
  wa_mount_lincoln_standard: { area: "wa_mount_lincoln", build: (r) => ({
    // Grade kept at Class 4 (the book says class 3; owner rule: keep the HIGHER grade). Only the route's
    // identity changes: it is the north ridge from Flapjack Lakes, not the south ridge.
    name: "North Ridge from Flapjack Lakes", face: "North Ridge", aspect: "N",
    beta: "From Flapjack Lakes, either contour around to the right or climb east and then south over the forested ridge to the head of the Madeline Creek basin. Exposed rock scrambling from there gains the north ridge, which leads south to the summit. The 5,700-ft north peak, the prominent point seen from the lakes, is not the top; keep it on your left. Allow about three hours from the lakes. The scrambling is class 3 for most of its length, with a class 4 chockstone move near the summit. The terrain is loose: steep duff and scree below the ridge, the chockstone gully and a boulder field, and an airy knife-edge near the top, so route-finding and care matter as much as difficulty. Most parties camp at the lakes; car-to-car it is a very long day. A different, easier line climbs the ridge south of the peak from lower on the valley trail, but its old trail burned in 1985 and is largely gone.",
    pitch_detail: subs(r.pitch_detail, [
      ["toward the south ridge crest.", "toward the head of the Madeline Creek basin and the north ridge."],
      ["Follow the crest of Sawtooth Ridge toward Lincoln, negotiating", "Follow the north ridge south toward the summit, negotiating"],
    ]),
  }) },
  wa_the_incisor_scramble: { area: "wa_the_incisor", build: (r) => ({
    name: "Knife-Edge Ridge", face: "Southeast corner and summit ridge", commitment: "II",
    fa: "1958, by Kent Heathershaw and Bob McKee",
    beta: "The Incisor is the rock tooth about 300 yards north of Martin Peak, above the upper Royal Basin. Its one route starts near a block at the southeast corner, coming from the Martin Peak side: traverse across a shallow dip to the low north end of the summit ridge, then straddle the knife-edge ridge to the top. It is short but exposed, and the rock, like everywhere in the Needles, needs testing before you weight it.",
    pro_needs: "A short, exposed 5.4 ridge: bring a rope, a light rack and slings for the knife-edge, and gear to rappel or lower off.",
    pro_tips: subs(r.pro_tips, [["Detailed pitch-by-pitch beta is scarce online; consult 'Olympic Mountains: A Climbing Guide' (Olympic Mountain Rescue, 4th ed.) for the definitive route description.", "The tooth sits about 300 yards north of Martin Peak; pick it out from the basin before you climb, since the Needles' summits are closely spaced."]]),
  }) },
};

const ids = Object.keys(FIX);
const rows = Object.fromEntries((await get(`routes?select=*&id=in.(${ids.join(",")})`)).map(r => [r.id, r]));
const go = [];
for (const id of ids) {
  const r = rows[id];
  if (!r) throw new Error(`${id} missing`);
  if (r.area_id !== FIX[id].area) throw new Error(`${id}: area ${r.area_id}, expected ${FIX[id].area}`);
  const body = FIX[id].build(r);
  if (body.name && body.name !== r.name) {
    const clash = await get(`routes?select=id,name&area_id=eq.${r.area_id}&id=neq.${id}&name=ilike.${encodeURIComponent(body.name)}`);
    if (clash.length) throw new Error(`${id}: name "${body.name}" already used by ${clash[0].id}`);
  }
  go.push({ id, body, before: Object.fromEntries(Object.keys(body).map(c => [c, r[c] ?? null])) });
  console.log(`\n## ${id}`);
  for (const [c, v] of Object.entries(body)) if (JSON.stringify(v) !== JSON.stringify(r[c] ?? null)) console.log(`  ${c}: ${typeof v === "string" && v.length < 90 ? `${JSON.stringify(r[c])} -> ${JSON.stringify(v)}` : "rewritten"}`);
}
if (DRY) process.exit(0);

const rb = `audits/route-grades/deep/rollback-guidebook-five-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(Object.fromEntries(go.map(g => [g.id, g.before])), null, 1));
console.log("rollback", rb);
for (const g of go) await patchRow("routes", g.id, g.body);
// jsonb may reorder keys, so compare canonically.
const canon = (v) => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x);
const after = Object.fromEntries((await get(`routes?select=*&id=in.(${ids.join(",")})`)).map(r => [r.id, r]));
const bad = go.flatMap(g => Object.entries(g.body).filter(([c, v]) => canon(after[g.id][c]) !== canon(v)).map(([c]) => `${g.id}.${c}`));
console.log(`wrote ${go.length}; re-read mismatches ${bad.length ? bad.join(", ") : 0}`);
