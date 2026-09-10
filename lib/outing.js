// How long is the outing, and is the stored distance the walk IN or the whole trip?
//
// SPLIT OUT OF RouteDetail.jsx BECAUSE TWO SCREENS WERE ANSWERING IT DIFFERENTLY. The route
// page has always preferred the route's OWN itinerary — the sum of its days' miles — over the
// `dist_km` column, halving it unless the trip is recorded as a loop or point-to-point. The peak
// page's ACROSS EVERY ROUTE HERE panel read `dist_km` raw. Measured over the WA catalog: of the
// 543 routes carrying both, 336 differ by more than 15%, and the Approach row on 128 of the 198
// peak pages that render that panel would move — almost always by a factor of two, because on
// those rows `dist_km` holds the ROUND TRIP while the itinerary agrees with half of it. So a
// climber reading the peak page saw the whole trip labelled "Approach", and the route page for
// the same climb said half of it.
//
// This module is the fix's shape rather than its content: nothing here is new, it is the route
// page's own arithmetic moved somewhere the area browser can import it. `lib/` and not
// ClimbMatchCore, for the reason `lib/rack.js` and `lib/rappels.js` record — core cannot import
// RouteDetail (lazy-loaded, and it already imports FROM core, so a static import both cycles and
// drags the route page into the startup bundle), and lib/DbAreaBrowser.jsx imports only lib/.
//
// WHICH CONVENTION `dist_km` HOLDS IS NOT SETTLED HERE, and must not be: CLAUDE.md records that
// the column holds two at once and that a blanket transform breaks as many rows as it fixes.
// This changes only WHICH SOURCE a reader prefers, and only where the route states an itinerary
// of its own. With no itinerary the stored column is returned untouched.

// Both spellings, because the two callers arrive with different objects: the route page's route
// has been through `dbRouteToCamel`, while the area browser holds RAW PostgREST rows. Reading one
// spelling silently drops the other's routes — the mistake `check:contrib-fields` records for
// `land_manager`/`landManager`, and the reason the route page's own trip-shape reader already
// took both.
export const recShapeOf = (route) => (route && (route.outingShape || route.outing_shape)) || null;

// The sum of the itinerary's day miles, or null when the route states no day mileage.
export const itinTotalMi = (route) => {
  const days = route && route.itinerary && route.itinerary.days;
  return (days && days.length) ? days.reduce((a, d) => a + (d.miles || 0), 0) : null;
};

// A recorded loop/point does not retrace its approach, so its itinerary total is the whole
// outing rather than a doubled walk-in. Only halve when the trip really is there-and-back.
export const effDistIsWholeTrip = (route) => {
  const sh = recShapeOf(route);
  return !!itinTotalMi(route) && (sh === "loop" || sh === "point");
};

/* Deliberately returns `route.distKm` UNCHANGED where it exists, and falls back to the snake
   spelling only when it does not — so this is byte-faithful to the expression it replaces for
   every object the route page has ever handed it, and the fallback can only ADD rows. */
const storedKm = (route) => {
  if (!route) return route;
  if (route.distKm != null) return route.distKm;
  return route.dist_km != null ? Number(route.dist_km) : route.distKm;
};

export const effDistKm = (route) => {
  const totMi = itinTotalMi(route);
  if (!totMi) return storedKm(route);
  return effDistIsWholeTrip(route) ? totMi * 1.60934 : (totMi * 1.60934) / 2;
};
