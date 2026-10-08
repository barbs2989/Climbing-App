/* THE CONDITIONS SCORE — how good the climbing is, hour by hour, at a CRAG (sport, trad, top-rope,
   bouldering). Pure: takes the crag forecast (lib/forecast.js fetchCragForecast) and what the app
   knows about the wall, returns stars and the reasons for them. Rendered by ConditionsScoreCard in
   RouteDetail.jsx; checked by scripts/check-conditions-score.mjs.

   FIVE FACTORS, each worth a fixed number of points (WEIGHTS, 100 in all):
     temperature  full inside the climber's band, fading to nothing 25°F below / 20°F above it;
     humidity     full at 40% or less, nothing at 90% — friction (with the dew point, the card's
                  friction reading: crisp / okay / greasy / damp);
     dry rock     drying credit earned since the last rain (faster in sun and wind, slower at
                  night and in humid air, none at the dew point) against how long THIS rock takes
                  to dry (lib/rockType.js DRY_HOURS by family, scaled by how much rain fell),
                  discounted by the chance of more rain;
     wind         full at 10 mph or less, nothing at 35; a gust counts at 70%;
     sun / shade  whether the wall is in sun this hour (the sun's real position for the date,
                  the wall's aspect, and cloud) against whether the climber wants sun (cold) or
                  shade (hot).
   A factor whose input is MISSING is left out, and the hour's stars are its points over the points
   that WERE measured: an unknown aspect is "not measured", never a zero and never a pass.
   CAPS: some conditions end the climbing outright — rain in the past hour, rock still wet (or any
   wet sandstone), air at its dew point, smoke. Summed factors could not say that (an hour of rain
   still read "Fair"), so each such condition caps the hour's stars and carries its reason, which
   the card prints. Stars are exactly min(5 × points / measured points, the lowest cap) — the
   factor rows still add up to the points line, and the cap says why the stars are lower. */
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

/* SUNRISE AND SUNSET for one calendar date at one point, as instants: when the sun's centre
   crosses -0.833° (the horizon as seen through the atmosphere, with the disc's own radius), found
   by walking sunPosition() through the device's local day in five-minute steps and bisecting each
   crossing to the second. Longitude, the equation of time and daylight saving all come from
   sunPosition and the Date object.

   IT REPLACES "solar noon ± half the day length", which the Calendar's Daylight line used to print
   as clock times. That estimate had no longitude, no equation of time and no DST, and ignored the
   disc and refraction. Measured against Open-Meteo's ephemeris for four Washington points on four
   dates (scripts/check-sun-times.mjs carries the table): in the daylight-saving months sunrise
   was 44–70 minutes EARLY and sunset 60–89 minutes early; in December, with no DST and near the
   zone's own meridian, rise was within 6 minutes and set 6–13 minutes early; the day was 11–19
   minutes short all year. A party planning a summer alpine start around the old number left camp
   an hour before it needed to.

   `dateStr` is the calendar date the climber sees ("2026-06-21"), read as the device's local day,
   which is the day the Calendar is laying out. Returns { daylight: hours, sunrise: Date|null,
   sunset: Date|null }; a polar day is 24 h with no crossings, a polar night 0 h, and a missing or
   unparseable input is null. */
export function sunRiseSet(lat, lng, dateStr) {
  if (lat == null || lng == null || !dateStr) return null;
  const start = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const above = function (t) { return sunPosition(lat, lng, t).alt + 0.833; };
  const bisect = function (lo, hi) { for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (above(mid) >= 0 === above(lo) >= 0) lo = mid; else hi = mid; } return new Date(Math.round((lo + hi) / 2)); };
  const STEP = 5 * 60000;
  let rise = null, set = null, upMs = 0, prev = above(start.getTime());
  for (let t = start.getTime() + STEP; t <= end.getTime(); t += STEP) {
    const a = above(t);
    if (prev < 0 && a >= 0 && rise == null) rise = bisect(t - STEP, t);
    else if (prev >= 0 && a < 0) set = bisect(t - STEP, t);
    if (a >= 0) upMs += STEP;
    prev = a;
  }
  const daylight = rise && set && set > rise ? (set - rise) / 3600000 : Math.min(24, upMs / 3600000);
  return { daylight: daylight, sunrise: rise, sunset: set };
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

