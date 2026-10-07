// The forecast FETCH, shared by the Safety tab's WeatherPanel and the trip pack.
//
// WeatherPanel used to own these three requests inline, which meant a forecast existed only while
// that panel was mounted — so a packed route had none at the trailhead. The raw responses are what
// the pack stores (lib/offline.js `_wx`), and WeatherPanel runs them through the SAME processing
// whether they arrived now or were saved earlier: two parsers for one forecast would be two
// forecasts. The URLs and the reasons for each parameter are documented in WeatherPanel.
import { savePackForecast } from "./offline";
import { monthlyClimate } from "./conditionsScore.js";

export function forecastKey(w) { return w.type + "_" + w.name; }

// Resolves to [openMeteo, nws, met]. Open-Meteo is required (it throws without an hourly series,
// exactly as the panel always did); the two secondary sources resolve to null on any failure.
export function fetchForecastRaw(w) {
  const omUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + w.lat + "&longitude=" + w.lng + (w.elev != null ? "&elevation=" + Math.round(w.elev / 3.28084) : "") + "&hourly=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_speed_80m,wind_direction_80m,wind_gusts_10m,precipitation_probability,precipitation,snowfall,freezing_level_height,uv_index&forecast_days=16&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto";
  const nwsPromise = fetch("https://api.weather.gov/points/" + w.lat.toFixed(4) + "," + w.lng.toFixed(4)).then(function (r) { return r.ok ? r.json() : null; }).then(function (pj) { return pj ? fetch(pj.properties.forecastGridData).then(function (r) { return r.ok ? r.json() : null; }) : null; }).catch(function () { return null; });
  const metPromise = fetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=" + w.lat.toFixed(4) + "&lon=" + w.lng.toFixed(4) + (w.elev != null ? "&altitude=" + Math.round(w.elev / 3.28084) : "")).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  return Promise.all([fetch(omUrl).then(function (r) { return r.json(); }), nwsPromise, metPromise]).then(function (res) {
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
     daily sunrise, sunset                the Sun on the wall section;
     past_days=14                         the rain that already fell: how wet the rock is NOW, and
                                          the 7- and 14-day totals the seepage risk reads;
     forecast_days=7                      the strip the card shows (the reliable part of the range);
     timeformat=unixtime                  each hour is an instant placed in the crag's `timezone`,
                                          so a daylight-saving change mid-series is not an hour off.
   Same canonical units as the panel (F, mph, inch) and converted only at display. */
export function fetchCragForecast(lat, lng) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + (+lat).toFixed(4) + "&longitude=" + (+lng).toFixed(4) + "&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,cloud_cover,wind_speed_10m,wind_gusts_10m,is_day&daily=sunrise,sunset&past_days=14&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&timeformat=unixtime";
  return fetch(url).then(function (r) { if (!r.ok) throw new Error("forecast " + r.status); return r.json(); }).then(function (j) {
    if (!j || !j.hourly || !j.hourly.time || !j.hourly.temperature_2m) throw new Error("no data");
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

// Fetch every point and store them with the packed route. `points` are the ones WeatherPanel would
// pick ({type,name,lat,lng,elev}); they are stored too, so a later background refresh can re-fetch
// the same points without loading the route page. All-or-nothing: a snapshot missing the summit is
// not the forecast the climber saw, so a partial one is not saved (the older complete one stands).
export async function snapshotPackForecast(routeId, points) {
  const pts = (points || []).filter(function (w) { return w && typeof w.lat === "number" && typeof w.lng === "number"; });
  if (!routeId || !pts.length) return false;
  const raws = await Promise.all(pts.map(fetchForecastRaw));
  const raw = {};
  pts.forEach(function (w, i) { raw[forecastKey(w)] = raws[i]; });
  return savePackForecast(routeId, { points: pts.map(function (w) { return { type: w.type, name: w.name, lat: w.lat, lng: w.lng, elev: w.elev != null ? w.elev : null }; }), raw: raw });
}
