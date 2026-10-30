// The forecast FETCHES: the Safety tab's WeatherPanel, the crag and alpine Conditions cards, and the
// Best day tile. The URLs and the reasons for each parameter are documented beside each reader.
// A forecast is NEVER saved for offline use: it is out of date within hours, and a saved one read as
// today's is worse than none (owner, 2026-10-21). Offline, every forecast surface says it could not load.
import { monthlyClimate, mergeMeasuredRain } from "./conditionsScore.js";

export function forecastKey(w) { return w.type + "_" + w.name; }

/* ONE MODEL CHAIN, so a forecast does not jump between visits. Open-Meteo's default (`best_match`) in the
   US is HRRR for two days and then GFS ALONE, one deterministic run that swings with every update.
   Measured 2026-10-21 (8 WA points, 30 days, Open-Meteo previous-runs API, 2 m temperature): for the same
   hour, the run 5 days earlier and the latest run differed by 10 F or more in 12.0% of hours on GFS,
   0.7% on the NWS's National Blend of Models (NBM: ~30 models blended and bias-corrected, what NWS
   forecasters start from), 0.9% on ECMWF; median 4.4 F vs 2.1 F vs 2.0 F. So NBM leads, and the
   default fills, hour by hour and field by field, whatever NBM does not publish: anywhere outside the
   lower 48, past day ~11, and the freezing level, UV, low cloud and visibility past day 4.
   Asked for together, Open-Meteo suffixes every series with its model; this folds them back into the
   plain names every reader already uses. Where only ONE model answers (Alaska) nothing is suffixed. */
export const NBM = "ncep_nbm_conus";
export const BLEND = "&models=" + NBM + ",best_match";
export function blendModels(j) {
  ["hourly", "daily"].forEach(function (s) {
    const o = j && j[s], u = j && j[s + "_units"];
    if (!o) return;
    Object.keys(o).forEach(function (k) {
      const m = /^(.*)_best_match$/.exec(k);
      if (!m) return;
      const nk = m[1] + "_" + NBM, a = o[nk], b = o[k];
      o[m[1]] = Array.isArray(a) && Array.isArray(b) ? b.map(function (v, i) { return a[i] != null ? a[i] : v; }) : b;
      delete o[k]; delete o[nk];
      if (u) { u[m[1]] = u[k] != null ? u[k] : u[nk]; delete u[k]; delete u[nk]; }
    });
  });
  return j;
}

/* The forecast grid publishes the HEIGHT its temperatures are for (`properties.elevation`, metres). A point
   higher than that cell is colder by the standard lapse rate: 6.5 C per km = 3.57 F per 1,000 ft (the ICAO
   standard atmosphere; real lapse varies with inversions, so this is an average, not a measurement).
   Returns the shift in F to ADD to the grid's temperatures: negative for a point above its cell, 0 when
   either height is unknown -- an unknown height is never guessed. Measured 2026-10-14: summit cells sit
   150-850 m below the summit pin, i.e. up to 9 F of difference that is height, not forecast. */
export function nwsHeightShiftF(nwsJson, pointElevFt) {
  const e = nwsJson && nwsJson.properties && nwsJson.properties.elevation;
  const cellM = e && typeof e.value === "number" && /:m$/.test(e.unitCode || "") ? e.value : null;
  if (cellM == null || pointElevFt == null || !isFinite(pointElevFt)) return 0;
  return -((pointElevFt - cellM * 3.28084) / 1000) * 3.57;
}

// Resolves to [openMeteo, nws, met]. Open-Meteo is required (it throws without an hourly series,
// exactly as the panel always did); the two secondary sources resolve to null on any failure.
export function fetchForecastRaw(w) {
  const omUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + w.lat + "&longitude=" + w.lng + (w.elev != null ? "&elevation=" + Math.round(w.elev / 3.28084) : "") + "&hourly=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_gusts_10m,precipitation_probability,precipitation,snowfall,freezing_level_height,uv_index&forecast_days=16&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto" + BLEND;
  const nwsPromise = fetch("https://api.weather.gov/points/" + w.lat.toFixed(4) + "," + w.lng.toFixed(4)).then(function (r) { return r.ok ? r.json() : null; }).then(function (pj) { return pj ? fetch(pj.properties.forecastGridData).then(function (r) { return r.ok ? r.json() : null; }) : null; }).catch(function () { return null; });
  const metPromise = fetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=" + w.lat.toFixed(4) + "&lon=" + w.lng.toFixed(4) + (w.elev != null ? "&altitude=" + Math.round(w.elev / 3.28084) : "")).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  return Promise.all([fetch(omUrl).then(function (r) { return r.json(); }).then(blendModels), nwsPromise, metPromise]).then(function (res) {
    const h = res[0] && res[0].hourly;
    if (!h || !h.temperature_2m || !h.time) throw new Error("no data");
    return res;
  });
}

