import { useEffect, useState } from "react";
import { C, DLOCALE, MOUNTAINS, catOf, gradeLabel, uDist, uElev, routeAscentFt, routeLocText } from "../ClimbMatchCore.jsx";
import { effDistKm } from "./outing.js";
import { fetchCragForecastMeasured } from "./forecast";
import { scoreForecast, starsLabel, CRAG_SCORE_DISCIPLINES } from "./conditionsScore.js";
import { useCondPrefs, scorePrefs } from "./CondPrefs.jsx";
import { routeRock } from "./rockType.js";
import { POP_BACK, POP_CHIP_X } from "./popupChrome.js";
import { discLabel } from "./discLabels";

/* COMPARE ROUTES (desktop website, owner 2026-10-22): "+ Compare" on a route page adds it to a tray
   pinned at the bottom of the window (up to four); the tray opens a side-by-side table. Every cell
   is a value the route STORES, read the way its own page reads it; one it does not store says "—".
   The conditions row is the route page's own score (the best day this week, crag disciplines
   only) — alpine climbs are judged by flags, not a number, so they say so instead of a blank. */
export const COMPARE_MAX = 4;

const _wx = {};
const ptOf = function (r) {
  const m = MOUNTAINS.find(function (x) { return x.id === r.mountainId; }) || r._dbArea || null;
  const lat = m && m.lat != null ? +m.lat : null, lng = m && m.lng != null ? +m.lng : null;
  return lat != null && lng != null && isFinite(lat) && isFinite(lng) ? { lat: lat, lng: lng } : null;
};
const dayName = function (d, i) { if (i === 0) return "Today"; if (i === 1) return "Tomorrow"; try { return new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { weekday: "short" }); } catch (e) { return d.slice(5); } };

