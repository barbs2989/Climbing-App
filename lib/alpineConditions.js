// Conditions for alpine, mountaineering, scrambling, ice and mixed routes: FLAGS, never a score.
//
// There is no published alpine go/no-go standard to score against (owner decision 2026-10-07), and
// the five disciplines do not even agree on which direction a number is bad in -- a cold, clear night
// is GOOD for a glacier (the bridges refreeze) and BAD for a scramble (frost and verglas on the
// holds), a thaw is BAD for waterfall ice and BUILDS snow-ice on a turf route. So each route is read
// as one KIND, and each kind gets only the flags that mean something for it. The research behind
// every threshold is in docs/guards/honesty-claims.md (check:alpine-conditions); a number with no
// published source is labelled a rule of thumb there, and the screen never calls one a standard.
//
// Pure: no fetch, no React. lib/AlpineConditionsCard.jsx feeds it an Open-Meteo hourly series
// (temperature_unit=fahrenheit, wind mph, precipitation inch -- which also makes freezing_level_height
// FEET -- timeformat=unixtime, past_days for the temperature history ice needs).

export const ALPINE_COND_DISCIPLINES = ["alpine", "mountaineering", "scrambling", "ice", "mixed"];

/* Every threshold, with where it comes from. "published" = a named authority states it; "rule of
   thumb" = several practitioners repeat it; "single source" = one guide or one paper. */
export const LIMITS = {
  gustCaution: 30,      // mph. Rule of thumb: 14ers.com / Met Office mountain forecasts put ridge turnarounds at 30-45 mph.
  gustWarn: 50,         // mph. Met Office: gale is "gusts over 50mph".
  windChillWarn: -18,   // F. NWS wind-chill chart: frostbite on exposed skin in 30 minutes from about -18 F.
  thunderCape: 400,     // J/kg. Single source: a 1994 New Mexico study found CAPE above 400 J/kg useful in predicting lightning. NWS: no CAPE threshold makes storms certain, so this only says "possible".
  thunderOffBy: 12,     // clock hour. Published but disagreeing: CFI 2026 "back to tree line by noon"; Roach "off summits by noon"; CFI 2020 "off summit by 10 a.m.".
  snowNewCaution: 6,    // in / 24 h at the summit band. Avalanche Canada's report prompt names 30 cm in 48 h; ~6 in in a day is half of the "foot in 24 h" instability rule of thumb.
  snowNewWarn: 12,      // in / 24 h. Rule of thumb: "a foot or more of new snow in 24 hours" = obvious instability.
  iceSnowCaution: 2,    // in / 24 h. Single source (Gadd): more than 5 cm in 24 h, stay to simple terrain.
  iceSnowWarn: 4,       // in / 24 h. Single source (Gadd): more than 10 cm, wait 24 h.
  iceGust: 25,          // mph. Single source (Gadd): snow transport starts ~20 km/h, "really moving" ~40 km/h (25 mph) -- loading the bowl above the gully.
  iceWarmNight: 32,     // F. Weiss et al. 2011 (J. Glaciology, published): prolonged >0 C INCLUDING AT NIGHT is the most destabilising condition; DeBruin's chart (single source): "overnight temp over 32F".
  iceWarmDays: 3,       // days with a high over 34 F in a row -- DeBruin (single source).
  iceWarmHigh: 34,
  iceRise48: 20,        // F rise in 48 h -- DeBruin (single source).
  iceDrop6: 15,         // F fall in 6 h. Weiss et al. (published mechanism, "several C per hour over several hours"); the 15 F / 6 h cut is ours.
  iceColdDays: 3,       // days below freezing in the last 7 before ice can be in. Single source (a forum answer): "several days (up to a week)".
  mixedFrozenDays: 10,  // of the last 14 with a high below freezing. Single source (Abacus): blocks need "a couple of weeks of sub-zero conditions".
  wetRock48: 0.1,       // in of rain in the 48 h before the climb. No published drying time exists; this only says rain fell.
  showerProb: 40,       // % precipitation probability in daylight for a rock route.
  spreadGust: 40,       // mph between the models' highest gust of the day. Ours: no published threshold exists.
  spreadHigh: 12,       // F between the models' highs. Ours.
  spreadFreezeFt: 3000, // ft between the models' mean freezing level. Ours. All three sit near the 90th percentile of
                        // the spread measured at six summits over 7 days (2026-10-07): summit gusts disagree by a
                        // median 21 mph on ORDINARY days, so a lower cut flagged most days and meant nothing.
  descentShareOfPush: 0.69, // the way down from camp as a share of the way up: 0.41 / 0.59, the catalog's own complete rows (lib/planTimes.js).
};

