/* THE CONDITIONS SCORE — how good the climbing is, hour by hour, at a CRAG (sport, trad, top-rope,
   bouldering). Pure: takes the crag forecast (lib/forecast.js fetchCragForecast) and what the app
   knows about the wall, returns stars and the reasons for them. Rendered by ConditionsScoreCard in
   RouteDetail.jsx; checked by scripts/check-conditions-score.mjs.

   FIVE FACTORS, each worth a fixed number of points (WEIGHTS, 100 in all):
     temperature  full inside the climber's range (dragged both ends), fading to nothing 25°F below /
                  20°F above it. The range is theirs: one for all climbing, optionally another per
                  discipline (lib/CondPrefs.jsx), else the preset for the discipline;
     humidity     full up to the climber's ceiling (40% unless they set one), nothing 50 points past
                  it (never past 100%) — friction (with the dew point, the card's friction reading:
                  crisp / okay / greasy / damp, which stays a reading of the air, not a preference);
     dry rock     drying credit earned since the last rain (faster in sun and wind, slower at
                  night and in humid air, none at the dew point) against how long THIS rock takes
                  to dry (lib/rockType.js DRY_HOURS by family, scaled by how much rain fell),
                  discounted by the chance of more rain;
     wind         full inside the climber's range (default calm to 10 mph), nothing 25 mph above it
                  and, when the bottom is above calm, nothing 10 mph below it; a gust counts at 70%;
     sun / shade  whether the wall is in sun this hour (the sun's real position for the date,
                  the wall's aspect, and cloud) against whether the climber wants sun or shade —
                  which they can say, else it follows their temperature range (sun when cold, shade
                  when hot).
   OPTIONAL, all of them: a climber who sets none gets exactly the score they always had. The ones
   they can set are the temperature range, the wind and humidity they accept, a sun / shade
   preference, an air-quality sensitivity, and a daylight window (the hours the best window may
   fall in — it never hides an hour, it only decides which three can be recommended).
   A factor whose input is MISSING is left out, and the hour's stars are its points over the points
   that WERE measured: an unknown aspect is "not measured", never a zero and never a pass.
   CAPS: some conditions end the climbing outright — rain in the past hour, rock still wet (or any
   wet sandstone; rock not yet dry is held to 2 or 3.5 stars, WET_BANDS), air at its dew point, smoke. Summed factors could not say that (an hour of rain
   still read "Fair"), so each such condition caps the hour's stars and carries its reason, which
   the card prints. Stars are exactly min(5 × points / measured points, the lowest cap) — the
   factor rows still add up to the points line, and the cap says why the stars are lower. */
import { DRY_HOURS, DRY_HOURS_UNKNOWN } from "./rockType.js";
import { definePref, defineRangePref } from "./prefs.js";

export const WEIGHTS = { temp: 30, humidity: 20, dry: 25, wind: 10, sun: 15 };
export const FACTOR_LABEL = { temp: "Temperature", humidity: "Humidity", dry: "Dry rock", wind: "Wind", sun: "Sun / shade" };
// The ideal air-temperature band, °F. Bouldering defaults cooler: friction is the whole game.
export const TEMP_BANDS = { cool: [35, 58], standard: [45, 68], warm: [55, 78] };
export function defaultBand(discipline) { return discipline === "bouldering" ? "cool" : "standard"; }
// Humidity the score is happy with, %. The fade is 50 points wide but never runs past 100%.
export const RH_FULL_PCT = 40, RH_FADE_PCT = 50;
export const rhZero = function (full) { return Math.min(100, full + RH_FADE_PCT); };
/* Air quality (US AQI): [above this the hour is held to 2 stars, above this to 1 star]. The default is
   the EPA's "Unhealthy" and "Very unhealthy" lines. "sensitive" is for lungs that react earlier (the EPA's
   101-150 band is "unhealthy for sensitive groups"). "relaxed" moves both lines up one band, never
   off: above AQI 300, "Hazardous", the hour is held to 1 star whatever the climber asked for. */
