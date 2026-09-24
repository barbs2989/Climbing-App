/* IS THIS A WAY TO DRIVE TO THE TRAILHEAD, OR A DESCRIPTION OF THE WALK FROM IT?

   approach_logistics.trailheadDirection renders in the TRAILHEAD card (RouteDetail.jsx), directly
   under the trailhead's name and beside "Drive here", and the contribute form labels it "Driving
   directions". On 2026-09-24, 230 routes carried the WALK there instead: "From Slate Pass at the end
   of Harts Pass Road: backpack ~13 miles via the Whistler Cutoff", "South side from Paradise: Skyline
   Trail to the Muir Snowfield and Camp Muir", a bare "North", and two strings cut off mid-sentence.
   The column was populated, so every coverage guard read it as done. Its SHAPE was the defect.

   THE RULE: the value ENDS AT THE TRAILHEAD. It may name the trail you start on ("via Trail #677").
   It may not say where that trail goes, how far or how long it is on foot, what you cross, or what
   terrain you reach, and it must name somewhere you can drive to. The walk belongs in `approach`.

   Returns a short reason, or null when the value is fine. It is a deny-list over English, which
   docs/guards/ warns is the weak kind of test, so it is held to a MEASURED corpus rather than to
   intuition: scripts/trailhead-directions-reviewed.json is every distinct live value on 2026-09-24,
   each read by hand, and check:trailhead-direction-shape fails unless this function agrees with every
   verdict in BOTH directions. Agreement with that corpus is not proof on new prose; a phrasing none
   of those values used can slip it. That is why the live scan runs daily too, and why a new miss
   goes INTO the corpus with its verdict before the rule is widened to catch it. */
