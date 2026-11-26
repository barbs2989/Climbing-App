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
// `summit`: the place pin is a PEAK's summit, drawn "S" and keyed "Summit" (owner note 2026-11-26: "Getting there
// section on peaks map shows c for crag when it's a peak not a crag"). A peak's own coordinate is its top, the way
// Peakbagger, CalTopo and our own route map (WP_STYLES "Summit") mark it; every other caller's pin is a crag or wall.
/** @param {{ pts: any, park: any, crag: any, center?: { lat: number, lng: number } | null, height?: number, zoom?: number, label?: string, on3d?: () => void, expandable?: boolean, title?: string, summit?: boolean }} props */
export default function WalkInMap({ pts, park, crag, center = null, height = 200, zoom, label, on3d, expandable = false, title, summit = false }) {
  const [destLetter, destWords] = summit ? ["S", "Summit"] : ["C", "The crag"];
  const div = useRef(null), roRef = useRef(null), mapRef = useRef(null), tileRef = useRef(null), dialogRef = useRef(null), expandBtn = useRef(null);
  const [fail, setFail] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [baseLayer, setBaseLayer] = useState("topo");
  // Each build reads these; the map is rebuilt only when it moves into or out of full screen (its box changes).
  const init = useRef({ pts, park, crag, center, zoom, destLetter });
  const layerNow = useRef(baseLayer);
  layerNow.current = baseLayer;
  useEffect(() => {
    let cancelled = false;
    loadLeaflet(() => {
      if (cancelled || !div.current || mapRef.current || !window.L) return;
      const L = window.L, map = L.map(div.current, { attributionControl: false, zoomControl: fullscreen });
      const { pts: p0, park: k0, crag: c0, center: m0, zoom: z0, destLetter: d0 } = init.current;
      applyBaseLayer(map, tileRef, layerNow.current);
      // P is drawn ABOVE C (owner note 2026-11-25: a crag whose parking sits a stone's throw from its own coordinate showed
      // only the C, the P hidden underneath it, though the editor's map and Google Maps both showed the parking).
      const pin = (p, label, color, z) => L.marker([p.lat, p.lng], { keyboard: false, interactive: false, zIndexOffset: z || 0, icon: L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div style="width:22px;height:22px;border-radius:50%;background:' + color + ';border:2px solid #fff;color:#fff;font:700 11px/18px system-ui;text-align:center">' + label + "</div>" }) }).addTo(map);
      const bounds = p0.slice();
      if (k0) { pin(k0, "P", C.blue, 1000); bounds.push([k0.lat, k0.lng]); }
      if (c0) { pin(c0, d0, C.orange); bounds.push([c0.lat, c0.lng]); }
      if (m0 && !bounds.length) bounds.push([m0.lat, m0.lng]);
      if (p0.length > 1) L.polyline(p0, { color: C.orange, weight: 4 }).addTo(map);
      // FRAME AGAIN ONCE THE BOX HAS ITS SIZE. Framed at build time, while the page was still laying the map out, the
      // fit was computed for a box a fraction of its real size: measured on Dihedral Wall (Index) it opened at zoom 14
      // where the two pins fit at 17, so they sat 17px apart and the C covered the P. The view is re-framed on every
      // real change of the box until the climber moves the map, the same ResizeObserver rule the area Map uses.
      const frame = () => { if (bounds.length === 1 && z0) map.setView(bounds[0], z0, { animate: false }); else if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 17, animate: false }); };
      frame();
      let touched = false;
      ["pointerdown", "wheel", "keydown"].forEach((ev) => map.getContainer().addEventListener(ev, () => { touched = true; }, { once: true, passive: true }));
      let last = "";
      const refit = () => { const el = div.current; if (!el || !mapRef.current) return; const k = el.clientWidth + "x" + el.clientHeight; if (k === last || !el.clientWidth || !el.clientHeight) return; last = k; try { map.invalidateSize(); if (!touched) frame(); } catch (e) { /* the map was removed first */ } };
      if (typeof ResizeObserver !== "undefined") { roRef.current = new ResizeObserver(refit); roRef.current.observe(div.current); }
      mapRef.current = map;
      setTimeout(refit, 150);
    }, () => setFail(true));
    return () => { cancelled = true; tileRef.current = null; if (roRef.current) { roRef.current.disconnect(); roRef.current = null; } if (mapRef.current) { try { mapRef.current.remove(); } catch (e) { /* already gone */ } mapRef.current = null; } };
  }, [fullscreen]);
  // A layer picked on the open map swaps its tiles in place.
  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);
  // Full screen takes focus, so Escape and a screen reader start inside it; leaving hands it back to the ⤢.
  useEffect(() => { if (fullscreen) { try { dialogRef.current && dialogRef.current.focus({ preventScroll: true }); } catch (e) { /* not focusable yet */ } } }, [fullscreen]);
  const exitFullscreen = () => { setFullscreen(false); setTimeout(() => { try { expandBtn.current && expandBtn.current.focus({ preventScroll: true }); } catch (e) { /* the page moved on */ } }, 0); };
  const name = label || "Map of the walk in from the parking pin (P) to the " + (summit ? "summit (S)" : "crag (C)");
  const mapDiv = <div ref={div} role="img" aria-label={name} style={fullscreen ? { flex: "1 1 auto", minHeight: 160, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: C.surface } : { height, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: C.surface }} />;
  const layers = expandable && !fail ? <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} on3d={on3d} /> : null;
  const failEl = fail ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted }}>The map couldn't load.</div> : null;
  // A KEY UNDER THE MAP (owner note 2026-11-25: "does the C mean crag? It's unclear"). The pins stay letters, the
  // way 27 Crags and theCrag mark a crag's parking with a P, but each letter is now named beside a copy of its pin.
  const dot = (bg, t) => <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 9, background: bg, border: "2px solid #fff", color: "#fff", font: "700 10px/14px system-ui", textAlign: "center", flexShrink: 0, boxSizing: "border-box" }}>{t}</span>;
  const keyItem = (bg, t, words) => <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>{dot(bg, t)}{words}</span>;
  const legend = park || crag ? <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 11.5, color: C.textSub, lineHeight: 1.4 }}>{park ? keyItem(C.blue, "P", "Parking") : null}{crag ? keyItem(C.orange, destLetter, destWords) : null}</div> : null;
  if (fullscreen) {
    return createPortal(<div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title || "Map"} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); exitFullscreen(); } }} style={{ position: "fixed", inset: 0, zIndex: 9700, background: C.bg, padding: 12, display: "flex", flexDirection: "column", boxSizing: "border-box", overscrollBehavior: "contain", outline: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title || "Map"}</span>
        <button type="button" onClick={exitFullscreen} aria-label="Close full-screen map" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ position: "relative", flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>{mapDiv}{layers}{failEl}</div>
      {legend}
      <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginTop: 8 }}>Zoom in on Topo to see the mapped trails; Satellite shows the ones that aren't mapped.</div>
    </div>, document.body);
  }
  return <div style={{ position: "relative" }}>
    {mapDiv}
    {layers}
    {expandable && !fail ? <button type="button" ref={expandBtn} onClick={() => setFullscreen(true)} aria-label="Full screen" title="Full screen" style={{ ...POP_CLOSE_MEDIA, position: "absolute", top: 10, right: 10, zIndex: 1000 }}>⤢</button> : null}
    {!expandable && on3d && !fail ? <button type="button" onClick={on3d} aria-label="View in 3D" style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, padding: "9px 11px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>3D</button> : null}
    {failEl}
    {legend}
  </div>;
}
