import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../ClimbMatchCore.jsx";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle } from "./mapKit";
import { POP_CLOSE, POP_CLOSE_MEDIA } from "./popupChrome.js";

// A small map of a crag's walk in (0397): the line over the parking pin (P) and the crag
// (C), on Topo, which draws the mapped footpaths. Used on the crag's own page (Getting there) and in
// the owner's trail queue. `pts` is [[lat,lng],...]; `park` and `crag` are {lat,lng} or null.
/** @type {(gpx: unknown) => number[][]} */
export const walkInPts = (gpx) => (Array.isArray(gpx) ? gpx : []).map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : p && typeof p === "object" ? [Number(p.lat), Number(p.lng)] : null)).filter((p) => p && isFinite(p[0]) && isFinite(p[1]));

// `zoom`: the zoom to open at when there is only one point to frame (a pin, no line) -- an area page's map thumbnail
// shows a whole region, where fitting one point would open at street level. `label` replaces the walk-in description.
// `center`: a point to frame with NO pin. A state, region or range is not a crag, so its thumbnail must not draw a "C".
// `on3d`: puts the route and area maps' 3D button in the same top-left corner. The crag page passes it (its walk in,
// or its pins where no walk in is on file); the region thumbnails and the owner's trail queue do not.
// `expandable` (the crag page's Getting there, owner 2026-11-24: "getting there map needs to allow you to expand full
// screen"): the Street / Satellite / Topo row the route map has, with 3D at its end, and a ⤢ that opens the same map
// full screen, where it can be zoomed to read the mapped trails. `title` names that full-screen view.
/** @param {{ pts: any, park: any, crag: any, center?: { lat: number, lng: number } | null, height?: number, zoom?: number, label?: string, on3d?: () => void, expandable?: boolean, title?: string }} props */
export default function WalkInMap({ pts, park, crag, center = null, height = 200, zoom, label, on3d, expandable = false, title }) {
  const div = useRef(null), mapRef = useRef(null), tileRef = useRef(null), dialogRef = useRef(null), expandBtn = useRef(null);
  const [fail, setFail] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [baseLayer, setBaseLayer] = useState("topo");
  // Each build reads these; the map is rebuilt only when it moves into or out of full screen (its box changes).
  const init = useRef({ pts, park, crag, center, zoom });
  const layerNow = useRef(baseLayer);
  layerNow.current = baseLayer;
  useEffect(() => {
    let cancelled = false;
    loadLeaflet(() => {
      if (cancelled || !div.current || mapRef.current || !window.L) return;
      const L = window.L, map = L.map(div.current, { attributionControl: false, zoomControl: fullscreen });
      const { pts: p0, park: k0, crag: c0, center: m0, zoom: z0 } = init.current;
      applyBaseLayer(map, tileRef, layerNow.current);
      const pin = (p, label, color) => L.marker([p.lat, p.lng], { keyboard: false, interactive: false, icon: L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div style="width:22px;height:22px;border-radius:50%;background:' + color + ';border:2px solid #fff;color:#fff;font:700 11px/18px system-ui;text-align:center">' + label + "</div>" }) }).addTo(map);
      const bounds = p0.slice();
      if (k0) { pin(k0, "P", C.blue); bounds.push([k0.lat, k0.lng]); }
      if (c0) { pin(c0, "C", C.orange); bounds.push([c0.lat, c0.lng]); }
      if (m0 && !bounds.length) bounds.push([m0.lat, m0.lng]);
      if (p0.length > 1) L.polyline(p0, { color: C.orange, weight: 4 }).addTo(map);
      if (bounds.length === 1 && z0) map.setView(bounds[0], z0);
      else if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 17 });
      mapRef.current = map;
      setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* the map was removed first */ } }, 150);
    }, () => setFail(true));
    return () => { cancelled = true; tileRef.current = null; if (mapRef.current) { try { mapRef.current.remove(); } catch (e) { /* already gone */ } mapRef.current = null; } };
  }, [fullscreen]);
  // A layer picked on the open map swaps its tiles in place.
  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);
  // Full screen takes focus, so Escape and a screen reader start inside it; leaving hands it back to the ⤢.
  useEffect(() => { if (fullscreen) { try { dialogRef.current && dialogRef.current.focus({ preventScroll: true }); } catch (e) { /* not focusable yet */ } } }, [fullscreen]);
  const exitFullscreen = () => { setFullscreen(false); setTimeout(() => { try { expandBtn.current && expandBtn.current.focus({ preventScroll: true }); } catch (e) { /* the page moved on */ } }, 0); };
  const name = label || "Map of the walk in from the parking pin (P) to the crag (C)";
  const mapDiv = <div ref={div} role="img" aria-label={name} style={fullscreen ? { flex: "1 1 auto", minHeight: 160, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: C.surface } : { height, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: C.surface }} />;
  const layers = expandable && !fail ? <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} on3d={on3d} /> : null;
  const failEl = fail ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted }}>The map couldn't load.</div> : null;
  if (fullscreen) {
    return createPortal(<div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title || "Map"} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); exitFullscreen(); } }} style={{ position: "fixed", inset: 0, zIndex: 9700, background: C.bg, padding: 12, display: "flex", flexDirection: "column", boxSizing: "border-box", overscrollBehavior: "contain", outline: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title || "Map"}</span>
        <button type="button" onClick={exitFullscreen} aria-label="Close full-screen map" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ position: "relative", flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>{mapDiv}{layers}{failEl}</div>
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginTop: 8 }}>Zoom in on Topo to see the mapped trails; Satellite shows the ones that aren't mapped.</div>
    </div>, document.body);
  }
  return <div style={{ position: "relative" }}>
    {mapDiv}
    {layers}
    {expandable && !fail ? <button type="button" ref={expandBtn} onClick={() => setFullscreen(true)} aria-label="Full screen" title="Full screen" style={{ ...POP_CLOSE_MEDIA, position: "absolute", top: 10, right: 10, zIndex: 1000 }}>⤢</button> : null}
    {!expandable && on3d && !fail ? <button type="button" onClick={on3d} aria-label="View in 3D" style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, padding: "9px 11px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>3D</button> : null}
    {failEl}
  </div>;
}
