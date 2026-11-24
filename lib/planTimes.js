// The Planner's time maths, in ONE place: the Planner tab renders it, and the Conditions tab's
// alpine start counts back from it ("off the snow before it softens" needs the time UP and the time
// DOWN). Two readers of one estimate is the shape that drifted everywhere else on the route page
// (see lib/outing.js), so neither may compute it for itself.
import { scarfHrs, techHrs, gn } from "../ClimbMatchCore.jsx";
import { effDistKm, effDistIsWholeTrip, isMultiDayOuting } from "./outing.js";

/* A STORED SUMMIT LEG THAT INCLUDES THE DESCENT. 94 rows store "Summit push and full descent" in
   summitTimeHrs: approach + summit = total and no descent figure, so the summit leg is the round trip
   from camp. Across the 253 rows that store all three legs, the summit leg's median share of
   summit + descent is 0.59 (measured 2026-10-07), so that share is the way up. */
export const SUMMIT_SHARE_OF_PUSH = 0.59;
/* A multi-day route's walk in and walk out within this share of each other, beside a stored summit
   leg, is the summit DAY from camp (see planTimes below). */
export const CAMP_LEG_MATCH = 0.35;
/* Ten minutes of stops for each hour of modelled moving time: 1/6. Published guides put it at 5-12
   min/hr (Bergfreunde 5-10, DNT 12, Walkhighlands 10, RMI and Northwest Alpine Guides 10 min each hour). */
export const REST_PER_MOVING_HR = 1 / 6;

/* Returns hours, plus the flags the Planner's tiles and the alpine start need. `depart` is a clock
   hour of the departure day; sumH and retH are absolute hours from that midnight and UNBOUNDED (a
   value past 24 is the next day -- the Planner's fmt() and dayOf() read it that way). */
/* A PITCH COUNT OF 1 BESIDE MORE THAN 100 M OF CLIMB IS NO PITCH COUNT. Slipstream stores 1 pitch on a
   909 m route (about 6 ice pitches and long simul ground, 7.5 hr of climbing in the reports), so the
   Planner printed "Climbing 0.6 hr" -- "unknown" counted as "none" on the leg that matters, the same
   defect as a missing count (see climbKnown below). Measured 2026-10-08 on the catalog's ice and mixed
   rows with both a count and a length: 6,098 rows, 61 m per pitch at the 90th percentile and 76 m at the
   95th, and 247 rows above 100 m per pitch, 197 of them a count of 1 with no stored time (175 ice, 22
   mixed; aid adds 19). A rope does not reach 100 m, so ONE pitch is never that long: the 1 is a
   placeholder, and it says nothing about how long the climbing takes. Such a route is read exactly as
   one with NO pitch count: the Climbing tile reads N/A and the totals carry the "≥".
   ONLY A COUNT OF 1. A larger count beside a long length (p12 on 4,000 ft) can be right, because a
   route's length includes the scrambling and simul ground between its pitches; those counts may be
   undercounts, but no rule can tell, so they are left as stored (about 50 ice and mixed rows). */
export const MAX_PITCH_FT = 330;

/* CLIMBING ALWAYS IN THE TOTAL (owner rule, 2026-10-30). Where a climbing route has no pitch count, its
   length says roughly how much rope it takes: the count is the length over one pitch of the planner's
   own 35 m default, at least one. Only the disciplines whose point is the climbing are read this way (a
   walk-up or a scramble has no pitch count to estimate). The Total built on it stays "≥": the pitch count
   is an estimate, so the number is a floor with the climb in it, not a measured day. */
const CLIMB_DISCIPLINES = /^(alpine|ice|mixed|trad)\b/i;
/* ...AND THAT ESTIMATE IS CAPPED, BECAUSE A LONG ROUTE IS NOT PITCHED END TO END (owner, 2026-11-23: do it
   "based on research"). Against the 202 routes that publish a climb leg beside a length
   (scripts/oneoff/measure-length-pitch-estimate.mjs), published climbing hours barely grow with length --
   median 8.5 hr at 300-800 m, 9 hr past 800 m -- while length / 35 m grows without limit: the estimate ran
   1.35x the published leg at 500-800 m and 2.55x past 800 m, ABOVE it on 45 of 57 routes past 500 m, so
   the "≥" claimed a floor it was not (Slipstream 18.6 hr against about 7.5, Mount Despair 21.9). 6 hr is
   the 25th percentile of the published leg on routes of 300 m and more; capped there the estimate is at or
   under the published leg on 173 of 202 (was 128) and on 48 of 57 long routes (was 12), so the "≥" holds.
   Below the cap nothing moves: short routes already estimate under their published leg (0.34x under 150 m). */
