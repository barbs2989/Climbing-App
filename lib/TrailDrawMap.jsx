import { tx } from "./tapWords.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadLeaflet, applyBaseLayer } from "./mapKit";
import { loadUnits } from "./units-pref";
import { MIN_RECORDED_PTS } from "./track";
import { POP_CLOSE, POP_CLOSE_MEDIA } from "./popupChrome.js";
import { routeLeg } from "./trailRouting.js";

// TRACE THE WALK IN ON THE MAP. A crag's trail used to be addable only as a recorded GPX, so the
// line reached a crag only after someone had walked it with a watch running AND thought to export
// the file. theCrag draws approach paths by hand on the map, from the parking toward the cliff,
// and attaches them to the crag; this is that, for climbers who know the way but have no recording.
// Topo opens first because it draws the mapped footpaths to trace over; Satellite shows the
// unmapped climbers' trails. `start` is the parking pin, `end` the crag's own coordinate; either
// may be missing. `pts` is [[lat,lng],...] in walking order, owned by the caller.
//
// SHAPING THE LINE (owner, 2026-11-05: "clicking points on the map doesn't allow for curves"). The
// first version appended a straight segment per tap and could only undo the last one, so a bend
// placed wrong meant undoing everything after it. Now every tap is an ANCHOR you can drag; a hollow
// dot in the middle of each leg drags out into a new anchor (as Leaflet.Editable and Google My Maps
// edit a line); tapping an anchor selects it for Delete; Undo and Redo walk the whole history; and
// FOLLOW TRAILS routes each leg along the mapped footpaths between its anchors (lib/trailRouting.js),
// so two taps trace a switchbacking path. The ⤢ on the map opens the drawer full screen.
//
// Internally the line is `nodes`: [{ id, a:[lat,lng], via:[[lat,lng],...], pending }], where `a` is the
// anchor the climber placed and `via` the routed points between the PREVIOUS anchor and this one
// (empty for a straight leg). `pts` is always the flattening of `nodes`, so what is drawn is what
// is submitted.
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

let nextId = 1;
const node = (a, via) => ({ id: nextId++, a: [+(+a[0]).toFixed(6), +(+a[1]).toFixed(6)], via: via || [], pending: false });
const flatten = (nodes) => { const out = []; nodes.forEach((n, i) => { if (i > 0) out.push(...n.via); out.push(n.a); }); return out; };
const legPts = (nodes, i) => [nodes[i - 1].a].concat(nodes[i].via, [nodes[i].a]);
const sameP = (p, q) => !!p && !!q && p[0] === q[0] && p[1] === q[1];
const HISTORY_CAP = 50;
// Remembered for the session, not across them: a climber tracing two crags in one sitting keeps the mode.
let followDefault = false;

/* `marks` names the two pins: the crag default (P parking, C crag), or the desktop drawing tool's
   T trailhead and S summit / B base on a route that is not a crag. */
