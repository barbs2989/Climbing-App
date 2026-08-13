#!/usr/bin/env node
// Populate approach_variants / climbing_route / bivy, and enrich rappel_detail in place.
//
// Migration 0122 created the columns; this puts content in them. One route per entry below,
// keyed by the FULL route id, and every entry asserts its own `area` before writing — route
// ids are only ~9% peak-scoped, so a name-shaped id is not evidence of which peak you are on.
// patchRow throws unless exactly one row comes back, so a wrong id cannot read as success.
//
// Three rules the content follows, each of them a rule this repo learned the hard way:
//
//   * Enrichment is NOT testimony. Nothing here is attributed to a named climber or written as
//     somebody's account. Where a fact is contested or conditions-dependent, it says so.
//   * The prose is written here, not lifted. Facts are facts, but no sentence is copied from a
//     trip report or a guidebook.
//   * `baseFinding` answers exactly one question — how do I know I am at the start of the
//     climbing — and answers it in a way you could act on in fog. It is the field the whole
//     0122 migration exists for, so it must not drift into being a second `notes`.
//
// Usage:  node scripts/enrich-approach-rappel-bivy.mjs [--dry] [--only <routeId>]
//                                                     [--from batch.json] (repeatable)

import fs from "fs";
import { patchRow, SUPABASE_URL, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ONLY = (() => { const i = args.indexOf("--only"); return i >= 0 ? args[i + 1] : null; })();

// ── Content ──────────────────────────────────────────────────────────────────────────────
// climbing_route entries below are a RE-HOMING, not new research: every fact in them was
// already in that route's own `approach` text, where audit:approach-scope found it. Nothing is
// invented and nothing is deleted — `approach` is left exactly as it is this pass, because
// losing a sentence is worse than repeating one, and the CLIMBING ROUTE heading is what tells
// a reader which half of the story they are in. Trimming the approach to stop at the base is a
// separate, riskier pass that should be done route-by-route with eyes on it.
const DATA = {
  wa_bulls_tooth_standard: {
    area: "wa_bulls_tooth",
    climbing_route: [
      { n: 1, label: "Summit block, right-hand line", class: "Class 2–3",
        notes: "Solid granite. The easier line works around the right (east/south) side of the block rather than the left — going left is the common error here." },
      { n: 2, label: "Final step and mantle", class: "Class 3",
        notes: "Short but exposed: a step and a mantle onto the summit itself." },
    ],
  },

  wa_bearpaw_mountain_scramble: {
    area: "wa_bearpaw_mountain",
    climbing_route: [
      { n: 1, label: "Summit block from the north bowl", class: "Class 2–3",
        notes: "Roughly 300 ft from the base of the block to the 6,091 ft summit on generally solid rock and blocks, with mild exposure in the last stretch. Snow lingers in the summit gullies into July on shaded ground; early season that can mean an axe for this section." },
    ],
  },

  wa_summit_chief_mountain_south_route: {
    area: "wa_summit_chief_mountain",
    climbing_route: [
      { n: 1, label: "Talus basin to the 7,200 ft notch", class: "Class 2",
        notes: "Steep hardpan and talus with real rockfall potential from parties above. A moat around 7,000 ft, where the peak steepens, is the feature most likely to stop you — it can be impassable after mid-July, earlier in a low-snow year." },
      { n: 2, label: "Southwest gully system", class: "Class 2–3",
        notes: "Loose rock and an exposed slab that dips slightly outward. Route-finding through here is the crux of the route, and beta photos of the south-ridge crossing point are frequently reported as inaccurate — navigate it rather than pattern-match it." },
      { n: 3, label: "Final scramble to the summit", class: "Class 2–3",
        notes: "Short, on the same loose ground as the gully below." },
    ],
  },

  wa_cloudy_peak_southwest_slopes: {
    area: "wa_cloudy_peak",
    climbing_route: [
      { n: 1, label: "Cloudy Pass to the southwest ridge", class: "Class 2",
        notes: "An obvious boot path climbs through meadows onto rocky talus and gains the southwest ridge — about 1,500 ft above the pass, in well under a mile." },
      { n: 2, label: "The southwest ridge crest", class: "Class 2–3",
        notes: "Stay ON the crest. Straying onto the flanking slopes puts you in seriously unstable scree and talus. Loose blocks throughout, so keep the party out of one another's fall line. The exposure is real — the far (north) side of the ridge drops away steeply." },
      { n: 3, label: "Summit block, east then north side", class: "Class 4+",
        notes: "At the base of the final block, traverse round to its east side, then work toward the north (back) side to find the walkable weakness through. Narrow, genuinely exposed, and the technical crux of the day." },
    ],
    // The route's own text already recorded that three approaches reach Cloudy Pass; until now
    // that fact lived as an aside at the end of an approach paragraph, where it could not be
    // compared against anything. Same facts, made choosable.
    approach_variants: [
      { name: "Phelps Creek and Spider Gap (standard)", season: "Jul–Sep", hours: "2 days", gainFt: 5800,
        notes: "From the Phelps Creek Trailhead (~3,500 ft), Trail #1511 climbs the valley about 6.5 miles to Spider Meadows, then into upper Phelps Basin and up the Spider Glacier snowfield to Spider Gap at 7,100 ft. Descend the north side — the steepest 100 vertical feet first, softer snow tends to be climber's-left — then scree and easing snowfield past the Lyman Glacier to Lower Lyman Lake, and back up about 1.8 miles of open meadow to Cloudy Pass at 6,438 ft. This is the line the on-file distance matches.",
        baseFinding: "Cloudy Pass is the staging point, not the base: the climbing starts where the boot path leaves the meadows and gains the southwest ridge, with the summit about 1,500 ft above the pass.",
        hazards: [
          "Spider Gap is the crux of the approach — a permanent snow/glacier slope that is a straightforward boot-pack in summer but can hold open crevasses and firm icy snow early season. Carry an axe and know how to use it.",
          "A whiteout or an early-morning refreeze moves crampons from optional to necessary.",
        ] },
      { name: "Buck Creek Trail from Trinity, over Buck Creek Pass", season: "Jul–Sep", hours: "Multi-day",
        notes: "A longer alternative reaching Cloudy Pass from the Trinity Trailhead by way of Buck Creek Pass. Recorded on file as one of the three ways in; it is a multi-day trip rather than a variation on the standard day." },
      { name: "Railroad Creek from Holden Village", season: "Jul–Sep", hours: "Multi-day",
        notes: "Reaches Lower Lyman Lake and Cloudy Pass from Holden Village, which is itself reached by the Lake Chelan boat and a vehicle shuttle. The longest of the three and the one with the most fixed logistics." },
    ],
  },

  wa_forbidden_peak_west_ridge: {
    area: "wa_forbidden_peak",
    approach_variants: [
      {
        name: "South face couloir to the West Ridge notch",
        season: "Jun–early Aug, while it still holds snow",
        hours: "4–5 from camp",
        gainFt: 2065,
        notes:
          "From the Boston Basin high camp, traverse up and east across talus and the remains of the Quien Sabe Glacier toward Forbidden's south face. Where the glacier is melted out, a class 3 rock spur on climber's right is usually faster and drier than staying on snow; where it is snow-covered or crevassed, rope up. The couloir itself runs about 500 ft and steepens to 40–50° near the top, which is where crampons and an axe stop being optional. Reaching the notch is roughly 2,000 ft above camp.",
        baseFinding:
          "The notch is the low point on the skyline between Forbidden and Mount Torment, at 8,265 ft, and the couloir below it is the obvious continuous snow line splitting the left-hand edge of the south face. Navigate to the NOTCH, not to the first gully you reach — several lines start off the same snowfield and only this one tops out at the crest. You are at the base of the climbing when you step through the notch onto the ridge crest; from there the route to the summit runs to climber's right.",
        hazards: [
          "A moat where the snow pulls back from the rock guards the top of the couloir. Expect a short steep step or a band of loose rock to get over it, and expect it to be worse the later in the season you go.",
          "Rockfall once the sun reaches the couloir — parties above are the usual source, so it pays to be off it early.",
          "40–50° snow near the top, on ground where a slip does not stop on its own."
        ]
      },
      {
        name: "Cat Scratch gullies (late season, once the couloir has melted out)",
        season: "Late Aug–Sep, dry conditions",
        hours: "4–5 from camp",
        gainFt: 2065,
        notes:
          "When the couloir has gone to loose talus and scree, the usual line moves off the snow onto the rock gully system immediately west — climber's left — of it. Roughly the first 200 ft is class 4, easing to grassy class 3 for the last 200 ft to the notch. It is loose the whole way, and it is slower than it looks on the approach.",
        baseFinding:
          "Cat Scratch is not the snow couloir, and that mix-up is the usual reason parties lose time here: it is the parallel ROCK gully system just west (climber's left) of the couloir, and it tops out at the same 8,265 ft notch. Several parallel gullies in that system look alike from below — the correct one finishes at the notch itself rather than on the ridge either side of it, so pick your line by where it ENDS on the skyline, not by which entrance looks easiest from the basin.",
        hazards: [
          "Loose rock from bottom to top. Keep the party out of one another's fall line rather than spread across the gully.",
          "The parallel gullies are easy to confuse, and committing to the wrong one puts you on the ridge away from the notch with loose ground to traverse back."
        ]
      }
    ],
    bivy: [
      {
        name: "Boston Basin high camp",
        lat: 48.492,
        lng: -121.065,
        elev: 6200,
        capacity: "Designated sites, small parties",
        water: "Snowmelt and basin creeks; seasonal, thinner late",
        permit: "North Cascades NP backcountry permit — Marblemount",
        notes:
          "The standard base for the route, in the boulder-and-heather basin below the south face, roughly 3 miles and 3,000 ft above the trailhead. Most parties leave camp very early and are back the same day; it is also the place to retreat to if the couloir or the ridge turns you around."
      },
      {
        name: "Treeline emergency bivy",
        elev: 4800,
        capacity: "Emergency only — not a site",
        water: "Seasonal creek crossings on the climbers' path",
        notes:
          "Not a planned camp and not a substitute for reaching the basin. Recorded here only because parties benighted on the walk in have stopped near treeline on the Boston Basin path; there are no prepared sites and no reason to aim for it."
      }
    ],
    // Merged key-by-key onto the existing rappel_detail entries, matched on `n`. Existing
    // notes/anchor/lengthM are left exactly as they are — this only ADDS the three keys 0122's
    // UI introduced, so nothing already reviewed gets overwritten by this pass.
    rappel_add: {
      1: {
        station:
          "On the tower at the top of the steep section, roughly 175 ft below the summit. Slings and cord are usually in place here; it is the first station most parties actually use rather than downclimb.",
        hazards: [
          "The pull angles here are awkward and a rope that is not weighted cleanly off the horn can hang up. Watch the rope over the edge before the last person goes."
        ],
        pull: "Set the knot well clear of the lip and check the pull before committing."
      },
      2: {
        station:
          "Below the crux tower, dropping toward the north-side snow. Anchors here are natural — slung horns and blocks with accumulated tat rather than a bolted station.",
        hazards: [
          "This one lands on snow, and the transition from rock to snow is where parties come off the rappel awkwardly. Have crampons and an axe accessible before you start down, not stowed."
        ]
      },
      3: {
        station:
          "Above the upper moat, at the top of the steepest remaining snow. This is the station most commonly reported as hard to find — if you cannot see the next anchor, stop and look on the rib to the down-climber's LEFT of the gully before continuing.",
        hazards: [
          "The descent line follows fixed anchors on the small rib to the down-climber's LEFT of the gully. Parties that drift into the right-hand gully end up off route on loose ground with no stations — this is the single most commonly reported descent error on the route.",
          "Stations are intentionally short in places and easy to rappel straight past. Do not skip an anchor because the next one is not yet visible.",
          "The moat at the bottom of the couloir reappears on the way down and can require a step across or a short downclimb."
        ],
        pull: "A 60m rope doubled covers the reported stations; a 45m has been reported as only just sufficient. Carry enough cord to build an extra station if you cannot find the next one."
      }
    }
  }
};

// Batches produced elsewhere (see --from) are merged in here rather than pasted into DATA, so
// the review surface stays the JSON file and this script stays the single write path — area
// assertion, patchRow, re-read. A batch file must not be able to bypass any of that.
//
// An entry whose climbing_route is EMPTY is dropped with its stated reason rather than written.
// Writing [] would look identical to "enriched" on every count-based check while putting an
// empty section on the route, which is the failure mode this whole change exists to remove.
for (const f of args.filter((a, i) => args[i - 1] === "--from")) {
  const raw = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [id, spec] of Object.entries(raw)) {
    // `rappel_add` has to count as content. It is an object keyed by rappel number rather than
    // an array, so an array-only test drops a rappel-enrichment batch entirely — and drops it
    // SILENTLY, reporting "nothing to write" for a file full of work.
    const hasContent = ["climbing_route", "approach_variants", "bivy"].some(k => Array.isArray(spec[k]) && spec[k].length)
      || (spec.rappel_add && Object.keys(spec.rappel_add).length > 0)
      || (Array.isArray(spec.rappel_detail) && spec.rappel_detail.length > 0)
      || (spec.set && Object.keys(spec.set).length > 0);
    if (!hasContent) { console.log(`skip ${id} — ${spec.skip_reason || "nothing to write"}`); continue; }
    if (!spec.area) { console.error(`skip ${id} — batch entry has no area to assert against`); process.exitCode = 1; continue; }
    for (const k of ["climbing_route", "approach_variants", "bivy"]) if (Array.isArray(spec[k]) && !spec[k].length) delete spec[k];
    DATA[id] = spec;
  }
}

