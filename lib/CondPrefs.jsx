import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { C, uTemp, uTempN, uTempIn, uWind, uWindN, uWindIn } from "../ClimbMatchCore.jsx";
import { BAND_PREF, RAIN_PREF, TEMP_BANDS, WIND_FULL_MPH, WIND_FADE_MPH, RH_FULL_PCT, rhZero, AQ_LIMITS, resolveRange } from "./conditionsScore.js";
import { useMyCondPrefs, saveMyCondPrefs } from "./db.js";
import { DISC_LABELS } from "./discLabels.js";

/* "YOUR CONDITIONS" — the climber's ideal temperature RANGE (one for all climbing, and optionally
   one per discipline), the wind they are happy in, and how long they give rock after rain. They
   change the conditions score everywhere it renders: the route page's Conditions tab, the Best day
   to climb view in the Menu, and Settings.

   A RANGE, NOT A PRESET. The climber says "30° to 90° is good for me" and anything inside it scores
   full marks on temperature; outside it the score fades (25°F below, 20°F above). Cool, Mild and
   Warm are shortcuts that fill the range in. Sport, trad, top-rope and bouldering can each have
   their own range, because bouldering wants it cooler than a sport day.

   ALPINE and ICE ARE TWO MORE, SEPARATE SCOPES, and they work differently. "Alpine" covers alpine,
   mountaineering and scrambling; "Ice & mixed" covers ice and mixed. Neither inherits the
   all-climbing range (alpine is always colder, and ice wants cold). They have NO presets and NO
   default: no published temperature range exists for either (the guidance is qualitative, and the
   one hazard with a number, a thaw, is already a flag), so an unset range means no line at all.
   When set it adds ONE plain line to the route's Conditions tab saying whether the forecast
   temperatures fall inside it. It never touches a warning, a caution or a start time: those are
   safety flags, not a score (lib/alpineConditions.js).

   OPTIONAL EXTRAS, none of which has to be set (a climber who sets none gets the score they always
   had): the humidity they accept, whether they want the wall in sun or shade, how sensitive they are
   to smoke, and a daylight window (the hours the best window may fall in).

   Temperatures are stored in °F and wind in mph whatever the climber reads; the sliders convert on
   the way in and out (uTempIn / uWindIn), so a metric climber's 10°C is stored as 50°F.

   ONE STORE, so every reader agrees. A change goes through updateCondPrefs, which cleans it, keeps
   it on the device, tells every subscriber, and (signed in) saves it to the account after a short
   pause (the sliders fire on every pixel). On sign-in the account's copy wins; an account with no
   copy yet takes the device's. A device that last belonged to a DIFFERENT account starts from the
   defaults, never handing one climber's choices to another. The in-memory value stands for the
   session when storage is blocked (private mode), so the control still works there. */
export const COND_DISCS = ["sport", "trad", "toprope", "bouldering"];
// The two scopes that are the climber's own range and nothing else.
export const RANGE_ONLY = { alpine: "Alpine & mountaineering", ice: "Ice & mixed" };
// The scope a route's discipline belongs to ("all" when it has none of its own).
export function scopeForDiscipline(d) {
  if (COND_DISCS.indexOf(d) >= 0) return d;
  if (d === "alpine" || d === "mountaineering" || d === "scrambling") return "alpine";
  if (d === "ice" || d === "mixed") return "ice";
  return "all";
}
const DISC_NAME = DISC_LABELS;
const TEMP_MIN = -40, TEMP_MAX = 115, MIN_SPAN = 5, WIND_MIN = 5, WIND_MAX = 40, RH_MIN = 30, RH_MAX = 85, WIN_MIN_SPAN = 3;
const SUN_CHOICES = ["sun", "shade", "either"], AQ_CHOICES = ["sensitive", "relaxed"];
const KEY = "climbmatch-cond-prefs-v2", OWNER_KEY = "climbmatch-cond-owner";
const DEFAULTS = { rain: "normal", temp: {}, windMax: null, rhMax: null, sun: null, aq: null, window: null };

