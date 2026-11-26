// lib/db-route-row.js — turning a routes row into the app's route object (dbRouteToCamel) and its waypoint/gear/pitch helpers.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { tidyWaypoints } from "./waypoints";
import { recordedTrackPts } from "./track.js";
import { upCragFacts } from "./areaInherit.js";
import { usableFa } from "./fa";
import { toWarnArr } from "./hazards";
import { ancestorSeason } from "./db-catalog-more.js";

// Coerce a DB value into the array shape the app's consumers assume.
// rack/gear/features/hazards/objHaz are read with .filter/.some/.map all over the
// app; if a row stored one as a string (or null), those calls would throw. Normalize
// here at the boundary: arrays pass through, strings split on commas, blanks -> [].
// An OBJECT must never reach String(v) here: that yields the literal "[object Object]",
// which renders as a bullet and is one of the tokens check:ui exists to catch. Two rows
// hit exactly that — see gearArr below. Returning [] is the floor; gearArr recovers the
// content properly for the one column where it is recoverable.
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  if (typeof v === "object") return [];
  return String(v).split(/,\s*/).filter(Boolean);
}

// One column, two shapes. `gear` is an array of strings on 1,065 of its 1,067 rows, but
// wa_mount_baker_boulder_park_cleaver and wa_mount_shuksan_beckey_schmidtke hold a nested
// object — {rack:[…], gearTiers:{…}} — because enrichment wrote the wrong container there.
// Both rendered the literal "[object Object]" TWICE: once as the gear list, and again as
// the RACK box, because `rack` falls back to gear when the rack column is null, which it is
// on both. Their real rack array is one key down, so unwrap rather than blank — the content
// is right and only its shape is wrong. Two marquee WA alpine climbs; check:ui scans for
// this exact token but walks a single sample route, so it never saw them.
function gearArr(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) return toArr(v.rack);
  return toArr(v);
}

// watch_out is the ONLY toArr column with string rows: 79 of 1,070, the other 991 being
// arrays — and obj_haz/rack/gear/features/hazards/what_to_bring/pro_tips are 100% arrays,
// measured, so this shape is not lurking elsewhere. Those 79 separate their warnings with
// SEMICOLONS and NEWLINES, never commas, so toArr's comma split rendered each as one
// run-on bullet; on the 30 that also contain commas it broke them mid-clause into
// fragments ("…avalanche activity between Doctor Creek and Victoria Creek at 5," / "500
// ft"). Three are nothing but separators — "; ; ; ; " on Adams' Avalanche Glacier, Adams
// NW Ridge and Rainier's North Mowich Headwall — and drew a bullet of pure punctuation
// under a red WATCH OUT heading.
//
// Applied ONLY to the string form, deliberately. 237 of the 991 array rows contain a
// semicolon INSIDE one item ("the lake may still be snow/ice-covered; some parties have
// crossed…") — that is a single hazard that happens to use a semicolon, and splitting it
// would shred correct data.
// pitch_detail is an array of per-pitch objects on 918 of its 920 rows. Two Hozomeen South
// Peak routes store PROSE there instead, and every reader assumes the array — the Overview
// tab does `route.pitchDetail.reduce(...)`, a string has no .reduce, and both route pages
// THREW on render. Measured, not inferred: rendering the real RouteDetail with the real rows
// fails with "route.pitchDetail.reduce is not a function" on overview, while the array
// control renders clean.
//
// `.length` is what let it through. The guard upstream is
// `route.pitchDetail && route.pitchDetail.length`, and a non-empty STRING satisfies it — the
// same fail-open shape as the gear/watch_out pair above.
function pitchArr(v) {
  return Array.isArray(v) ? v : [];
}

