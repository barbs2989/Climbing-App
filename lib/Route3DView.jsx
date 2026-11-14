// THE ROUTE IN 3D: the same line, pins and climbers' tracks as the route map, draped over the terrain and
// tilted, so a climber can see the ridge, the gully and the glacier the line crosses. CalTopo, Strava
// and Gaia GPS all open 3D from a "3D" button on the map they already show, and that is how this opens
// (owner's note, 2026-10-24: "a 3d map view of the route ie for gpx tracks").
//
// MapLibre GL draws it, because Leaflet has no 3D. It comes from cdnjs with its integrity hash pinned,
// for the same reason lib/mapKit.jsx pins Leaflet: what a CDN returns runs in this origin. Get a new
// hash from the publisher, never by hashing a download:
//   curl -s 'https://api.cdnjs.com/libraries/maplibre-gl/<version>?fields=sri'
// The ground is the free, keyless Terrarium elevation tiles on AWS (Tilezen), which answer CORS `*`;
// MapLibre assumes the other encoding unless told, and a wrong one draws noise rather than failing, so
// `encoding: "terrarium"` is load-bearing. The picture on it is the route map's own Esri imagery.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { C, WP_COLORS, WP_STYLE, wpType } from "../ClimbMatchCore.jsx";
import { MAP_TILE_URLS, TILE_CREDIT } from "./mapKit";
import { POP_CLOSE } from "./popupChrome.js";

const MAPLIBRE = {
  css: { url: "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css", sri: "sha512-6AYkNPc8EvA9WwC0CvbRQHWpK1zV1+QeW+lVBfYqN2zTfG9IfWMRMyUDOw6GdF5US0poI/C/pz8tkiL+nfmYHg==" },
  js: { url: "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js", sri: "sha512-x8Bt/82VRs91xVTqHDpQ1t8c4qit3QCRbo9BVqnUsyw5yKqzvL4BAgcz7R34BDCiCwx9ypXPTnxPaNnazQz1ag==" },
};
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const TERRAIN_CREDIT = 'Terrain: <a href="https://github.com/tilezen/joerd" target="_blank" rel="noopener noreferrer">Mapzen / Tilezen</a>';

function loadMaplibre(onReady, onError) {
  if (window.maplibregl) { onReady(); return; }
  if (!document.getElementById("maplibre-css")) {
    const lk = document.createElement("link");
    lk.id = "maplibre-css"; lk.rel = "stylesheet"; lk.crossOrigin = "anonymous"; lk.integrity = MAPLIBRE.css.sri; lk.href = MAPLIBRE.css.url;
    document.head.appendChild(lk);
  }
  let sc = document.getElementById("maplibre-js");
  if (!sc) {
    sc = document.createElement("script");
    sc.id = "maplibre-js"; sc.crossOrigin = "anonymous"; sc.integrity = MAPLIBRE.js.sri; sc.src = MAPLIBRE.js.url; sc.async = true;
    document.head.appendChild(sc);
  }
  const ok = () => { if (window.maplibregl) onReady(); else onError(); };
  sc.addEventListener("load", ok, { once: true });
  sc.addEventListener("error", () => { sc.remove(); onError(); }, { once: true });
}

const lineFeature = (pts) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: pts.map((p) => [p[1], p[0]]) } });

/**
 * @param {{ line?: Array<Array<number|null>>|null, waypoints?: Array<{lat:number,lng:number,name?:string|null,type?:string|null}>,
 *   tracks?: Array<{id:string,color:string,label:string,pts:Array<Array<number|null>>}>, title?: string, onClose: () => void }} props
 */
