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
export const CROWDS_KEYS=[["estimatePerSeason","Parties per season","e.g. a handful of parties a year"],["peakTraffic","Busiest times","e.g. July weekends"],["solitudeRating","Solitude","e.g. High — you will likely be alone"]];

export const PARTNER_KEYS=[["experienceLevel","Experience needed","e.g. comfortable leading 5.8 alpine rock"],["fitnessSpec","Fitness","e.g. 4,000 ft of gain with a heavy pack"],["requiredSkills","Skills","e.g. crevasse rescue, running belays"],["approachTime","Approach time","e.g. 4-5 hrs to high camp"]];

export const SEASONAL_KEYS=[["optimalWindow","Best window","e.g. mid-July to early September"]];

export const EMERGENCY_KEYS=[["sheriffDispatch","Dispatch / ranger","e.g. Chelan County Sheriff 509-667-6851"],["rangerStation","Ranger station","e.g. Leavenworth Ranger Station"],["nearestHospital","Nearest hospital","e.g. Cascade Medical, Leavenworth"],["county","County","e.g. Chelan County"],["notes","Notes","e.g. no cell service until the pass"]];

export const LOGISTICS_KEYS=[["trailhead","Trailhead name","e.g. Stuart Lake Trailhead (FS 7601)"],["trailheadDirection","Driving directions","e.g. Icicle Creek Rd 8.4 mi, right on FS 7601"]];