// Whatever came from storage or the account becomes a prefs object the score can use, or the default.
export function cleanPrefs(o) {
  const out = { rain: "normal", temp: {}, windMax: null, rhMax: null, sun: null, aq: null, window: null };
  if (!o || typeof o !== "object") return out;
  if (o.rain === "cautious") out.rain = "cautious";
  const t = o.temp && typeof o.temp === "object" ? o.temp : {};
  ["all"].concat(COND_DISCS).concat(Object.keys(RANGE_ONLY)).forEach(function (k) {
    const r = t[k];
    if (!Array.isArray(r) || r.length !== 2) return;
    const lo = Math.round(+r[0]), hi = Math.round(+r[1]);
    if (isFinite(lo) && isFinite(hi) && lo >= TEMP_MIN && hi <= TEMP_MAX && hi - lo >= MIN_SPAN) out.temp[k] = [lo, hi];
  });
  const w = Math.round(+o.windMax);
  if (o.windMax != null && isFinite(w) && w >= WIND_MIN && w <= WIND_MAX) out.windMax = w;
  const h = Math.round(+o.rhMax);
  if (o.rhMax != null && isFinite(h) && h >= RH_MIN && h <= RH_MAX) out.rhMax = h;
  if (SUN_CHOICES.indexOf(o.sun) >= 0) out.sun = o.sun;
  if (AQ_CHOICES.indexOf(o.aq) >= 0) out.aq = o.aq;
  if (Array.isArray(o.window) && o.window.length === 2) {
    const a = Math.round(+o.window[0]), b = Math.round(+o.window[1]);
    if (isFinite(a) && isFinite(b) && a >= 0 && b <= 24 && b - a >= WIN_MIN_SPAN) out.window = [a, b];
  }
  return out;
}
const isDefault = function (p) { return p.rain === "normal" && p.windMax == null && p.rhMax == null && !p.sun && !p.aq && !p.window && !Object.keys(p.temp).length; };
const hasExtras = function (p) { return p.rhMax != null || !!p.sun || !!p.aq || !!p.window; };

let mem = null, acct = null, syncState = "local", saveTimer = null;
const subs = new Set(), syncSubs = new Set();
const notify = function () { subs.forEach(function (cb) { cb(); }); };
const setSync = function (s) { if (syncState !== s) { syncState = s; syncSubs.forEach(function (cb) { cb(); }); } };
const owner = function () { try { return localStorage.getItem(OWNER_KEY); } catch (e) { return null; } };
const keepLocal = function (p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); if (acct) localStorage.setItem(OWNER_KEY, acct); } catch (e) { /* private mode: the session copy stands */ }
};
const read = function () {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return cleanPrefs(JSON.parse(raw));
  } catch (e) { /* unreadable: fall through to the older keys */ }
  // Before ranges, the choice was a preset name under its own key. Carry it over.
  const b = BAND_PREF.load(), r = RAIN_PREF.load();
  const p = { rain: r, temp: {} };
  if (TEMP_BANDS[b]) p.temp.all = TEMP_BANDS[b].slice();
  return cleanPrefs(p);
};
const snap = function () { if (!mem) mem = read(); return mem; };
const SERVER = DEFAULTS;

function subscribe(cb) {
  subs.add(cb);
  const onStorage = function (e) { if (!e || e.key == null || e.key === KEY) { mem = read(); cb(); } };
  try { window.addEventListener("storage", onStorage); } catch (e) { /* no window (SSR) */ }
  return function () { subs.delete(cb); try { window.removeEventListener("storage", onStorage); } catch (e) { /* no window */ } };
}
function subscribeSync(cb) { syncSubs.add(cb); return function () { syncSubs.delete(cb); }; }