/* THE CRAG FORECAST, for the conditions score (lib/conditionsScore.js) on sport, trad, top-rope and
   bouldering routes. One request at the CRAG's own coordinate (the area the route is filed on), so
   it needs no placed waypoints — which is what most crag routes lack. It differs from the panel's
   fetch in what friction and drying need:
     relative_humidity_2m, dew_point_2m  friction, and condensation (air at its dew point);
     cloud_cover, is_day                  whether a sunny-aspect wall is in sun, and daylight;
                                          cloud cover is also charted hour by hour and averaged
                                          over each day's daylight;
     apparent_temperature,                what the hourly chart and the day-by-day list show
       wind_direction_10m                 beside the temperature and the wind (not scored);
     daily sunrise, sunset                the Sun on the wall section;
     past_days=14                         the rain that already fell: how wet the rock is NOW, and
                                          the 7- and 14-day totals the seepage risk reads;
     forecast_days=7                      the strip the card shows (the reliable part of the range);
     timeformat=unixtime                  each hour is an instant placed in the crag's `timezone`,
                                          so a daylight-saving change mid-series is not an hour off.
   Same canonical units as the panel (F, mph, inch) and converted only at display. */
/* MEASURED PAST RAIN — what actually fell at the crag over the past four days, so "is the rock still wet"
   rests on a measurement where one exists, not on the forecast model's memory of its own forecast.
   Tried in order (owner-approved 2026-10-15; measured in PR notes):
     1. A radar-and-gauge analysis in 6-hour totals (ECCC HRDPA, 2.5 km). Covers Canada and the northern
        United States — WA, OR, KY, WV, WI, NY answered; the South, the Southwest, California and Colorado
        do not. It put the 2026-10-09 storm at Index on the hours the gauges measured.
     2. An hourly radar-and-gauge analysis (NCEP Stage IV, served by Iowa State), but ONLY east of 104°W:
        in the West its hours are split out of 6-hour totals, and at Index it put that storm 18 h late.
     3. Neither: null, and the score keeps the forecast model's past rain, as it always did.
   A time not yet analysed is UNAVAILABLE (left to the model), never zero. A failed or slow request is
   null: the score falls back to the model, it never reads as "no rain". */
