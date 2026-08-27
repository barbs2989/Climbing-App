// The sub-key lists for the three jsonb objects a climber can fill in: road, access, timing.
//
// They live here rather than in RouteDetail.jsx because BOTH forms need them now — SuggestFix
// (which edits an existing route) and AddRoute (which proposes a new one). ClimbMatchCore
// cannot import RouteDetail: that file is lazy-loaded and already imports FROM core, so a
// static import would both cycle and drag the route page into the main bundle. Same reasoning
// that moved the rack helpers into lib/rack.js.
//
// EACH ENTRY IS [key, label, placeholder] and the KEY IS NOT A GUESS — it is the key the
// panel's own reader looks at, and where a reader accepts more than one spelling this writes
// the CANONICAL one:
//
//   * `access` carries TWO land-manager spellings — `land_manager` on 399 of 400 sampled rows
//     and `landManager` on 8. Display reads `ac.land_manager||ac.landManager`, so writing the
//     canonical one shows immediately AND leaves any legacy value in place as the fallback it
//     already is.
//   * Seasonal closures render as `ac.closures||ac.closure||ac.seasonal`; this writes
//     `closures`, first in that chain.
//   * `road` is single-convention camelCase throughout — name / driveNote / status /
//     seasonalGate.
//
// TIMING_KEYS carries a fourth element, "num", marking the fields that are hours rather than
// prose. check:contrib-fields reads these lists and fails ANCHOR LOST if a name moves.

export const ROAD_KEYS=[["name","Road / access point","e.g. Cascade River Road"],["driveNote","Drive notes","e.g. last 4 mi rough, high clearance helps"],["status","Road status","e.g. Open, Seasonal, Washed out"],["seasonalGate","Seasonal gate","e.g. gated at MP 18 until late June"]];

export const ACCESS_KEYS=[["land_manager","Land manager","e.g. Mt. Baker-Snoqualmie NF (Skykomish RD)"],["parking_pass","Parking / entrance","e.g. Northwest Forest Pass at the trailhead"],["permit","Permit","e.g. None required / overnight permit needed"],["passRequired","Pass required","e.g. NPS backcountry permit"],["fees","Fees","e.g. None, or $5 per vehicle per day"],["closures","Seasonal closures","e.g. road gated Nov–May"],["rules","Rules & limits","e.g. bear canisters required in some camps"],["group_limit","Group size limit","e.g. 12"],["notes","How to apply","e.g. recreation.gov, released 2 weeks ahead"]];

export const TIMING_KEYS=[["totalHrs","Car-to-car total (hrs)","e.g. 11.5","num"],["approachTimeHrs","Approach (hrs)","e.g. 3","num"],["summitTimeHrs","To the summit (hrs)","e.g. 8","num"],["descentTimeHrs","Descent (hrs)","e.g. 3.5","num"],["recommendedStart","Recommended start","e.g. 5:00 AM from camp"]];

/* FIVE MORE OBJECTS, added because a climber could SEE all of them on the route page and correct
   none of them — the `bivy` shape, which rendered on ~380 routes with no way to fix a word.
   Same rule as above and it is the whole reason these live here: EVERY KEY BELOW IS THE KEY THE
   PANEL'S OWN READER DESTRUCTURES, read out of the component rather than guessed.

     CrowdsPanel                const {estimatePerSeason, peakTraffic, solitudeRating} = route.crowds
     PartnerRequirementsPanel   const {experienceLevel, fitnessSpec, requiredSkills, approachTime} = ...
     SeasonalGuidancePanel      const {optimalWindow, monthBreakdown} = route.seasonalGuidance
     EmergencyRescueCard        em.sheriffDispatch / em.rangerStation / em.nearestHospital /
                                em.county / em.notes

   TWO DELIBERATE OMISSIONS, so nobody reads these lists as the whole object:

   `monthBreakdown` is a MAP of month -> {status, reason}, not a flat key, so it needs a nested
   editor rather than a text row. `optimalWindow` is the panel's headline and is offered; a block
   holding only monthBreakdown reads as "—", which is correct — there is nothing flat for a
   climber to confirm. Same behaviour ACCESS_KEYS already documents for its unoffered keys.

   `approachLogistics` offers the trailhead NAME and its written directions and NOT
   trailheadLat/trailheadLng. A coordinate is not prose: this repo has a whole audit
   (audit:trailhead-agreement) about the two trailhead records disagreeing, a rule that a
   trailhead pin must never be manufactured from the logistics copy, and a dedicated
   GpsSubmissionModal for submitting real coordinates. A free-text lat/lng box would feed that
   exact defect from a third direction. */
