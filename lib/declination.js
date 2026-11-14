// Magnetic declination from the World Magnetic Model (WMM2025, NOAA/NCEI and the British Geological
// Survey; public domain), so a phone's compass can be turned into TRUE north.
//
// WHY: a phone browser's compass is MAGNETIC. Safari fills webkitCompassHeading from Core Location's
// magneticHeading and corrects nothing (WebKit, WebCoreMotionManager.mm), and Android's absolute
// orientation is referenced to the geomagnetic field. Bearings computed between two coordinates are
// TRUE. In the Cascades the two differ by ~15°, enough to point an arrow at the wrong line from 100 m.
//
// COF is the model's own coefficient file (WMM.COF), unedited: n, m, g, h, ġ, ḣ per row. The model is
// valid 2025.0–2030.0; past that it is extrapolated, which drifts slowly (secular variation is about
// 0.1°/yr in the lower 48) until the next model replaces this table. scripts/check-declination.mjs
// runs it against NOAA's published test values.
export const WMM_EPOCH = 2025.0;
const COF = [
  1, 0, -29351.8, 0, 12, 0,
  1, 1, -1410.8, 4545.4, 9.7, -21.5,
  2, 0, -2556.6, 0, -11.6, 0,
  2, 1, 2951.1, -3133.6, -5.2, -27.7,
  2, 2, 1649.3, -815.1, -8, -12.1,
  3, 0, 1361, 0, -1.3, 0,
  3, 1, -2404.1, -56.6, -4.2, 4,
  3, 2, 1243.8, 237.5, 0.4, -0.3,
  3, 3, 453.6, -549.5, -15.6, -4.1,
  4, 0, 895, 0, -1.6, 0,
  4, 1, 799.5, 278.6, -2.4, -1.1,
  4, 2, 55.7, -133.9, -6, 4.1,
  4, 3, -281.1, 212, 5.6, 1.6,
  4, 4, 12.1, -375.6, -7, -4.4,
  5, 0, -233.2, 0, 0.6, 0,
  5, 1, 368.9, 45.4, 1.4, -0.5,
  5, 2, 187.2, 220.2, 0, 2.2,
  5, 3, -138.7, -122.9, 0.6, 0.4,
  5, 4, -142, 43, 2.2, 1.7,
  5, 5, 20.9, 106.1, 0.9, 1.9,
  6, 0, 64.4, 0, -0.2, 0,
  6, 1, 63.8, -18.4, -0.4, 0.3,
  6, 2, 76.9, 16.8, 0.9, -1.6,
  6, 3, -115.7, 48.8, 1.2, -0.4,
  6, 4, -40.9, -59.8, -0.9, 0.9,
  6, 5, 14.9, 10.9, 0.3, 0.7,
  6, 6, -60.7, 72.7, 0.9, 0.9,
  7, 0, 79.5, 0, 0, 0,
  7, 1, -77, -48.9, -0.1, 0.6,
  7, 2, -8.8, -14.4, -0.1, 0.5,
  7, 3, 59.3, -1, 0.5, -0.8,
  7, 4, 15.8, 23.4, -0.1, 0,
  7, 5, 2.5, -7.4, -0.8, -1,
  7, 6, -11.1, -25.1, -0.8, 0.6,
  7, 7, 14.2, -2.3, 0.8, -0.2,
  8, 0, 23.2, 0, -0.1, 0,
  8, 1, 10.8, 7.1, 0.2, -0.2,
  8, 2, -17.5, -12.6, 0, 0.5,
  8, 3, 2, 11.4, 0.5, -0.4,
  8, 4, -21.7, -9.7, -0.1, 0.4,
  8, 5, 16.9, 12.7, 0.3, -0.5,
  8, 6, 15, 0.7, 0.2, -0.6,
  8, 7, -16.8, -5.2, 0, 0.3,
  8, 8, 0.9, 3.9, 0.2, 0.2,
  9, 0, 4.6, 0, 0, 0,
  9, 1, 7.8, -24.8, -0.1, -0.3,
  9, 2, 3, 12.2, 0.1, 0.3,
  9, 3, -0.2, 8.3, 0.3, -0.3,
  9, 4, -2.5, -3.3, -0.3, 0.3,
  9, 5, -13.1, -5.2, 0, 0.2,
  9, 6, 2.4, 7.2, 0.3, -0.1,
  9, 7, 8.6, -0.6, -0.1, -0.2,
  9, 8, -8.7, 0.8, 0.1, 0.4,
  9, 9, -12.9, 10, -0.1, 0.1,
  10, 0, -1.3, 0, 0.1, 0,
  10, 1, -6.4, 3.3, 0, 0,
  10, 2, 0.2, 0, 0.1, 0,
  10, 3, 2, 2.4, 0.1, -0.2,
  10, 4, -1, 5.3, 0, 0.1,
  10, 5, -0.6, -9.1, -0.3, -0.1,
  10, 6, -0.9, 0.4, 0, 0.1,
  10, 7, 1.5, -4.2, -0.1, 0,
  10, 8, 0.9, -3.8, -0.1, -0.1,
  10, 9, -2.7, 0.9, 0, 0.2,
  10, 10, -3.9, -9.1, 0, 0,
  11, 0, 2.9, 0, 0, 0,
  11, 1, -1.5, 0, 0, 0,
  11, 2, -2.5, 2.9, 0, 0.1,
  11, 3, 2.4, -0.6, 0, 0,
  11, 4, -0.6, 0.2, 0, 0.1,
  11, 5, -0.1, 0.5, -0.1, 0,
  11, 6, -0.6, -0.3, 0, 0,
  11, 7, -0.1, -1.2, 0, 0.1,
  11, 8, 1.1, -1.7, -0.1, 0,
  11, 9, -1, -2.9, -0.1, 0,
  11, 10, -0.2, -1.8, -0.1, 0,
  11, 11, 2.6, -2.3, -0.1, 0,
  12, 0, -2, 0, 0, 0,
  12, 1, -0.2, -1.3, 0, 0,
  12, 2, 0.3, 0.7, 0, 0,
  12, 3, 1.2, 1, 0, -0.1,
  12, 4, -1.3, -1.4, 0, 0.1,
  12, 5, 0.6, 0, 0, 0,
  12, 6, 0.6, 0.6, 0.1, 0,
  12, 7, 0.5, -0.1, 0, 0,
  12, 8, -0.1, 0.8, 0, 0,
  12, 9, -0.4, 0.1, 0, 0,
  12, 10, -0.2, -1, -0.1, 0,
  12, 11, -1.3, 0.1, 0, 0,
  12, 12, -0.7, 0.2, -0.1, -0.1,
];
const N = 12, RE = 6371.2, WGS_A = 6378.137, WGS_F = 1 / 298.257223563, E2 = WGS_F * (2 - WGS_F);