const MEASURED_HOURS = 96, MEASURED_TIMEOUT_MS = 8000, STAGE4_EAST_OF = -104;
function hrdpaWindow(lat, lng, endMs, layer) {
  const b = [(+lat - 0.01).toFixed(4), (+lng - 0.01).toFixed(4), (+lat + 0.01).toFixed(4), (+lng + 0.01).toFixed(4)].join(",");
  const url = "https://geo.weather.gc.ca/geomet?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=" + layer + "&QUERY_LAYERS=" + layer + "&CRS=EPSG:4326&BBOX=" + b + "&WIDTH=3&HEIGHT=3&I=1&J=1&INFO_FORMAT=application/json&TIME=" + new Date(endMs).toISOString().slice(0, 19) + "Z";
  // -> mm, or "out" (the point is outside the analysis), or null (that time is not analysed yet / failed).
  return fetch(url).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
    if (!t || t.charAt(0) === "<") return null;
    let j; try { j = JSON.parse(t); } catch (e) { return null; }
    const f = j && j.features && j.features[0];
    if (!f) return "out";
    const v = f.properties && f.properties.value;
    return typeof v === "number" && isFinite(v) && v >= 0 ? v : null;
  }, function () { return null; });
}
function fetchHrdpa(lat, lng, now) {
  const last = Math.floor(now / 216e5) * 216e5, ends = [];
  for (let e = last; e > now - MEASURED_HOURS * 3600e3; e -= 216e5) ends.push(e);
  // One probe first (the oldest window is the one most surely analysed): outside the analysis, stop.
  return hrdpaWindow(lat, lng, ends[ends.length - 1], "HRDPA_2.5km_Precip-Accum6h").then(function (probe) {
    if (probe === "out") return null;
    return Promise.all(ends.map(function (e, i) {
      const first = i === ends.length - 1 ? Promise.resolve(probe) : hrdpaWindow(lat, lng, e, "HRDPA_2.5km_Precip-Accum6h");
      return first.then(function (v) { return typeof v === "number" ? v : hrdpaWindow(lat, lng, e, "HRDPA-Prelim_2.5km_Precip-Accum6h"); });
    })).then(function (vals) {
      const windows = [];
      vals.forEach(function (v, i) { if (typeof v === "number") windows.push({ end: ends[i], hours: 6, inch: v < 0.1 ? 0 : v / 25.4 }); });
      return windows.length ? { kind: "6h", windows: windows } : null;
    });
  });
}
function fetchStage4(lat, lng, now) {
  const days = [];
  for (let t = now - MEASURED_HOURS * 3600e3; t <= now + 864e5; t += 864e5) days.push(new Date(t).toISOString().slice(0, 10));
  return Promise.all(days.map(function (d) {
    return fetch("https://mesonet.agron.iastate.edu/json/stage4.py?lat=" + (+lat).toFixed(4) + "&lon=" + (+lng).toFixed(4) + "&valid=" + d + "&tz=UTC").then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  })).then(function (js) {
    const windows = [];
    for (const j of js) for (const x of (j && j.data) || []) {
      const end = Date.parse(x.end_valid);
      if (!isFinite(end) || end <= now - MEASURED_HOURS * 3600e3 || end > now) continue;
      if (typeof x.precip_in === "number" && x.precip_in >= 0) windows.push({ end: end, hours: 1, inch: x.precip_in < 0.004 ? 0 : x.precip_in });
    }
    return windows.length ? { kind: "1h", windows: windows } : null;
  });
}
export function fetchMeasuredRain(lat, lng, nowMs) {
  const now = nowMs == null ? Date.now() : nowMs;
  const work = fetchHrdpa(lat, lng, now).then(function (m) { return m || (+lng > STAGE4_EAST_OF ? fetchStage4(lat, lng, now) : null); });
  const late = new Promise(function (res) { setTimeout(function () { res(null); }, MEASURED_TIMEOUT_MS); });
  return Promise.race([work.catch(function () { return null; }), late]);
}
/* The crag forecast WITH the measured past rain written over the model's (lib/conditionsScore.js
   mergeMeasuredRain). Every crag-score reader goes through this one call — the Conditions card and the
   Home tile — so the two cannot disagree about whether it rained. */
export function fetchCragForecastMeasured(lat, lng) {
  return Promise.all([fetchCragForecast(lat, lng), fetchMeasuredRain(lat, lng)]).then(function (r) { return r[1] ? mergeMeasuredRain(r[0], r[1]) : r[0]; });
}
export function fetchCragForecast(lat, lng) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + "&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day&daily=sunrise,sunset&past_days=14&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&timeformat=unixtime" + BLEND;
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("forecast " + r.status); return r.json(); }).then(blendModels).then(function (j) {
    if (!j || !j.hourly || !j.hourly.time || !j.hourly.temperature_2m) throw new Error("no data");
    return j;
  });
}

/* THE ALPINE FORECAST, for the Conditions tab's flags (lib/alpineConditions.js) on alpine,
   mountaineering, scrambling, ice and mixed routes. One request at the route's HIGH POINT -- the
   summit pin, else the route's high point over its area's coordinate -- downscaled to that height
   with `elevation`, so it needs no placed waypoints. What the flags read that the panel's fetch lacks:
     cape, showers, precipitation_probability   thunderstorm risk (with weather_code 95-99);
     rain, snowfall                             wet rock, and new snow at the summit band;
     freezing_level_height (FEET in these units) refreeze and the hour the snow softens, at ANY height
                                                 on the route from the one series;
     is_day, daily sunrise/sunset               night (the refreeze) vs day (softening, thunder);
     past_days=14                               the temperature HISTORY waterfall ice and mixed fail on
                                                 (a thaw is days, not hours);
     timeformat=unixtime                        hours placed in the route's own `timezone`.
   Rejects on any failure; the card then says it could not load, never that conditions are fine. */