// ── Apply ────────────────────────────────────────────────────────────────────────────────
const key = anonKey();
const readRoute = async id => {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,pitches,rappel_detail,rappel_count_note,rappels,descent_text,approach,waypoints,overview,beta,hazards,pro_tips,watch_out,pro_needs,bail,approach_variants,climbing_route,bivy&id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!res.ok) throw new Error(`read ${id} -> ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
};

if (!DRY) requireServiceKey();
const ids = Object.keys(DATA).filter(id => !ONLY || id === ONLY);
if (!ids.length) { console.error("no matching route ids"); process.exit(1); }

for (const id of ids) {
  const spec = DATA[id];
  const before = await readRoute(id);
  if (!before) { console.error(`SKIP ${id} — no such route`); process.exitCode = 1; continue; }
  // Assert the peak BEFORE writing. A name-shaped id that resolves to the wrong mountain is
  // this catalog's signature failure, and a write is not the place to discover it.
  if (before.area_id !== spec.area) {
    console.error(`REFUSING ${id} — area_id is ${before.area_id}, expected ${spec.area}`);
    process.exitCode = 1; continue;
  }

  const body = {};
  if (spec.approach_variants) body.approach_variants = spec.approach_variants;
  if (spec.climbing_route) body.climbing_route = spec.climbing_route;
  if (spec.bivy) body.bivy = spec.bivy;
  // A WHOLE table, for a route that has none — and, with an explicit opt-in, for one whose stored
  // table is itself the thing being corrected. Replacing is refused by default: a table already on
  // file may have been reviewed by a human, and overwriting it silently is how researched work gets
  // lost. `replace_rappels` has to be set per route in the batch, so the decision is visible in the
  // reviewed file rather than in a flag someone typed once.
  if (Array.isArray(spec.rappel_detail) && spec.rappel_detail.length) {
    const had = (before.rappel_detail || []).length;
    if (had && !spec.replace_rappels) {
      console.error(`REFUSING ${id} — it already has ${had} rappel entries. Set "replace_rappels": true in the batch if the stored table is what you mean to correct.`);
      process.exitCode = 1; continue;
    }
    body.rappel_detail = spec.rappel_detail;
  } else if (spec.rappel_add && Array.isArray(before.rappel_detail)) {
    body.rappel_detail = before.rappel_detail.map((r, i) => {
      const n = r.n != null ? r.n : i + 1;
      const add = spec.rappel_add[n];
      return add ? { ...r, ...add } : r;
    });
  }
  // A CORRECTION path for the scalar prose columns beside the table. It exists because the
  // rappel-length defect is not repairable without it: a table can be fixed while
  // `rappel_count_note` still states the methodology that produced the wrong number, and the
  // next pass then re-derives it. The allow-list is deliberate — this script must not become a
  // way to write arbitrary columns, and `null` is a legal value here (it is the correct value
  // for a distance no source gives; see the rope-capacity note below).
  // `approach` is settable so a CONTAMINATED approach can be corrected — five Cutthroat Peak
  // routes shared one boilerplate string naming the wrong trailhead (the PCT rather than the SR-20
  // pullout) and the wrong side of the mountain, and it contradicted itself inside one sentence
  // ("South-southwest via open timber basin ... basin northwest of peak"). Correcting it is not
  // enrichment: the replacement must be RE-HOMED from a peer row on the same peak or from this
  // route's own researched approach_variants, never composed from memory.
  // `waypoints` is settable ONLY to correct a pin that is demonstrably in the wrong place, and the
  // replacement must be RE-HOMED from a peer row on the same peak whose coordinate has been checked
  // against a known summit. wa_ragged_edge stored a "Vesper-Sperry Saddle" pin 2.32 km from the
  // Vesper summit and a "North Face Ledge" pin 2.63 km away, both roughly 2,500 ft below their
  // stated elevations, while three sibling rows carry the real pair 0.27 km and 0.10 km out.
  // This is NOT a route for bulk waypoint edits — see the standing rule that waypoint findings
  // must be read row by row before anything is written.
  // PROSE columns only. The line is deliberate: display text a correction can rewrite, versus
  // IDENTITY and CLASSIFICATION columns — `name`, `discipline`, `grade`, `area_id` — which are
  // NOT here and must go through hand-written SQL a human runs, because they feed search, dedup,
  // the duplicate-name view and the discipline filter chips. wa_little_annapurna_south_slopes is
  // the case that drew the line: its prose needs a systematic north/south repair AND its name is
  // wrong, and only the first half belongs to this script.
  const SETTABLE = new Set([
    "rappel_count_note", "rappels", "descent_text", "approach", "waypoints",
    "overview", "beta", "hazards", "pro_tips", "watch_out", "pro_needs", "bail",
  ]);
  if (spec.set) {
    for (const [k, v] of Object.entries(spec.set)) {
      if (!SETTABLE.has(k)) { console.error(`REFUSING ${id} — set.${k} is not an allowed column`); process.exitCode = 1; body._refuse = true; continue; }
      body[k] = v;
    }
    if (body._refuse) { delete body._refuse; continue; }
  }

  console.log(`\n${id}  (${before.name} · ${before.area_id})`);
  for (const k of Object.keys(body)) {
    const v = body[k];
    console.log(`   ${k}: ${Array.isArray(v) ? v.length + " entr" + (v.length === 1 ? "y" : "ies") : "set"}`);
  }
  if (DRY) { console.log("   --dry, not written"); continue; }

  await patchRow("routes", id, body);

  // Re-read and reconcile. A 200 is not evidence the data changed.
  const after = await readRoute(id);
  // Every key written must be checked. The first version of this omitted climbing_route, so a
  // route that set ONLY that column satisfied every remaining clause vacuously and printed
  // "verified" having confirmed nothing — the same shape as a guard that passes because it
  // looked at an empty set. Build the checks from what was actually written.
  const checks = [];
  if (body.approach_variants) checks.push((after.approach_variants || []).length === body.approach_variants.length);
  if (body.climbing_route) checks.push((after.climbing_route || []).length === body.climbing_route.length);
  if (body.bivy) checks.push((after.bivy || []).length === body.bivy.length);
  // Compare what came back against what was SENT, key by key, rather than testing for the
  // presence of `station`. That earlier test only described an enrichment batch: a CORRECTION
  // that nulls a wrong lengthM adds no station, so a correct write reported a mismatch — and,
  // worse, a batch that changed nothing at all would have passed on stations written months ago.
  // Key-by-key because jsonb does not preserve key ORDER, so stringifying the whole array
  // compares formatting as well as content.
  if (body.rappel_detail) {
    const got = after.rappel_detail || [];
    checks.push(got.length === body.rappel_detail.length && body.rappel_detail.every((want, i) =>
      Object.keys(want).every(k => JSON.stringify(got[i] && got[i][k]) === JSON.stringify(want[k]))));
  }
  // Scalars compare directly; the array-valued prose columns (hazards, pro_tips, watch_out)
  // compare by JSON, which is safe here because they are arrays of STRINGS — order is meaningful
  // and there are no object keys whose order jsonb could reshuffle.
  for (const k of ["rappel_count_note", "rappels", "descent_text", "approach", "overview", "beta", "pro_needs", "bail"]) if (k in body) checks.push(after[k] === body[k]);
  for (const k of ["hazards", "pro_tips", "watch_out"]) if (k in body) checks.push(JSON.stringify(after[k]) === JSON.stringify(body[k]));
  // waypoints is an array of objects, so compare length plus each entry's name and coordinate —
  // a string compare would fail on jsonb key order, which is not stable.
  if (body.waypoints) {
    const got = after.waypoints || [];
    checks.push(got.length === body.waypoints.length && body.waypoints.every((w, i) =>
      got[i] && got[i].name === w.name && got[i].lat === w.lat && got[i].lng === w.lng));
  }
  if (!checks.length) { console.log("   nothing to verify — refusing to claim success"); process.exitCode = 1; continue; }
  const ok = checks.every(Boolean);
  console.log(ok ? "   verified on re-read" : "   MISMATCH on re-read — inspect before trusting");
  if (!ok) process.exitCode = 1;
}
