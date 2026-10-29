import { useEffect, useMemo, useState } from "react";
import { C, DLOCALE, MOUNTAINS, catOf } from "../ClimbMatchCore.jsx";
import { fetchCragForecastMeasured } from "./forecast";
import { scoreForecast, starsLabel, CRAG_SCORE_DISCIPLINES, OPEN_DAY } from "./conditionsScore.js";
import { useCondPrefs, scorePrefs } from "./CondPrefs.jsx";
import { routeRock } from "./rockType.js";
import { useRoutesByIds, dbRouteToCamel, useAreaCardsByIds, useAreasClimbDiscs } from "./db.js";
import { USE_DB } from "./supabase";
import Chevron from "../src/components/Chevron.tsx";

/* BEST DAY TO CLIMB — Home's answer to "which of my saved crag climbs, and when, this week?". It is
   the route page's conditions score (lib/conditionsScore.js, same factors, same prefs) run over the
   climber's saved crag routes, so a number here and the one on that route's Conditions tab agree.
   Crag disciplines only, like the score itself; a saved climb with no crag location is listed as
   unscored, never dropped silently. One forecast per crag (routes on one crag share it), at most
   MAX_CRAGS, and the tile says when it is showing fewer than the climber saved.
   With no saved crag climb it shows only how to get one: no number, so it rates nothing.
   SAVED AREAS are scored too, as CragReport and Climbing Weather forecast a crag rather than a route:
   at the area's own coordinate, with its own wall direction and rock when the row has them. A crag
   is in when one of its disciplines is a crag one; a REGION's own row carries no disciplines, so it
   is in when crag climbs are at least half of the climbs under it (area_climb_stats), and is scored
   for its most-climbed crag discipline. Peaks, ranges and states are left out, like a saved alpine
   route: the score is a rock score. */
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

const AREA_TYPES = ["crag", "wall", "region"];
// The crag discipline an area is scored for, or null when it is not a crag place.
const areaDisc = function (a, byDisc) {
  if (a.type === "region") {
    if (!byDisc) return null;
    let all = 0, crag = 0, top = null;
    for (const x of byDisc) { all += x.n; if (CRAG_SCORE_DISCIPLINES.includes(x.disc)) { crag += x.n; if (!top || x.n > top.n) top = x; } }
    return top && crag * 2 >= all ? top.disc : null;
  }
  if (CRAG_SCORE_DISCIPLINES.includes(a.dominant)) return a.dominant;
  return (a.disciplines || []).find(function (d) { return CRAG_SCORE_DISCIPLINES.includes(d); }) || null;
};