// ...and the prose must not simply vanish. `beta` is NULL on both rows and neither
// `overview` contains this text, so dropping it would lose 477 and 254 characters of the
// only route description those climbs have. It is appended to `beta`, which renders as its
// own block. Prose in a structured column is the failure CLAUDE.md documents for season and
// grade; the reader-side defence here is the same remedy — show the value where it belongs
// rather than where it was written.
function pitchProse(v) {
  if (Array.isArray(v) || typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

// toWarnArr — the watch_out parser the long note above describes — lives in lib/hazards.js now, so
// audit:hazard-redundancy parses the column exactly as this file does.

// Waypoint `type`/`elev`/`note` field names and casing vary across research
// batches (different agents wrote `elevFt`/`elev_ft` vs `elev`, `notes` vs
// `note`, lowercase/aliased types like "trailhead"/"camp"/"pass"). RouteDetail's
// waypoint list, map, and "Directions to trailhead" button all key off the
// app's native seed-data shape (Title-case type, `elev`), so normalize here at
// the DB boundary rather than special-casing every consumer.
const WAYPOINT_TYPE_ALIASES = {
  trailhead: "Trailhead", start: "Trailhead",
  camp: "Campsite", campsite: "Campsite",
  water: "Water",
  junction: "Junction", pass: "Junction", notch: "Junction", col: "Junction", landmark: "Junction", ridge: "Junction", viewpoint: "Junction",
  hazard: "Hazard", glacier: "Hazard", crevasse: "Hazard",
  summit: "Summit",
  topout: "Topout",
};
function normalizeWaypointType(t) {
  if (!t) return t;
  return WAYPOINT_TYPE_ALIASES[t.toLowerCase()] || (t[0].toUpperCase() + t.slice(1));
}
function normalizeWaypoints(wps) {
  if (typeof wps === "string") {
    try { wps = JSON.parse(wps); } catch { return null; }
  }
  if (!Array.isArray(wps)) return null;
  // Coerce numerics: contributed rows have stored lat/lng/elev as strings, which
  // crashes downstream renderers that call .toFixed() (wa_martin_peak_west_ridge).
  const num = v => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  // Order and de-duplicate at the same boundary, for the same reason: every consumer (the
  // waypoint list, the map) assumed the stored array was already
  // walkable and unique, and on a lot of rows it is neither. 51 routes render the summit
  // second — Forbidden Peak's West Ridge lists it at 4.5 mi ahead of a camp at 3 mi — and 10
  // list the same place twice. See lib/waypoints.js for why reordering only happens when
  // every waypoint carries a distMi.
  // Bail points were removed from the app (owner, 2026-10-07): a stored bail/bailout pin is dropped
  // here, at the one boundary every consumer reads through, rather than drawn as an unlabelled pin.
  return tidyWaypoints(wps.filter(w => !(w && /^bail(out)?$/i.test(String(w.type || "").trim()))).map(w => ({
    ...w,
    type: normalizeWaypointType(w.type),
    lat: num(w.lat),
    lng: num(w.lng),
    elev: num(w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft)),
    note: w.note != null ? w.note : w.notes,
  })));
}

// Map a DB route row (snake_case) to the app's camelCase shape so RouteDetail —
// which reads route.gainFt/objHaz/elevPts/etc. — renders DB routes fully, not blank.
// A class grade (1st-4th) is a SCRAMBLING grade. It cannot describe a bolted sport climb, a
// trad pitch or a boulder problem, so on those disciplines it is not a grade at all -- it is
// an import artifact. 184 catalog routes carry one: "Prism Roof", a sport route at Shady Lane
// West, rendered its grade as "3rd" in the header badge AND the Grade tile.
//
// The grade came faithfully from OpenBeta, so there is nothing upstream to "restore" and no
// trustworthy source to derive a real grade from (audited 2026-08-07/08; the descent and
// approach lines in that same population were separately reclassified, see
// audits/2026-08-08-permits-rappels-class-grades.md). What the app can do without a source is
// stop presenting it as fact: null it here, at the single boundary every DB route crosses, so
// every render site shows "not recorded" and missingFacts() lists "grade" -- which puts the
// route into the contribute flow instead of quietly misinforming a climber.
//
// Deliberately NOT applied to alpine/mountaineering/ice/mixed/scrambling, where a class grade
// is meaningful and correct.
const CRAG_DISC = new Set(["trad", "sport", "toprope", "bouldering"]);
const CLASS_GRADE = /^\s*(?:class\s*)?[1-4](?:st|nd|rd|th)?(?:\s*class)?\s*$/i;
function usableGrade(r) {
  if (!r || r.grade == null) return r ? r.grade : null;
  if (!CRAG_DISC.has(r.discipline)) return r.grade;
  return CLASS_GRADE.test(String(r.grade)) ? null : r.grade;
}

// A route's area and the areas above it, root-first, read off the nested `parent` embed
// (ROUTE_AREA_EMBED carries four levels) and stopping at the state: its id is the path's
// second label, and the country above it is never named. What routePlaceDb prints on a
// search row, so two routes that share a name can be told apart by where they are.
function areaChainOf(a) {
  if (!a || !a.name) return [];
  const labels = a.path ? String(a.path).split(".") : [];
  const stop = new Set(labels.slice(0, 2));
  const out = [a.name];
  for (let p = a.parent, g = 0; p && g < 8; p = p.parent, g++) {
    if (stop.has(p.id) || p.area_type === "state" || p.area_type === "country" || p.area_type === "world") break;
    if (p.name) out.unshift(p.name);
  }
  return out;
}
// The state an embedded area sits in, by walking its `parent` embed — routePlaceDb's fallback
// when the area has no `path` to read the state from.
function embedStateName(a) {
  for (let p = a, g = 0; p && g < 8; p = p.parent, g++) if (p.area_type === "state") return p.name || "";
  return "";
}
export function dbRouteToCamel(r) {
  if (!r) return r;
  return {
    ...r,
    grade: usableGrade(r),
    fa: usableFa(r.fa),
    // The Overview card, SuggestFix and typicalPatterns read `overview||desc` (the seed key). The
    // older `routes.description` column (0001) passed through only as `description`, so a row with
    // prose there and no `overview` read "No description yet". `overview` still wins where set.
    desc: r.description || undefined,
    mountainId: r.area_id,
    gradeSystem: r.grade_system,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainFt: r.gain_ft, lossFt: r.loss_ft, approachLossFt: r.approach_loss_ft, returnGainFt: r.return_gain_ft, outingShape: r.outing_shape, gainM: r.gain_ft!=null?Math.round(r.gain_ft/3.28084):null, lossM: r.loss_ft!=null?Math.round(r.loss_ft/3.28084):null, distKm: r.dist_km, maxAngle: r.max_angle,
    objHaz: toArr(r.obj_haz),
    // THE ROUTE LINE IS A RECORDED TRACK OR NOTHING (owner, 2026-10-25). A stored `gpx` that is only
    // the route's own waypoints joined up is not a track anybody walked, and the waypoints are often
    // off, so it is dropped here with the elevation profile sampled along it: every screen then reads
    // the route as having no track, and a climber's real GPX (a trip report download, an approved
    // recording) is the only line the map draws. Never build or reshape the line from the waypoints.
    ...(recordedTrackPts(r.gpx, r.waypoints) ? { elevPts: r.elev_pts, gpxPts: r.gpx } : { elevPts: null, gpxPts: null }),
    waypoints: normalizeWaypoints(r.waypoints),
    // Structured trailhead block (2026-07 enrichment): {trailhead, trailheadDirection, trailheadLat/Lng, peakLat/Lng}.
    approachLogistics: r.approach_logistics || null,
    // Migration 0120. Each defaults to an empty array rather than null so every consumer can
    // ask `.length` without guarding — the sections that render them are gated on non-empty,
    // so an absent column and an empty array mean the same thing to the UI and neither
    // renders a heading over nothing.
    approachVariants: Array.isArray(r.approach_variants) ? r.approach_variants : [],
    climbingRoute: Array.isArray(r.climbing_route) ? r.climbing_route : [],
    bivy: Array.isArray(r.bivy) ? r.bivy : [],
    // There is no `rack` column, so this mapped every DB route to an empty array and the
    // spread above could not help. The structured rack a climber wants IS `gear`, so fall
    // back to it — otherwise the protection summary, the gear readout's category matching
    // and the planner's packing list all run on nothing.
    rack: toArr(r.rack).length ? toArr(r.rack) : gearArr(r.gear), gear: gearArr(r.gear), features: toArr(r.features), hazards: toArr(r.hazards),
    /* ONE fact under TWO spellings, and the DB path only ever filled one of them. `routes.rock`
       is NOT unreachable — RouteDetail's TECH STATS reads `route.rock` and renders a "Rock"
       tile, so #828/0132's column does show up. But three other surfaces spell the same fact
       `rockType` and saw nothing on a DB route: passesFilters' rock-type facet (so filtering
       for Granite skipped every DB route that says it is granite), the bouldering header
       strap, and — worst of the three — SuggestFix's `cur:` value, which showed a climber "—"
       for the rock type beside a route that already states it, inviting a re-submission of
       what is on file. Not the descent_text shape (populated, read by nobody); the narrower
       one where a reader exists under a name the mapper never wrote. Seed routes carry
       rockType directly and never come through here, so this cannot clobber one. It is a
       straight read of `rock` and NOT `r.rock ?? r.rockType`: there is no rockType COLUMN, and
       check:schema-drift rejects that fallback — correctly, since PostgREST would return
       undefined rather than error and the guard exists for exactly that silence. */
    rockType: r.rock,
    alpineGrade: r.alpine_grade, rockGrade: r.rock_grade, iceGrade: r.ice_grade,highPointFt:r.high_point_ft,aidGrade:r.aid_grade,descentText:r.descent_text,protRating:r.prot_rating,rackItems:Array.isArray(r.rack_items)?r.rack_items:null,extraFacts:Array.isArray(r.extra_facts)?r.extra_facts:null,rockQuality:r.rock_quality,fixedGear:r.fixed_gear,wet:r.wet,sun:r.sun,startType:r.start_type,landing:r.landing,pads:r.pads,rock:r.rock,crux:r.crux,difficulty:r.difficulty,pitchDetail:pitchArr(r.pitch_detail),rappelDetail:r.rappel_detail,rappelCountNote:r.rappel_count_note,lists:r.lists,permits:r.permit,
    timing:r.timing, detailedRack:r.detailed_rack, whatToBring:toArr(r.what_to_bring), proTips:toArr(r.pro_tips), watchOut:toWarnArr(r.watch_out), proNeeds:r.pro_needs, bestSeason:r.best_season, beta:(function(){var b=Array.isArray(r.beta)?r.beta.slice():(r.beta?[r.beta]:[]);var p=pitchProse(r.pitch_detail);if(p)b.push(p);return b;})(),
    slingRack: r.sling_rack || null, alpineDraws: r.alpine_draws, ropeType: r.rope_type, ropeLengthM: r.rope_length_m, ropeNote: r.rope_note, ascender: r.ascender, corrections: r.corrections,
    // When somebody last read this route's road/access claims against a primary source — NOT when
    // the row was last written. 0172 adds the column; it is set explicitly by a script that did the
    // checking, never by a trigger or by patchRow, because a mechanical stamp on every write would
    // date a typo fix as a verification. NULL means the age of those claims is unrecorded, which is
    // the honest state for every row written before the column existed.
    accessCheckedAt: r.access_checked_at,
    // `verif` carries the reviewer's verdict ({status, source, updated, confirms}).
    // It was never mapped, so ProvenancePanel fell back to "unverified" for every
    // route and the reviewer flags on known-bad entries were invisible.
    verif: r.verif,
    // `gear_confidence` is the gear audit's verdict on THIS route's rack — 'verified' (275 WA
    // routes) or 'inferred' (159). It was never mapped, so an inferred rack rendered
    // identically to an audited one. Deliberately NOT joined by `auto_generated`: 138 WA
    // routes are auto_generated=true AND gear_confidence=verified, i.e. the audit went back
    // and confirmed them, so treating auto_generated as a caveat would misreport 138 racks a
    // human checked. That column stays plumbing (it is in audit-column-attribution's PLUMBING
    // set), and this one carries the meaning.
    gearConfidence: r.gear_confidence,
    // Enrichment panel fields (migration 0014) — no static-array equivalent, so no gap-fill needed.
    crowds: r.crowds, partnerRequirements: r.partner_requirements, seasonalGuidance: r.seasonal_guidance, seasonalHazards: r.seasonal_hazards, dataQuality: r.data_quality,
    // The reviewed terrain facts (0490): does the NORMAL line in its NORMAL season travel a crevassed glacier, and
    // does it cross snow at all? 'yes' | 'no' | null (not settled). lib/terrain.js reads them before the text.
    glacierTravel: r.glacier_travel || null, snowInSeason: r.snow_in_season || null, snowFreeFrom: r.snow_free_from || null,
    // The embedded parent area (see useAreaRoutes) — shaped like a MOUNTAINS entry so
    // RouteDetail's `MOUNTAINS.find(...)||route._dbArea||{}` fallback works without the
    // area needing a match in the static seed array.
    _dbArea: r.areas ? { id: r.area_id, path: r.areas.path || null, name: r.areas.name, areaType: r.areas.area_type, region: r.areas.region, parentName: r.areas.parent && r.areas.parent.name, chain: areaChainOf(r.areas), stateName: embedStateName(r.areas), lat: r.areas.lat, lng: r.areas.lng, elevation: r.areas.elevation_ft, prominence: r.areas.prominence_ft, avyZone: r.areas.avy_zone, blurb: r.areas.blurb, approach: r.areas.approach || null, approachMin: r.areas.approach_min ?? null, rock: r.areas.rock, rockBasis: r.areas.rock_basis, aspect: r.areas.aspect, parkingLat: r.areas.parking_lat ?? null, parkingLng: r.areas.parking_lng ?? null, parkingName: r.areas.parking_name || null, parkingNote: r.areas.parking_note || null, seasonMonths: Array.isArray(r.areas.season_months) ? r.areas.season_months : null, ancestorSeasonMonths: ancestorSeason(r.areas.parent), ...upCragFacts(r.areas.parent) } : null,
  };
}