// One KIND per route. `terrain` is lib/terrain.js routeTerrain(route): {glacier, snow, ...} as "yes"/"no"/"unknown".
// `disc` is catOf(route) -- the CATEGORY the route page gates on, which turns a trad route that
// climbs a peak into "alpine". Reading the raw discipline instead would leave that route with a
// Conditions tab and no card.
export function condKind(route, terrain, disc) {
  const d = String(disc || (route && route.discipline) || "").toLowerCase();
  const g = String((route && route.grade) || "");
  const snowInGrade = /snow/i.test(g);
  if (d === "ice") return (/\bAI\s*\d/i.test(g) || snowInGrade || isPeak(route)) ? "alpineice" : "waterfall";
  if (d === "mixed") return (snowInGrade || isPeak(route) || (route.pitches || 0) >= 4 || (route.routeFt || 0) >= 820) ? "alpineice" : "cragmixed";
  if (d === "mountaineering") return terrain && terrain.snow === "no" ? "scramble" : "glacier";
  if (d === "scrambling") return "scramble";
  if (d === "alpine") return "alpinerock";
  return null;
}
function isPeak(route) { const a = route && route._dbArea; return !!(a && a.areaType === "peak"); }

// Does this kind carry snow-softening logic? Alpine rock and scrambles do when the route itself
// says it crosses snow (a snow approach or descent gully softens like any other).
export function hasSnowLegs(kind, terrain) {
  return kind === "glacier" || kind === "alpineice" || ((kind === "alpinerock" || kind === "scramble") && !!terrain && terrain.snow === "yes");
}

/* NWS wind chill (F, mph). Defined for T <= 50 F and V >= 3 mph; outside that it is the air temperature. */
export function windChillF(t, v) {
  if (t == null || v == null || t > 50 || v < 3) return t;
  const p = Math.pow(v, 0.16);
  return 35.74 + 0.6215 * t - 35.75 * p + 0.4275 * t * p;
}

/* Split an Open-Meteo unixtime series into LOCAL days. Each day carries the indices of its own hours
   and of the NIGHT before it (18:00 the evening before to its sunrise), which is when a refreeze
   happens or does not. */
export function localDays(fc) {
  const h = fc && fc.hourly; if (!h || !h.time) return [];
  const off = (fc.utc_offset_seconds || 0) * 1000, out = [], byDate = {};
  h.time.forEach(function (t, i) {
    const d = new Date(t * 1000 + off).toISOString().slice(0, 10);
    if (!byDate[d]) { byDate[d] = { date: d, hours: [] }; out.push(byDate[d]); }
    byDate[d].hours.push(i);
  });
  const sun = {};
  if (fc.daily && fc.daily.time) fc.daily.time.forEach(function (t, i) { sun[new Date(t * 1000 + off).toISOString().slice(0, 10)] = { rise: fc.daily.sunrise[i], set: fc.daily.sunset[i] }; });
  out.forEach(function (day, k) {
    day.sunrise = sun[day.date] ? sun[day.date].rise : null;
    day.sunset = sun[day.date] ? sun[day.date].set : null;
    const prev = out[k - 1];
    const eve = prev ? prev.hours.filter(function (i) { return localHour(fc, i) >= 18; }) : [];
    const morn = day.hours.filter(function (i) { return day.sunrise != null ? h.time[i] < day.sunrise : localHour(fc, i) < 6; });
    day.night = eve.concat(morn);
  });
  return out;
}
export function localHour(fc, i) { return new Date(fc.hourly.time[i] * 1000 + (fc.utc_offset_seconds || 0) * 1000).getUTCHours(); }
const pick = (fc, k, idx) => idx.map(function (i) { return fc.hourly[k] ? fc.hourly[k][i] : null; }).filter(function (x) { return typeof x === "number" && isFinite(x); });
const mx = (a) => (a.length ? Math.max.apply(null, a) : null);
const mn = (a) => (a.length ? Math.min.apply(null, a) : null);
const sum = (a) => a.reduce(function (s, x) { return s + x; }, 0);

/* The hour (unix s) after sunrise when the freezing level first rises above `ft`: the air at that
   height goes above 0 C and the snow there starts to soften. null = it stays frozen all day. */