export const AQ_LIMITS = { sensitive: [100, 150], default: [150, 200], relaxed: [200, 300] };
export const aqiHeading = function (a) { return a > 300 ? "Hazardous air" : a > 200 ? "Very unhealthy air" : a > 150 ? "Unhealthy air" : "Unhealthy air for sensitive groups"; };
/* The range, °F, a climber wants for one discipline. Order of authority: the range they set for THIS
   discipline, the range they set for all climbing, a preset they chose (prefs.band, kept for older
   callers), the discipline's own default. `prefs.temp` is { all, sport, trad, toprope, bouldering },
   each [lo, hi] or absent. `prefs.tempRange` (one range, no discipline) is the older single-range shape
   and reads as "custom". Returns { range, source } so a screen can say where the range came from. */
export function resolveRange(prefs, discipline) {
  const ok = function (r) { return Array.isArray(r) && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[0] < r[1]; };
  const t = prefs && prefs.temp;
  if (t && ok(t[discipline])) return { range: [t[discipline][0], t[discipline][1]], source: "discipline" };
  if (t && ok(t.all)) return { range: [t.all[0], t.all[1]], source: "all" };
  if (prefs && TEMP_RANGE_PREF.valid(prefs.tempRange)) return { range: [prefs.tempRange[0], prefs.tempRange[1]], source: "custom" };
  if (prefs && TEMP_BANDS[prefs.band]) return { range: TEMP_BANDS[prefs.band], source: "preset" };
  return { range: TEMP_BANDS[defaultBand(discipline)], source: "default" };
}

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
function humPts(rh, full) {
  if (rh == null) return null;
  const zero = rhZero(full);
  return rh <= full ? 1 : rh >= zero ? 0 : (zero - rh) / (zero - full);
}
/* The wind the climber is happy with, mph: full score INSIDE [lo, hi], nothing 25 mph above hi (the
   10-to-35 fade this always had), and, for a climber who WANTS a breeze, fading over 10 mph below lo.
   Unchosen it is [0, 10], which reproduces the fixed rule exactly. */
export const WIND_DEFAULT = [0, 10];
export const WIND_FADE_UP = 25, WIND_FADE_DOWN = 10;
function windPts(w, g, range) {
  if (w == null && g == null) return null;
  const [lo, hi] = range || WIND_DEFAULT;
  const eff = Math.max(w || 0, (g || 0) * 0.7);
  return eff > hi ? Math.max(0, 1 - (eff - hi) / WIND_FADE_UP) : eff < lo ? Math.max(0, 1 - (lo - eff) / WIND_FADE_DOWN) : 1;
}
/* The wind range a prefs object asks for: `wind` (the store's), `windRange` (the older single-store
   shape), or `windMax` (an older "up to" limit, read as calm to that). Null = the default rule. */