export const LENGTH_CLIMB_MAX_H = 6;
export function climbPitches(route) {
  const p = realPitches(route);
  if (p > 0) return p;
  if (route && route.pitches == null && route.routeFt > 0 && CLIMB_DISCIPLINES.test(route.discipline || "")) {
    return Math.max(1, Math.round(route.routeFt / (35 * 3.28084)));
  }
  return 0;
}
export function realPitches(route) {
  const n = route && route.pitches;
  if (!(n > 0)) return 0;
  return n === 1 && route.routeFt != null && route.routeFt > MAX_PITCH_FT ? 0 : n;
}

/* WHICH DAY OF THE TRIP PLAN IS THE SUMMIT DAY (0-based count of the days before it). Since the
   one-total rule (2026-11-18) the stored approach IS the hours of the days before the summit day, so
   the summit day is the one the walk-in hours end at; with no approach or no day hours, it is day 2.
   ONE definition, read by the camp rule below and by summitDayPlan, so the two cannot disagree. */
export function summitDayIndex(route, approachH) {
  const days = route && route.itinerary && Array.isArray(route.itinerary.days) ? route.itinerary.days : [];
  const n = days.length;
  let k = 1;
  const hrs = days.map((d) => (d && typeof d.hours === "number" ? d.hours : null));
  if (n > 1 && approachH != null && hrs.every((h) => h != null)) {
    let best = Infinity;
    for (let i = 1, cum = 0; i < n; i++) { cum += hrs[i - 1]; const gap = Math.abs(cum - approachH); if (gap < best - 1e-9) { best = gap; k = i; } }
  }
  return { k, n, hrs };
}

