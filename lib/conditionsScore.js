/* THE CONDITIONS SCORE — how good the climbing is, hour by hour, at a CRAG (sport, trad, top-rope,
   bouldering). Pure: takes the crag forecast (lib/forecast.js fetchCragForecast) and what the app
   knows about the wall, returns stars and the reasons for them. Rendered by ConditionsScoreCard in
   RouteDetail.jsx; checked by scripts/check-conditions-score.mjs.

   FIVE FACTORS, each worth a fixed number of points (WEIGHTS, 100 in all):
     temperature  full inside the climber's band, fading to nothing 25°F below / 20°F above it;
     humidity     full at 40% or less, nothing at 90% — friction;
     dry rock     hours since the last rain against how long THIS rock takes to dry
                  (lib/rockType.js DRY_HOURS by family), discounted by the chance of more rain;
     wind         full at 10 mph or less, nothing at 35; a gust counts at 70%;
     sun / shade  whether the wall is in sun this hour (the sun's real position for the date,
                  the wall's aspect, and cloud) against whether the climber wants sun (cold) or
                  shade (hot).
   A factor whose input is MISSING is left out, and the hour's stars are its points over the points
   that WERE measured: an unknown aspect is "not measured", never a zero and never a pass. The
   stars are therefore exactly 5 × points / measured points, with no clamp anywhere, so the card's
   factor rows always add up to its headline. */
import { DRY_HOURS, DRY_HOURS_UNKNOWN } from "./rockType.js";
import { definePref } from "./prefs.js";

export const WEIGHTS = { temp: 30, humidity: 20, dry: 25, wind: 10, sun: 15 };
export const FACTOR_LABEL = { temp: "Temperature", humidity: "Humidity", dry: "Dry rock", wind: "Wind", sun: "Sun / shade" };
// The ideal air-temperature band, °F. Bouldering defaults cooler: friction is the whole game.
export const TEMP_BANDS = { cool: [35, 58], standard: [45, 68], warm: [55, 78] };
export function defaultBand(discipline) { return discipline === "bouldering" ? "cool" : "standard"; }

const R = Math.PI / 180;

/* The wall's facing as a compass bearing, from the route's free-text aspect ("South", "NE",
   "southwest-facing"). Several directions more than 45° apart ("N and S faces") are several walls,
   so that is null — unknown — rather than the first one named. */
const BEARING = { n: 0, nne: 22.5, ne: 45, ene: 67.5, e: 90, ese: 112.5, se: 135, sse: 157.5, s: 180, ssw: 202.5, sw: 225, wsw: 247.5, w: 270, wnw: 292.5, nw: 315, nnw: 337.5 };
export function aspectBearing(text) {
  if (text == null) return null;
  let s = String(text).toLowerCase().replace(/facing/g, " ");
  s = s.replace(/north/g, "n").replace(/south/g, "s").replace(/east/g, "e").replace(/west/g, "w");
  s = s.replace(/\b([ns])[\s-]+([ew])\b/g, "$1$2");
  const found = s.match(/\b(nne|ene|ese|sse|ssw|wsw|wnw|nnw|ne|se|sw|nw|n|e|s|w)\b/g);
  if (!found) return null;
  const bs = found.map(function (k) { return BEARING[k]; });
  for (const b of bs) if (angleDiff(b, bs[0]) > 45) return null;
  return bs[0];
}
function angleDiff(a, b) { const d = Math.abs(((a - b) % 360) + 360) % 360; return d > 180 ? 360 - d : d; }

/* Where the sun is: altitude above the horizon and azimuth from north, degrees. The standard
   low-precision solar position (about 1° — far finer than "is this wall lit"). */
export function sunPosition(lat, lng, utcMs) {
  const d = utcMs / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * R;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * R;
  const e = (23.439 - 0.00000036 * d) * R;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24 + 24) % 24;
  const H = (gmst * 15 + lng) * R - ra;
  const la = lat * R;
  const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) / R + 180;
  return { alt: alt / R, az: ((az % 360) + 360) % 360 };
}
// A wall is lit when the sun is up and in front of it (within 80° of the way it faces) and the sky
// is not mostly cloud.
export function wallInSun(sun, bearing, cloudPct) {
  if (bearing == null || sun.alt < 3) return false;
  if (angleDiff(sun.az, bearing) >= 80) return false;
  return !(typeof cloudPct === "number" && cloudPct >= 75);
}

const num = function (v) { return typeof v === "number" && isFinite(v) ? v : null; };

function tempPts(t, band) {
  if (t == null) return null;
  const [lo, hi] = band;
  const f = t < lo ? Math.max(0, 1 - (lo - t) / 25) : t > hi ? Math.max(0, 1 - (t - hi) / 20) : 1;
  return f;
}
function humPts(rh) { return rh == null ? null : rh <= 40 ? 1 : rh >= 90 ? 0 : (90 - rh) / 50; }
function windPts(w, g) {
  if (w == null && g == null) return null;
  const eff = Math.max(w || 0, (g || 0) * 0.7);
  return eff <= 10 ? 1 : eff >= 35 ? 0 : (35 - eff) / 25;
}

/* Score one forecast.
   forecast  the Open-Meteo JSON from fetchCragForecast;
   wall      { lat, lng, aspect (free text or null), family (rock family or null), discipline };
   prefs     { band: 'cool'|'standard'|'warm', rainCaution: 'normal'|'cautious' } (optional);
   nowMs     for tests. */
