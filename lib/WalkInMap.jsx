import { useEffect, useRef, useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { loadLeaflet, applyBaseLayer } from "./mapKit";

// A small read-only map of a crag's walk in (0397): the line over the parking pin (P) and the crag
// (C), on Topo, which draws the mapped footpaths. Used on the crag's own page (Getting there) and in
// the owner's trail queue. `pts` is [[lat,lng],...]; `park` and `crag` are {lat,lng} or null.
export const walkInPts = (gpx) => (Array.isArray(gpx) ? gpx : []).map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : p && typeof p === "object" ? [Number(p.lat), Number(p.lng)] : null)).filter((p) => p && isFinite(p[0]) && isFinite(p[1]));

export default function WalkInMap({ pts, park, crag, height = 200 }) {
  const div = useRef(null), mapRef = useRef(null), tileRef = useRef(null);
  const [fail, setFail] = useState(false);
  // The map is built once; that one build reads these.
  const init = useRef({ pts, park, crag });
  useEffect(() => {
    let cancelled = false;
    loadLeaflet(() => {
      if (cancelled || !div.current || mapRef.current || !window.L) return;
      const L = window.L, map = L.map(div.current, { attributionControl: false, zoomControl: false });
      const { pts: p0, park: k0, crag: c0 } = init.current;
      applyBaseLayer(map, tileRef, "topo");
      const pin = (p, label, color) => L.marker([p.lat, p.lng], { keyboard: false, interactive: false, icon: L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div style="width:22px;height:22px;border-radius:50%;background:' + color + ';border:2px solid #fff;color:#fff;font:700 11px/18px system-ui;text-align:center">' + label + "</div>" }) }).addTo(map);
      const bounds = p0.slice();
      if (k0) { pin(k0, "P", C.blue); bounds.push([k0.lat, k0.lng]); }
      if (c0) { pin(c0, "C", C.orange); bounds.push([c0.lat, c0.lng]); }
      if (p0.length > 1) L.polyline(p0, { color: C.orange, weight: 4 }).addTo(map);
      if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 17 });
      mapRef.current = map;
      setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* the map was removed first */ } }, 150);
    }, () => setFail(true));
    return () => { cancelled = true; if (mapRef.current) { try { mapRef.current.remove(); } catch (e) { /* already gone */ } mapRef.current = null; } };
  }, []);
  return <div style={{ position: "relative" }}>
    <div ref={div} role="img" aria-label="Map of the walk in from the parking pin (P) to the crag (C)" style={{ height, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: C.surface }} />
    {fail ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.textMuted }}>The map couldn't load.</div> : null}
  </div>;
}
