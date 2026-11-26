/* A HEADER SLOT TAKES A VALUE, NOT A PARAGRAPH (owner note, 2026-11-26: Sahale's avalanche card printed
   'NWAC "West Slopes North" zone (nearest official NWAC forecast zone). NWAC's regular forecast season runs
   roughly mid-November through mid-April and does not cover...' beside its heading).

   Research passes filled `areas.avy_zone` and the route's `climate.forecastZone` with their reasoning as well
   as the name: 34 of 69 zones and 411 of 734 forecast zones ran past 40 characters, up to 334. The data was
   rewritten to the bare zone name (the avalanche.org polygon the coordinate falls in, the same lookup the
   live "Avalanche today" card makes), and `areas.avy_zone` carries a length CHECK since migration 0549.
   This is the render side, for what a constraint cannot reach (a JSON key, an approved edit merged on the
   client): a slot built for a name prints a name, and anything longer is not put there.

   50 is above the longest real forecast-zone name in the US (46 characters, "San Francisco Peaks / Kachina
   Peaks Wilderness", avalanche.org map layer 2026-11-26) and far below any of the paragraphs. A sentence
   break or an em dash means an explanation has been attached to the name. */
export const HEADER_VALUE_MAX = 50;
export function headerValue(v) {
  if (v == null || typeof v === "object") return null;
  const s = String(v).trim();
  if (!s || s.length > HEADER_VALUE_MAX || /[.;:]\s|\s—\s?/.test(s)) return null;
  return s;
}
