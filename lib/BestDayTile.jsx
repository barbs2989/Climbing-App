import { useEffect, useMemo, useState } from "react";
import { C, DLOCALE, MOUNTAINS, catOf } from "../ClimbMatchCore.jsx";
import { fetchCragForecast } from "./forecast";
import { scoreForecast, starsLabel, CRAG_SCORE_DISCIPLINES, OPEN_DAY } from "./conditionsScore.js";
import { useCondPrefs, scorePrefs } from "./CondPrefs.jsx";
import { routeRock } from "./rockType.js";
import { useRoutesByIds, dbRouteToCamel } from "./db.js";
import { USE_DB } from "./supabase";

/* BEST DAY TO CLIMB — Home's answer to "which of my saved crag climbs, and when, this week?". It is
   the route page's conditions score (lib/conditionsScore.js, same factors, same prefs) run over the
   climber's saved crag routes, so a number here and the one on that route's Conditions tab agree.
   Crag disciplines only, like the score itself; a saved climb with no crag location is listed as
   unscored, never dropped silently. One forecast per crag (routes on one crag share it), at most
   MAX_CRAGS, and the tile says when it is showing fewer than the climber saved.
   With no saved crag climb it shows only how to get one: no number, so it rates nothing. */
const MAX_CRAGS = 8;
const _wx = {};
const ptOf = function (r) {
  const m = MOUNTAINS.find(function (x) { return x.id === r.mountainId; }) || r._dbArea || null;
  const lat = m && m.lat != null ? +m.lat : null, lng = m && m.lng != null ? +m.lng : null;
  return lat != null && lng != null && isFinite(lat) && isFinite(lng) ? { lat: lat, lng: lng, crag: m.name || null } : null;
};
const tint = function (s) { const l = starsLabel(s); return l === "Good" ? C.green : l === "Fair" ? C.amber : l === "Poor" ? C.red : C.textMuted; };
const dayName = function (d, i) { if (i === 0) return "Today"; if (i === 1) return "Tomorrow"; try { return new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { weekday: "short" }); } catch (e) { return d.slice(5); } };
const hr = function (h) { const a = h >= 12 ? "PM" : "AM"; return (h % 12 || 12) + " " + a; };