function BestDayCell({ route }) {
  const on = CRAG_SCORE_DISCIPLINES.includes(catOf(route));
  const pt = on ? ptOf(route) : null;
  const k = pt ? pt.lat.toFixed(3) + "," + pt.lng.toFixed(3) : "";
  const [wx, setWx] = useState(function () { return k && _wx[k] ? { data: _wx[k] } : null; });
  const prefs = scorePrefs(useCondPrefs());
  useEffect(function () {
    if (!k) return undefined;
    if (_wx[k]) { setWx({ data: _wx[k] }); return undefined; }
    let live = true; setWx(null);
    fetchCragForecastMeasured(pt.lat, pt.lng).then(function (j) { _wx[k] = j; if (live) setWx({ data: j }); }, function () { if (live) setWx({ error: true }); });
    return function () { live = false; };
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps -- `pt` is derived from `k`'s own inputs; keying on `k` alone is what stops a refetch per render
  if (!on) return <span style={{ color: C.textMuted }}>Judged by flags — see its Conditions tab</span>;
  if (!pt) return <span style={{ color: C.textMuted }}>No crag location on file</span>;
  if (!wx) return <span style={{ color: C.textMuted }}>Checking the forecast…</span>;
  if (wx.error) return <span style={{ color: C.amber }}>Forecast didn’t load</span>;
  const rk = routeRock(route);
  const s = scoreForecast(wx.data, { lat: pt.lat, lng: pt.lng, aspect: route.aspect || route.face || (route._dbArea && route._dbArea.aspect) || null, family: rk ? rk.family : null, rock: rk ? rk.rock : null, discipline: catOf(route) }, prefs);
  let best = null;
  (s ? s.days : []).forEach(function (d, i) { if (d.stars != null && (!best || d.stars > best.d.stars)) best = { d: d, i: i }; });
  if (!best) return <span style={{ color: C.textMuted }}>No climbable window this week</span>;
  return <span><b>{best.d.stars.toFixed(1)}</b><span style={{ color: C.textMuted }}>{" of 5 · " + starsLabel(best.d.stars) + " · " + dayName(best.d.date, best.i)}</span></span>;
}

const ROWS = [
  ["Grade", r => gradeLabel(r)],
  ["Discipline", r => discLabel(catOf(r))],
  ["Where", r => routeLocText(r)],
  ["Length", r => r.routeFt != null ? uElev(r.routeFt) : null],
  ["Pitches", r => r.pitches > 0 ? String(r.pitches) : null],
  ["Approach", r => { const d = effDistKm(r); return d != null ? uDist(d) : null; }],
  ["Gain", r => { const g = routeAscentFt(r); return g != null ? "↑" + uElev(g) : null; }],
  ["Aspect", r => r.aspect || r.face || (r._dbArea && r._dbArea.aspect) || null],
  ["Season", r => r.season],
  ["Rating", r => r.stars != null && Number(r.stars) > 0 ? Number(r.stars).toFixed(1) + " ★" : null],
  ["Hazards", r => Array.isArray(r.hazards) && r.hazards.length ? r.hazards.join(" · ") : null],
];

export function CompareTray({ routes, onRemove, onClear, onOpen }) {
  return <div role="region" aria-label="Routes to compare" style={{ position: "fixed", bottom: 16, left: "var(--cm-col-left)", width: "var(--cm-col-w)", zIndex: 45, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
    <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", maxWidth: "100%", boxSizing: "border-box", background: C.surface, border: "1px solid " + C.borderHi, borderRadius: 14, boxShadow: "0 12px 36px rgba(0,0,0,0.55)", padding: "8px 10px" }}>
      {routes.map(r => <button key={r.id} onClick={() => onRemove(r.id)} aria-label={"Remove " + r.name + " from the comparison"} style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 190, background: C.card, border: "1px solid " + C.border, borderRadius: 999, padding: "5px 8px 5px 11px", color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span><span aria-hidden="true" style={POP_CHIP_X}>✕</span></button>)}
      <button onClick={onOpen} disabled={routes.length < 2} title={routes.length < 2 ? "Add one more climb to compare" : undefined} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: routes.length < 2 ? C.card : C.blueSolid, color: routes.length < 2 ? C.textMuted : "#fff", fontSize: 13, fontWeight: 700, cursor: routes.length < 2 ? "default" : "pointer" }}>{routes.length < 2 ? "Add another to compare" : "Compare " + routes.length}</button>
      <button onClick={onClear} style={{ padding: "8px 6px", border: "none", background: "transparent", color: C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Clear</button>
    </div>
  </div>;
}

export function CompareView({ routes, onClose, onRemove, onOpenRoute }) {
  const cell = { padding: "9px 10px", borderBottom: "1px solid " + C.borderLight, fontSize: 13, verticalAlign: "top", textAlign: "left", lineHeight: 1.45 };
  return <div role="dialog" aria-modal="true" aria-label="Compare climbs" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1100, overflowY: "auto", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
      <button onClick={onClose} style={POP_BACK}>← Back</button>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{"Compare " + routes.length + " climbs"}</div>
    </div>
    <div style={{ padding: "14px 16px 40px", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", color: C.text }}>
        <thead><tr><th style={{ ...cell, width: 96 }} />{routes.map(r => <th key={r.id} scope="col" style={{ ...cell, fontSize: 14 }}><button onClick={() => onOpenRoute(r)} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>{r.name}</button><div><button onClick={() => onRemove(r.id)} style={{ background: "none", border: "none", padding: "4px 0 0", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>Remove</button></div></th>)}</tr></thead>
        <tbody>
          {ROWS.map(([label, get]) => <tr key={label}><th scope="row" style={{ ...cell, color: C.textMuted, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</th>{routes.map(r => { const v = get(r); return <td key={r.id} style={cell}>{v == null || v === "" ? <span style={{ color: C.textMuted }}>—</span> : v}</td>; })}</tr>)}
          <tr><th scope="row" style={{ ...cell, color: C.textMuted, fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4 }}>Best day</th>{routes.map(r => <td key={r.id} style={cell}><BestDayCell route={r} /></td>)}</tr>
        </tbody>
      </table>
    </div>
  </div>;
}