const CRAG_MARKS = { start: "P", end: "C", startName: "the parking pin", endName: "the crag" };
const HIT = 32; // the whole hit box of an anchor or handle; the dot inside is smaller
export default function TrailDrawMap({ start, end, pts, setPts, C, marks, title }) {
  const mk = marks || CRAG_MARKS;
  const mapDiv = useRef(null), mapRef = useRef(null), tileRef = useRef(null), drawn = useRef([]);
  const [ready, setReady] = useState(false), [mapFail, setMapFail] = useState(false);
  const [baseLayer, setBaseLayer] = useState("topo");
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomN, setZoomN] = useState(0);
  const [follow, setFollow] = useState(followDefault);
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState("");
  const [nodes, setNodes] = useState(() => (pts || []).map((p) => node(p)));
  const nodesRef = useRef(nodes);
  const undoRef = useRef([]), redoRef = useRef([]);
  const [histN, setHistN] = useState({ undo: 0, redo: 0 });
  const routing = useRef(new Map()); // node id -> AbortController
  const viewRef = useRef(null); // {center, zoom} kept across a full-screen rebuild
  const dragEndAt = useRef(0);
  const noteT = useRef(null);
  const propsRef = useRef({ start, end, follow, setPts });
  propsRef.current = { start, end, follow, setPts };

  // The caller cleared the line from outside (its own Clear, a new route): follow it.
  useEffect(() => { if ((!pts || !pts.length) && nodesRef.current.length) { nodesRef.current = []; setNodes([]); } }, [pts]);
  useEffect(() => () => { routing.current.forEach((c) => c.abort()); clearTimeout(noteT.current); }, []);

  const setBoth = (next) => { nodesRef.current = next; setNodes(next); propsRef.current.setPts(flatten(next)); };
  const say = (s) => { setNote(s); clearTimeout(noteT.current); noteT.current = setTimeout(() => setNote(""), 6000); };
  const abortRoute = (id) => { const c = routing.current.get(id); if (c) { c.abort(); routing.current.delete(id); } };
  // Ask the trails for the leg that ends at node `id`; the answer lands only if both anchors still stand.
  const startRoute = (id) => {
    const cur = nodesRef.current, k = cur.findIndex((n) => n.id === id);
    if (k < 1) return;
    const a = cur[k - 1].a, b = cur[k].a;
    abortRoute(id);
    const ctl = new AbortController();
    routing.current.set(id, ctl);
    routeLeg(a, b, ctl.signal).then((via) => {
      if (ctl.signal.aborted) return;
      routing.current.delete(id);
      const now = nodesRef.current, j = now.findIndex((n) => n.id === id);
      if (j < 1 || !sameP(now[j].a, b) || !sameP(now[j - 1].a, a)) return;
      const next = now.slice();
      next[j] = Object.assign({}, next[j], { via: via || [], pending: false });
      setBoth(next);
      if (!via) say(tx("Couldn't follow a mapped trail here, so that leg is a straight line. Drag the point, or tap the hollow dot to add one between."));
    });
  };
  // `idxs` are the legs this change touched: straight again, or routed when Follow trails is on.
  const withLegs = (next, idxs) => {
    const want = propsRef.current.follow, touched = [];
    idxs.forEach((i) => { if (i > 0 && i < next.length) { next[i] = Object.assign({}, next[i], { via: [], pending: want }); if (want) touched.push(next[i].id); } });
    return touched;
  };
  const commit = (next, touched) => {
    undoRef.current.push(nodesRef.current);
    if (undoRef.current.length > HISTORY_CAP) undoRef.current.shift();
    redoRef.current = [];
    setHistN({ undo: undoRef.current.length, redo: 0 });
    setBoth(next);
    (touched || []).forEach(startRoute);
  };
  const restore = (snap) => {
    routing.current.forEach((c) => c.abort()); routing.current.clear();
    setBoth(snap.map((n) => (n.pending ? Object.assign({}, n, { pending: false }) : n)));
    setSelectedId(null);
  };
  const undo = () => { if (!undoRef.current.length) return; redoRef.current.push(nodesRef.current); restore(undoRef.current.pop()); setHistN({ undo: undoRef.current.length, redo: redoRef.current.length }); };
  const redo = () => { if (!redoRef.current.length) return; undoRef.current.push(nodesRef.current); restore(redoRef.current.pop()); setHistN({ undo: undoRef.current.length, redo: redoRef.current.length }); };
  const append = (lat, lng) => { const next = nodesRef.current.concat([node([lat, lng])]); commit(next, withLegs(next, [next.length - 1])); };
  const insertAt = (i, lat, lng) => { const next = nodesRef.current.slice(); next.splice(i, 0, node([lat, lng])); commit(next, withLegs(next, [i, i + 1])); };
  const moveAnchor = (id, lat, lng) => { const cur = nodesRef.current, i = cur.findIndex((n) => n.id === id); if (i < 0) return; const next = cur.slice(); next[i] = Object.assign({}, node([lat, lng]), { id: id }); commit(next, withLegs(next, [i, i + 1])); };
  const deleteAnchor = (id) => { const cur = nodesRef.current, i = cur.findIndex((n) => n.id === id); if (i < 0) return; const next = cur.slice(); next.splice(i, 1); setSelectedId(null); commit(next, withLegs(next, [i])); };
  const clearAll = () => { if (!nodesRef.current.length) return; setSelectedId(null); commit([], []); };
  const toggleFollow = () => { followDefault = !follow; setFollow(!follow); };
  const api = useRef(null);
  api.current = { append, insertAt, moveAnchor, select: (id) => setSelectedId((s) => (s === id ? null : id)) };

  // The Leaflet map is rebuilt when the drawer goes full screen or comes back (the box it lives in
  // changes), keeping its centre and zoom, as the route map does (GPXMap).
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L, map = L.map(mapDiv.current, { attributionControl: false, doubleClickZoom: false });
      applyBaseLayer(map, tileRef, baseLayer);
      const v = viewRef.current;
      if (v) map.setView(v.center, v.zoom);
      else {
        const { start: s0, end: e0 } = propsRef.current;
        const anchors = [s0, e0].filter(Boolean).map((p) => [p.lat, p.lng]).concat(nodesRef.current.map((n) => n.a));
        if (anchors.length > 1) map.fitBounds(L.latLngBounds(anchors).pad(0.4), { maxZoom: 17 });
        else if (anchors.length) map.setView(anchors[0], 16);
        else map.setView([39.5, -98.5], 4);
      }
      // Leaflet swallows the click that ends a marker drag; the guard is for the browsers where it does not.
      // A double tap is ONE point: with doubleClickZoom off Leaflet still fires click twice, and the
      // first version zoomed AND dropped two points on top of each other.
      let lastTap = null;
      map.on("click", (e) => {
        if (Date.now() - dragEndAt.current < 250) return;
        const now = Date.now(), p = e.containerPoint;
        if (lastTap && now - lastTap.t < 300 && p && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 10) return;
        lastTap = { t: now, x: p ? p.x : 0, y: p ? p.y : 0 };
        api.current.append(e.latlng.lat, e.latlng.lng);
      });
      // Which legs are long enough for a midpoint handle depends on the zoom, so a zoom redraws.
      map.on("zoomend", () => setZoomN((z) => z + 1));
      mapRef.current = map; setReady(true);
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 220);
    };
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => {
      cancelled = true; clearTimeout(ft);
      const m = mapRef.current;
      if (m) { try { viewRef.current = { center: m.getCenter(), zoom: m.getZoom() }; m.remove(); } catch (e) {} mapRef.current = null; tileRef.current = null; drawn.current = []; }
      setReady(false);
    };
  }, [fullscreen]); // eslint-disable-line react-hooks/exhaustive-deps -- rebuilt on `fullscreen` ONLY; the base layer is applied by its own effect below and the pins/line by the redraw effect
  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);
  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !L || !ready) return;
    drawn.current.forEach((l) => { try { map.removeLayer(l); } catch (e) {} });
    drawn.current = [];
    const keep = (l) => { l.addTo(map); drawn.current.push(l); return l; };
    const dot = (size, fill, border, ring) => L.divIcon({ className: "", iconSize: [HIT, HIT], iconAnchor: [HIT / 2, HIT / 2], html: '<div style="width:' + size + "px;height:" + size + "px;margin:" + (HIT - size) / 2 + "px;border-radius:50%;background:" + fill + ";border:2px solid " + border + ";box-sizing:border-box;box-shadow:" + (ring ? "0 0 0 3px " + ring + "," : "") + '0 1px 4px rgba(0,0,0,.5)"></div>' });
    const pin = (p, label, color) => keep(L.marker([p.lat, p.lng], { keyboard: false, interactive: false, icon: L.divIcon({ className: "", iconSize: [24, 24], iconAnchor: [12, 12], html: '<div style="width:24px;height:24px;border-radius:50%;background:' + color + ';border:2px solid #fff;color:#fff;font:700 12px/20px system-ui;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.5)">' + label + "</div>" }) }));
    if (start) pin(start, mk.start, C.accent);
    if (end) pin(end, mk.end, C.warning);
    // One polyline per leg, dashed while its trail is being looked up; a wide invisible twin takes the taps.
    for (let i = 1; i < nodes.length; i++) {
      const leg = legPts(nodes, i), n = nodes[i];
      keep(L.polyline(leg, { color: C.warning, weight: 4, opacity: 0.95, dashArray: n.pending ? "6 8" : null, interactive: false }));
      keep(L.polyline(leg, { color: "#000", weight: 18, opacity: 0, bubblingMouseEvents: false })).on("click", (e) => { L.DomEvent.stop(e); api.current.insertAt(i, e.latlng.lat, e.latlng.lng); });
      // The hollow dot: drag it out (or tap it) to add an anchor on this leg. Not on a leg shorter
      // than its own hit box on screen, where it would sit on the anchors and steal their taps.
      const pa = map.latLngToContainerPoint(nodes[i - 1].a), pb = map.latLngToContainerPoint(n.a);
      if (Math.hypot(pa.x - pb.x, pa.y - pb.y) < HIT + 12) continue;
      const mid = leg[Math.floor((leg.length - 1) / 2)], mid2 = leg[Math.ceil((leg.length - 1) / 2)];
      const h = keep(L.marker([(mid[0] + mid2[0]) / 2, (mid[1] + mid2[1]) / 2], { draggable: true, keyboard: false, bubblingMouseEvents: false, icon: dot(14, "rgba(0,0,0,0.45)", C.warning) }));
      h.on("dragend", () => { dragEndAt.current = Date.now(); const q = h.getLatLng(); api.current.insertAt(i, q.lat, q.lng); });
      h.on("click", (e) => { L.DomEvent.stop(e); const q = h.getLatLng(); api.current.insertAt(i, q.lat, q.lng); });
    }
    nodes.forEach((n, i) => {
      const last = i === nodes.length - 1, sel = n.id === selectedId;
      const m = keep(L.marker(n.a, { draggable: true, keyboard: false, autoPan: true, bubblingMouseEvents: false, icon: dot(last ? 18 : 14, C.warning, "#fff", sel ? C.accent : null) }));
      m.on("dragend", () => { dragEndAt.current = Date.now(); const q = m.getLatLng(); api.current.moveAnchor(n.id, q.lat, q.lng); });
      m.on("click", (e) => { L.DomEvent.stop(e); api.current.select(n.id); });
    });
  }, [nodes, ready, zoomN, start, end, selectedId, C.accent, C.warning, mk.start, mk.end]);

  const flat = flatten(nodes), n = flat.length, selected = selectedId != null && nodes.some((x) => x.id === selectedId);
  const anyPending = nodes.some((x) => x.pending);
  const btn = { padding: "8px 11px", borderRadius: 8, border: "1px solid " + C.border, background: C.bg70, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const off = { opacity: 0.4, cursor: "default" };
  const b = (on) => (on ? btn : Object.assign({}, btn, off));
  const layerBtns = ready ? <div style={{ position: "absolute", top: 7, left: 7, zIndex: 1000, display: "flex", gap: 3 }}>{[["topo", "Topo"], ["sat", "Satellite"], ["street", "Street"]].map(([k, lbl]) => <button key={k} onClick={() => setBaseLayer(k)} aria-current={baseLayer === k ? "true" : undefined} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid " + (baseLayer === k ? C.accent : C.border), background: C.bg, color: baseLayer === k ? C.accent : C.text70, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>{lbl}</button>)}</div> : null;
  const status = n ? (n < MIN_RECORDED_PTS ? n + " of at least " + MIN_RECORDED_PTS + " points" : n + " points") + " · " + fmtTrailLen(lenM(flat)) + (anyPending ? " · following the trail…" : tx(" · tap to keep going")) : start ? tx("Tap the map along the trail, starting at " + mk.start) : tx("Tap where you park, then along the trail to " + mk.endName);
  const mapBox = (
    <div style={{ position: "relative", flex: fullscreen ? 1 : "none", minHeight: 0 }}>
      <div ref={mapDiv} role="application" aria-label={tx("Map: tap to add a point to the trail, drag a point to move it")} style={{ height: fullscreen ? "100%" : 300, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: "#0a0f1a", cursor: "crosshair" }} />
      {!ready ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.text70, fontSize: 13, pointerEvents: "none", textAlign: "center", padding: 16 }}>{mapFail ? "The map couldn't load. Upload or paste a recorded track instead." : "Loading map…"}</div> : null}
      {layerBtns}
      {/* ⤢ to go full screen and ✕ to leave it, in the SAME spot on the map, as the area map has it. */}
      <button onClick={() => setFullscreen((f) => !f)} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"} style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 7, right: 7, zIndex: 1000, background: C.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" })}>{fullscreen ? "✕" : "⤢"}</button>
      {ready ? <div style={{ position: "absolute", bottom: 7, left: 7, right: 7, zIndex: 1000, background: "rgba(13,17,23,0.85)", borderRadius: 7, padding: "4px 8px", fontSize: 12, color: "#fff", textAlign: "center", pointerEvents: "none" }}>{status}</div> : null}
    </div>
  );
  const tools = (
    <>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {start ? <button onClick={() => { if (!nodesRef.current.length) append(start.lat, start.lng); }} disabled={n > 0} style={b(!n)}>{"Start at " + mk.start}</button> : null}
        {end ? <button onClick={() => append(end.lat, end.lng)} disabled={!n} style={b(n)}>{"Finish at " + mk.end}</button> : null}
        <button onClick={undo} disabled={!histN.undo} style={b(histN.undo)}>Undo</button>
        <button onClick={redo} disabled={!histN.redo} style={b(histN.redo)}>Redo</button>
        {selected ? <button onClick={() => deleteAnchor(selectedId)} style={Object.assign({}, btn, { borderColor: C.error, color: C.error })}>Delete point</button> : null}
        <button onClick={clearAll} disabled={!n} style={b(n)}>Clear</button>
        <button onClick={toggleFollow} aria-pressed={follow} style={Object.assign({}, btn, follow ? { borderColor: C.accent, color: C.accent } : {})}>{"Follow trails" + (follow ? ": on" : ": off")}</button>
      </div>
      {note ? <div role="status" style={{ fontSize: 12, color: C.warning, margin: "8px 0 0", lineHeight: 1.45 }}>{note}</div> : null}
      <p style={{ fontSize: 12, color: C.text70, margin: "8px 0 0", lineHeight: 1.45 }}>
        <b style={{ color: C.accent }}>{mk.start}</b>{" is " + mk.startName + " and "}<b style={{ color: C.warning }}>{mk.end}</b>{" " + mk.endName + ". "}
        {tx("Tap along the trail the way you walk it. Drag a point to move it, drag or tap the hollow dot between two points to add one, tap a point and Delete to remove it.")} <b>Follow trails</b> bends each leg along the mapped footpaths between your points, so a switchbacking path takes two taps. Zoom in: Topo shows mapped paths, Satellite shows the ones that aren't.
      </p>
    </>
  );
  if (fullscreen) {
    return createPortal(<div role="dialog" aria-modal="true" aria-label={title || "Draw the trail"} style={{ position: "fixed", inset: 0, zIndex: 10000, background: C.bg, padding: 12, display: "flex", flexDirection: "column", boxSizing: "border-box", overscrollBehavior: "contain" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title || "Draw the trail"}</span>
        <button onClick={() => setFullscreen(false)} aria-label="Close full-screen map" style={POP_CLOSE}>✕</button>
      </div>
      {mapBox}
      <div style={{ flexShrink: 0 }}>{tools}</div>
    </div>, document.body);
  }
  return <div>{mapBox}{tools}</div>;
}