/* CONDENSATION. When the air is within DAMP_SPREAD °F of its dew point, water condenses on rock
   that is as cold as the air (shaded rock usually is) — the "greasy morning after a clear night".
   Rock in that state is damp whatever the rain record says. 5 °F is the 3 °C margin the
   condensation standard for surfaces uses (ISO 8502-4: a surface within 3 °C of the dew point is at
   high risk of condensation) — and shaded rock after a clear night is colder than the air. */
export const DAMP_SPREAD = 5;

/* FRICTION — the "send temps" reading, from air temperature, humidity and dew point together.
   Returns { key, label } or null when temperature or humidity is missing (not measured). */
export function frictionOf(temp, rh, dew, band) {
  if (temp == null || rh == null) return null;
  const spread = dew != null ? temp - dew : null;
  if (spread != null && spread < DAMP_SPREAD) return { key: "damp", label: "Damp — rock may be wet" };
  if (rh >= 80 || (spread != null && spread < 8) || temp > band[1] + 8) return { key: "greasy", label: "Greasy — poor friction" };
  if (rh <= 50 && temp <= band[1] && (spread == null || spread >= 15)) return { key: "crisp", label: "Crisp — good friction" };
  return { key: "ok", label: "Okay friction" };
}

/* AIR QUALITY, US AQI, in the EPA's own bands. Above "Unhealthy" the score is capped: breathing
   smoke on a hard pitch is the day's real hazard, whatever the rock is doing. */
export function aqiCategory(a) {
  if (a == null) return null;
  return a <= 50 ? { key: "good", label: "Good" } : a <= 100 ? { key: "moderate", label: "Moderate" } : a <= 150 ? { key: "usg", label: "Unhealthy for sensitive groups" } : a <= 200 ? { key: "unhealthy", label: "Unhealthy" } : a <= 300 ? { key: "very", label: "Very unhealthy" } : { key: "hazardous", label: "Hazardous" };
}

/* SEEPAGE RISK from the rain of the past 7 and 14 days, inches. A RISK, not a reading: whether a
   crack seeps depends on the wall's own drainage, which no forecast knows. */
export function seepRisk(rain7, rain14) {
  if (rain7 == null && rain14 == null) return null;
  const a = rain7 || 0, b = rain14 || 0;
  return a >= 1.5 || b >= 3 ? "high" : a >= 0.5 || b >= 1.25 ? "moderate" : "low";
}

/* LOCAL TIME at the crag. Open-Meteo is asked for unix timestamps plus its `timezone`, and each
   hour's local date and hour come from that zone — so a series that crosses a daylight-saving
   change is right on both sides of it (one utc_offset for the whole series was not). ISO strings
   with utc_offset_seconds (the guard's fixtures) still work. */
const _fmt = {};
function localFn(tz, off) {
  let f = null;
  if (tz) { try { f = _fmt[tz] || (_fmt[tz] = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })); } catch (e) { f = null; } }
  return function (utc) {
    if (f) {
      const p = {}; for (const x of f.formatToParts(new Date(utc))) p[x.type] = x.value;
      return { date: p.year + "-" + p.month + "-" + p.day, hr: parseInt(p.hour, 10) % 24, min: parseInt(p.minute, 10) };
    }
    const d = new Date(utc + off);
    return { date: d.toISOString().slice(0, 10), hr: d.getUTCHours(), min: d.getUTCMinutes() };
  };
}
// "2:40 PM" at the crag, for a utc instant.
export function clockAt(score, utc) {
  if (!score || utc == null) return "–";
  const l = score.local(utc);
  return (l.hr % 12 || 12) + ":" + String(l.min).padStart(2, "0") + (l.hr < 12 ? " AM" : " PM");
}

/* DRYING. Each dry hour after rain earns drying credit at a rate set by that hour's conditions:
   1 for a plain daylight hour, less at night or in humid air, more in sun or wind, and NONE while
   the air is at its dew point (water is condensing, not leaving). The rock counts as dry when the
   credit reaches its family's drying hours (DRY_HOURS), scaled by the rain of the 24 hours before
   it stopped: a passing drizzle needs half as long, a soaking up to 1.75 times. */