export function fetchAlpineForecast(lat, lng, elevFt) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + (elevFt != null && isFinite(elevFt) ? "&elevation=" + Math.round(elevFt / 3.28084) : "") + "&hourly=temperature_2m,precipitation,rain,showers,snowfall,weather_code,cape,freezing_level_height,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,cloud_cover_low,visibility,precipitation_probability,is_day&daily=sunrise,sunset&past_days=14&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&timeformat=unixtime" + BLEND;
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("forecast " + r.status); return r.json(); }).then(blendModels).then(function (j) {
    if (!j || !j.hourly || !j.hourly.time || !j.hourly.temperature_2m || !j.hourly.freezing_level_height) throw new Error("no data");
    return visibilityInMetres(j);
  });
}

/* VISIBILITY IN METRES, whatever the request's units. `precipitation_unit=inch` switches EVERY length field
   Open-Meteo returns to feet -- the freezing level, and visibility with it (hourly_units.visibility is "ft",
   checked live 2026-10-14) -- while the card's fog cut (LIMITS.fogM, 1 km) and its readout are metres. Read
   as metres, a 3,000 ft (914 m) fog hour was 3 km of visibility and never flagged. Converted here, by the unit
   the response itself states; a unit it does not state, or one this does not know, drops the series (the
   card then says "not measured") rather than guess which it is. */
export function visibilityInMetres(j) {
  const h = j && j.hourly;
  if (!h || !Array.isArray(h.visibility)) return j;
  const u = j.hourly_units && j.hourly_units.visibility;
  if (u === "ft") { h.visibility = h.visibility.map(function (v) { return typeof v === "number" ? v * 0.3048 : v; }); j.hourly_units.visibility = "m"; }
  else if (u !== "m") delete h.visibility;
  return j;
}

/* THE SAME DAYS FROM THREE FORECAST MODELS, for the alpine card's confidence check: gusts,
   temperature and freezing level at the route's high point, in the alpine forecast's own units
   (precipitation_unit=inch makes the freezing level feet). ECMWF sends no freezing level, so that one
   is compared across the other two. Rejects on any failure; the card then says nothing about
   agreement -- a failed read never reads as "the models agree". */
export const SPREAD_MODELS = ["gfs_seamless", "icon_seamless", "ecmwf_ifs025"];
export function fetchAlpineSpread(lat, lng, elevFt) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + (elevFt != null && isFinite(elevFt) ? "&elevation=" + Math.round(elevFt / 3.28084) : "") + "&hourly=temperature_2m,wind_gusts_10m,freezing_level_height,precipitation&models=" + SPREAD_MODELS.join(",") + "&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&timeformat=unixtime";
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("spread " + r.status); return r.json(); }).then(function (j) {
    if (!j || !j.hourly || !j.hourly.time) throw new Error("no data");
    return j;
  });
}

/* AIR QUALITY at the crag: US AQI and PM2.5, hourly, 5 days — for wildfire smoke, a whole-season
   hazard in the West. Rejects on any failure; the card then says "not measured", never "clean". */
export function fetchCragAir(lat, lng) {
  const url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + "&hourly=pm2_5,us_aqi&forecast_days=5&timezone=auto&timeformat=unixtime";
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("air " + r.status); return r.json(); }).then(function (j) {
    if (!j || !j.hourly || !j.hourly.time || !j.hourly.us_aqi) throw new Error("no data");
    return j;
  });
}

/* ACTIVE WEATHER ALERTS at a point (the US only). Open to the browser (CORS *, no key). Outside the US the
   service answers 400 "out of bounds": that resolves to {outside:true}, which the card words as "not checked",
   never as "no alerts". Any other failure rejects, and the card says "not measured". */