const pushNow = function () {
  const uid = acct;
  if (!uid) return;
  setSync("saving");
  saveMyCondPrefs(uid, snap()).then(function () { if (acct === uid) setSync("saved"); }, function () { if (acct === uid) setSync("failed"); });
};
// mut gets a copy of the current prefs and returns the next ones.
export function updateCondPrefs(mut) {
  const cur = snap();
  const next = cleanPrefs(mut(Object.assign({}, cur, { temp: Object.assign({}, cur.temp) })));
  mem = next;
  keepLocal(next);
  notify();
  if (acct) { setSync("saving"); clearTimeout(saveTimer); saveTimer = setTimeout(pushNow, 600); }
}
// { rain, temp: { all, sport, trad, toprope, bouldering }, windMax, rhMax, sun, aq, window } — what the controls edit.
export function useCondPrefs() { return useSyncExternalStore(subscribe, snap, function () { return SERVER; }); }
// "local" (signed out), "loading", "saving", "saved" or "failed".
export function useCondSync() { return useSyncExternalStore(subscribeSync, function () { return syncState; }, function () { return "local"; }); }
// What scoreForecast takes.
export function scorePrefs(p) { return { temp: p.temp, windMax: p.windMax, rhMax: p.rhMax, sun: p.sun, aq: p.aq, window: p.window, rainCaution: p.rain }; }

/* Mount ONCE in App with the signed-in user's id (null when signed out). Reads the account's copy
   on sign-in and keeps the store pointed at that account for the writes. */
export function useCondPrefsAccount(uid) {
  const q = useMyCondPrefs(uid);
  const done = useRef(null);
  useEffect(function () {
    acct = uid || null;
    if (!uid) { done.current = null; clearTimeout(saveTimer); setSync("local"); return; }
    setSync(done.current === uid ? syncState : "loading");
  }, [uid]);
  useEffect(function () {
    if (!uid || done.current === uid) return;
    if (q.isError) { setSync("failed"); return; }
    if (!q.isSuccess) return;
    done.current = uid;
    const o = owner();
    if (o && o !== uid) { mem = cleanPrefs(null); keepLocal(mem); notify(); }
    const remote = q.data ? cleanPrefs(q.data) : null;
    if (remote && !isDefault(remote)) { mem = remote; keepLocal(mem); notify(); setSync("saved"); }
    else if (!isDefault(snap())) pushNow();
    else { keepLocal(snap()); setSync("saved"); }
  }, [uid, q.isSuccess, q.isError, q.data]);
}

const NAME = { cool: "Cool", standard: "Mild", warm: "Warm" };
const hourName = function (h) { return (h % 12 || 12) + (h % 24 < 12 ? " AM" : " PM"); };
const rangeText = function (r) { return uTemp(r[0]) + "–" + uTemp(r[1]); };
const same = function (a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; };
const LBL = { fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 };
const SYNC_TEXT = {
  local: "Saved on this device. Sign in to keep it on your account.",
  loading: "Checking your account…",
  saving: "Saving to your account…",
  saved: "Saved to your account.",
  failed: "Couldn’t reach your account, so this is kept on this device for now. Change anything to try again."
};

/* The controls. `disc` is the route's discipline when shown on a route (so it opens on that
   discipline's range); in Settings and the Menu there is none, so it opens on All climbing. */