function dryRate(daylight, rh, wind, sunny, spread) {
  if (spread != null && spread < DAMP_SPREAD) return 0;
  let r = daylight ? 1 : 0.6;
  if (rh != null) r *= rh >= 90 ? 0.3 : rh >= 75 ? 0.6 : rh <= 50 ? 1.15 : 1;
  if (wind != null && wind >= 8) r *= 1.15;
  if (sunny) r *= 1.3;
  return r;
}
export function rainScale(rain24) { return Math.max(0.5, Math.min(1.75, 0.5 + (rain24 || 0) / 0.4)); }
const utcOf = function (t, off) { return typeof t === "number" ? t * 1000 : Date.parse(t + ":00Z") - off; };

/* Score one forecast.
   forecast  the Open-Meteo JSON from fetchCragForecast;
   wall      { lat, lng, aspect (free text or null), family (rock family or null), rock (the specific rock, optional), discipline };
   prefs     { band: 'cool'|'standard'|'warm', rainCaution: 'normal'|'cautious' } (optional);
   nowMs     for tests;
   air       the Open-Meteo air-quality JSON (optional; missing is "not measured", never "clean"). */
export function scoreForecast(forecast, wall, prefs, nowMs, air) {
  const h = forecast && forecast.hourly;
  if (!h || !h.time) return null;
  const now = nowMs == null ? Date.now() : nowMs;
  const off = (forecast.utc_offset_seconds || 0) * 1000;
  const local = localFn(forecast.timezone, off);
  const bandKey = (prefs && TEMP_BANDS[prefs.band]) ? prefs.band : defaultBand(wall.discipline);
  const band = TEMP_BANDS[bandKey];
  const family = wall.family || null;
  const dryNeed = (family && DRY_HOURS[family] ? DRY_HOURS[family] : DRY_HOURS_UNKNOWN) * (prefs && prefs.rainCaution === "cautious" ? 1.5 : 1);
  // 'varies' (areas.aspect, 0249): a formation with faces every way. Not one bearing, so no sun.
  const aspectVaries = wall.aspect != null && /vari|all\s+aspects|every\s+(direction|aspect)/i.test(String(wall.aspect));
  const bearing = aspectVaries ? null : aspectBearing(wall.aspect);
  // WEAK WHEN WET: sandstone, which can lose up to 75% of its strength while wet. NOT conglomerate,
  // though it dries like sandstone: quartz-cemented conglomerate (the Gunks) is hard rock, and no
  // climbing body warns that it weakens when wet — it gets the ordinary "still wet" cap instead.
  const sandstone = family === "sandstone" && !/conglomerate/i.test(wall.rock || "");
  const today = local(now).date;

  const aq = {};
  const ah = air && air.hourly;
  if (ah && ah.time) ah.time.forEach(function (t, i) { aq[utcOf(t, (air.utc_offset_seconds || 0) * 1000)] = { aqi: num(ah.us_aqi && ah.us_aqi[i]), pm25: num(ah.pm2_5 && ah.pm2_5[i]) }; });

  let lastRain = null, credit = 0, need = dryNeed, rain24At = 0;
  const P = h.precipitation || [];
  const hours = h.time.map(function (t, i) {
    const utc = utcOf(t, off);
    const loc = typeof t === "number" ? local(utc) : { date: t.slice(0, 10), hr: parseInt(t.slice(11, 13), 10) };
    const temp = num(h.temperature_2m[i]), rh = num(h.relative_humidity_2m && h.relative_humidity_2m[i]), dew = num(h.dew_point_2m && h.dew_point_2m[i]);
    // precipitation[T] is the rain of the hour BEFORE T (and its probability, the chance of it).
    const precip = num(P[i]), pop = num(h.precipitation_probability && h.precipitation_probability[i]);
    const cloud = num(h.cloud_cover && h.cloud_cover[i]), wind = num(h.wind_speed_10m && h.wind_speed_10m[i]), gust = num(h.wind_gusts_10m && h.wind_gusts_10m[i]);
    // Shown beside the temperature and the wind, never scored: friction follows the air, not how
    // cold it feels, and a gust is a gust from any direction.
    const feels = num(h.apparent_temperature && h.apparent_temperature[i]), windDir = num(h.wind_direction_10m && h.wind_direction_10m[i]);
    const isDay = h.is_day ? num(h.is_day[i]) : null;
    const sun = sunPosition(wall.lat, wall.lng, utc);
    const daylight = isDay != null ? isDay === 1 : sun.alt > 0;
    const lit = bearing == null ? null : wallInSun(sun, bearing, cloud);
    const spread = temp != null && dew != null ? temp - dew : null;
    const damp = spread != null && spread < DAMP_SPREAD;
    // ANY measurable rain counts: Open-Meteo reports in 0.1 mm steps, so 0.004" is a real drizzle.
    const rained = precip != null && precip > 0;
    if (rained) {
      lastRain = i; credit = 0;
      let s24 = 0; for (let k = Math.max(0, i - 23); k <= i; k++) s24 += num(P[k]) || 0;
      rain24At = s24; need = dryNeed * rainScale(s24);
    } else credit += dryRate(daylight, rh, wind, lit === true || (daylight && cloud != null && cloud < 40), spread);
    // No rain anywhere in the fetched past (14 days) is longer than any rock takes to dry.
    const sinceRainAtLeast = lastRain == null;
    const sinceRain = lastRain === i ? 0 : lastRain != null ? Math.round((utc - utcOf(h.time[lastRain], off)) / 3600e3) : i;
    const dryFrac = sinceRainAtLeast ? 1 : rained ? 0 : Math.min(1, credit / need);

    const f = {};
    const tp = tempPts(temp, band);
    f.temp = tp == null ? null : { pts: tp * WEIGHTS.temp, val: temp, note: temp < band[0] ? "cold" : temp > band[1] ? "warm" : "in your range" };
    const hp = humPts(rh);
    const fr = frictionOf(temp, rh, dew, band);
    f.humidity = hp == null ? null : { pts: hp * WEIGHTS.humidity, val: rh, dew: dew, damp: damp, friction: fr };
    if (precip == null) f.dry = null;
    else {
      let dryF = dryFrac * (pop == null ? 1 : 1 - 0.6 * pop / 100);
      if (damp) dryF = Math.min(dryF, 0.25);
      f.dry = { pts: dryF * WEIGHTS.dry, val: sinceRain, atLeast: sinceRainAtLeast, raining: rained, precip: precip, frac: dryFrac, need: Math.round(need), rain24: sinceRainAtLeast ? 0 : rain24At, pop: pop, damp: damp };
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
    const caps = [];
    if (rained) caps.push({ stars: 1, why: "Rain in the past hour" });
    else if (!sinceRainAtLeast && sandstone && dryFrac < 1) caps.push({ stars: 1, why: "Sandstone still wet from rain" });
    else if (!sinceRainAtLeast && dryFrac < 0.3) caps.push({ stars: 1, why: "Rock still wet from rain" });
    if (damp) caps.push({ stars: 2, why: "Air at its dew point — rock may be damp" });
    const a = aq[utc] || null;
    const aqi = a ? a.aqi : null;
    if (aqi != null && aqi > 200) caps.push({ stars: 1, why: "Very unhealthy air (AQI " + Math.round(aqi) + ")" });
    else if (aqi != null && aqi > 150) caps.push({ stars: 2, why: "Unhealthy air (AQI " + Math.round(aqi) + ")" });
    const raw = max ? 5 * pts / max : null;
    const capAt = caps.length ? Math.min.apply(null, caps.map(function (c) { return c.stars; })) : null;
    const stars = raw == null ? null : capAt != null ? Math.min(raw, capAt) : raw;
    return { time: t, utc: utc, date: loc.date, hr: loc.hr, daylight: daylight, past: utc + 3600e3 <= now, lit: lit, factors: f, pts: pts, max: max, rawStars: raw, stars: stars, caps: caps, missing: missing,
      temp: temp, feels: feels, dew: dew, rh: rh, pop: pop, precip: precip, wind: wind, windDir: windDir, gust: gust, cloud: cloud, aqi: aqi, pm25: a ? a.pm25 : null, friction: fr, dryFrac: precip == null ? null : dryFrac };
  });

  // The hour containing NOW, and when wet rock is next expected to be dry.
  let nowI = -1;
  for (let i = 0; i < hours.length; i++) if (hours[i].utc <= now) nowI = i;
  const cur = nowI >= 0 ? hours[nowI] : null;
  let dryFrom = null, dryBeyond = false;
  if (cur && cur.dryFrac != null && cur.dryFrac < 1) {
    for (let i = nowI + 1; i < hours.length; i++) if (hours[i].dryFrac != null && hours[i].dryFrac >= 1) { dryFrom = hours[i]; break; }
    if (!dryFrom) dryBeyond = true;
  }
  // Rain of the past 7 and 14 days, for seepage. `short` when the series starts later than that.
  let rain7 = 0, rain14 = 0, have = false;
  const first = hours.length ? hours[0].utc : now;
  for (const x of hours) { if (x.utc > now || x.precip == null) continue; have = true; if (x.utc > now - 14 * 864e5) rain14 += x.precip; if (x.utc > now - 7 * 864e5) rain7 += x.precip; }
  const seep = have ? { rain7: rain7, rain14: rain14, risk: seepRisk(rain7, rain14), short: first > now - 14 * 864e5 + 3600e3 } : null;

  const daily = forecast.daily || {};
  const sunTimes = {};
  if (daily.time && daily.sunrise) daily.time.forEach(function (t, i) { const sr = daily.sunrise[i], ss = daily.sunset && daily.sunset[i]; const rise = sr == null ? null : utcOf(sr, off), set = ss == null ? null : utcOf(ss, off); if (rise != null && isFinite(rise)) sunTimes[local(rise).date] = { rise: rise, set: set }; });

  const byDate = {};
  for (const x of hours) { if (x.date < today) continue; (byDate[x.date] = byDate[x.date] || []).push(x); }
  // RAIN BY DAY. precipitation[T] is the rain of the hour BEFORE T, so an hour's rain belongs to the
  // day that hour BEGAN in: midnight's value is the previous evening's. `n` counts the hours read, so
  // a day with no precipitation values at all is "not measured", never "dry".
  const rainBy = {};
  for (const x of hours) {
    if (x.precip == null) continue;
    const d = local(x.utc - 3600e3).date, r = rainBy[d] || (rainBy[d] = { sum: 0, hrs: 0, n: 0 });
    r.sum += x.precip; r.n++; if (x.precip > 0) r.hrs++;
  }
  const maxOf = function (xs) { return xs.length ? Math.max.apply(null, xs) : null; }, minOf = function (xs) { return xs.length ? Math.min.apply(null, xs) : null; };
  const vals = function (xs, k) { return xs.map(function (x) { return x[k]; }).filter(function (v) { return v != null; }); };
  const days = Object.keys(byDate).sort().slice(0, 7).map(function (date) {
    const all = byDate[date];
    // Hours already gone are not offered: today's best window must be one you can still climb.
    const day = all.filter(function (x) { return x.daylight && x.stars != null && !x.past; });
    let best = null;
    for (let i = 0; i + 2 < day.length; i++) {
      if (day[i + 2].utc - day[i].utc !== 2 * 3600e3) continue; // three CONSECUTIVE hours
      const m = (day[i].stars + day[i + 1].stars + day[i + 2].stars) / 3;
      if (!best || m > best.stars) best = { start: day[i].hr, end: (day[i + 2].hr + 1) % 24, stars: m, i: i };
    }
    const capWhy = [];
    if (best) for (let k = best.i; k < best.i + 3; k++) for (const c of day[k].caps) { const w = c.why.replace(/ \(AQI \d+\)/, ""); if (!capWhy.includes(w)) capWhy.push(w); }
    const temps = all.map(function (x) { return x.temp; }).filter(function (v) { return v != null; });
    const aqis = all.map(function (x) { return x.aqi; }).filter(function (v) { return v != null; });
    // When the sun is on the wall, from geometry alone (a clear sky), every 5 minutes of the day.
    let on = null, offAt = null;
    if (bearing != null && all.length) {
      for (let u = all[0].utc; u < all[all.length - 1].utc + 3600e3; u += 300e3) {
        if (wallInSun(sunPosition(wall.lat, wall.lng, u), bearing, null)) { if (on == null) on = u; offAt = u + 300e3; }
      }
    }
    // DAY BY DAY: the whole day's temperature range and rain, but wind, humidity and cloud over its
    // DAYLIGHT hours only — a calm night or a foggy dawn is not the day you climb in.
    const dl = all.filter(function (x) { return x.daylight; });
    const feelsAll = vals(all, "feels"), clouds = vals(dl, "cloud"), rhs = vals(dl, "rh");
    const r = rainBy[date];
    return { date: date, all: all, hours: day, best: best, stars: best ? best.stars : null, capWhy: capWhy, hi: temps.length ? Math.max.apply(null, temps) : null, lo: temps.length ? Math.min.apply(null, temps) : null, aqiMax: aqis.length ? Math.max.apply(null, aqis) : null, sun: sunTimes[date] || null, wallSun: bearing == null ? null : { on: on, off: offAt },
      feelsHi: maxOf(feelsAll), feelsLo: minOf(feelsAll),
      rain: r ? r.sum : null, rainHrs: r ? r.hrs : null, popMax: maxOf(vals(all, "pop")),
      windMax: maxOf(vals(dl, "wind")), gustMax: maxOf(vals(dl, "gust")),
      rhMin: minOf(rhs), rhMax: maxOf(rhs), cloudAvg: clouds.length ? clouds.reduce(function (a, b) { return a + b; }, 0) / clouds.length : null };
  });
  return { days: days, band: band, bandKey: bandKey, dryNeed: Math.round(dryNeed), bearing: bearing, aspectVaries: aspectVaries, family: family, sandstone: sandstone, now: cur, dryFrom: dryFrom, dryBeyond: dryBeyond, seep: seep, airMeasured: !!(ah && ah.time), local: local, tz: forecast.timezone || null };
}

/* MONTHLY CLIMATE at the crag, from the archive's daily history: average high and low, wet days
   (≥ 0.04") and rain per calendar month, and the years averaged. Historical averages, never a
   forecast. Null unless every month has data. When the archive was asked for snowfall (the alpine
   card reads it at the top of the climb) each month also carries `snow`, its average total; a crag's
   reading has no `snow` key at all. */
export function monthlyClimate(archive) {
  const d = archive && archive.daily;
  if (!d || !d.time || !d.time.length || !d.temperature_2m_max || !d.temperature_2m_min) return null;
  const m = []; for (let i = 0; i < 12; i++) m.push({ hi: 0, lo: 0, n: 0, wet: 0, rain: 0, days: 0, snow: 0, sdays: 0 });
  const hasSnow = Array.isArray(d.snowfall_sum);
  const years = {};
  d.time.forEach(function (t, i) {
    const mo = parseInt(String(t).slice(5, 7), 10) - 1; if (!(mo >= 0 && mo < 12)) return;
    const hi = num(d.temperature_2m_max[i]), lo = num(d.temperature_2m_min[i]), p = num(d.precipitation_sum && d.precipitation_sum[i]);
    if (hi != null && lo != null) { m[mo].hi += hi; m[mo].lo += lo; m[mo].n++; }
    if (p != null) { m[mo].days++; m[mo].rain += p; if (p >= 0.04) m[mo].wet++; }
    const sn = hasSnow ? num(d.snowfall_sum[i]) : null;
    if (sn != null) { m[mo].sdays++; m[mo].snow += sn; }
    years[String(t).slice(0, 4)] = 1;
  });
  if (m.some(function (x) { return !x.n || !x.days; })) return null;
  const ys = Object.keys(years).sort();
  const DIM = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return { years: ys[0] + "–" + ys[ys.length - 1], months: m.map(function (x, i) { const o = { hi: x.hi / x.n, lo: x.lo / x.n, wetDays: x.wet / x.days * DIM[i], rain: x.rain / x.days * DIM[i] }; if (hasSnow) o.snow = x.sdays ? x.snow / x.sdays * DIM[i] : null; return o; }) };
}
// PRIME: the month's average high is inside the climber's band and fewer than 12 days are wet.
// GOOD: within 6° of the band and fewer than 16 wet days.
export function monthFit(mo, band) {
  if (!mo) return null;
  const inBand = mo.hi >= band[0] && mo.hi <= band[1], near = mo.hi >= band[0] - 6 && mo.hi <= band[1] + 6;
  return inBand && mo.wetDays < 12 ? "prime" : near && mo.wetDays < 16 ? "good" : "off";
}

export function starsLabel(s) { return s == null ? "No score" : s >= 4 ? "Good" : s >= 2.5 ? "Fair" : "Poor"; }
export const CRAG_SCORE_DISCIPLINES = ["sport", "trad", "toprope", "bouldering"];

// The climber's own ideal conditions, kept on this device (signed out too). 'auto' follows the
// discipline's default band.
export const BAND_PREF = definePref("climbmatch-cond-band", ["auto", "cool", "standard", "warm"], "auto");
export const RAIN_PREF = definePref("climbmatch-cond-rain", ["normal", "cautious"], "normal");

// A day picked on Home's "Best day to climb" table, handed to the route's Conditions card so it
// opens on that day. One-shot: the card takes it on mount and clears it.
export const OPEN_DAY = { date: null };
