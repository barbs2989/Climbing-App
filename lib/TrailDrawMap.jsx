import { useEffect, useRef, useState } from "react";
import { loadLeaflet, applyBaseLayer } from "./mapKit";
import { loadUnits } from "./units-pref";
import { MIN_RECORDED_PTS } from "./track";

// TRACE THE WALK IN ON THE MAP. A crag's trail used to be addable only as a recorded GPX, so the
// line reached a crag only after someone had walked it with a watch running AND thought to export
// the file. theCrag draws approach paths by hand on the map, from the parking toward the cliff,
// and attaches them to the crag; this is that, for climbers who know the way but have no recording.
// Topo opens first because it draws the mapped footpaths to trace over; Satellite shows the
// unmapped climbers' trails. `start` is the parking pin, `end` the crag's own coordinate; either
// may be missing. `pts` is [[lat,lng],...] in walking order, owned by the caller.
function lenM(pts) {
  let m = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
    m += 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  return m;
}
// In the climber's units (check:units): feet/miles or metres/kilometres.
export function fmtTrailLen(m) {
  if (loadUnits() === "metric") return m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(2) + " km";
  const ft = m * 3.28084;
  return ft < 1000 ? Math.round(ft / 10) * 10 + " ft" : (ft / 5280).toFixed(2) + " mi";
}
export function trailLenM(pts) { return lenM(pts || []); }

/* `marks` names the two pins: the crag default (P parking, C crag), or the desktop drawing tool's
   T trailhead and S summit / B base on a route that is not a crag. */
const CRAG_MARKS = { start: "P", end: "C", startName: "the parking pin", endName: "the crag" };
export default function TrailDrawMap({ start, end, pts, setPts, C, marks }) {
  const mk = marks || CRAG_MARKS;
  const mapDiv = useRef(null), mapRef = useRef(null), tileRef = useRef(null), drawn = useRef([]);
  const [ready, setReady] = useState(false), [mapFail, setMapFail] = useState(false);
  const [baseLayer, setBaseLayer] = useState("topo");
  const addRef = useRef(null);
  // The map is built once; that one build reads these, so a later prop change cannot rebuild it.
  const initRef = useRef({ start, end, baseLayer });
  addRef.current = (lat, lng) => setPts((p) => p.concat([[+lat.toFixed(6), +lng.toFixed(6)]]));
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L, map = L.map(mapDiv.current, { attributionControl: false });
      const { start: s0, end: e0, baseLayer: b0 } = initRef.current;
      applyBaseLayer(map, tileRef, b0);
      const anchors = [s0, e0].filter(Boolean).map((p) => [p.lat, p.lng]);
      if (anchors.length > 1) map.fitBounds(L.latLngBounds(anchors).pad(0.4), { maxZoom: 17 });
      else if (anchors.length) map.setView(anchors[0], 16);
      else map.setView([39.5, -98.5], 4);
      map.on("click", (e) => addRef.current && addRef.current(e.latlng.lat, e.latlng.lng));
      mapRef.current = map; setReady(true);
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 150);
    };
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => { cancelled = true; clearTimeout(ft); if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} mapRef.current = null; tileRef.current = null; } };
  }, []);
  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);
  useEffect(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !L) return;
    drawn.current.forEach((l) => { try { map.removeLayer(l); } catch (e) {} });
    drawn.current = [];
    const keep = (l) => { l.addTo(map); drawn.current.push(l); };
    const pin = (p, label, color) => keep(L.marker([p.lat, p.lng], { keyboard: false, interactive: false, icon: L.divIcon({ className: "", iconSize: [24, 24], iconAnchor: [12, 12], html: '<div style="width:24px;height:24px;border-radius:50%;background:' + color + ';border:2px solid #fff;color:#fff;font:700 12px/20px system-ui;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.5)">' + label + "</div>" }) }));
    if (start) pin(start, mk.start, C.accent);
    if (end) pin(end, mk.end, C.warning);
    if (pts.length > 1) keep(L.polyline(pts, { color: C.warning, weight: 4, opacity: 0.95 }));
    pts.forEach((p, i) => keep(L.circleMarker(p, { radius: i === pts.length - 1 ? 6 : 4, color: "#fff", weight: 2, fillColor: C.warning, fillOpacity: 1, interactive: false })));
  }, [pts, ready, start, end, C.accent, C.warning, mk.start, mk.end]);
  const btn = { padding: "8px 11px", borderRadius: 8, border: "1px solid " + C.border, background: C.bg70, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const off = { opacity: 0.4, cursor: "default" };
  return (
    <div>
      <div style={{ position: "relative" }}>
        <div ref={mapDiv} role="application" aria-label="Map: tap to add a point to the trail" style={{ height: 300, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: "#0a0f1a", cursor: "crosshair" }} />
        {!ready ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.text70, fontSize: 13, pointerEvents: "none", textAlign: "center", padding: 16 }}>{mapFail ? "The map couldn't load. Upload or paste a recorded track instead." : "Loading map…"}</div> : null}
        {ready ? <div style={{ position: "absolute", top: 7, left: 7, zIndex: 1000, display: "flex", gap: 3 }}>{[["topo", "Topo"], ["sat", "Satellite"], ["street", "Street"]].map(([k, lbl]) => <button key={k} onClick={() => setBaseLayer(k)} aria-current={baseLayer === k ? "true" : undefined} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid " + (baseLayer === k ? C.accent : C.border), background: C.bg, color: baseLayer === k ? C.accent : C.text70, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>{lbl}</button>)}</div> : null}
        {ready ? <div style={{ position: "absolute", bottom: 7, left: 7, right: 7, zIndex: 1000, background: "rgba(13,17,23,0.85)", borderRadius: 7, padding: "4px 8px", fontSize: 12, color: "#fff", textAlign: "center", pointerEvents: "none" }}>{pts.length ? (pts.length < MIN_RECORDED_PTS ? pts.length + " of at least " + MIN_RECORDED_PTS + " points" : pts.length + " points") + " · " + fmtTrailLen(lenM(pts)) + " · tap to keep going" : start ? "Tap the map along the trail, starting at P (parking)" : "Tap where you park, then along the trail to the crag"}</div> : null}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {start ? <button onClick={() => setPts((p) => (p.length ? p : [[start.lat, start.lng]]))} disabled={pts.length > 0} style={pts.length ? { ...btn, ...off } : btn}>{"Start at " + mk.start}</button> : null}
        {end ? <button onClick={() => setPts((p) => p.concat([[end.lat, end.lng]]))} disabled={!pts.length} style={pts.length ? btn : { ...btn, ...off }}>{"Finish at " + mk.end}</button> : null}
        <button onClick={() => setPts((p) => p.slice(0, -1))} disabled={!pts.length} style={pts.length ? btn : { ...btn, ...off }}>Undo point</button>
        <button onClick={() => setPts([])} disabled={!pts.length} style={pts.length ? btn : { ...btn, ...off }}>Clear</button>
      </div>
      <p style={{ fontSize: 12, color: C.text70, margin: "8px 0 0", lineHeight: 1.45 }}>
        <b style={{ color: C.accent }}>{mk.start}</b>{" is " + mk.startName + " and "}<b style={{ color: C.warning }}>{mk.end}</b>{" " + mk.endName + "."} Follow the trail the way you walk it, with a point at every bend and fork. Zoom in: Topo shows mapped paths, Satellite shows the ones that aren't.
      </p>
    </div>
  );
}
