import { useSyncExternalStore } from "react";
import { C, uTemp, uTempN, uTempIn, uTempDelta, uWind, uImp } from "../ClimbMatchCore.jsx";
import { BAND_PREF, RAIN_PREF, TEMP_RANGE_PREF, WIND_RANGE_PREF, TEMP_BANDS, WIND_DEFAULT, defaultBand } from "./conditionsScore.js";
import { RangeSlider } from "./RangeSlider.jsx";

/* "YOUR CONDITIONS" — the climber's ideal temperature RANGE and wind RANGE (drag both ends) and how long they give rock after rain.
   They change the conditions score everywhere it renders: the route page's Conditions tab, Home's
   Best day tile, and Settings, which is where the menu and the profile both reach them.

   ONE STORE, so all three agree. Each reader used to load the stored value on its own (the Home
   tile during every render, the route card once into its own useState), so a change on a route
   page left Home and Settings showing the old band until something else re-rendered them. Now a
   change goes through setCondPref, which saves it and tells every subscriber; another tab's change
   arrives through the `storage` event. The in-memory value stands for the session when storage is
   blocked (private mode), so the control still works there — it just is not remembered. */
let mem = null;
const subs = new Set();
const read = function () { return { band: BAND_PREF.load(), rain: RAIN_PREF.load(), temp: TEMP_RANGE_PREF.load(), wind: WIND_RANGE_PREF.load() }; };
const same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
const snap = function () { if (!mem) mem = read(); return mem; };
const SERVER = { band: BAND_PREF.DEFAULT, rain: RAIN_PREF.DEFAULT, temp: null, wind: null };
function subscribe(cb) {
  subs.add(cb);
  const onStorage = function (e) { if (!e || e.key == null || /^climbmatch-cond-/.test(e.key)) { const n = read(); if (!mem || !same(n, mem)) { mem = n; cb(); } } };
  try { window.addEventListener("storage", onStorage); } catch (e) { /* no window (SSR) */ }
  return function () { subs.delete(cb); try { window.removeEventListener("storage", onStorage); } catch (e) { /* no window */ } };
}
export function setCondPref(which, v) {
  if (which === "temp" || which === "wind") {
    // A range is two numbers in deg F / mph, or null to clear it. Refused unless the store would read it back.
    const R = which === "temp" ? TEMP_RANGE_PREF : WIND_RANGE_PREF;
    if (v != null && !R.valid(v)) return;
    R.save(v);
    mem = Object.assign({}, snap(), { [which]: v == null ? null : [v[0], v[1]] });
    subs.forEach(function (cb) { cb(); });
    return;
  }
  const P = which === "band" ? BAND_PREF : RAIN_PREF;
  if (P.VALID.indexOf(v) < 0) return;
  P.save(v);
  mem = Object.assign({}, snap(), { [which]: v });
  subs.forEach(function (cb) { cb(); });
}
// { band: 'auto'|'cool'|'standard'|'warm' (older choice), rain: 'normal'|'cautious', temp: [lo, hi] deg F | null, wind: [lo, hi] mph | null }
export function useCondPrefs() { return useSyncExternalStore(subscribe, snap, function () { return SERVER; }); }
// What scoreForecast takes.
export function scorePrefs(p) { return { band: p.band === "auto" ? null : p.band, tempRange: p.temp, windRange: p.wind, rainCaution: p.rain }; }

const NAME = { cool: "Cool", standard: "Mild", warm: "Warm" };
const LBL = { fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 };
const NOTE = { fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 6 };
// A step the climber can SEE: a whole degree C when metric, a whole degree F otherwise, and a whole km/h or mph.
const snapTemp = function (f) { return uTempIn(uTempN(f)); };
const snapWind = function (m) { return uImp() ? Math.round(m) : Math.round(m * 1.60934) / 1.60934; };
const stepTemp = function () { return uImp() ? 1 : 1.8; };
const stepWind = function () { return uImp() ? 1 : 1.60934; };
const sameRange = function (a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; };

