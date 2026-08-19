// Is a coordinate actually a SUMMIT on the ground?
//
// When two stored records disagree about where a peak is, neither can adjudicate the other, and
// the route's own track often cannot either — on 201 of 580 WA routes the track IS the waypoint
// list joined up (see lib/track.js), so "is the pin on the track" is answered yes by
// construction. The ground is a genuinely independent record: a summit is a point with nothing
// higher around it, which is true whatever either record CLAIMS.
//
// USGS 3DEP Elevation Point Query Service — public, read-only, no auth, 1 m raster.
//
// FAILS CLOSED. A reading that cannot be obtained returns null, never 0, and `isMax` is null
// rather than false: "no evidence" and "not a summit" must not be confused, since one of them
// would condemn a correct coordinate.
//
// Calibrated against known answers before use — see selfTest() below. An instrument whose
// expected output is "no findings" reads identically to a broken one, so prove it can fail.
const EPQS = "https://epqs.nationalmap.gov/v1/json";
const RING_M = 70;                       // ~2 raster cells beyond typical pin slop
const NOISE_FT = 3;                      // DEM jitter tolerance
const BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];

export async function elevationAt(lat, lng, tries = 4) {
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(`${EPQS}?x=${lng}&y=${lat}&units=Feet&wkid=4326`, { signal: AbortSignal.timeout(20000) });
      if (r.ok) { const v = Number((await r.json())?.value); if (Number.isFinite(v) && v > -1000) return v; }
    } catch { /* retried below */ }
    await new Promise(s => setTimeout(s, 400 * (t + 1)));
  }
  return null;
}

const offset = (lat, lng, m, bearing) => {
  const R = 6371000, d = m / R, b = bearing * Math.PI / 180, p = Math.PI / 180;
  const φ1 = lat * p, λ1 = lng * p;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
  const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return [φ2 / p, λ2 / p];
};

/** { centre, isMax, note } — isMax is null when there is not enough data to say. */
export async function summitProbe(lat, lng) {
  const centre = await elevationAt(lat, lng);
  if (centre == null) return { centre: null, isMax: null, note: "no elevation data" };
  const ring = [];
  for (const b of BEARINGS) { const [y, x] = offset(lat, lng, RING_M, b); ring.push(await elevationAt(y, x)); }
  const known = ring.filter(v => v != null);
  if (known.length < 6) return { centre, isMax: null, note: `incomplete ring (${known.length}/8)` };
  const above = known.filter(v => v > centre + NOISE_FT);
  return { centre, isMax: above.length === 0,
    note: above.length === 0
      ? "local maximum"
      : `${above.length}/8 higher (up to +${Math.round(Math.max(...above) - centre)} ft)` };
}

/** Throws unless the probe still separates known summits from known non-summits. */
export async function selfTest() {
  const CASES = [
    ["Columbia Crest (Mount Rainier)",  46.852947, -121.760424, true],
    ["Mount Baker",                     48.7767,   -121.8144,   true],
    ["Paradise parking lot",            46.7858,   -121.7360,   false],
  ];
  const lines = [];
  for (const [label, lat, lng, wantMax] of CASES) {
    const r = await summitProbe(lat, lng);
    lines.push(`  ${r.isMax === wantMax ? "ok  " : "FAIL"} ${label.padEnd(32)} ${String(Math.round(r.centre ?? NaN)).padStart(6)} ft  ${r.note}`);
    if (r.isMax !== wantMax)
      throw new Error(`terrain probe is not trustworthy — ${label} came back "${r.note}"\n${lines.join("\n")}`);
  }
  return lines.join("\n");
}