export function fetchPointAlerts(lat, lng) {
  const url = "https://api.weather.gov/alerts/active?point=" + (+lat).toFixed(4) + "," + (+lng).toFixed(4);
  return fetch(url).then(function (r) {
    if (r.status === 400) return { outside: true };
    if (!r.ok) throw new Error("alerts " + r.status);
    return r.json();
  }).then(function (j) {
    if (j && j.outside) return j;
    if (!j || !Array.isArray(j.features)) throw new Error("no data");
    return j;
  });
}

/* USGS STREAM GAUGES near a point, then one gauge's last 24 h. Open to the browser (CORS *, no key). The site
   service answers 404 for "no gauge in this box", which is {sites: []} -- a fact, not a failure. Any other
   non-200 rejects, and the card says "not measured". The site list is cached on this device's page for the
   session by 0.1-degree cell: gauges move on the scale of decades. */
const _gaugeSites = {};
export function fetchGaugeSites(lat, lng) {
  const key = (+lat).toFixed(1) + "," + (+lng).toFixed(1);
  if (_gaugeSites[key]) return Promise.resolve(_gaugeSites[key]);
  const la = +lat, lo = +lng, b = [(lo - 0.45).toFixed(4), (la - 0.3).toFixed(4), (lo + 0.45).toFixed(4), (la + 0.3).toFixed(4)].join(",");
  const url = "https://waterservices.usgs.gov/nwis/site/?format=rdb&bBox=" + b + "&parameterCd=00060,00065&siteType=ST&siteStatus=active&hasDataTypeCd=iv";
  return fetch(url).then(function (r) {
    if (r.status === 404) return "";
    if (!r.ok) throw new Error("gauges " + r.status);
    return r.text();
  }).then(function (t) { _gaugeSites[key] = t; return t; });
}
export function fetchGaugeFlow(siteNo) {
  const url = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=" + encodeURIComponent(siteNo) + "&parameterCd=00060,00065&period=PT24H";
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("flow " + r.status); return r.json(); });
}

/* CLIMATE at the crag: the last five full years of daily highs, lows and rain from the weather
   archive, reduced to twelve monthly averages (monthlyClimate). Averages do not move week to week,
   so the reduced result — not the 50 KB of days — is kept on this device for 30 days. */
const CLIM_TTL = 30 * 864e5;
export function fetchCragClimate(lat, lng) {
  const key = "climbmatch-clim-" + (+lat).toFixed(2) + "," + (+lng).toFixed(2);
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c && c.at > Date.now() - CLIM_TTL && c.m && c.m.months) return Promise.resolve(c.m); } catch (e) { /* blocked or junk: fetch */ }
  const y = new Date().getFullYear() - 1;
  const url = "https://archive-api.open-meteo.com/v1/archive?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + "&start_date=" + (y - 4) + "-01-01&end_date=" + y + "-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto";
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("climate " + r.status); return r.json(); }).then(function (j) {
    const m = monthlyClimate(j);
    if (!m) throw new Error("no data");
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), m: m })); } catch (e) { /* full or blocked */ }
    return m;
  });
}

/* CLIMATE AT THE TOP of an alpine climb: the same five years of archive as a crag, read at the
   route's high point (the archive downscales to an `elevation` in metres; without one it reads the
   grid cell's own height, which on an area coordinate can be thousands of feet below the summit),
   and with snowfall. Kept on this device for 30 days. */
/** @returns {Promise<NonNullable<ReturnType<typeof monthlyClimate>>>} */
export function fetchAlpineClimate(lat, lng, elevFt) {
  const em = elevFt != null && isFinite(elevFt) ? Math.round(elevFt / 3.28084) : null;
  const key = "climbmatch-aclim-" + (+lat).toFixed(2) + "," + (+lng).toFixed(2) + "@" + (em != null ? em : "");
  try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c && c.at > Date.now() - CLIM_TTL && c.m && c.m.months) return Promise.resolve(c.m); } catch (e) { /* blocked or junk: fetch */ }
  const y = new Date().getFullYear() - 1;
  const url = "https://archive-api.open-meteo.com/v1/archive?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + (em != null ? "&elevation=" + em : "") + "&start_date=" + (y - 4) + "-01-01&end_date=" + y + "-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto";
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("climate " + r.status); return r.json(); }).then(function (j) {
    const m = monthlyClimate(j);
    if (!m) throw new Error("no data");
    try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), m: m })); } catch (e) { /* full or blocked */ }
    return m;
  });
}
