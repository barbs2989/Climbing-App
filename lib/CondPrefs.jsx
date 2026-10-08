import { useSyncExternalStore } from "react";
import { C, uTemp } from "../ClimbMatchCore.jsx";
import { BAND_PREF, RAIN_PREF, TEMP_BANDS, defaultBand } from "./conditionsScore.js";

/* "YOUR CONDITIONS" — the climber's ideal temperature band and how long they give rock after rain.
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
const read = function () { return { band: BAND_PREF.load(), rain: RAIN_PREF.load() }; };
const snap = function () { if (!mem) mem = read(); return mem; };
const SERVER = { band: BAND_PREF.DEFAULT, rain: RAIN_PREF.DEFAULT };
function subscribe(cb) {
  subs.add(cb);
  const onStorage = function (e) { if (!e || e.key == null || /^climbmatch-cond-/.test(e.key)) { const n = read(); if (!mem || n.band !== mem.band || n.rain !== mem.rain) { mem = n; cb(); } } };
  try { window.addEventListener("storage", onStorage); } catch (e) { /* no window (SSR) */ }
  return function () { subs.delete(cb); try { window.removeEventListener("storage", onStorage); } catch (e) { /* no window */ } };
}
export function setCondPref(which, v) {
  const P = which === "band" ? BAND_PREF : RAIN_PREF;
  if (P.VALID.indexOf(v) < 0) return;
  P.save(v);
  mem = Object.assign({}, snap(), { [which]: v });
  subs.forEach(function (cb) { cb(); });
}
// { band: 'auto'|'cool'|'standard'|'warm', rain: 'normal'|'cautious' }
export function useCondPrefs() { return useSyncExternalStore(subscribe, snap, function () { return SERVER; }); }
// What scoreForecast takes.
export function scorePrefs(p) { return { band: p.band === "auto" ? null : p.band, rainCaution: p.rain }; }

const bandRange = function (k) { const b = TEMP_BANDS[k]; return uTemp(b[0]) + "–" + uTemp(b[1]); };
const NAME = { cool: "Cool", standard: "Mild", warm: "Warm" };
const LBL = { fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 };

/* The two controls. `disc` is the route's discipline when shown on a route (so "Default" can say
   which band it means there); in Settings there is no route, so Default names both. All four band
   choices are always offered and exactly one is pressed — a saved band that happens to equal this
   discipline's default is pressed as itself, never as nothing. */
export function CondPrefsControls({ disc }) {
  const p = useCondPrefs();
  const chip = function (on, label, onClick, key) { return <button key={key} onClick={onClick} aria-pressed={on} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : "transparent", color: on ? C.green : C.textSub, fontSize: 12, fontWeight: on ? 800 : 600, cursor: "pointer" }}>{label}</button>; };
  const dflt = disc ? "Default (" + NAME[defaultBand(disc)] + " " + bandRange(defaultBand(disc)) + ")" : "Default (Cool for bouldering, Mild otherwise)";
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div><div style={LBL}>Ideal temperature</div><div role="group" aria-label="Ideal temperature" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["auto", "cool", "standard", "warm"].map(function (k) { return chip(p.band === k, k === "auto" ? dflt : NAME[k] + " " + bandRange(k), function () { setCondPref("band", k); }, k); })}</div></div>
    <div><div style={LBL}>After rain</div><div role="group" aria-label="After rain" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chip(p.rain === "normal", "Usual drying time", function () { setCondPref("rain", "normal"); }, "n")}{chip(p.rain === "cautious", "Give it longer", function () { setCondPref("rain", "cautious"); }, "c")}</div></div>
  </div>;
}