export function planTimes(route, opts) {
  const o = opts || {};
  const fit = o.fit || "intermediate", pack = o.pack != null ? o.pack : 10, party = o.party != null ? o.party : 2, depart = o.depart != null ? o.depart : 6;
  const tm = route.timing || null;
  const hasPublishedSummitH = !!(tm && tm.summitTimeHrs != null);
  const derivedSummitH = (!hasPublishedSummitH && tm && tm.totalHrs != null) ? Math.max(0, tm.totalHrs - (tm.approachTimeHrs || 0) - (tm.descentTimeHrs || 0)) : null;
  const hasDerivedSummitH = derivedSummitH != null && derivedSummitH > 0;
  // scarfHrs() coerces a missing distance or gain to 0, so a route with neither
  // reported "0.0hr Approach / 0.0hr Total" and a return time equal to the
  // departure minute -- a multi-day Olympic approach shown as summiting at 6:00 AM.
  // A published summit time that equals the published total, with no separate
  // approach figure, is a car-to-car number: the whole day already. Adding a
  // separate approach estimate to it double-counts the walk in.
  // So is a published total with NO legs at all: derivedSummitH then equals the whole
  // total, and the walk in was stacked on top -- 32 rows (Mastiff's 8.5 hr day put the
  // summit some 13 hr out). Measured 2026-10-01.
  const publishedIsWholeDay = !!(tm && tm.totalHrs != null && tm.approachTimeHrs == null && (tm.summitTimeHrs != null ? tm.summitTimeHrs === tm.totalHrs : tm.descentTimeHrs == null));

  /* THE HIKE LEG READS effDistKm, NOT THE RAW COLUMN. lib/outing.js exists because two SCREENS
     answered "how far is the approach" differently; `dist_km` holds two conventions at once and
     CLAUDE.md forbids normalising it in bulk, so the reader picks the source instead. With no
     itinerary of its own a route gets the stored column back untouched. A recorded loop or
     point-to-point holds the WHOLE outing in its distance, so each leg below walks half.

     THE WALK IS TWO LEGS: UP BEFORE THE SUMMIT, DOWN AFTER IT. One scarfHrs() used to charge gain
     AND loss before the summit, so the descent was walked on the way UP: Est. summit ran late and on
     gain≈loss rows Est. summit and Est. return were the SAME time, and a pitched route's return had
     no walk out at all.
       up   = distance + GAIN only.
       down = distance + max(gain, loss). loss_ft holds two conventions (the descent to the car, or
              only the dips on the way in -- 545 ft on a 6,266 ft Hozomeen climb), and a party back
              at its car has dropped at least what it climbed, so the larger one is used. */
  const _walkKm = effDistIsWholeTrip(route) && effDistKm(route) != null ? effDistKm(route) / 2 : effDistKm(route);
  /* ...AND THE GAIN READS THE SAME PLACE THE LEG CARD DOES (routeAscentFt: the gain column, else the trip
     plan's day gains). The miles already came from the trip plan while the gain did not, so 68 routes
     printed "↑ 4,600 ft" on TRAILHEAD TO SUMMIT and walked it flat: Mount Ballard's East Face, 3.5 mi and
     4,600 ft, read a 1.5 hr approach under a note saying no gain was on file (owner, 2026-11-23, "make
     sure it's all showing and consistent"; scripts/oneoff/measure-full-trip-time-legs.mjs). */
  const _blank = (v) => v == null || v === "";
  const _planGainFt = route.itinerary && Array.isArray(route.itinerary.days) ? route.itinerary.days.reduce((a, d) => a + ((d && d.gainFt) || 0), 0) : 0;
  const walkGainM = !_blank(route.gainM) ? route.gainM : _planGainFt > 0 ? Math.round(_planGainFt / 3.28084) : null;
  const walkKm = _walkKm != null && _walkKm !== "" ? _walkKm : null;
  const walkUpH = scarfHrs(_walkKm, walkGainM, 0, fit, pack);
  const walkDownH = scarfHrs(_walkKm, 0, Math.max(route.lossM || 0, walkGainM || 0), fit, pack);

  /* A ROUTE'S OWN STORED LEGS WIN OVER THE WALK MODEL, because the walk model charges the WHOLE
     car-to-summit gain on the way in and a stored summit leg then charges the top of it AGAIN:
     Easton read 17 hr to the summit. Checked against ONLINE trip-report times, route by route
     (2026-10-07, 27 routes, model ÷ online):
       time to summit  walk + stored summit 1.6x (28% within 0.8-1.25x)  ->  stored approach + stored summit 1.2x
       descent         stored descent 0.8x, 14 of 23 SHORT               ->  the longer of stored and walked 1.0x, 4 short
     The stored descent alone ran short, and a short descent is the dangerous error (soft snow,
     tired legs, and the alpine start counts back from it), so the descent is the LONGER of the two.
     A stored summit leg already covers its rappels, so 0.7 x climb is added only to a modelled climb.
     A stored approach is used only beside a stored or derived summit leg -- the pair is one
     convention -- never on its own beside a modelled climb. */
  const legsStored = hasPublishedSummitH || hasDerivedSummitH;
  const pushInclDescent = hasPublishedSummitH && tm.approachTimeHrs != null && tm.descentTimeHrs == null && tm.totalHrs != null && Math.abs(tm.approachTimeHrs + tm.summitTimeHrs - tm.totalHrs) < 0.01;
  const storedApproachH = legsStored && tm.approachTimeHrs != null ? tm.approachTimeHrs : null;
  const storedDescentH = legsStored && tm.descentTimeHrs != null ? tm.descentTimeHrs : null;
  /* A STORED SUMMIT LEG CAN HOLD THE WAY DOWN TOO. Three stored shapes do:
       push     approach + summit = total and no descent (94 rows): "Summit push and full descent".
       derived  only an approach and a total (13 rows): total - approach is the climb AND the descent.
       camp     a MULTI-DAY outing whose walk in and walk out agree within CAMP_LEG_MATCH, beside a
                stored summit leg (174 rows): the summit leg is the summit DAY, a round trip from camp
                (Devore 6 / 11 / 5). On a single-day route the same shape is a one-way climb and a walk
                back the way you came, so it is left alone: of the routes with online times, 17 of 20
                multi-day rows read as a round trip, and 3 of 4 single-day rows as one-way.
     Each sends SUMMIT_SHARE_OF_PUSH of that leg up and the rest DOWN, on top of any stored descent,
     so the round trip never drops below the route's own stored total. The push used to climb its
     0.59 and then DROP the 0.41: American Border Peak walked down in 2.9 hr against 7 online. Against
     online trip-report times (2026-10-07, 69 routes, model / online):
       time to summit  1.3x, 41% within 0.8-1.25x  ->  1.2x, 58% within
       descent         14 of 63 SHORT              ->  9 short (mountaineering 5 -> 1) */
  const a0 = tm ? tm.approachTimeHrs : null, d0 = tm ? tm.descentTimeHrs : null;
  const derivedHoldsDescent = hasDerivedSummitH && d0 == null && a0 != null;
  /* ...AND ONLY WHEN A LATER DAY FOLLOWS THE SUMMIT DAY (2026-11-18). When the summit day walks out to
     the car, the one-total rule stores the summit leg as camp to summit ONE WAY and the descent as summit
     to car, so reading it as a round trip from camp halved the climb: Shasta's Avalanche Gulch went up from
     Helen Lake in 2.95 hr against 4-6 reported (20 sources), Mount Daniel in 2.7, Courtney Peak in 1.2.
     This errs the SAFE way: a row that still stores a round trip there now summits LATE, never early, and
     the Conditions tab's alpine start counts back from the longer climb (earlier start). Totals never move. */
  const sdi = summitDayIndex(route, a0);
  const hasDayAfterSummitDay = sdi.n - sdi.k - 1 > 0;
  /* THE PLAN'S OWN HOURS SAY WHICH WAY THE LEG RUNS (2026-11-18). A summit day LONGER than the stored
     summit leg holds more than the climb up -- the way back to camp -- so the leg is ONE WAY and must not
     be split. Rows researched since store it that way (camp to summit, the return in the summit day's
     hours and the descent); on the 192 rows read as a round trip, 182 store a summit day EQUAL to the leg,
     so they are untouched. */
  const sumDayH = sdi.hrs[sdi.k];
  const summitLegOneWay = hasDayAfterSummitDay && hasPublishedSummitH && sumDayH != null && sumDayH > tm.summitTimeHrs + 0.05;
  const summitDayFromCamp = hasPublishedSummitH && !pushInclDescent && a0 != null && d0 != null && isMultiDayOuting(route) && hasDayAfterSummitDay && !summitLegOneWay && Math.abs(a0 - d0) / Math.max(a0, d0) <= CAMP_LEG_MATCH;
  const splitLegH = pushInclDescent || summitDayFromCamp ? tm.summitTimeHrs : derivedHoldsDescent ? derivedSummitH : null;
  /* REST AND BREAKS. The moving-time model (Scarf's Rule, the pitch speed) counts no stop at all, and
     the climbing and walking it produced ran short against online trip reports (see the notes above).
     REST_PER_MOVING_HR is 10 minutes of stops per hour of MODELLED moving time, the middle of the
     published range (DNT, Bergfreunde, Walkhighlands, RMI; see docs/features/route-page.md). It is added only to legs the model
     computed. A stored leg is a published time and already says what it includes, so it is left alone.
     The per-pitch belay change inside techHrs is a transition, not a stop, so the rest is taken on the
     climbing beyond it. */
  const modelledClimbH = splitLegH == null && !hasPublishedSummitH && !hasDerivedSummitH ? techHrs(climbPitches(route), route.avgPitchLength || 35, gn(route.grade)) : null;
  const transitionH = modelledClimbH != null ? 0.17 * climbPitches(route) : 0;
  const _modelTechH = modelledClimbH != null ? modelledClimbH + REST_PER_MOVING_HR * Math.max(0, modelledClimbH - transitionH) : null;
  /* A COUNT ESTIMATED FROM THE LENGTH IS CAPPED at LENGTH_CLIMB_MAX_H (see it above): a long route is not
     pitched end to end, so its length over 35 m pitches charged Slipstream 18.6 hr against about 7.5. */
  const techH = _modelTechH != null ? (realPitches(route) > 0 ? _modelTechH : Math.min(_modelTechH, LENGTH_CLIMB_MAX_H)) : splitLegH != null ? splitLegH * SUMMIT_SHARE_OF_PUSH : hasPublishedSummitH ? tm.summitTimeHrs : derivedSummitH;
  const legDownH = splitLegH != null ? splitLegH - techH : 0;
  /* A STORED APPROACH OR DESCENT WITH NO SUMMIT LEG BESIDE IT IS STILL THE ROUTE'S OWN FIGURE, so it is a
     FLOOR on the walk model, never thrown away. It is not paired with a modelled climb as one convention
     (see above), only kept as a lower bound, so it can lengthen a leg and never shorten one. Measured
     2026-10-28 over the 1,023 WA alpine, mountaineering and scrambling rows: 69 store an approach with no
     summit leg or total, and the walk model came out more than 20% short of it on 20 of them (0 hr on 6,
     whose gain or distance is missing: Davis Peak's North Face stored 8.5 hr in and 4.5 out and the
     Planner printed 0). 16 store a descent the same way. */
  const loneApproachH = !legsStored && tm && tm.approachTimeHrs != null ? tm.approachTimeHrs : null;
  const loneDescentH = !legsStored && tm && tm.descentTimeHrs != null ? tm.descentTimeHrs : null;
  const hikeH = storedApproachH != null ? storedApproachH : Math.max(walkUpH * (1 + REST_PER_MOVING_HR), loneApproachH || 0);
  const rapH = climbPitches(route) > 0 && !legsStored ? techH * 0.7 : 0;
  const downH = Math.max((storedDescentH || 0) + legDownH, walkDownH * (1 + REST_PER_MOVING_HR) + rapH, loneDescentH || 0);
  /* CLIMBING IS ALWAYS IN THE TOTAL (owner rule, 2026-10-30). A way in that starts with climbing -- a
     via route whose base is reached up a chimney or a couloir -- carries that climb as climbToStartHrs
     (approaches.js sets it on the variant). It is added here, once, on top of the walk; the summit
     climb (techH) is already in the total. A published whole-day total already includes it. */
  const climbToStartH = !publishedIsWholeDay && tm && tm.climbToStartHrs != null ? tm.climbToStartHrs : 0;
  const totalH = (publishedIsWholeDay ? techH : hikeH + climbToStartH + techH) + (party > 2 ? (party - 2) * 0.4 : 0); // the same as partyH below
  const sumH = depart + totalH;
  const retH = publishedIsWholeDay ? sumH : sumH + downH;
  /* THE FULL TRIP: approach + climb + descent, the number a climber budgets the day by. `totalH` stops at
     the summit (it feeds the summit clock and the alpine start), so reading it as the day undercounts by
     the whole way down. Defined as the return clock minus the departure so the two cannot disagree. */
  const tripH = retH - depart;
  /* WHICH LEGS ARE ONLY A FLOOR. scarfHrs() charges a missing distance or gain as 0 and techHrs(0)
     is 0, so a leg with nothing on file is "unknown" counted as "none". The Planner marks those
     tiles "≥"; the alpine start refuses to count back from them at all, because a start computed
     from a floor is too LATE -- the dangerous direction. A STORED leg is not a hole. */
  const blank = (v) => v == null || v === "";
  const hikeInputsComplete = walkKm != null && walkGainM != null && !blank(route.lossM); // what the walk above actually read
  const walkInKnown = hikeInputsComplete || storedApproachH != null || loneApproachH != null;
  const walkOutKnown = hikeInputsComplete || storedDescentH != null || loneDescentH != null;
  const climbKnown = hasPublishedSummitH || hasDerivedSummitH || realPitches(route) > 0;
  const legsFloor = !publishedIsWholeDay && !(walkInKnown && walkOutKnown && climbKnown);
  /* WHICH LEGS HAVE A TIME AT ALL, ONE TEST FOR EVERY SURFACE (owner, 2026-11-23: "sometimes it doesn't
     show the approach time ... when it shows it in other places"). Full trip time used to decide its N/A
     from the RAW columns (dist_km, gain_ft, pitches) while the hours above walk effDistKm() -- the trip
     plan's day miles where it has them -- and climbPitches() -- a pitch count from the length where none is
     stored. So TRAILHEAD TO SUMMIT printed a time the Approach or Climbing tile called N/A: 14 approaches
     and 31 climbs on one-day routes, and 28 routes (Slipstream, the Kain Route) where Climbing, Descent and
     Total all read N/A beside a timed leg card (scripts/oneoff/measure-full-trip-time-legs.mjs). A leg is
     TIMED when its own hours are above zero or it is a stored figure; whether it is only a floor is
     walkInKnown / climbKnown / walkOutKnown above, unchanged. */
  const approachTimed = storedApproachH != null || loneApproachH != null || hikeH > 0;
  const climbTimed = techH > 0;
  const descentTimed = storedDescentH != null || loneDescentH != null || downH > 0;
  const partyH = party > 2 ? (party - 2) * 0.4 : 0;
  const anyTimed = publishedIsWholeDay ? tripH > 0 : approachTimed || climbTimed || descentTimed || climbToStartH > 0;
  /* A STORED LEG IS A FIT PARTY'S DAY. `timing` is "published times for a fit party in good
     conditions -- the guidebook figure" (the contribute form's own definition), and fitness and pack
     scale only the WALK model, so on these rows they barely move the estimate. Readers say so
     (legsStored) instead of presenting a fit party's day as the climber's own. Checked against 1,176
     online reports (2026-10-08): stored descents on technical alpine routes ran short -- Forbidden's
     West Ridge stored 15 hr against about 20 online. The field's definition rules out overwriting
     them in bulk with a median of trip reports, so the 27 short rows were read ONE AT A TIME: a
     published route figure wins, else at least three timed reports agree, and only a short leg moved
     (audits/2026-10-08-route-timing-repairs.json). A multi-day repair keeps the CAMP shape above
     (summit leg = the summit day from camp and back): the alpine start counts back from that leg. */
  return { legsStored, hikeH, downH, techH, climbToStartH, totalH, tripH, sumH, retH, walkUpH, walkDownH, storedApproachH, storedDescentH, loneApproachH, loneDescentH, pushInclDescent,
    derivedHoldsDescent, summitDayFromCamp, legDownH, summitLegOneWay, sumDayH,
    hasPublishedSummitH, derivedSummitH, hasDerivedSummitH, publishedIsWholeDay,
    hikeInputsComplete, walkKm, walkGainM, walkInKnown, walkOutKnown, climbKnown, legsFloor,
    approachTimed, climbTimed, descentTimed, anyTimed, partyH };
}