export function softensAt(fc, day, ft) {
  if (ft == null) return null;
  const h = fc.hourly;
  for (const i of day.hours) {
    if (day.sunrise != null && h.time[i] < day.sunrise) continue;
    if (typeof h.freezing_level_height[i] === "number" && h.freezing_level_height[i] > ft) return h.time[i];
  }
  return null;
}
// Hours of the night before `day` with the freezing level BELOW `ft` (the snow there below 0 C).
export function freezeHours(fc, day, ft) {
  if (ft == null) return null;
  return day.night.filter(function (i) { const v = fc.hourly.freezing_level_height[i]; return typeof v === "number" && v < ft; }).length;
}
// First daylight hour with a thunderstorm weather code (95-99), or with CAPE over the cut AND rain
// in the air. {at, likely}; null when neither.
export function thunderOnset(fc, day) {
  const h = fc.hourly;
  for (const i of day.hours) {
    if (h.is_day && h.is_day[i] === 0) continue;
    if (h.weather_code && h.weather_code[i] >= 95) return { at: h.time[i], likely: true };
  }
  for (const i of day.hours) {
    if (h.is_day && h.is_day[i] === 0) continue;
    const wet = (h.showers && h.showers[i] > 0) || (h.precipitation_probability && h.precipitation_probability[i] >= 30);
    if (h.cape && h.cape[i] >= LIMITS.thunderCape && wet) return { at: h.time[i], likely: false };
  }
  return null;
}

/* The flags for one day. ctx = {
     kind, terrain,
     highFt     -- the route's high point (summit / top of the climbing), the forecast's elevation;
     snowFt     -- the lowest snow the party must recross (highest camp, else halfway up the gain);
     legs       -- {up, down, fromCamp, floor}: hours, from lib/planTimes.js. fromCamp = the day starts
                   at a high camp; floor = the legs are lower bounds, so NO start time is given.
   }
   Returns {flags: [{key, level: "warn"|"caution", v}], start: {at, why} | null, softAt, thunder}.
   A flag carries VALUES (canonical F, mph, inch, ft), never words: the card words it in the
   climber's own units (check:units), so this module stays free of display. */
/* MODELS DISAGREE: one local day, read from each forecast model -- its highest gust, its high, and
   its mean freezing level -- and how far apart the models sit. `over` names what is past LIMITS.
   Null when fewer than two models answered for anything that day: one model is no comparison, and
   it never reads as "they agree". `sp` is fetchAlpineSpread()'s response. */
export function modelSpread(sp, date, models) {
  const h = sp && sp.hourly;
  if (!h || !Array.isArray(h.time)) return null;
  const off = sp.utc_offset_seconds || 0, ms = models || ["gfs_seamless", "icon_seamless", "ecmwf_ifs025"];
  const idx = [];
  h.time.forEach(function (t, i) { if (new Date((t + off) * 1000).toISOString().slice(0, 10) === date) idx.push(i); });
  if (!idx.length) return null;
  const per = function (field, reduce) {
    return ms.map(function (m) { const a = h[field + "_" + m]; if (!Array.isArray(a)) return null; const v = idx.map(function (i) { return a[i]; }).filter(function (x) { return typeof x === "number"; }); return v.length ? reduce(v) : null; }).filter(function (x) { return x != null; });
  };
  const max = function (v) { return Math.max.apply(null, v); }, mean = function (v) { return v.reduce(function (a, b) { return a + b; }, 0) / v.length; };
  const range = function (v) { return v.length >= 2 ? [Math.min.apply(null, v), Math.max.apply(null, v)] : null; };
  const gust = range(per("wind_gusts_10m", max)), high = range(per("temperature_2m", max)), fl = range(per("freezing_level_height", mean));
  if (!gust && !high && !fl) return null;
  const over = [];
  if (gust && gust[1] - gust[0] >= LIMITS.spreadGust) over.push("gust");
  if (high && high[1] - high[0] >= LIMITS.spreadHigh) over.push("high");
  if (fl && fl[1] - fl[0] >= LIMITS.spreadFreezeFt) over.push("fl");
  return { gust, high, fl, over };
}