/* The controls. `disc` is the route's discipline when shown on a route, so the slider starts at THAT discipline's
   default band; in Settings there is no route and it starts at Mild. Dragging either end saves the range, and the
   score, Home's Best day and Settings all read it from the one store. A climber who saved Cool / Mild / Warm in
   the old chips keeps that band as the starting range. The presets are shortcuts to a range, not a choice you
   are limited to: drag the ends to cover Cool through Warm. */
export function CondPrefsControls({ disc }) {
  const p = useCondPrefs();
  const legacy = p.band !== "auto" ? TEMP_BANDS[p.band] : null;
  const dBand = TEMP_BANDS[disc ? defaultBand(disc) : "standard"];
  const temp = p.temp || legacy || dBand;
  const wind = p.wind || WIND_DEFAULT;
  const chosen = !!(p.temp || legacy);
  const preset = function (k) { setCondPref("band", "auto"); setCondPref("temp", TEMP_BANDS[k]); };
  const chip = function (on, label, onClick, key) { return <button key={key} onClick={onClick} aria-pressed={on} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : "transparent", color: on ? C.green : C.textSub, fontSize: 12, fontWeight: on ? 800 : 600, cursor: "pointer" }}>{label}</button>; };
  const reset = function (on, label, onClick) { return on ? <button onClick={onClick} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.textSub, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>{label}</button> : null; };
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div>
      <div style={LBL}>Ideal temperature</div>
      <RangeSlider label="Ideal temperature" min={TEMP_RANGE_PREF.MIN} max={TEMP_RANGE_PREF.MAX} minGap={TEMP_RANGE_PREF.MIN_GAP} step={stepTemp()} value={temp} fmt={uTemp} snap={snapTemp} onChange={function (r) { setCondPref("band", "auto"); setCondPref("temp", r); }} />
      <div role="group" aria-label="Temperature shortcuts" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {["cool", "standard", "warm"].map(function (k) { return chip(sameRange(temp, TEMP_BANDS[k]), NAME[k] + " " + uTemp(TEMP_BANDS[k][0]) + "–" + uTemp(TEMP_BANDS[k][1]), function () { preset(k); }, k); })}
        {reset(chosen, "Back to default", function () { setCondPref("band", "auto"); setCondPref("temp", null); })}
      </div>
      <div style={NOTE}>{chosen ? "Full marks inside your range; the score fades to nothing " + uTempDelta(25) + "° below it and " + uTempDelta(20) + "° above." : "Default" + (disc ? " for this discipline" : " (Cool for bouldering, Mild otherwise)") + ". Drag either end to set your own; the score fades to nothing " + uTempDelta(25) + "° below your range and " + uTempDelta(20) + "° above."}</div>
    </div>
    <div>
      <div style={LBL}>Ideal wind</div>
      <RangeSlider label="Ideal wind" min={WIND_RANGE_PREF.MIN} max={WIND_RANGE_PREF.MAX} minGap={WIND_RANGE_PREF.MIN_GAP} step={stepWind()} value={wind} fmt={uWind} snap={snapWind} onChange={function (r) { setCondPref("wind", r); }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{reset(!!p.wind, "Back to default", function () { setCondPref("wind", null); })}</div>
      <div style={NOTE}>{"Full marks inside your range, fading to nothing " + uWind(25) + " above it and, if the bottom is above calm, " + uWind(10) + " below it. A gust counts at 70%." + (p.wind ? "" : " Default: calm to " + uWind(WIND_DEFAULT[1]) + ".")}</div>
    </div>
    <div><div style={LBL}>After rain</div><div role="group" aria-label="After rain" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chip(p.rain === "normal", "Usual drying time", function () { setCondPref("rain", "normal"); }, "n")}{chip(p.rain === "cautious", "Give it longer", function () { setCondPref("rain", "cautious"); }, "c")}</div></div>
  </div>;
}
