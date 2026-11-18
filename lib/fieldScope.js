/* Which route fields a climber can EDIT, per discipline — one rule, read by the edit sheet (SuggestFix) and by
   the route-page sections that render those fields, so the two cannot drift again.

   Why it exists (owner, 2026-11-18): "I only want to show options for editing that fits the situation or
   discipline." The sheet's old DROP map was written apart from the page's own section gates; measured that day
   (every chip × all 76 fields, page readers traced), a single-pitch sport or trad route was offered Trip shape,
   Published times, Camping & bivy, High point, First winter ascent, Ways in, Climbing route sections, Seasonal
   hazards and the descent/rappel set — none of which its page draws. Competitors agree on the line drawn here:
   Mountain Project, theCrag, OpenBeta and 27 Crags keep a crag ROUTE to its climbing facts (grade, length,
   pitches, bolts, protection, FA/FFA, location on the wall, rack); trip shape is a mountain/hike field (WTA,
   Camptocamp) and time estimates a mountain/big-wall one (SummitPost, SuperTopo).

   `cat` is the discipline the sheet is tailored to: the route's catOf() (so a trad line on a peak is "alpine"),
   or the chip an admin / an unfiled route picked. "hiking" is accepted here although the sheet has no hiking
   chip: SuggestFix passes it for a hiking route, whose page has no length or crux tile.
   `multiPitch` is true when the route (or the pitch count being entered) has more than one pitch.

   Every key in SuggestFix's FIELDS must have an entry; check:edit-scope fails on one that does not, and
   fieldScope() answers false for an unknown key rather than defaulting to "offer it". */

/** The crag disciplines — must equal CRAG_CATS in ClimbMatchCore.jsx (check:edit-scope compares them). */
export const CRAG = ["trad", "sport", "toprope", "aid", "bouldering"];
/** Roped crag disciplines: a crag minus bouldering. */
export const ROCK_CRAG = ["trad", "sport", "toprope", "aid"];
/** The mountain family: the disciplines with a Plan tab (and hiking). */
export const MOUNTAIN = ["alpine", "ice", "mixed", "mountaineering", "scrambling", "hiking"];

const all = () => true;
const inList = (list) => (c) => list.includes(c.cat);
const notIn = (list) => (c) => !list.includes(c.cat);
const mountain = inList(MOUNTAIN);
const crag = inList(CRAG);
/* The descent / rappel / pitch-by-pitch set. A single-pitch crag line is lowered off its anchor, so these
   have no section on its page (owner, 2026-11-18: DESCENT shows on MULTI-pitch sport and trad only). A crag
   line that already STORES one keeps it: its page still shows the value, so it must stay correctable. */
const pitchedSet = (c, k) => mountain(c) || (ROCK_CRAG.includes(c.cat) && (!!c.multiPitch || !!(c.has && c.has[k])));
/** Does the route already store field `k`? (scopeCtx().has) */
const stored = (c, k) => !!(c.has && c.has[k]);