export function dayFlags(fc, days, k, ctx) {
  const day = days[k], h = fc.hourly, flags = [], kind = ctx.kind;
  const add = (key, level, v) => flags.push({ key, level, v: v || {} });
  const dayIdx = day.hours.filter(function (i) { return !h.is_day || h.is_day[i] === 1; });
  const gust = mx(pick(fc, "wind_gusts_10m", dayIdx));
  const prior = (n) => { const out = []; for (let j = k - n; j < k; j++) if (days[j]) out.push.apply(out, days[j].hours); return out; };
  const before48 = prior(2), snow24 = sum(pick(fc, "snowfall", prior(1))), rain48 = sum(pick(fc, "rain", before48));
  const snowToday = sum(pick(fc, "snowfall", day.hours));
  const thunder = thunderOnset(fc, day);
  let softAt = null, start = null;

  if (kind === "waterfall" || kind === "cragmixed") {
    // Temperature HISTORY at the climb, not the day's softening (Weiss et al.; Parks Canada).
    const nightMin = mn(pick(fc, "temperature_2m", day.night));
    const highs = []; for (let j = k - 6; j <= k; j++) if (days[j]) highs.push(mx(pick(fc, "temperature_2m", days[j].hours)));
    if (kind === "waterfall") {
      if (nightMin != null && nightMin > LIMITS.iceWarmNight) add("ice-warm-night", "warn", { low: nightMin });
      let run = 0, best = 0; highs.forEach(function (t) { run = t != null && t > LIMITS.iceWarmHigh ? run + 1 : 0; best = Math.max(best, run); });
      if (best >= LIMITS.iceWarmDays) add("ice-warm-run", "warn", { days: best });
      const t48 = pick(fc, "temperature_2m", before48.concat(day.hours.slice(0, 6)));
      if (t48.length > 1 && t48[t48.length - 1] - mn(t48) >= LIMITS.iceRise48) add("ice-rise", "caution", { delta: t48[t48.length - 1] - mn(t48) });
      const tt = pick(fc, "temperature_2m", day.hours); let drop = 0; for (let a = 0; a + 6 < tt.length; a++) drop = Math.max(drop, tt[a] - tt[a + 6]);
      if (drop >= LIMITS.iceDrop6) add("ice-drop", "caution", { delta: drop });
      if (rain48 + sum(pick(fc, "rain", day.hours)) > 0.02) add("ice-rain", "warn");
      const cold = highs.slice(0, -1).filter(function (t) { return t != null && t < 32; }).length;
      if (cold < LIMITS.iceColdDays) add("ice-not-in", "caution", { cold: cold });
      if (snow24 >= LIMITS.iceSnowWarn) add("ice-snow", "warn", { inch: snow24 });
      else if (snow24 >= LIMITS.iceSnowCaution) add("ice-snow", "caution", { inch: snow24 });
      if (gust != null && gust >= LIMITS.iceGust) add("ice-wind", "caution", { gust: gust });
    } else {
      const highs14 = []; for (let j = k - 14; j < k; j++) if (days[j]) highs14.push(mx(pick(fc, "temperature_2m", days[j].hours)));
      const frozen = highs14.filter(function (t) { return t != null && t < 32; }).length;
      if (highs14.length >= 10 && frozen < LIMITS.mixedFrozenDays) add("mixed-not-frozen", "caution", { frozen: frozen, of: highs14.length });
    }
    if (thunder && thunder.likely) add("thunder", "warn", { likely: true, at: thunder.at });
    return { flags, start: null, softAt: null, thunder };
  }

  // ── Summer kinds: glacier, alpine ice/mixed, alpine rock, scramble ──
  const snowLegs = hasSnowLegs(kind, ctx.terrain);
  if (snowLegs && ctx.snowFt != null) {
    const fh = freezeHours(fc, day, ctx.snowFt);
    softAt = softensAt(fc, day, ctx.snowFt);
    if (fh === 0) add("no-refreeze", "warn", { ft: ctx.snowFt });
  }
  if (ctx.highFt != null) {
    const flNight = mn(pick(fc, "freezing_level_height", day.night)), flDay = mx(pick(fc, "freezing_level_height", dayIdx));
    if (snowLegs && flNight != null && flNight > ctx.highFt) add("fl-above-night", "warn");
    else if (snowLegs && flDay != null && flDay > ctx.highFt + 2000) add("fl-above", "caution", { above: flDay - ctx.highFt });
    const wetPrior = sum(pick(fc, "precipitation", prior(1))) > 0.02;
    if ((kind === "scramble" || kind === "alpinerock") && wetPrior && mn(pick(fc, "freezing_level_height", prior(1).concat(day.night))) < ctx.highFt) add("verglas", "warn");
  }
  if ((kind === "scramble" || kind === "alpinerock") && rain48 >= LIMITS.wetRock48) add("wet-rock", "caution", { inch: rain48 });
  if (kind === "alpinerock") { const pp = mx(pick(fc, "precipitation_probability", dayIdx)); if (pp != null && pp >= LIMITS.showerProb) add("showers", "caution", { pct: pp }); }
  const newSnow = Math.max(snow24, snowToday);
  if (newSnow >= LIMITS.snowNewWarn) add("new-snow", "warn", { inch: newSnow, scramble: kind === "scramble" });
  else if (newSnow >= LIMITS.snowNewCaution || ((kind === "scramble" || kind === "alpinerock") && newSnow >= 1)) add("new-snow", "caution", { inch: newSnow, scramble: kind === "scramble" });
  if (gust != null && gust >= LIMITS.gustWarn) add("wind", "warn", { gust: gust });
  else if (gust != null && gust >= LIMITS.gustCaution) add("wind", "caution", { gust: gust });
  const chill = mn(day.hours.map(function (i) { return windChillF(h.temperature_2m[i], h.wind_speed_10m ? h.wind_speed_10m[i] : null); }).filter(function (x) { return typeof x === "number" && isFinite(x); }));
  if (chill != null && chill <= LIMITS.windChillWarn) add("wind-chill", "warn", { chill: chill });
  if (thunder) add("thunder", thunder.likely ? "warn" : "caution", { likely: thunder.likely, at: thunder.at });

  // ── Start time: each kind counts back from its OWN deadline (research, 2026-10-07) ──
  const L = ctx.legs;
  if (L && !L.floor && L.up != null) {
    const cands = [];
    // Snow: back DOWN off the snow before it softens (owner: "going down is more dangerous").
    if (snowLegs && softAt != null) {
      const need = L.fromCamp ? L.up * (1 + LIMITS.descentShareOfPush) : L.up + (L.down || 0);
      cands.push({ at: softAt - need * 3600, why: "snow" });
    }
    // Thunder: scrambles and glaciers off the summit by noon (or the forecast onset, if earlier);
    // alpine rock starts DOWN (the rappels) before it.
    if (thunder) {
      const noon = noonOf(fc, day), off = Math.min(noon, thunder.at);
      cands.push({ at: off - L.up * 3600, why: kind === "alpinerock" ? "storm-descent" : "storm-summit" });
    }
    if (cands.length) start = cands.sort(function (a, b) { return a.at - b.at; })[0];
  }
  return { flags, start, softAt, thunder };
}
function noonOf(fc, day) { const i = day.hours.find(function (j) { return localHour(fc, j) === LIMITS.thunderOffBy; }); return i != null ? fc.hourly.time[i] : fc.hourly.time[day.hours[0]] + LIMITS.thunderOffBy * 3600; }