/* A SUMMIT LEG LONGER THAN THIS IS NOT ONE DAY, so it has no clock: a traverse stores its middle days
   in the summit leg (Ptarmigan, 27.5 hr over four days). A long alpine summit day runs 14-18 hr. */
export const SUMMIT_DAY_MAX_H = 20;

/* THE SUMMIT DAY OF A MULTI-DAY TRIP (owner, 2026-11-18: "What if the trip is multiple days?").
   The Planner used to add every day of a multi-day trip into ONE push from the Depart time, as if
   nobody slept: 445 of 507 multi-day WA routes showed a red "After dark" or "Overnight", and
   Forbidden's West Ridge summited at 3:54 PM because day 1's walk in was put in front of day 2's
   climb (scripts/oneoff/measure-multiday-estimate.mjs). This lays the same estimate out as days:
   the walk in, the summit day TIMED FROM CAMP (`depart` is when the party leaves camp), and the
   walk out. The warnings are judged on the summit day alone.

   WHICH DAY IS THE SUMMIT DAY. Since the one-total rule (2026-11-18) the stored approach IS the
   hours of the days before the summit day, so the summit day is the one the walk-in hours end at.
   With no stored approach, or no day hours, it is day 2.

   Returns null on a one-day trip. `timed: false` (durations, no clocks) when the trip publishes
   only one figure for the whole outing, or the summit leg is longer than one day. */