/** @typedef {{cat: string, multiPitch?: boolean, singlePitch?: boolean, cragPin?: boolean, has?: Record<string, boolean>}} ScopeCtx */
/** @type {Record<string, (c: ScopeCtx, k: string) => boolean>} */
export const FIELD_SCOPE = {
  // ── every discipline ──
  name: all, grade: all, fa: all, altNames: all, variations: all, rock: all, aspect: all, season: all,
  seasonalGuidance: all, climate: all, haz: all, watchOut: all, overview: all, beta: all,
  road: all, access: all, permit: all, permitUrl: all, approach: all, comms: all, emergency: all,
  crowds: all, partnerRequirements: all,
  /* OVERLAPPING FIELDS, merged into one editor each (owner, 2026-11-18): each of these renders into the same
     slot as the field named beside it, so a climber was asked the same thing twice. New text goes to the one
     editor; a route that already STORES the old field keeps its editor, because the page still shows that value
     (1,000+ routes hold pro tips and a when-to-go note, 220 a rappel count note — not migrated, so nothing is
     lost and nothing is bulk-written).
       proTips    → beta              (short beta already prints as PRO TIPS; one pencil opened both)
       bestSeason → seasonalGuidance  (enrichRoute already promotes it to the Best window when that is empty) */
  proTips: (c, k) => stored(c, k),
  bestSeason: (c, k) => stored(c, k),

  // ── basics ──
  ffa: notIn(["sport", "toprope", "bouldering"]),
  fwa: mountain,
  highPointFt: mountain,
  length: notIn(["mountaineering", "hiking"]),
  /* Crux grade: only where a route has pitches to differ (unchanged rule), and not on the two pages whose
     TechStats branch draws no crux tile. */
  crux: (c) => !c.singlePitch && !["mountaineering", "hiking", "bouldering"].includes(c.cat),
  location: crag, rockQuality: crag, wet: crag, sun: crag,
  rockGrade: mountain, iceGrade: mountain, face: mountain,
  alpineGrade: inList(["alpine", "mountaineering", "ice", "mixed"]),
  commit: (c) => mountain(c) || c.cat === "aid",
  aidGrade: inList(["aid", "alpine"]),
  pitchCount: inList(["trad", "sport", "alpine", "ice", "mixed", "aid", "mountaineering"]),

  // ── protection & gear ──
  protRating: inList(["trad", "sport", "aid", "alpine", "ice", "mixed"]),
  bolts: inList(["sport", "trad", "aid"]),
  anchor: inList(ROCK_CRAG),
  fixedGear: inList(["trad", "aid", "sport"]),
  ropeLen: inList(["trad", "sport", "alpine", "ice", "mixed", "aid", "mountaineering"]),
  ropeType: inList(["trad", "sport", "alpine", "ice", "mixed", "aid", "mountaineering"]),
  ropeNote: notIn(["toprope", "bouldering"]),
  draws: inList(["sport", "trad", "mixed", "aid"]),
  alpineDraws: inList(["trad", "aid", "alpine", "mixed"]),
  screws: inList(["ice", "mixed"]),
  /* Bouldering and sport edit their own count instead (pads, draws) — CragRack's pencil opens those. */
  rack: notIn(["bouldering", "sport"]),
  /* GEAR & ESSENTIALS is mounted off CRAG_CATS only (owner 2026-10-21). */
  whatToBring: mountain,
  climbingRoute: mountain,
  pitchDetail: pitchedSet,

  // ── bouldering ──
  landing: inList(["bouldering"]), pads: inList(["bouldering"]), startType: inList(["bouldering"]),

  // ── approach, descent & camping ──
  /* Aid walls always show DESCENT (their page has, since before 2026-11-11); sport, trad and top-rope only
     when multi-pitch. */
  descentText: (c, k) => c.cat === "aid" || pitchedSet(c, k),
  /* rappelCountNote → rappelDetail: the note prints only INSIDE the station-by-station table, so the table is
     where a rappel count is told; the note stays editable where one is stored. */
  rap: pitchedSet, rappelDetail: pitchedSet, rappelCountNote: (c, k) => pitchedSet(c, k) && stored(c, k),
  dist: mountain, gain: mountain, loss: mountain, angle: mountain,
  approachVariants: mountain,
  /* A crag route's parking is the CRAG's pin (owner, 2026-11-18; areas.parking_*, 0378): the crag parking
     card edits it in the area's own editor, and one edit fills every route at that crag — as Mountain
     Project and theCrag hold parking on the crag. So a crag route offers no route waypoints, unless its
     crag cannot be edited (no catalog area, or one the area page does not edit), where the route pin is
     the only way to set parking — or the route already STORES its own pin, which trailheadPoint() shows
     ahead of the crag's, so it must stay correctable (the card's pencil opens it). The directions line
     follows: kept where the route stores one. */
  waypoints: (c) => mountain(c) || !c.cragPin || !!(c.has && c.has.waypoints),
  approachLogistics: (c) => mountain(c) || !c.cragPin || !!(c.has && c.has.approachLogistics),
  /* CAMPING & BIVY lives on the Plan tab. Follows the discipline the sheet is tailored to, not the route,
     so the crag "Parking spot" label and the camp editor never show together. */
  bivy: inList(["alpine", "mountaineering", "scrambling", "ice", "mixed"]),

  // ── conditions & logistics ──
  /* condWindow → seasonalGuidance: an overlay with no routes column, saying when conditions are in — what the
     Best window says. Kept where one is stored. */
  condWindow: (c, k) => inList(["alpine", "mountaineering", "ice", "mixed"])(c) && stored(c, k),
  objHaz: mountain,
  seasonalHazards: mountain,
  /* Trip shape, Published times and the Trip plan are planner facts; a crag page has no Plan tab, and no
     competitor offers them on a crag route. */
  outingShape: mountain, timing: mountain, itinerary: mountain,
};

/**
 * Is field `k` offered for editing on a route of this discipline?
 * @param {string} k
 * @param {ScopeCtx} ctx
 * @returns {boolean}
 */
export function fieldScope(k, ctx) {
  const rule = FIELD_SCOPE[k];
  return rule ? !!rule(ctx, k) : false;
}

/** @param {unknown} v */
const _filled = (v) => Array.isArray(v) ? v.length > 0 : (v != null && String(v).trim() !== "");

/**
 * The scope context for a route, from its discipline category (catOf, or the sheet's chip) and its stored
 * fields. `pitchCount` overrides the stored pitch count (the sheet passes the one being typed).
 * @param {any} route
 * @param {string} cat
 * @param {number | null} [pitchCount]
 * @returns {ScopeCtx}
 */
export function scopeCtx(route, cat, pitchCount) {
  const r = route || {};
  const n = pitchCount != null && !Number.isNaN(pitchCount) ? pitchCount : (r.pitches != null ? Number(r.pitches) : null);
  const al = r.approachLogistics || {};
  return {
    cat,
    multiPitch: n != null && n > 1,
    singlePitch: cat === "bouldering" || (n != null && n <= 1),
    cragPin: CRAG.includes(cat) && cragAreaEditable(r),
    has: {
      descentText: _filled(r.descentText) || _filled(r.descent), rap: _filled(r.rappels), rappelDetail: _filled(r.rappelDetail),
      rappelCountNote: _filled(r.rappelCountNote), pitchDetail: _filled(r.pitchDetail),
      proTips: _filled(r.proTips), bestSeason: _filled(r.bestSeason), condWindow: _filled(r.condWindow),
      approachLogistics: _filled(al.trailheadDirection), waypoints: _filled(r.waypoints),
    },
  };
}

/** The area types whose page lets climbers edit them (AreaSuggestFix). */
export const EDITABLE_AREA_TYPES = ["crag", "wall", "peak"];

/**
 * Can this route's own catalog area be edited in the area editor? RouteDetail's crag-wide facts
 * (`areaFactEdit`) and the crag parking card open it; the sheet then stops offering the route-level copy.
 * @param {any} route
 * @returns {boolean}
 */
export function cragAreaEditable(route) {
  const a = route && route._dbArea;
  return !!(a && a.id && EDITABLE_AREA_TYPES.includes(a.areaType));
}