export default function BestDayTile({ ids, routeById, onOpen, onPrefs, onExplore }) {
  // Saved ids App has not resolved (it resolves lists, logs and crews, not objectives) are read here,
  // with the same area embed, so a saved DB climb is scored rather than skipped.
  const missing = (ids || []).filter(function (id) { return !routeById(id); });
  const { data: fetched } = useRoutesByIds(USE_DB ? missing : []);
  const routes = (ids || []).map(function (id) { const r = routeById(id); if (r) return r; const f = (fetched || []).find(function (x) { return x.id === id; }); return f ? dbRouteToCamel(f) : null; }).filter(Boolean);
  const routeKey = routes.map(function (r) { return r.id; }).join(",");
  const crag = useMemo(function () { return routes.filter(function (r) { return CRAG_SCORE_DISCIPLINES.includes(catOf(r)); }); }, [routeKey]);
  const located = crag.map(function (r) { return { r: r, pt: ptOf(r) }; });
  const keys = [];
  for (const x of located) if (x.pt) { const k = x.pt.lat.toFixed(3) + "," + x.pt.lng.toFixed(3); x.k = k; if (!keys.includes(k) && keys.length < MAX_CRAGS) keys.push(k); }
  const keyStr = keys.join("|");
  const [wx, setWx] = useState({}); const [tries, setTries] = useState(0); const [open, setOpen] = useState(false);
  useEffect(function () {
    let live = true;
    const next = {};
    for (const k of keys) next[k] = _wx[k] ? { data: _wx[k] } : null;
    setWx(next);
    for (const k of keys) {
      if (_wx[k]) continue;
      const p = k.split(",");
      fetchCragForecast(+p[0], +p[1]).then(function (j) { _wx[k] = j; if (live) setWx(function (o) { return Object.assign({}, o, { [k]: { data: j } }); }); },
        function () { if (live) setWx(function (o) { return Object.assign({}, o, { [k]: { error: true } }); }); });
    }
    return function () { live = false; };
  }, [keyStr, tries]);
  // The climber's ideal conditions, from the ONE store the route page and Settings write through,
  // so a change made on a route re-scores this tile at once (lib/CondPrefs.jsx).
  const prefs = scorePrefs(useCondPrefs());
  const rows = located.map(function (x) {
    if (!x.pt) return { r: x.r, why: "no crag location on file" };
    if (!keys.includes(x.k)) return { r: x.r, why: "over the " + MAX_CRAGS + "-crag limit", over: true };
    const w = wx[x.k];
    if (!w) return { r: x.r, loading: true, crag: x.pt.crag };
    if (w.error) return { r: x.r, why: "forecast didn’t load", crag: x.pt.crag, failed: true };
    const rk = routeRock(x.r);
    const s = scoreForecast(w.data, { lat: x.pt.lat, lng: x.pt.lng, aspect: x.r.aspect || x.r.face || (x.r._dbArea && x.r._dbArea.aspect) || null, family: rk ? rk.family : null, discipline: catOf(x.r) }, prefs);
    return s ? { r: x.r, s: s, crag: x.pt.crag } : { r: x.r, why: "forecast didn’t load", failed: true, crag: x.pt.crag };
  });
  if (!crag.length) return <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>{"Best day to climb"}</div><div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"Save a sport, trad, top-rope or bouldering climb and this picks its best day this week."}</div><button onClick={onExplore} style={{ marginTop: 8, background: "none", border: "1px solid " + C.border, color: C.blue, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{"Explore climbs"}</button></div>;
  let best = null;
  for (const row of rows) if (row.s) row.s.days.forEach(function (d, i) { if (d.stars != null && (!best || d.stars > best.d.stars)) best = { row: row, d: d, i: i }; });
  const loading = rows.some(function (x) { return x.loading; }), failed = rows.filter(function (x) { return x.failed; }).length;
  const over = rows.filter(function (x) { return x.over; }).length;
  const dates = (rows.find(function (x) { return x.s; }) || {}).s;
  const box = { background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "12px 14px", marginBottom: 14 };
  const hd = <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>{"Best day to climb"}</div>;
  if (!best) return <div style={box}>{hd}<div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{loading ? "Checking this week’s forecast for your saved crag climbs…" : failed ? "Couldn’t load the forecast for your saved crag climbs, so there is no best day to show — this is not a rating." : "None of your saved crag climbs has a crag location on file yet, so there is no forecast to score."}</div>{!loading && failed ? <button onClick={function () { setTries(tries + 1); }} style={{ marginTop: 8, background: "none", border: "1px solid " + C.border, color: C.blue, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Try again</button> : null}</div>;
  const b = best;
  return <div style={box}>{hd}
    <button onClick={function () { onOpen(b.row.r, "forecast"); }} aria-label={"Open " + b.row.r.name + " conditions"} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: C.text }}>
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 54 }}><div style={{ fontSize: 22, fontWeight: 800, color: tint(b.d.stars), lineHeight: 1 }}>{b.d.stars.toFixed(1)}</div><div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>{"of 5 ★"}</div></div>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{dayName(b.d.date, b.i) + (b.d.best ? ", " + hr(b.d.best.start) + " – " + hr(b.d.best.end % 24) : "")}</div><div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.row.r.name + (b.row.crag ? " · " + b.row.crag : "")}</div></div>
      <span style={{ fontSize: 18, color: C.textMuted, flexShrink: 0 }}>{"›"}</span>
    </button>
    <button onClick={function () { setOpen(!open); }} aria-expanded={open} style={{ marginTop: 10, width: "100%", background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, padding: "8px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between" }}><span>{"Compare your " + rows.length + " saved crag climb" + (rows.length === 1 ? "" : "s")}</span><span style={{ color: C.blue }}>{open ? "▾" : "▸"}</span></button>
    {open ? <div style={{ marginTop: 10, overflowX: "auto" }}>
      {dates ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(" + dates.days.length + ",30px)", gap: 3, fontSize: 10.5, color: C.textMuted, fontWeight: 700, marginBottom: 4 }}><span />{dates.days.map(function (d, i) { return <span key={d.date} aria-label={dayName(d.date, i)} style={{ textAlign: "center", color: i === 0 ? C.blue : C.textMuted }}>{dayName(d.date, 2).slice(0, 3)}</span>; })}</div> : null}
      {rows.map(function (row) {
        return <div key={row.r.id} style={{ display: "grid", gridTemplateColumns: dates ? "minmax(0,1fr) repeat(" + dates.days.length + ",30px)" : "1fr", gap: 3, alignItems: "center", padding: "5px 0", borderTop: "1px solid " + C.borderLight }}>
          <button onClick={function () { onOpen(row.r, "forecast"); }} style={{ minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: C.text }}><div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.r.name}</div><div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.s ? (row.crag || "") : row.loading ? "Loading…" : "No score: " + row.why}</div></button>
          {row.s && dates ? dates.days.map(function (d, i) { const m = row.s.days.find(function (x) { return x.date === d.date; }); const v = m && m.stars != null ? m.stars : null; return <button key={d.date} onClick={function () { OPEN_DAY.date = d.date; onOpen(row.r, "forecast"); }} aria-label={row.r.name + ", " + dayName(d.date, i) + ": " + (v == null ? "no score" : v.toFixed(1) + " of 5")} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: v == null ? C.textMuted : tint(v), background: C.surface, border: "none", borderRadius: 6, padding: "4px 0", cursor: "pointer", minWidth: 0 }}>{v == null ? "–" : v.toFixed(1)}</button>; }) : null}
        </div>;
      })}
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>{"Each number is that day’s best 3-hour window, scored as on the route’s Conditions tab. Tap one to open that day." + (over ? " Showing the first " + MAX_CRAGS + " crags you saved." : "") + (failed ? " " + failed + " couldn’t load." : "")}</div>
    </div> : null}
    {onPrefs ? <button onClick={onPrefs} style={{ marginTop: 8, background: "none", border: "none", padding: "4px 0", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{"Your conditions ›"}</button> : null}
  </div>;
}