export default function Route3DView({ line, waypoints, tracks, title, onClose }) {
  const div = useRef(null), mapRef = useRef(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    let cancelled = false;
    loadMaplibre(() => {
      if (cancelled || !div.current) return;
      const ml = window.maplibregl;
      if (ml.supported && !ml.supported()) { setState("nogl"); return; }
      const all = [];
      (line || []).forEach((p) => all.push([p[1], p[0]]));
      (tracks || []).forEach((t) => t.pts.forEach((p) => all.push([p[1], p[0]])));
      (waypoints || []).forEach((w) => all.push([w.lng, w.lat]));
      if (!all.length) { setState("empty"); return; }
      let map;
      try {
        map = new ml.Map({
          container: div.current,
          attributionControl: false,
          maxPitch: 80,
          style: {
            version: 8,
            sources: {
              sat: { type: "raster", tiles: [MAP_TILE_URLS.sat], tileSize: 256, maxzoom: 19, attribution: TILE_CREDIT.sat.html },
              dem: { type: "raster-dem", tiles: [TERRAIN_TILES], tileSize: 256, maxzoom: 14, encoding: "terrarium", attribution: TERRAIN_CREDIT },
            },
            layers: [{ id: "sat", type: "raster", source: "sat" }],
            terrain: { source: "dem", exaggeration: 1.3 },
          },
          center: all[0], zoom: 12,
        });
      } catch { setState("nogl"); return; }
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new ml.AttributionControl({ compact: true }), "bottom-right");
      map.on("error", () => { /* a tile that fails is drawn as a gap; the rest of the map stands */ });
      map.on("load", () => {
        if (cancelled) return;
        if (line && line.length >= 2) {
          map.addSource("route", { type: "geojson", data: lineFeature(line) });
          map.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "#000", "line-width": 6, "line-opacity": 0.45 }, layout: { "line-join": "round", "line-cap": "round" } });
          map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": C.blue, "line-width": 3.5 }, layout: { "line-join": "round", "line-cap": "round" } });
        }
        (tracks || []).forEach((t, i) => {
          const id = "trk" + i;
          map.addSource(id, { type: "geojson", data: lineFeature(t.pts) });
          map.addLayer({ id: id + "-casing", type: "line", source: id, paint: { "line-color": "#000", "line-width": 5, "line-opacity": 0.4 }, layout: { "line-join": "round", "line-cap": "round" } });
          map.addLayer({ id, type: "line", source: id, paint: { "line-color": t.color, "line-width": 3 }, layout: { "line-join": "round", "line-cap": "round" } });
        });
        (waypoints || []).forEach((w) => {
          const ty = wpType(w), st = WP_STYLE[ty], col = WP_COLORS[ty] || (st && st.color) || C.blue;
          const el = document.createElement("button");
          el.type = "button";
          el.setAttribute("aria-label", (w.name || ty || "Waypoint") + (ty && w.name ? ", " + ty : ""));
          el.style.cssText = "width:24px;height:24px;border-radius:12px;border:2px solid #fff;background:" + col + ";color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.6)";
          el.textContent = st ? st.glyph : "•";
          const pop = new ml.Popup({ offset: 14, closeButton: false, maxWidth: "240px" });
          const card = document.createElement("div");
          card.style.cssText = "font-size:13px;line-height:1.4;color:#111";
          const nm = document.createElement("div"); nm.style.fontWeight = "700"; nm.textContent = w.name || ty || "Waypoint"; card.appendChild(nm);
          if (ty && w.name) { const t2 = document.createElement("div"); t2.style.cssText = "font-size:11px;font-weight:700;text-transform:uppercase;opacity:0.7"; t2.textContent = ty; card.appendChild(t2); }
          pop.setDOMContent(card);
          new ml.Marker({ element: el }).setLngLat([w.lng, w.lat]).setPopup(pop).addTo(map);
        });
        const b = all.reduce((bb, c) => bb.extend(c), new ml.LngLatBounds(all[0], all[0]));
        map.fitBounds(b, { padding: 60, pitch: 62, bearing: -20, maxZoom: 15, duration: 0 });
        setState("ready");
      });
    }, () => { if (!cancelled) setState("fail"); });
    return () => { cancelled = true; try { if (mapRef.current) mapRef.current.remove(); } catch { /* the map is already gone */ } mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- built once per opening; the view is closed and reopened to show a different selection
  }, []);
  const msg = state === "loading" ? "Loading 3D map…" : state === "fail" ? "The 3D map couldn’t load. Check your connection, or use the flat map." : state === "nogl" ? "This device can’t draw 3D maps. The flat map still works." : state === "empty" ? "This route has nothing to draw in 3D yet." : null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="3D route map" style={{ position: "fixed", inset: 0, zIndex: 9700, background: C.bg, padding: 12, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9, gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title ? title + " · 3D" : "3D route map"}</span>
        <button onClick={onClose} aria-label="Close 3D map" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={div} style={{ position: "absolute", inset: 0, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: "#0a0f1a" }} />
        {msg ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13, textAlign: "center", padding: 16, pointerEvents: "none" }}>{msg}</div> : null}
      </div>
      <div style={{ paddingTop: 8, display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 12, color: C.textSub }}>
        {line && line.length >= 2 ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span aria-hidden="true" style={{ width: 16, height: 0, borderTop: "3px solid " + C.blue }} />Route line</span> : null}
        {(tracks || []).map((t) => <span key={t.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span aria-hidden="true" style={{ width: 16, height: 0, borderTop: "3px solid " + t.color }} />{t.label}</span>)}
      </div>
      <div style={{ fontSize: 11.5, color: C.textMuted, paddingTop: 4 }}>Drag with two fingers to tilt, twist to turn. On a computer, right-drag. The ground is raised 1.3× so slopes read clearly.</div>
    </div>,
    document.body
  );
}