const decYear = (date) => {
  const y = date.getUTCFullYear(), s = Date.UTC(y, 0, 1), e = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - s) / (e - s);
};

// Schmidt semi-normalisation factors, fixed for the model's degree, built once.
const SN = [];
for (let n = 0; n <= N; n++) {
  SN.push(new Array(N + 1).fill(0));
  SN[n][0] = n ? SN[n - 1][0] * (2 * n - 1) / n : 1;
  for (let m = 1; m <= n; m++) SN[n][m] = SN[n][m - 1] * Math.sqrt((n - m + 1) * (m === 1 ? 2 : 1) / (n + m));
}

// Degrees east of true north (negative = west) at a geodetic point. opts: altKm above the
// ellipsoid, and year (decimal) or date; the current date when neither is given.
export function declinationDeg(lat, lng, opts = {}) {
  const altKm = Number.isFinite(opts.altKm) ? opts.altKm : 0;
  const t = Number.isFinite(opts.year) ? opts.year : decYear(opts.date || new Date());
  const dt = t - WMM_EPOCH, rad = Math.PI / 180;
  // Geodetic to geocentric spherical.
  const phi = lat * rad, lam = lng * rad, sphi = Math.sin(phi), cphi = Math.cos(phi);
  const rc = WGS_A / Math.sqrt(1 - E2 * sphi * sphi);
  const p = (rc + altKm) * cphi, z = (rc * (1 - E2) + altKm) * sphi;
  const r = Math.sqrt(p * p + z * z), phic = Math.asin(z / r);
  const ct = Math.sin(phic), st = Math.cos(phic); // colatitude θ: cosθ = sinφ', sinθ = cosφ'
  // Gauss-normalised Legendre functions P(n,m)(cosθ) and their θ-derivatives.
  const P = [], D = [];
  for (let n = 0; n <= N; n++) { P.push(new Array(N + 1).fill(0)); D.push(new Array(N + 1).fill(0)); }
  P[0][0] = 1;
  for (let n = 1; n <= N; n++) {
    for (let m = 0; m <= n; m++) {
      if (n === m) { P[n][m] = st * P[n - 1][m - 1]; D[n][m] = st * D[n - 1][m - 1] + ct * P[n - 1][m - 1]; }
      else {
        const k = n > 1 ? ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3)) : 0;
        const p2 = m <= n - 2 ? P[n - 2][m] : 0, d2 = m <= n - 2 ? D[n - 2][m] : 0;
        P[n][m] = ct * P[n - 1][m] - k * p2;
        D[n][m] = ct * D[n - 1][m] - st * P[n - 1][m] - k * d2;
      }
    }
  }
  let X = 0, Y = 0, Z = 0;
  for (let i = 0; i < COF.length; i += 6) {
    const n = COF[i], m = COF[i + 1];
    const g = COF[i + 2] + dt * COF[i + 4], h = COF[i + 3] + dt * COF[i + 5];
    const ar = Math.pow(RE / r, n + 2), cm = Math.cos(m * lam), sm = Math.sin(m * lam);
    const pn = P[n][m] * SN[n][m], dn = D[n][m] * SN[n][m];
    X += ar * (g * cm + h * sm) * dn;
    Y += ar * m * (g * sm - h * cm) * pn;
    Z -= ar * (n + 1) * (g * cm + h * sm) * pn;
  }
  if (st > 1e-8) Y /= st;
  // Rotate the geocentric north component back into the geodetic frame (east is unchanged).
  const psi = phic - phi, Xg = X * Math.cos(psi) - Z * Math.sin(psi);
  return Math.atan2(Y, Xg) / rad;
}