/* solitudeRating IS A NUMBER 1-5 in the column, not a phrase — measured across the 499 populated
   routes: 219x 5, 141x 4, 84x 3, 42x 2, 12x 1. So it gets a PICKER whose values are those exact
   numbers. That is the whole point of reading the data before writing an option list: a text box
   here invited a sentence into a field holding a 1-5 rating, and a sentence can never cluster
   anyway (three people never type the same one, so the 3-agree gate is unreachable).

   The other two stay TEXT and that is a measurement too, not laziness: estimatePerSeason is 490
   distinct values over 498 rows and peakTraffic 495 over 505 — 98% unique both. They are genuinely
   open-ended ("unknown - low-traffic; likely well under 20 parties per season"), so an option list
   would either mismatch the stored data or throw most of it away. */
export const CROWDS_KEYS=[["estimatePerSeason","Parties per season","e.g. a handful of parties a year"],["peakTraffic","Busiest times","e.g. July weekends"],["solitudeRating","Solitude","","enum",[[5,"5 — you will likely be alone"],[4,"4 — rarely see another party"],[3,"3 — a party or two about"],[2,"2 — usually company"],[1,"1 — busy, expect queues"]]]];

/* fitnessSpec is an OBJECT on 473 of 504 populated routes, and two keys carry it: `hiking` (460)
   and `packWeight` (455). The rest is a one-off tail. So it is offered as those two DOTTED rows
   rather than one text box, which would have offered to replace a structured fact with a sentence.
   experienceLevel / requiredSkills / approachTime measured 100%, 100% and 99% unique — genuinely
   prose, and left as prose. */
export const PARTNER_KEYS=[["experienceLevel","Experience needed","e.g. comfortable leading 5.8 alpine rock"],["fitnessSpec.hiking","Hiking pace / distance","e.g. 3,000 ft of gain at 1,000 ft/hr"],["fitnessSpec.packWeight","Pack weight","e.g. 35-40 lb for an overnight"],["requiredSkills","Skills","e.g. crevasse rescue, running belays"],["approachTime","Approach time","e.g. 4-5 hrs to high camp"]];

export const SEASONAL_KEYS=[["optimalWindow","Best window","e.g. mid-July to early September"]];

export const EMERGENCY_KEYS=[["sheriffDispatch","Dispatch / ranger","e.g. Chelan County Sheriff 509-667-6851"],["rangerStation","Ranger station","e.g. Leavenworth Ranger Station"],["nearestHospital","Nearest hospital","e.g. Cascade Medical, Leavenworth"],["county","County","e.g. Chelan County"],["notes","Notes","e.g. no cell service until the pass"]];

export const LOGISTICS_KEYS=[["trailhead","Trailhead name","e.g. Stuart Lake Trailhead (FS 7601)"],["trailheadDirection","Driving directions","e.g. Icicle Creek Rd 8.4 mi, right on FS 7601"]];

/* The five axes DiffRadar plots, and the best-behaved field in this sweep: 8,029 routes carry
   `difficulty`, every axis is an INTEGER 1-5 with exactly five distinct values across 8,028
   populated rows, and no key outside these five exists. So every row is a PICKER — three climbers
   choosing 4 are byte-identical, which is the only way the 3-agree gate is reachable.

   The scale wording is shared rather than per-axis because the column stores a bare number and the
   radar plots it on one 1-5 ring; inventing five different vocabularies would imply a precision
   the data does not carry. */
const DIFF_SCALE=[[1,"1 — low"],[2,"2 — moderate"],[3,"3 — high"],[4,"4 — serious"],[5,"5 — extreme"]];
export const DIFFICULTY_KEYS=[
  ["physical","Physical","","enum",DIFF_SCALE],
  ["technical","Technical","","enum",DIFF_SCALE],
  ["exposure","Exposure","","enum",DIFF_SCALE],
  ["commitment","Commitment","","enum",DIFF_SCALE],
  ["routefinding","Route-finding","","enum",DIFF_SCALE]];