export function scoreForecast(forecast, wall, prefs, nowMs) {
  const h = forecast && forecast.hourly;
  if (!h || !h.time) return null;
  const off = (forecast.utc_offset_seconds || 0) * 1000;
  const bandKey = (prefs && TEMP_BANDS[prefs.band]) ? prefs.band : defaultBand(wall.discipline);
  const band = TEMP_BANDS[bandKey];
  const dryNeed = (wall.family && DRY_HOURS[wall.family] ? DRY_HOURS[wall.family] : DRY_HOURS_UNKNOWN) * (prefs && prefs.rainCaution === "cautious" ? 1.5 : 1);
  const bearing = aspectBearing(wall.aspect);
  const today = new Date((nowMs == null ? Date.now() : nowMs) + off).toISOString().slice(0, 10);

  let lastRain = null; // index of the most recent hour with measurable rain
  const hours = h.time.map(function (t, i) {
    const utc = Date.parse(t + ":00Z") - off;
    const temp = num(h.temperature_2m[i]), rh = num(h.relative_humidity_2m && h.relative_humidity_2m[i]);
    const precip = num(h.precipitation && h.precipitation[i]), pop = num(h.precipitation_probability && h.precipitation_probability[i]);
    const cloud = num(h.cloud_cover && h.cloud_cover[i]), wind = num(h.wind_speed_10m && h.wind_speed_10m[i]), gust = num(h.wind_gusts_10m && h.wind_gusts_10m[i]);
    if (precip != null && precip >= 0.01) lastRain = i;
    // Rain history is only as long as the 3 past days fetched, so "no rain seen" means "at least this long".
    const sinceRain = lastRain === i ? 0 : lastRain != null ? i - lastRain : i;
    const sinceRainAtLeast = lastRain == null;
    const sun = sunPosition(wall.lat, wall.lng, utc);
    const lit = bearing == null ? null : wallInSun(sun, bearing, cloud);

    const f = {};
    const tp = tempPts(temp, band);
    f.temp = tp == null ? null : { pts: tp * WEIGHTS.temp, val: temp, note: temp < band[0] ? "cold" : temp > band[1] ? "warm" : "in your range" };
    const hp = humPts(rh);
    f.humidity = hp == null ? null : { pts: hp * WEIGHTS.humidity, val: rh };
    if (precip == null) f.dry = null;
    else {
      const dryF = Math.min(1, sinceRain / dryNeed) * (pop == null ? 1 : 1 - 0.6 * pop / 100);
      f.dry = { pts: dryF * WEIGHTS.dry, val: sinceRain, atLeast: sinceRainAtLeast, raining: sinceRain === 0, need: Math.round(dryNeed), pop: pop };
    }
    const wp = windPts(wind, gust);
    f.wind = wp == null ? null : { pts: wp * WEIGHTS.wind, val: wind, gust: gust };
    if (lit == null || temp == null) f.sun = null;
    else {
      const wantSun = temp < band[0] + 5, wantShade = temp > band[1] - 5;
      const sf = wantSun ? (lit ? 1 : 0.4) : wantShade ? (lit ? 0.2 : 1) : 0.85;
      f.sun = { pts: sf * WEIGHTS.sun, lit: lit, want: wantSun ? "sun" : wantShade ? "shade" : "either" };
    }
    // Whole points per factor, summed AFTER rounding: the card prints each row's points and the
    // total, and a total that differs from the sum of its own rows by a rounding is a total nobody
    // can check.
    let pts = 0, max = 0;
    const missing = [];
    for (const k of Object.keys(WEIGHTS)) { if (f[k]) { f[k].pts = Math.round(f[k].pts); pts += f[k].pts; max += WEIGHTS[k]; } else missing.push(k); }
    return { time: t, date: t.slice(0, 10), hr: parseInt(t.slice(11, 13), 10), daylight: sun.alt > 0, lit: lit, factors: f, pts: pts, max: max, stars: max ? 5 * pts / max : null, missing: missing };
  });

  const byDate = {};
  for (const x of hours) { if (x.date < today) continue; (byDate[x.date] = byDate[x.date] || []).push(x); }
  const days = Object.keys(byDate).sort().slice(0, 7).map(function (date) {
    const all = byDate[date];
    const day = all.filter(function (x) { return x.daylight && x.stars != null; });
    let best = null;
    for (let i = 0; i + 2 < day.length; i++) {
      if (day[i + 2].hr - day[i].hr !== 2) continue; // three CONSECUTIVE hours
      const m = (day[i].stars + day[i + 1].stars + day[i + 2].stars) / 3;
      if (!best || m > best.stars) best = { start: day[i].hr, end: day[i + 2].hr + 1, stars: m, i: i };
    }
    const temps = all.map(function (x) { return x.factors.temp ? x.factors.temp.val : null; }).filter(function (v) { return v != null; });
    return { date: date, hours: day, best: best, stars: best ? best.stars : null, hi: temps.length ? Math.max.apply(null, temps) : null, lo: temps.length ? Math.min.apply(null, temps) : null };
  });
  return { days: days, band: band, bandKey: bandKey, dryNeed: Math.round(dryNeed), bearing: bearing, family: wall.family || null };
}

export function starsLabel(s) { return s == null ? "No score" : s >= 4 ? "Good" : s >= 2.5 ? "Fair" : "Poor"; }
export const CRAG_SCORE_DISCIPLINES = ["sport", "trad", "toprope", "bouldering"];

// The climber's own ideal conditions, kept on this device (signed out too). 'auto' follows the
// discipline's default band.
export const BAND_PREF = definePref("climbmatch-cond-band", ["auto", "cool", "standard", "warm"], "auto");
export const RAIN_PREF = definePref("climbmatch-cond-rain", ["normal", "cautious"], "normal");