const ROAD = String.raw`\b(?:drive|driving|road|rd|roads|highway|hwy|street|exit|milepost|mile|fr|fs|sr|us|nf|wa|i|county|spur|ferry|shuttle)\b|\b(?:FR|FS|SR|US|NF|WA|I|CR)[- ]?\d`;
const ROAD_RE = new RegExp(ROAD, "i");
const DRIVE_TARGET = /\b(trailheads?|trail head|parking|park|parked|pullouts?|turnouts?|lot|campground|road|rd|highway|hwy|gate|gated|lodge|visitor center|ranger station|ferry|shuttle|sno-park|drive|exit|milepost|washout|picnic area|overlook|village|landing|bridge)\b|\b(SR|US|I|FR|FS|NF|WA)[- ]?\d/i;
// Place names that contain a terrain word but are somewhere you DRIVE: the town of Glacier, WA,
// its Public Service Center, Glacier Creek Road, the Nooksack Cirque and Climbers Bivouac trailheads.
const PLACE_NAMES = /\bGlacier,? WA\b|\bFrom Glacier\b|\bGlacier Public Service Center\b|\bGlacier Creek (Road|Rd)\b|\bClimbers Bivouac trailhead\b/gi;
// Split on ", " (comma SPACE) so an elevation like 5,050 ft stays one clause.
const clauses = t => t.split(/[;:—()]|, | - /);
// The text after a trail's "then", or null. A "then" that goes on to a ROAD or a TRAILHEAD is still
// driving ("turn at the Snowgrass Trail sign onto FR 2150, then follow signs to the trailhead").
const afterThen = t => { const m = t.match(/\b(trail|trails|path)\b(?!head)[^.;]*\bthen\b([^.;,]*)/i); return m ? m[2] : null; };
const RULES = [
  ["a compass bearing, not directions", t => /^(north|south|east|west)[\w/-]*\b/i.test(t) && !/\bdrive\b/i.test(t) && (t.length < 40 || /^(north|south|east|west)[\w/-]*\s*[(,;]/i.test(t))],
  ["a compass bearing, not directions", t => /^(north|south|east|west)[\w/-]*( side)?\s+(from|via|up|to|through|side of)\b/i.test(t) && !/\bdrive\b|\bhighway\b|\b(FS|Forest) Road\b/i.test(t)],
  ["cut off mid-sentence", t => /\b(Mt|St|Rd|Hwy|approx|Ft)\.?$/.test(t) || /[,:—–-]$/.test(t) || /\b(and|or|the|to|via|of|at|then|runs|follow the trail)$/i.test(t)],
  ["names nowhere to drive to", t => !DRIVE_TARGET.test(t)],
  ["an on-foot distance", t => {
    const m = t.match(/\b(trail|path|hike|hiking|backpack\w*|walk|road-walk|bike)\b([^.;:]{0,70}?)(~|about |roughly |approximately )?\d+(\.\d+)?(\s*[-–]\s*\d+(\.\d+)?)?\+?\s*(mi|miles?)\b([^.;]{0,40})/i);
    if (m && !ROAD_RE.test(m[2]) && !/^\s*(to|from) the [\w\s'-]*trailhead\b/i.test(m[8]) && !/\bto the [\w\s'-]*trailhead\b/i.test(m[8])) return true;
    return /(~|about |roughly )?\d+(\.\d+)?\+?\s*(mi|miles?)\b\s+(up|along|of|on)\s+(the\s+)?[\w\s/'-]{0,40}\b(trail|logging roads and ridge)/i.test(t)
      || /\b(about|roughly) a mile\b|\bat \d+(\.\d+)? miles?\b|\b\d+ yards (through|up|along)\b/i.test(t);
  }],
  ["an on-foot time", t => /\b\d+(\s*[-–]\s*\d+)?\s*(minutes?|min)\b/i.test(t) && !/\bdrive\b/i.test(t)],
  ["travel beyond the trailhead", t => /\b(backpack\w*|bushwhack\w*|wad(e|ing)|ford(s|ed|ing)?|cross-country|off-trail|traverse|traversing|rappel\w*|glissad\w*|ascend\w*|descend\w*|contour\w*|true-(right|left)|leave the trail|no trail|no maintained trail)\b/.test(t) || /^(Backpack|Bushwhack|Traverse|Ascend|Descend)\b/.test(t)],
  ["travel beyond the trailhead", t => /\bhike\b(?![- ]in\b| itself)/i.test(t) || /\b(short|direct) walk\b|\bwalk the road\b|\bwalk back\b/i.test(t) || /\bon logs\b|\blog crossing\b|\bcross the footbridge\b|\btrail bridge\b/i.test(t)],
  ["travel beyond the trailhead", t => { const a = afterThen(t); return a != null && !ROAD_RE.test(a) && !/\btrailhead\b/i.test(a); }],
  ["travel beyond the trailhead", t => { const m = t.match(/\bthen (north|south|east|west|right|left)\b(?! on\b| onto\b)([^.;]*)/i); return !!m && !/\bdrive\b/i.test(t) && !ROAD_RE.test(m[2]); }],
  ["travel beyond the trailhead", t => /\bTrails?\b(\s*(#|No\.?)\s*[\d.]+)?\)?\s+(to|toward|towards|over|past)\s+(?!the climbers'|the unsigned|the [\w\s-]*junction|the [\w\s-]*trailhead|the fork)/i.test(t)],
  ["travel beyond the trailhead", t => clauses(t).some(c => /\b(over|via|into|through|to)\b[\w\s.'&/-]{0,45}\b(Pass|Gap|Enchantments|Meadows|Basin|Lake)\b(?!\s+[A-Z]|\s*(Trailhead|Road|Rd|Highway|Hwy|trailhead|Campground|Trail\b|Ranger|Visitor|fork))/.test(c) && !ROAD_RE.test(c) && !/\btrailhead\b|\bwater[- ]taxi\b/i.test(c))],
  ["terrain beyond the trailhead", t => { const u = t.replace(PLACE_NAMES, ""); return /\b(couloir|snowfield|moraine|bivy|bivouac|high camp|base camp|glacier camp|a camp at|camp muir|to the base|the base of|base of the|switchback trail|talus|scree|boulder field|upper bench)\b/i.test(u) || /\b[A-Z][\w-]+ Glacier\b(?! (Creek|Road|Rd|Basin Trail|Peak|Meadows))/.test(u) || /\bglaciers?\b/.test(u) || /\b[A-Z][\w-]+ Col\b|\bcol\b/.test(u); }],
  ["travel beyond the trailhead", t => /\b(dropping|drops|climbs steadily|climbs steeply)\b/i.test(t) || /\bfrom (the )?trailhead\s*[:,]/i.test(t) || /\bthe approach (runs|goes|continues)\b/i.test(t)],
  ["an approach, not a way to the trailhead", t => /\b(multi-day|two-day|three-day|car-to-summit|car-to-car)\b|\bno (dedicated|independent|short) (trailhead|start)\b|\bthere is no trail\b|\breached only by\b|\bestablished approaches\b|\bgive access\.?$|\bsame [\w\s]+ approach\b|\bas for the [\w\s]+route\b/i.test(t)],
];
export function trailheadDirectionProblem(s) {
  if (s == null) return null;
  const t = String(s).replace(/\s+/g, " ").trim();
  if (!t) return null;
  for (const [why, test] of RULES) if (test(t)) return why;
  return null;
}
