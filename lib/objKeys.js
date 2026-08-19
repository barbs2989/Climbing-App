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
