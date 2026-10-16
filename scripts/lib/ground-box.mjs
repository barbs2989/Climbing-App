// HOW MUCH CAN THE GROUND ACTUALLY RESOLVE UNDER ONE PIN?
//
// Two audits ask the USGS DEM to adjudicate a stored elevation, and both of them used to compare
// a single reading against a FLAT bar — 250 ft in one, an implicit 150 ft in the other. A flat bar
// reads its own noise: the DEM's resolving power under a pin is not a constant, it is set by how
// much the terrain varies across the pin's OWN positional uncertainty.
//
// Measured on the six findings audit:pin-elev-vs-own-prose reports, that uncertainty box spans
// 193 ft at the Park Butte trailhead and 616 ft under Magic Mountain's. A bar that cannot tell
// those apart is wrong in both directions at once, and it was: it refused a verdict the ground
// decides plainly at Park Butte, and issued one the ground cannot support at Osceola Peak.
//
// A pin's true position lies within its ROUNDING box (a coordinate given to 2 dp is any of the
// points that round to it, ~+/-550 m) plus the PLACEMENT slop of whoever put it there. Sample the
// ground across that box and you have what the terrain could innocently explain here.
//
// EXTRACTED rather than copied. `boxGrid` lived inside scripts/audit-waypoint-elevations.mjs with
// a comment apologising for not exporting it ("this file opens with top-level await against the
// database, so an import to reach one pure function would run the whole audit — an attractive
// nuisance"). That is a reason to move it OUT, not to write it twice: this module has no top-level
// await, no database and no network of its own, so importing it costs nothing. The repair is to
// COLLAPSE, never to make two bodies match.
//
// The READER is a parameter, not an import, so a caller can prove its verdicts without a network —
// the `--fixture` / `--known` test-seam idiom this repo already uses. Passing nothing uses 3DEP.
import { elevationAt } from "./terrain.mjs";

/** Decimal places a coordinate was written to — what its rounding box is worth. */
export const dpOf = v => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

/** The 8 corner/edge points bounding what rounding and placement slop together could explain.
    The centre is deliberately NOT included: every caller already reads it, and doing it here
    would make a caller that also reads it pay for the same request twice. */
export function boxGrid(lat, lng, slopM) {
  const M_LAT = 111320, cos = Math.cos(lat * Math.PI / 180);
  const halfLat = (0.5 * 10 ** -dpOf(lat) * M_LAT + slopM) / M_LAT;
  const halfLng = (0.5 * 10 ** -dpOf(lng) * M_LAT * cos + slopM) / (M_LAT * cos);
  const pts = [];
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) if (dy || dx) pts.push([lat + dy * halfLat, lng + dx * halfLng]);
  return pts;
}

/** Read the centre and the 8 box points.
    { centre, lo, hi, relief, read } — or null when too few points came back, because a box built
    from three readings is not a statement about the terrain and must never read as one. FAILS
    CLOSED: a 3DEP outage returns null, never a narrow box, which would manufacture verdicts. */
export async function groundBox(lat, lng, slopM, opts) {
  const o = opts || {};
  const read = o.read || ((y, x) => elevationAt(y, x, o.tries || 6));
  const centre = await read(lat, lng);
  const reads = [centre];
  for (const [y, x] of boxGrid(lat, lng, slopM)) reads.push(await read(y, x));
  const known = reads.filter(v => v != null).map(Number).filter(Number.isFinite);
  if (known.length < 7) return null;
  const lo = Math.min(...known), hi = Math.max(...known);
  return { centre: centre == null ? null : Number(centre), lo, hi, relief: hi - lo, read: known.length };
}

/** THE MARGIN IS DERIVED FROM THE CLAIM, NOT CHOSEN.
    A stored elevation is written to a rounding step — 3,200 to the nearest hundred, 3,360 to the
    nearest ten, 5,392 to the foot — and a value rounded to the nearest 100 is consistent with any
    ground within 50 ft of it. Reading the step off the number itself means no threshold is fitted
    to the cases being judged, which is the objection that kept two of these findings deferred. */
export const roundingSlack = h => {
  const n = Math.abs(Math.round(Number(h)));
  if (!Number.isFinite(n) || n === 0) return 0.5;
  for (const step of [1000, 100, 10]) if (n % step === 0) return step / 2;
  return 0.5;
};

/** Could the terrain under this pin innocently produce this claimed height? */
export const boxAdmits = (box, h) => {
  if (!box || !Number.isFinite(Number(h))) return false;
  const m = roundingSlack(h);
  return Number(h) + m >= box.lo && Number(h) - m <= box.hi;
};