export function CondPrefsControls({ disc, only }) {
  const p = useCondPrefs();
  const sync = useCondSync();
  const [scope, setScope] = useState(scopeForDiscipline(disc));
  const ownOnly = !!RANGE_ONLY[scope];
  const full = only !== "temp";
  const chip = function (on, label, onClick, key) { return <button key={key} onClick={onClick} aria-pressed={on} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + (on ? C.green : C.border), background: on ? C.greenBg : "transparent", color: on ? C.green : C.textSub, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>; };
  const own = scope !== "all" && !!p.temp[scope];
  const eff = scope === "all" ? (p.temp.all || TEMP_BANDS.standard) : ownOnly ? (p.temp[scope] || null) : resolveRange(scorePrefs(p), scope).range;
  const setRange = function (r) { updateCondPrefs(function (x) { x.temp[scope] = r; return x; }); };
  const clearRange = function () { updateCondPrefs(function (x) { delete x.temp[scope]; return x; }); };
  const dMin = uTempN(TEMP_MIN), dMax = uTempN(TEMP_MAX);
  const slider = function (label, val, min, max, onChange, text) {
    return <label style={{ display: "block", marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textSub, fontWeight: 600, marginBottom: 2 }}><span>{label}</span><span style={{ color: C.text, fontWeight: 800 }}>{text}</span></div>
      <input type="range" aria-label={label} aria-valuetext={text} min={min} max={max} step={1} value={val} onChange={function (e) { onChange(+e.target.value); }} style={{ width: "100%", accentColor: C.green }} /></label>;
  };
  const scopeName = scope === "all" ? "all climbing" : ownOnly ? RANGE_ONLY[scope] : DISC_NAME[scope];
  const windMph = p.windMax == null ? WIND_FULL_MPH : p.windMax;
  const [more, setMore] = useState(hasExtras(p));
  const rh = p.rhMax == null ? RH_FULL_PCT : p.rhMax;
  const win = p.window || [6, 20];
  const setWin = function (a, b) { updateCondPrefs(function (x) { x.window = [a, b]; return x; }); };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div>
      <div style={LBL}>Temperatures that suit you</div>
      <div role="group" aria-label="Which climbing the temperature range is for" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {[["all", "All climbing"]].concat(COND_DISCS.map(function (k) { return [k, DISC_NAME[k]]; })).concat(Object.keys(RANGE_ONLY).map(function (k) { return [k, RANGE_ONLY[k]]; })).map(function (d) { return chip(scope === d[0], d[0] !== "all" && p.temp[d[0]] ? d[1] + " ·" : d[1], function () { setScope(d[0]); }, d[0]); })}
      </div>
      {ownOnly ? <div role="group" aria-label={"Range for " + scopeName} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {chip(!own, "Not set", clearRange, "ns")}
        {chip(own, own ? "My range" : "Set a range", function () { if (!own) setRange(scope === "ice" ? [5, 30] : [20, 50]); }, "sr")}
      </div> : <div role="group" aria-label={"Quick ranges for " + scopeName} style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {chip(scope === "all" ? !p.temp.all : !own, scope === "all" ? "Default (Mild " + rangeText(TEMP_BANDS.standard) + ", Cool for bouldering)" : "Same as all climbing", clearRange, "d")}
        {["cool", "standard", "warm"].map(function (k) { return chip(scope === "all" ? same(p.temp.all, TEMP_BANDS[k]) : same(p.temp[scope], TEMP_BANDS[k]), NAME[k] + " " + rangeText(TEMP_BANDS[k]), function () { setRange(TEMP_BANDS[k].slice()); }, k); })}
      </div>}
      {eff ? slider(ownOnly ? "Coldest I like" : "Coldest I’ll climb", uTempN(eff[0]), dMin, dMax, function (v) { const f = uTempIn(v); setRange([Math.min(f, eff[1] - MIN_SPAN), eff[1]]); }, uTemp(eff[0])) : null}
      {eff ? slider(ownOnly ? "Warmest I like" : "Hottest I’ll climb", uTempN(eff[1]), dMin, dMax, function (v) { const f = uTempIn(v); setRange([eff[0], Math.max(f, eff[0] + MIN_SPAN)]); }, uTemp(eff[1])) : null}
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{ownOnly
        ? (own ? "Each day on the Conditions tab of " + scopeName.toLowerCase() + " routes says whether the forecast temperatures fall in " + rangeText(eff) + ". The slider start is only a place to begin; set yours." : "Not set, so " + scopeName.toLowerCase() + " routes show no temperature line. There are no suggested ranges for these: set the temperatures you like.") + " Warnings about wind, snow, thunder and thaw never change."
        : "Anything from " + rangeText(eff) + " scores full marks for " + scopeName + (scope === "all" ? ", unless a discipline has its own range (marked ·)." : own ? "." : ", from your all-climbing range.") + " Alpine and ice have their own ranges, set above."}</div>
    </div>
    {full ? <>
    <div>
      <div style={LBL}>Wind you’re fine with</div>
      <div role="group" aria-label="Wind you’re fine with" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{chip(p.windMax == null, "Default (up to " + uWind(WIND_FULL_MPH) + ")", function () { updateCondPrefs(function (x) { x.windMax = null; return x; }); }, "w")}</div>
      {slider("Windiest I’ll climb in", uWindN(windMph), uWindN(WIND_MIN), uWindN(WIND_MAX), function (v) { updateCondPrefs(function (x) { x.windMax = uWindIn(v); return x; }); }, "up to " + uWind(windMph))}
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{"Full marks up to " + uWind(windMph) + ", fading to nothing by " + uWind(windMph + WIND_FADE_MPH) + ". A gust counts at 70%."}</div>
    </div>
    <div>
      <button onClick={function () { setMore(!more); }} aria-expanded={more} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{(more ? "Fewer conditions" : "More conditions (optional)") + (hasExtras(p) && !more ? " · some set" : "")}</button>
    </div>
    {more ? <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={LBL}>Humidity you’re fine with</div>
        <div role="group" aria-label="Humidity you’re fine with" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{chip(p.rhMax == null, "Default (up to " + RH_FULL_PCT + "%)", function () { updateCondPrefs(function (x) { x.rhMax = null; return x; }); }, "h")}</div>
        {slider("Most humid I’ll climb in", rh, RH_MIN, RH_MAX, function (v) { updateCondPrefs(function (x) { x.rhMax = v; return x; }); }, "up to " + rh + "%")}
        <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{"Full marks up to " + rh + "%, fading to nothing by " + rhZero(rh) + "%. The friction reading (crisp, okay, greasy) is still about the air, so it can say greasy on a day you’re fine with."}</div>
      </div>
      <div>
        <div style={LBL}>Sun or shade</div>
        <div role="group" aria-label="Sun or shade" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[[null, "Follow my temperatures"], ["sun", "I want sun"], ["shade", "I want shade"], ["either", "Don’t mind"]].map(function (o) { return chip(p.sun === o[0], o[1], function () { updateCondPrefs(function (x) { x.sun = o[0]; return x; }); }, String(o[0])); })}</div>
        <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 6 }}>{p.sun ? "Walls in " + (p.sun === "either" ? "sun or shade score alike." : p.sun === "sun" ? "sun score highest." : "shade score highest.") : "Without a choice, it wants sun when it’s cold for you and shade when it’s hot."}</div>
      </div>
      <div>
        <div style={LBL}>Daylight window</div>
        <div role="group" aria-label="Daylight window" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{chip(!p.window, "Any daylight hour", function () { updateCondPrefs(function (x) { x.window = null; return x; }); }, "any")}</div>
        {slider("Start no earlier than", win[0], 0, 21, function (v) { setWin(Math.min(v, win[1] - WIN_MIN_SPAN), win[1]); }, hourName(win[0]))}
        {slider("Finish by", win[1], 3, 24, function (v) { setWin(win[0], Math.max(v, win[0] + WIN_MIN_SPAN)); }, hourName(win[1]))}
        <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{p.window ? "The best window is picked from " + hourName(win[0]) + " to " + hourName(win[1]) + ". Hours outside it are still shown." : "The best window can fall in any daylight hour."}</div>
      </div>
      <div>
        <div style={LBL}>Smoke and air quality</div>
        <div role="group" aria-label="Smoke and air quality" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[[null, "Standard"], ["sensitive", "Sensitive lungs"], ["relaxed", "Relaxed"]].map(function (o) { return chip(p.aq === o[0], o[1], function () { updateCondPrefs(function (x) { x.aq = o[0]; return x; }); }, String(o[0])); })}</div>
        <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 6 }}>{(function () { var l = AQ_LIMITS[p.aq] || AQ_LIMITS.default; return "Above AQI " + l[0] + " the score is held to 2 ★ and above " + l[1] + " to 1 ★." + (p.aq === "relaxed" ? " Above AQI 300 (hazardous) it is held to 1 ★ whatever you pick." : ""); })()}</div>
      </div>
    </div> : null}
    <div><div style={LBL}>After rain</div><div role="group" aria-label="After rain" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chip(p.rain === "normal", "Usual drying time", function () { updateCondPrefs(function (x) { x.rain = "normal"; return x; }); }, "n")}{chip(p.rain === "cautious", "Give it longer", function () { updateCondPrefs(function (x) { x.rain = "cautious"; return x; }); }, "c")}</div></div>
    </> : null}
    <div role="status" style={{ fontSize: 11.5, color: sync === "failed" ? C.amber : C.textMuted, lineHeight: 1.5 }}>{SYNC_TEXT[sync] || SYNC_TEXT.local}</div>
  </div>;
}