/**
 * @typedef {Object} SummitDayPlan
 * @property {number} nDays   days in the trip plan
 * @property {number} inDays  days of walking in before the summit day
 * @property {number} outDays days of walking out after it
 * @property {number} [climbDays] days the climb itself covers, when it is longer than one day
 * @property {number} walkInH
 * @property {number} tripH
 * @property {boolean} timed  false: durations only, no clocks
 * @property {"whole"|"long"|"noclimb"|"enroute"} [why] why it is not timed
 * @property {number} [upH]
 * @property {number} [summitClock] absolute hours from midnight of the summit day
 * @property {number|null} [endClock] back at the car or camp; null when not on file
 * @property {"car"|"camp"} [endAt]
 * @property {number} [walkOutH]
 * @property {boolean} [sumLate]
 * @property {boolean} [late]
 */
/** @returns {SummitDayPlan|null} */
export function summitDayPlan(route, P, opts) {
  const days = route && route.itinerary && Array.isArray(route.itinerary.days) ? route.itinerary.days : [];
  const n = days.length;
  if (n < 2) return null;
  const o = opts || {};
  const depart = o.depart != null ? o.depart : 6, party = o.party != null ? o.party : 2;
  const { k, hrs } = summitDayIndex(route, P.storedApproachH);
  const outDays = n - k - 1;
  const base = { nDays: n, inDays: k, outDays, walkInH: P.hikeH, tripH: P.tripH };
  if (P.publishedIsWholeDay) return { ...base, timed: false, why: "whole" };
  /* THE SUMMIT ON THE WALK IN. Courtney Peak tags its summit partway through day 1 on the way to camp
     (approach 5 + summit 1 inside a 7.5 hr day 1): there is no summit day from camp to time. */
  if (P.storedApproachH != null && P.hasPublishedSummitH && hrs[k - 1] != null && P.storedApproachH + P.techH <= hrs[k - 1] + 0.05) {
    return { ...base, inDays: k, outDays: n - k, timed: false, why: "enroute" };
  }
  const upH = P.techH + P.climbToStartH + (party > 2 ? (party - 2) * 0.4 : 0);
  if (upH > SUMMIT_DAY_MAX_H) {
    /* The climb covers several days (a traverse): count them the same way, as the run of days after the
       walk in whose hours make up the stored summit leg, so the walk out is only the days after THAT. */
    let m = 1;
    if (P.hasPublishedSummitH && hrs.every((h) => h != null)) {
      let best = Infinity;
      for (let j = 1, cum = 0; j <= n - k; j++) { cum += hrs[k + j - 1]; const gap = Math.abs(cum - P.techH); if (gap < best - 1e-9) { best = gap; m = j; } }
    }
    const climbDays = Math.min(m, n - k);
    return { ...base, climbDays, outDays: n - k - climbDays, timed: false, why: "long" };
  }
  if (!(upH > 0)) return { ...base, timed: false, why: "noclimb" };
  const summitClock = depart + upH;
  if (outDays === 0) {
    // The summit day ends at the car: the way down is the whole descent.
    const endClock = summitClock + P.downH;
    return { ...base, timed: true, upH, summitClock, endClock, endAt: "car", walkOutH: 0, sumLate: summitClock > 13, late: endClock > 18.5 };
  }
  /* Later days walk out, so the summit day ends at a camp. Where planTimes split the summit leg
     (legDownH) the way back is that remainder. A leg it did NOT split is read as it reads it, the climb
     up: such a leg is a round trip from camp on some rows (Agnes Mountain) and one way on others (Mount
     Goode's NE Buttress, whose summit day ends at a bivy ON the summit: 9 hr up, 16 sources), so
     splitting it here put Goode on top in 5.3 hr. Not splitting errs LATE, never early, and keeps this
     clock and the Conditions tab's alpine start one estimate. The summit clock then stands alone. */
  // A one-way leg (the summit day outlasts it): the rest of the summit day is the way back to camp.
  const up = upH, backH = P.legDownH > 0 ? P.legDownH : P.summitLegOneWay ? P.sumDayH - P.techH : null;
  const sClock = depart + up;
  const endClock = backH != null ? sClock + backH : null;
  // What the later days walk is the descent less the way back to camp on the summit day.
  return { ...base, timed: true, upH: up, summitClock: sClock, endClock, endAt: "camp", walkOutH: Math.max(0, P.downH - (backH || 0)), sumLate: sClock > 13, late: endClock != null && endClock > 18.5 };
}