// What the day looks like at the forecast's height, for the card's readout (canonical units).
export function daySummary(fc, day) {
  const h = fc.hourly, dayIdx = day.hours.filter(function (i) { return !h.is_day || h.is_day[i] === 1; });
  const t = pick(fc, "temperature_2m", day.hours), fl = pick(fc, "freezing_level_height", day.hours);
  return { hi: mx(t), lo: mn(t), flLo: mn(fl), flHi: mx(fl), gust: mx(pick(fc, "wind_gusts_10m", dayIdx)),
    snow: sum(pick(fc, "snowfall", day.hours)), precip: sum(pick(fc, "precipitation", day.hours)) };
}

// The local date "now" falls on, in the forecast's own timezone -- the first day the card offers.
export function todayOf(fc, nowMs) {
  return new Date((nowMs != null ? nowMs : Date.now()) + (fc.utc_offset_seconds || 0) * 1000).toISOString().slice(0, 10);
}

/* The snow elevation the party must get back below in time: the highest camp on the route, else
   halfway up its gain from the high point. Halfway is an assumption, and the card says which it used. */
export function snowFloorFt(route, campFt) {
  if (campFt != null) return { ft: Math.round(campFt), basis: "camp" };
  const hp = route && route.highPointFt, gain = route && route.gainM != null ? route.gainM * 3.28084 : null;
  if (hp != null && gain != null && gain > 0) return { ft: Math.round(hp - gain / 2), basis: "halfway" };
  return null;
}