export function resolveWind(prefs) {
  if (!prefs) return null;
  if (WIND_RANGE_PREF.valid(prefs.wind)) return [prefs.wind[0], prefs.wind[1]];
  if (WIND_RANGE_PREF.valid(prefs.windRange)) return [prefs.windRange[0], prefs.windRange[1]];
  if (isFinite(prefs.windMax) && prefs.windMax >= 3 && prefs.windMax <= 40) return [0, +prefs.windMax];
  return null;
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
   with utc_offset_seconds (the guard's fixtures) still work. The alpine card reads its local time
   through this same function (lib/alpineConditions.js localAt). */
const _fmt = {};
export function localFn(tz, off) {
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
   1 for a plain hour (day or night), less in humid air or at the dew point, more in sun or wind. The
   rock counts as dry when the credit reaches its family's drying hours (DRY_HOURS), scaled by the
   rain of the 24 hours before it stopped: a passing drizzle needs half as long, a soaking up to 1.75
   times. DRY_RATE was sped up on 2026-10-15 (owner: "probably speed it up"): it used to give nothing
   at the dew point, 0.6 at night and 0.3 at 90% humidity, so a Northwest night after rain dried
   almost nothing and Exit 38 was 42% dry at 8 AM the next day. Fitted against CragReport's hourly
   surface dryness at Index, Exit 38, Mt Erie and Squamish (one storm, 169 hours): mean error 0.21 ->
   0.12, bias -0.16 -> -0.05. A full fit wants night FASTER than day, which is not physical; the rest
   of the gap is CragReport's shorter drying times, and DRY_HOURS stays on the published guidance. */
export const DRY_RATE = { damp: 0.6, night: 1, rh90: 0.6, rh75: 0.9, rhDry: 1.15, wind: 1.15, sun: 1.3 };
function dryRate(daylight, rh, wind, sunny, spread) {
  const k = DRY_RATE;
  if (spread != null && spread < DAMP_SPREAD) return k.damp;
  let r = daylight ? 1 : k.night;
  if (rh != null) r *= rh >= 90 ? k.rh90 : rh >= 75 ? k.rh75 : rh <= 50 ? k.rhDry : 1;
  if (wind != null && wind >= 8) r *= k.wind;
  if (sunny) r *= k.sun;
  return r;
}
/* WET ROCK holds the hour down until the drying model says the rock is DRY, in three steps:
   [dry fraction below this, stars at most]. One cap at 30% used to be the whole rule, and Dry rock is
   only 25 of the 100 points, so an hour the card itself called "about 50% dry" scored 4.3 stars,
   "Good", in green beside a red morning (Exit 38, the day after 0.2" of rain). A wet hour now reads
   red until it is mostly dry and amber until it is dry; green means the model expects dry rock. */
export const WET_BANDS = [[0.3, 1], [0.7, 2], [1, 3.5]];
export function rainScale(rain24) { return Math.max(0.5, Math.min(1.75, 0.5 + (rain24 || 0) / 0.4)); }
const utcOf = function (t, off) { return typeof t === "number" ? t * 1000 : Date.parse(t + ":00Z") - off; };

/* MEASURED PAST RAIN written over the model's (lib/forecast.js fetchMeasuredRain). `measured.windows` is
   [{ end: utc ms, hours: 1 | 6, inch }]: the rain that fell in the `hours` ending at `end`. precipitation[T] is
   the rain of the hour ending at T, so a window covers the hours ending at end, end-1h, ... A 6-hour total is
   spread over its hours in the proportions the model had them (evenly when the model had none): the
   measurement decides HOW MUCH, the model only WHEN within those six hours. A window not wholly inside the
   series is skipped; an hour no window covers keeps the model's value, so a gap never reads as dry.
   Returns a NEW forecast carrying `_rainMeasured: { kind, from, through, windows }`. */
export function mergeMeasuredRain(forecast, measured) {
  const h = forecast && forecast.hourly;
  if (!h || !h.time || !h.precipitation || !measured || !measured.windows || !measured.windows.length) return forecast;
  const off = (forecast.utc_offset_seconds || 0) * 1000;
  const idx = {};
  h.time.forEach(function (t, i) { idx[utcOf(t, off)] = i; });
  const M = h.precipitation, P = M.slice();
  let from = null, through = null, n = 0;
  for (const w of measured.windows) {
    const is = [];
    for (let k = 0; k < w.hours; k++) { const i = idx[w.end - k * 3600e3]; if (i != null) is.push(i); }
    if (is.length !== w.hours || !(w.inch >= 0)) continue;
    const model = is.reduce(function (a, i) { return a + (M[i] > 0 ? M[i] : 0); }, 0);
    for (const i of is) P[i] = Math.round(w.inch * (model > 0 ? (M[i] > 0 ? M[i] : 0) / model : 1 / w.hours) * 10000) / 10000;
    const start = w.end - w.hours * 3600e3;
    if (from == null || start < from) from = start;
    if (through == null || w.end > through) through = w.end;
    n++;
  }
  if (!n) return forecast;
  return Object.assign({}, forecast, { hourly: Object.assign({}, h, { precipitation: P }), _rainMeasured: { kind: measured.kind, from: from, through: through, windows: n } });
}

/* Score one forecast.
   forecast  the Open-Meteo JSON from fetchCragForecast;
   wall      { lat, lng, aspect (free text or null), family (rock family or null), rock (the specific rock, optional), discipline };
   prefs     { temp: { all, sport, trad, toprope, bouldering }, wind: [lo, hi] mph, rhMax, sun: 'sun'|'shade'|'either',
               aq: 'sensitive'|'relaxed', window: [startHr, endHr], rainCaution: 'normal'|'cautious' } (optional;
             the older shapes still work: `tempRange` (one range, bandKey 'custom'), `windRange`, `windMax`,
             and `band: 'cool'|'standard'|'warm'` for a caller that has only a preset);
   nowMs     for tests;
   air       the Open-Meteo air-quality JSON (optional; missing is "not measured", never "clean"). */
export function scoreForecast(forecast, wall, prefs, nowMs, air) {
  const h = forecast && forecast.hourly;
  if (!h || !h.time) return null;
  const now = nowMs == null ? Date.now() : nowMs;
  const off = (forecast.utc_offset_seconds || 0) * 1000;
  const local = localFn(forecast.timezone, off);
  const rr = resolveRange(prefs, wall.discipline);
  // A preset or the default reads as its band's name ('warm', 'cool'); a set range as where it came from.
  const band = rr.range, bandKey = rr.source === "preset" ? prefs.band : rr.source === "default" ? defaultBand(wall.discipline) : rr.source;
  const windRange = resolveWind(prefs);
  const rhFull = prefs && isFinite(prefs.rhMax) && prefs.rhMax >= 30 && prefs.rhMax <= 85 ? +prefs.rhMax : RH_FULL_PCT;
  const sunPref = prefs && (prefs.sun === "sun" || prefs.sun === "shade" || prefs.sun === "either") ? prefs.sun : null;
  const aqLimits = AQ_LIMITS[prefs && prefs.aq] || AQ_LIMITS.default;
  const win = prefs && Array.isArray(prefs.window) && prefs.window.length === 2 && isFinite(prefs.window[0]) && isFinite(prefs.window[1]) && prefs.window[1] - prefs.window[0] >= 3 ? [+prefs.window[0], +prefs.window[1]] : null;
  // A window's hours are the HOURS A CLIMB MAY START: three whole hours must sit inside it.
  const inWin = function (x) { return !win || (x.hr >= win[0] && x.hr < win[1]); };
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
    const hp = humPts(rh, rhFull);
    const fr = frictionOf(temp, rh, dew, band);
    f.humidity = hp == null ? null : { pts: hp * WEIGHTS.humidity, val: rh, dew: dew, damp: damp, friction: fr };
    if (precip == null) f.dry = null;
    else {
      let dryF = dryFrac * (pop == null ? 1 : 1 - 0.6 * pop / 100);
      if (damp) dryF = Math.min(dryF, 0.25);
      f.dry = { pts: dryF * WEIGHTS.dry, val: sinceRain, atLeast: sinceRainAtLeast, raining: rained, precip: precip, frac: dryFrac, need: Math.round(need), rain24: sinceRainAtLeast ? 0 : rain24At, pop: pop, damp: damp };
    }
    const wp = windPts(wind, gust, windRange);
    f.wind = wp == null ? null : { pts: wp * WEIGHTS.wind, val: wind, gust: gust };
    if (lit == null || temp == null) f.sun = null;
    else {
      // Said by the climber, else read from their temperature range. "either" said outright is full
      // marks (they do not mind); "either" reached by the range is the old 0.85.
      const wantSun = sunPref ? sunPref === "sun" : temp < band[0] + 5, wantShade = sunPref ? sunPref === "shade" : temp > band[1] - 5;
      const sf = sunPref === "either" ? 1 : wantSun ? (lit ? 1 : 0.4) : wantShade ? (lit ? 0.2 : 1) : 0.85;
      f.sun = { pts: sf * WEIGHTS.sun, lit: lit, want: wantSun ? "sun" : wantShade ? "shade" : "either", said: !!sunPref };
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
    else if (!sinceRainAtLeast && dryFrac < WET_BANDS[0][0]) caps.push({ stars: WET_BANDS[0][1], why: "Rock still wet from rain" });
    else if (!sinceRainAtLeast && dryFrac < WET_BANDS[1][0]) caps.push({ stars: WET_BANDS[1][1], why: "Rock still drying from rain" });
    else if (!sinceRainAtLeast && dryFrac < 1) caps.push({ stars: WET_BANDS[2][1], why: "Rock may still be damp from rain" });
    if (damp) caps.push({ stars: 2, why: "Air at its dew point — rock may be damp" });
    const a = aq[utc] || null;
    const aqi = a ? a.aqi : null;
    if (aqi != null && aqi > aqLimits[1]) caps.push({ stars: 1, why: aqiHeading(aqi) + " (AQI " + Math.round(aqi) + ")" });
    else if (aqi != null && aqi > aqLimits[0]) caps.push({ stars: 2, why: aqiHeading(aqi) + " (AQI " + Math.round(aqi) + ")" });
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
    const d = local(x.utc - 3600e3).date, r = rainBy[d] || (rainBy[d] = { sum: 0, hrs: 0, n: 0, from: null, to: null });
    r.sum += x.precip; r.n++;
    // WHEN it rains, not only how much: the hour the first wet hour began and the hour the last one ended.
    if (x.precip > 0) { r.hrs++; const b = local(x.utc - 3600e3).hr; if (r.from == null) r.from = b; r.to = x.hr; }
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
      if (!inWin(day[i]) || !inWin(day[i + 2])) continue; // all three inside the climber's daylight window
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
      rain: r ? r.sum : null, rainHrs: r ? r.hrs : null, rainFrom: r ? r.from : null, rainTo: r ? r.to : null, popMax: maxOf(vals(all, "pop")),
      windMax: maxOf(vals(dl, "wind")), gustMax: maxOf(vals(dl, "gust")),
      rhMin: minOf(rhs), rhMax: maxOf(rhs), cloudAvg: clouds.length ? clouds.reduce(function (a, b) { return a + b; }, 0) / clouds.length : null };
  });
  return { rainMeasured: forecast._rainMeasured || null, days: days, band: band, bandKey: bandKey, windRange: windRange || WIND_DEFAULT, rhFull: rhFull, sunPref: sunPref, aqLimits: aqLimits, window: win, dryNeed: Math.round(dryNeed), bearing: bearing, aspectVaries: aspectVaries, family: family, sandstone: sandstone, now: cur, dryFrom: dryFrom, dryBeyond: dryBeyond, seep: seep, airMeasured: !!(ah && ah.time), local: local, tz: forecast.timezone || null };
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
/* A month is judged by the part of the day a party climbs, not by its afternoon high alone. Its
   climbing day runs from the morning (a fifth of the way from the average low to the average
   high, about 8 am in summer) up to that high: a hot month is climbed in the cool morning and
   evening, a cold one in the afternoon. Judging the high alone called July and August "off"
   across Canada (the archive puts Squamish at 79 °F in the afternoon and about 61 °F in the
   morning), the months climbers actually go (owner note 2026-10-24).
   PRIME: the climbing day comes within 3° of the climber's band (a monthly average is not finer
   than that), its afternoon is no more than 24° above the band (past that only a dawn session is
   left: Red Rock or Bishop in summer), and the month is dry: fewer than 12 wet days, or fewer than
   16 that add up to under 4 in. (summer thunderstorms in the Rockies and Ontario are many short
   showers, not the coast's winter rain: Lake Louise's July is 12 wet days and 2.2 in.).
   GOOD: within 6° of the band and fewer than 16 wet days. */
export function monthDay(mo) { return [mo.lo + (mo.hi - mo.lo) / 5, mo.hi]; }
export function monthFit(mo, band) {
  if (!mo) return null;
  const d = monthDay(mo), gap = d[1] < band[0] ? band[0] - d[1] : d[0] > band[1] ? d[0] - band[1] : 0;
  const dry = mo.wetDays < 12 || (mo.wetDays < 16 && mo.rain < 4);
  return gap <= 3 && mo.hi <= band[1] + 24 && dry ? "prime" : gap <= 6 && mo.wetDays < 16 ? "good" : "off";
}

export function starsLabel(s) { return s == null ? "No score" : s >= 4 ? "Good" : s >= 2.5 ? "Fair" : "Poor"; }
export const CRAG_SCORE_DISCIPLINES = ["sport", "trad", "toprope", "bouldering"];

// The climber's own ideal conditions, kept on this device (signed out too). 'auto' follows the
// discipline's default band.
export const BAND_PREF = definePref("climbmatch-cond-band", ["auto", "cool", "standard", "warm"], "auto");
// A range the climber drags out, in deg F and mph. Nothing stored = follow the default band / wind rule.
export const TEMP_RANGE_PREF = defineRangePref("climbmatch-cond-temp", 10, 110, 4);
export const WIND_RANGE_PREF = defineRangePref("climbmatch-cond-wind", 0, 40, 3);
export const RAIN_PREF = definePref("climbmatch-cond-rain", ["normal", "cautious"], "normal");

// A day picked on Home's "Best day to climb" table, handed to the route's Conditions card so it
// opens on that day. One-shot: the card takes it on mount and clears it.
export const OPEN_DAY = { date: null };
