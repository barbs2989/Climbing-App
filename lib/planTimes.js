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

/* Returns hours, plus the flags the Planner's tiles and the alpine start need. `depart` is a clock
   hour of the departure day; sumH and retH are absolute hours from that midnight and UNBOUNDED (a
   value past 24 is the next day -- the Planner's fmt() and dayOf() read it that way). */
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
  const walkUpH = scarfHrs(_walkKm, route.gainM, 0, fit, pack);
  const walkDownH = scarfHrs(_walkKm, 0, Math.max(route.lossM || 0, route.gainM || 0), fit, pack);

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
  const summitDayFromCamp = hasPublishedSummitH && !pushInclDescent && a0 != null && d0 != null && isMultiDayOuting(route) && Math.abs(a0 - d0) / Math.max(a0, d0) <= CAMP_LEG_MATCH;
  const splitLegH = pushInclDescent || summitDayFromCamp ? tm.summitTimeHrs : derivedHoldsDescent ? derivedSummitH : null;
  const techH = splitLegH != null ? splitLegH * SUMMIT_SHARE_OF_PUSH : hasPublishedSummitH ? tm.summitTimeHrs : hasDerivedSummitH ? derivedSummitH : techHrs(route.pitches, route.avgPitchLength || 35, gn(route.grade));
  const legDownH = splitLegH != null ? splitLegH - techH : 0;
  const hikeH = storedApproachH != null ? storedApproachH : walkUpH;
  const rapH = route.pitches > 0 && !legsStored ? techH * 0.7 : 0;
  const downH = Math.max((storedDescentH || 0) + legDownH, walkDownH + rapH);
  const totalH = (publishedIsWholeDay ? techH : hikeH + techH) + (party > 2 ? (party - 2) * 0.4 : 0);
  const sumH = depart + totalH;
  const retH = publishedIsWholeDay ? sumH : sumH + downH;
  /* WHICH LEGS ARE ONLY A FLOOR. scarfHrs() charges a missing distance or gain as 0 and techHrs(0)
     is 0, so a leg with nothing on file is "unknown" counted as "none". The Planner marks those
     tiles "≥"; the alpine start refuses to count back from them at all, because a start computed
     from a floor is too LATE -- the dangerous direction. A STORED leg is not a hole. */
  const blank = (v) => v == null || v === "";
  const hikeInputsComplete = !blank(route.distKm) && !blank(route.gainM) && !blank(route.lossM);
  const walkInKnown = hikeInputsComplete || storedApproachH != null;
  const walkOutKnown = hikeInputsComplete || storedDescentH != null;
  const climbKnown = hasPublishedSummitH || hasDerivedSummitH || !!route.pitches;
  const legsFloor = !publishedIsWholeDay && !(walkInKnown && walkOutKnown && climbKnown);
  return { hikeH, downH, techH, totalH, sumH, retH, walkUpH, walkDownH, storedApproachH, storedDescentH, pushInclDescent,
    derivedHoldsDescent, summitDayFromCamp, legDownH,
    hasPublishedSummitH, derivedSummitH, hasDerivedSummitH, publishedIsWholeDay,
    hikeInputsComplete, walkInKnown, walkOutKnown, climbKnown, legsFloor };
}
