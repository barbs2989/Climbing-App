// The forecast FETCH, shared by the Safety tab's WeatherPanel and the trip pack.
//
// WeatherPanel used to own these three requests inline, which meant a forecast existed only while
// that panel was mounted — so a packed route had none at the trailhead. The raw responses are what
// the pack stores (lib/offline.js `_wx`), and WeatherPanel runs them through the SAME processing
// whether they arrived now or were saved earlier: two parsers for one forecast would be two
// forecasts. The URLs and the reasons for each parameter are documented in WeatherPanel.
import { savePackForecast } from "./offline";

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