export default function BestDayTile({ ids, areaIds, routeById, onOpen, onOpenArea, onPrefs, onExplore }) {
  // Saved ids App has not resolved (it resolves lists, logs and crews, not objectives) are read here,
  // with the same area embed, so a saved DB climb is scored rather than skipped.
  const missing = (ids || []).filter(function (id) { return !routeById(id); });
  const { data: fetched } = useRoutesByIds(USE_DB ? missing : []);
  const routes = (ids || []).map(function (id) { const r = routeById(id); if (r) return r; const f = (fetched || []).find(function (x) { return x.id === id; }); return f ? dbRouteToCamel(f) : null; }).filter(Boolean);
  const routeKey = routes.map(function (r) { return r.id; }).join(",");
  const crag = useMemo(function () { return routes.filter(function (r) { return CRAG_SCORE_DISCIPLINES.includes(catOf(r)); }); }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps -- routes is rebuilt every render; routeKey (the joined ids) is the identity that matters

  // Saved areas: a seed area is read off MOUNTAINS, a DB one from the area-card read the Saved view
  // already makes; a region's disciplines come from the climbs under it.
  const aIds = areaIds || [];
  const dbAIds = aIds.filter(function (id) { return !MOUNTAINS.some(function (m) { return m.id === id; }); });
  const cardsQ = useAreaCardsByIds(USE_DB ? dbAIds : []);
  const cards = cardsQ.data || {};
  const regionIds = dbAIds.filter(function (id) { return cards[id] && cards[id].type === "region" && cards[id].lat != null; });
  const discsQ = useAreasClimbDiscs(USE_DB ? regionIds : []);
  const areas = [];
  for (const id of aIds) {
    const m = MOUNTAINS.find(function (x) { return x.id === id; });
    const a = m ? { name: m.name, type: m.areaType, lat: m.lat, lng: m.lng, aspect: m.aspect || null, rock: m.rock || null, disciplines: [], dominant: null } : cards[id];
    if (!a || !AREA_TYPES.includes(a.type)) continue;
    // A seed area carries no disciplines: a seed crag is scored for no discipline in particular, a seed region not at all.
    const disc = m ? null : areaDisc(a, (discsQ.data || {})[id]);
    if (m ? a.type === "region" : !disc) continue;
    areas.push({ id: id, name: a.name, parentName: a.parentName || null, aspect: a.aspect, rock: a.rock, rockBasis: a.rockBasis, discipline: disc, lat: a.lat, lng: a.lng });
  }
  const areasPending = USE_DB && ((dbAIds.length > 0 && cardsQ.isLoading) || (regionIds.length > 0 && discsQ.isLoading));
  const located = crag.map(function (r) { return { r: r, pt: ptOf(r) }; }).concat(areas.map(function (a) {
    const lat = a.lat != null ? +a.lat : null, lng = a.lng != null ? +a.lng : null;
    // `r` is a route-shaped stand-in so the rows below read one shape; `area` marks it.
    return { r: { id: "area:" + a.id, name: a.name, aspect: a.aspect, _dbArea: { rock: a.rock, rockBasis: a.rockBasis } }, area: a, pt: lat != null && lng != null && isFinite(lat) && isFinite(lng) ? { lat: lat, lng: lng, crag: a.parentName } : null };
  }));
  const open1 = function (row) { if (row.area) { if (onOpenArea) onOpenArea(row.area); } else onOpen(row.r, "forecast"); };
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
      fetchCragForecastMeasured(+p[0], +p[1]).then(function (j) { _wx[k] = j; if (live) setWx(function (o) { return Object.assign({}, o, { [k]: { data: j } }); }); },
        function () { if (live) setWx(function (o) { return Object.assign({}, o, { [k]: { error: true } }); }); });
    }
    return function () { live = false; };
  }, [keyStr, tries]); // eslint-disable-line react-hooks/exhaustive-deps -- keys is rebuilt each render; keyStr is its joined identity
  // The climber's ideal conditions, from the ONE store the route page and Settings write through,
  // so a change made on a route re-scores this tile at once (lib/CondPrefs.jsx).
  const prefs = scorePrefs(useCondPrefs());
  const rows = located.map(function (x) {
    const ar = x.area || null;
    if (!x.pt) return { r: x.r, area: ar, why: ar ? "no location on file" : "no crag location on file" };
    if (!keys.includes(x.k)) return { r: x.r, area: ar, why: "over the " + MAX_CRAGS + "-crag limit", over: true };
    const w = wx[x.k];
    if (!w) return { r: x.r, area: ar, loading: true, crag: x.pt.crag };
    if (w.error) return { r: x.r, area: ar, why: "forecast didn’t load", crag: x.pt.crag, failed: true };
    const rk = routeRock(x.r);
    const s = scoreForecast(w.data, { lat: x.pt.lat, lng: x.pt.lng, aspect: x.r.aspect || x.r.face || (x.r._dbArea && x.r._dbArea.aspect) || null, family: rk ? rk.family : null, rock: rk ? rk.rock : null, discipline: ar ? ar.discipline : catOf(x.r) }, prefs);
    return s ? { r: x.r, area: ar, s: s, crag: x.pt.crag } : { r: x.r, area: ar, why: "forecast didn’t load", failed: true, crag: x.pt.crag };
  });
  if (!crag.length && areasPending) return <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}><div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"Checking your saved areas…"}</div></div>;
  if (!located.length) return <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>{"Best day to climb"}</div><div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{"Save a sport, trad, top-rope or bouldering climb, or a crag, and this picks its best day this week."}</div><button onClick={onExplore} style={{ marginTop: 8, background: "none", border: "1px solid " + C.border, color: C.blue, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{"Explore climbs"}</button></div>;
  let best = null;
  for (const row of rows) if (row.s) row.s.days.forEach(function (d, i) { if (d.stars != null && (!best || d.stars > best.d.stars)) best = { row: row, d: d, i: i }; });
  const loading = rows.some(function (x) { return x.loading; }), failed = rows.filter(function (x) { return x.failed; }).length;
  const over = rows.filter(function (x) { return x.over; }).length;
  const dates = (rows.find(function (x) { return x.s; }) || {}).s;
  const box = { background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "12px 14px", marginBottom: 14 };
  const hd = <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>{"Best day to climb"}</div>;
  if (!best) return <div style={box}>{hd}<div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>{loading ? "Checking this week’s forecast for your saved crags…" : failed ? "Couldn’t load the forecast for your saved crags, so there is no best day to show — this is not a rating." : "None of your saved crag climbs or areas has a location on file yet, so there is no forecast to score."}</div>{!loading && failed ? <button onClick={function () { setTries(tries + 1); }} style={{ marginTop: 8, background: "none", border: "1px solid " + C.border, color: C.blue, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Try again</button> : null}</div>;
  const b = best;
  return <div style={box}>{hd}
    <button onClick={function () { open1(b.row); }} aria-label={"Open " + b.row.r.name + (b.row.area ? "" : " conditions")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: C.text }}>
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 54 }}><div style={{ fontSize: 22, fontWeight: 800, color: tint(b.d.stars), lineHeight: 1 }}>{b.d.stars.toFixed(1)}</div><div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>{"of 5 ★"}</div></div>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{dayName(b.d.date, b.i) + (b.d.best ? ", " + hr(b.d.best.start) + " – " + hr(b.d.best.end % 24) : "")}</div><div style={{ fontSize: 12.5, color: C.textSub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.row.r.name + (b.row.crag ? " · " + b.row.crag : "") + (b.row.area ? " · saved area" : "")}</div></div>
      <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>
    </button>
    <button onClick={function () { setOpen(!open); }} aria-expanded={open} style={{ marginTop: 10, width: "100%", background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, padding: "8px 10px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between" }}><span>{(function () { const na = rows.filter(function (x) { return x.area; }).length, nr = rows.length - na; return "Compare your " + [nr ? nr + " saved crag climb" + (nr === 1 ? "" : "s") : null, na ? na + " saved area" + (na === 1 ? "" : "s") : null].filter(Boolean).join(" and "); })()}</span><Chevron open={open} size={16} color={C.blue} /></button>
    {open ? <div style={{ marginTop: 10, overflowX: "auto" }}>
      {dates ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(" + dates.days.length + ",30px)", gap: 3, fontSize: 10.5, color: C.textMuted, fontWeight: 700, marginBottom: 4 }}><span />{dates.days.map(function (d, i) { return <span key={d.date} aria-label={dayName(d.date, i)} style={{ textAlign: "center", color: i === 0 ? C.blue : C.textMuted }}>{dayName(d.date, 2).slice(0, 3)}</span>; })}</div> : null}
      {rows.map(function (row) {
        return <div key={row.r.id} style={{ display: "grid", gridTemplateColumns: dates ? "minmax(0,1fr) repeat(" + dates.days.length + ",30px)" : "1fr", gap: 3, alignItems: "center", padding: "5px 0", borderTop: "1px solid " + C.borderLight }}>
          <button onClick={function () { open1(row); }} style={{ minWidth: 0, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: C.text }}><div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.r.name}</div><div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.s ? [row.crag, row.area ? "saved area" : null].filter(Boolean).join(" · ") : row.loading ? "Loading…" : "No score: " + row.why}</div></button>
          {row.s && dates ? dates.days.map(function (d, i) { const m = row.s.days.find(function (x) { return x.date === d.date; }); const v = m && m.stars != null ? m.stars : null; return <button key={d.date} onClick={function () { if (row.area) { open1(row); return; } OPEN_DAY.date = d.date; onOpen(row.r, "forecast"); }} aria-label={row.r.name + ", " + dayName(d.date, i) + ": " + (v == null ? "no score" : v.toFixed(1) + " of 5")} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 800, color: v == null ? C.textMuted : tint(v), background: C.surface, border: "none", borderRadius: 6, padding: "4px 0", cursor: "pointer", minWidth: 0 }}>{v == null ? "–" : v.toFixed(1)}</button>; }) : null}
        </div>;
      })}
      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>{"Each number is that day’s best 3-hour window, scored as on the route’s Conditions tab. Tap one to open that day." + (rows.some(function (x) { return x.area; }) ? " A saved area is scored at its own location, for the climbing most of it holds; sun on the wall counts only where the area has one wall direction on file." : "") + (over ? " Showing the first " + MAX_CRAGS + " crags you saved." : "") + (failed ? " " + failed + " couldn’t load." : "")}</div>
    </div> : null}
    {onPrefs ? <button onClick={onPrefs} style={{ marginTop: 8, background: "none", border: "none", padding: "4px 0", minHeight: 24, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{"Your conditions ›"}</button> : null}
  </div>;
}
