// SHADE MAP — the crag on a map, with the shadow the TERRAIN casts at any time of the chosen day.
// A slider runs sunrise to sunset; the shadow is redrawn from the terrain heights for the sun at
// that minute (lib/terrainShade.js). It answers the question the score cannot for the 99% of crags
// with no wall direction on file: is this canyon, this side of the ridge, in sun or shade, and when.
// It is geometry under a clear sky, and the card says so; it is not scored.
//
// The terrain loads only when the map scrolls near the screen: sixteen height tiles (~1.5 MB) are
// not worth fetching for a climber who never scrolls down to it.
import { useEffect, useMemo, useRef, useState } from "react";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle } from "./mapKit";
import { sunPosition } from "./conditionsScore.js";
import { shadeGrid, decodeTerrarium, shadeMask, pointShaded, pinSunSpans, terrainCredits, gridPx, steepMask, STEEP_DEG, highestNear, SUMMIT_SNAP_M, TERRAIN_TILE_URL } from "./terrainShade.js";

const STEP = 10 * 60e3;
const SHADE_RGBA = ((150 << 24) | (40 << 16) | (18 << 8) | 12) >>> 0; // little-endian ABGR: rgb(12,18,40) at 59%
const STEEP_RGBA = ((140 << 24) | (62 << 16) | (136 << 8) | 240) >>> 0; // rgb(240,136,62) at 55%: steep ground in sun
const DIR8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

// One grid's heights per session, at most three grids (each is 4 MB of floats).
const _terrain = {};
const _order = [];
function decodeBlob(b) {
  const draw = function (img) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    return cx.getImageData(0, 0, 256, 256).data;
  };
  // colorSpaceConversion "none": the PNG's bytes ARE the heights, and a colour-managed decode would
  // shift them.
  if (typeof window.createImageBitmap === "function") return window.createImageBitmap(b, { colorSpaceConversion: "none", premultiplyAlpha: "none" }).then(function (bm) { const d = draw(bm); if (bm.close) bm.close(); return d; });
  return new Promise(function (res, rej) {
    const u = URL.createObjectURL(b), im = new Image();
    im.onload = function () { try { res(draw(im)); } catch (e) { rej(e); } URL.revokeObjectURL(u); };
    im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("decode")); };
    im.src = u;
  });
}
function loadTerrain(grid) {
  if (_terrain[grid.key]) return _terrain[grid.key];
  const E = new Float32Array(grid.W * grid.H).fill(NaN), heads = [];
  let got = 0;
  const p = Promise.all(grid.tiles.map(function (t) {
    return fetch(TERRAIN_TILE_URL + grid.z + "/" + t.x + "/" + t.y + ".png")
      .then(function (r) { if (!r.ok) throw new Error("tile " + r.status); heads.push(r.headers.get("x-amz-meta-x-imagery-sources")); return r.blob(); })
      .then(decodeBlob)
      .then(function (px) { decodeTerrarium(px, E, grid.W, t.ox, t.oy); got++; })
      .catch(function () { /* that tile stays NaN: drawn without shade, and said */ });
  })).then(function () {
    if (!got) throw new Error("no terrain");
    let emax = -Infinity;
    for (let i = 0; i < E.length; i++) if (E[i] > emax) emax = E[i];
    return { E: E, emax: emax, credits: terrainCredits(heads), partial: got < grid.tiles.length };
  });
  _terrain[grid.key] = p; _order.push(grid.key);
  while (_order.length > 3) delete _terrain[_order.shift()];
  p.catch(function () { delete _terrain[grid.key]; const i = _order.indexOf(grid.key); if (i >= 0) _order.splice(i, 1); });
  return p;
}

/* `pins` — [{key, label, lat, lng}] — are the points whose sun is read out. A crag passes none and
   gets its one unlabelled pin ("the pin"); an alpine route passes its own summit, base and camp, and
   the block of terrain is centred on (lat, lng), the climb. `steep` offers the STEEP SLOPES IN SUN
   overlay (routes with snow or ice); `place` names what the terrain surrounds, for the failure line. */
export default function ShadeMap({ lat, lng, rise, set, at0, dayKey, clock, C, pins, steep, place }) {
  const grid = useMemo(function () { return shadeGrid(lat, lng); }, [lat, lng]);
  const named = !!(pins && pins.length);
  const pts = named ? pins : [{ key: "pin", label: null, lat: lat, lng: lng }];
  const ptsKey = pts.map(function (p) { return p.key + ":" + p.lat + "," + p.lng; }).join("|");
  const snap = function (u) { return Math.max(rise, Math.min(set, rise + Math.round((u - rise) / STEP) * STEP)); };
  const [t, setT] = useState(function () { return snap(at0); });
  const [seen, setSeen] = useState(false);
  const [terr, setTerr] = useState(null);
  const [tries, setTries] = useState(0);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [baseLayer, setBaseLayer] = useState("sat");
  const [steepOn, setSteepOn] = useState(!!steep);
  const boxRef = useRef(null), mapDiv = useRef(null), mapRef = useRef(null), tileRef = useRef(null), cvRef = useRef(null), imgRef = useRef(null), maskRef = useRef(null), rafRef = useRef(0), creditRef = useRef([]);

  useEffect(function () { setT(snap(at0)); }, [dayKey, rise, set]);
  useEffect(function () {
    if (seen || !boxRef.current) return;
    if (typeof IntersectionObserver !== "function") { setSeen(true); return; }
    const io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { setSeen(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(boxRef.current);
    return function () { io.disconnect(); };
  }, [seen]);
  useEffect(function () {
    if (!seen) return;
    let live = true; setTerr(null);
    loadTerrain(grid).then(function (d) { if (live) setTerr({ data: d }); }, function () { if (live) setTerr({ error: true }); });
    return function () { live = false; };
  }, [seen, grid.key, tries]);

  useEffect(function () {
    if (!seen) return;
    let cancelled = false;
    const init = function () {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L;
      const b = L.latLngBounds([grid.se.lat, grid.nw.lng], [grid.nw.lat, grid.se.lng]);
      const map = L.map(mapDiv.current, { attributionControl: false, zoomControl: false, minZoom: 13, maxBounds: b.pad(0.05), maxBoundsViscosity: 0.8 }).setView([lat, lng], named ? 14 : 15);
      L.control.zoom({ position: "topright" }).addTo(map);
      applyBaseLayer(map, tileRef, baseLayer);
      const cv = document.createElement("canvas"); cv.width = grid.W; cv.height = grid.H; cvRef.current = cv; imgRef.current = null;
      // An ImageOverlay whose "image" is our canvas, so Leaflet places, scales and animates it like
      // any picture laid over the map, and redrawing it costs no PNG encode.
      const Ov = L.ImageOverlay.extend({ _initImage: function () { this._image = cv; L.DomUtil.addClass(cv, "leaflet-image-layer"); if (this._zoomAnimated) L.DomUtil.addClass(cv, "leaflet-zoom-animated"); cv.style.pointerEvents = "none"; } });
      new Ov("", b, { interactive: false }).addTo(map);
      pts.forEach(function (p) {
        const mk = L.circleMarker([p.lat, p.lng], { radius: named ? 6 : 7, color: "#ffffff", weight: 3, fillColor: C.blue, fillOpacity: 1, interactive: false }).addTo(map);
        if (p.label) mk.bindTooltip(p.label, { permanent: true, direction: "top", offset: [0, -7] });
      });
      if (named && pts.length > 1) { try { map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })).pad(0.35), { maxZoom: 15 }); } catch (e) {} }
      mapRef.current = map; creditRef.current = [];
      setReady(true);
      setTimeout(function () { try { map.invalidateSize(); } catch (e) {} }, 150);
    };
    loadLeaflet(init, function () { setMapFail(true); });
    const ft = setTimeout(function () { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return function () {
      cancelled = true; clearTimeout(ft); cancelAnimationFrame(rafRef.current);
      if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} }
      mapRef.current = null; tileRef.current = null; cvRef.current = null; setReady(false);
    };
  }, [seen, grid.key, ptsKey]);
  useEffect(function () { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);

  // The credit a terrain licence requires, beside the map layer's own (lib/terrainShade.js).
  useEffect(function () {
    const map = mapRef.current, ctl = map && map.__cmCredit;
    if (!ctl) return;
    creditRef.current.forEach(function (c) { ctl.removeAttribution(c); });
    creditRef.current = terr && terr.data ? terr.data.credits.map(function (c) { return "Terrain: " + c; }) : [];
    creditRef.current.forEach(function (c) { ctl.addAttribution(c); });
  }, [ready, terr]);

  const steepPx = useMemo(function () { return steep && terr && terr.data ? steepMask(terr.data.E, grid.W, grid.H, grid.pxM) : null; }, [steep, terr, grid.key]);
  useEffect(function () {
    if (!ready || !terr || !terr.data || !cvRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(function () {
      const cv = cvRef.current; if (!cv) return;
      const sp = sunPosition(lat, lng, t), d = terr.data;
      maskRef.current = shadeMask(d.E, grid.W, grid.H, grid.pxM, sp.az, sp.alt, maskRef.current && maskRef.current.length === grid.W * grid.H ? maskRef.current : null);
      const ctx = cv.getContext("2d");
      const img = imgRef.current || (imgRef.current = ctx.createImageData(grid.W, grid.H));
      const u32 = new Uint32Array(img.data.buffer), m = maskRef.current, st = steepOn ? steepPx : null;
      for (let i = 0; i < m.length; i++) u32[i] = m[i] === 1 ? SHADE_RGBA : st && m[i] === 0 && st[i] ? STEEP_RGBA : 0;
      ctx.putImageData(img, 0, 0);
    });
  }, [ready, terr, t, grid.key, steepOn, steepPx]);

  const d = terr && terr.data;
  const pxs = useMemo(function () { return pts.map(function (p) { const px = gridPx(grid, p.lat, p.lng); return px && p.top && d ? highestNear(d.E, grid.W, grid.H, px, Math.round(SUMMIT_SNAP_M / grid.pxM)) : px; }); }, [terr, grid.key, ptsKey]);
  const spans = useMemo(function () { return d ? pts.map(function (p, k) { return pxs[k] ? pinSunSpans(d, grid, lat, lng, rise, set, 10, pxs[k]) : undefined; }) : null; }, [terr, grid.key, ptsKey, rise, set]);
  const sun = sunPosition(lat, lng, t);
  const shAt = function (k) { return d && pxs[k] ? pointShaded(d.E, grid.W, grid.H, grid.pxM, pxs[k].c, pxs[k].r, sun.az, sun.alt, d.emax) : undefined; };
  const reachKm = Math.round(Math.min(grid.pin.c, grid.W - grid.pin.c, grid.pin.r, grid.H - grid.pin.r) * grid.pxM / 100) / 10;
  const sunLine = sun.alt <= 0 ? "Sun below the horizon" : "Sun " + Math.round(sun.alt) + "° up in the " + DIR8[Math.round(sun.az / 45) % 8];
  const spanText = function (sp) {
    const hrs = sp.reduce(function (a, s) { return a + (s[1] - s[0]); }, 0) / 3600e3;
    return sp.map(function (s) { return clock(s[0]) + " – " + clock(s[1]); }).join(", ") + " (about " + (Math.round(hrs * 2) / 2) + " h)";
  };
  let pinLine = "", spanEl = null;
  if (!named) {
    const pinSh = shAt(0), sp0 = spans ? spans[0] : null;
    pinLine = pinSh === undefined ? "" : pinSh === null ? " · no height on file at the pin" : sun.alt <= 0 ? "" : pinSh ? " · pin in the terrain’s shade" : " · pin in sun";
    if (sp0) spanEl = <div style={{ fontSize: 12.5, color: sp0.length ? C.yellow : C.textSub, lineHeight: 1.5, marginTop: 4 }}>{sp0.length ? "Sun reaches the pin " + spanText(sp0) : "The terrain keeps the pin in shade from sunrise to sunset"}</div>;
  } else {
    if (d && sun.alt > 0) pinLine = " · " + pts.map(function (p, k) { const s = shAt(k); return p.label + (s === undefined ? " off the map" : s === null ? " unknown" : s ? " in shade" : " in sun"); }).join(" · ");
    if (spans) spanEl = <div style={{ marginTop: 6 }}>{pts.map(function (p, k) {
      const sp = spans[k];
      const txt = sp === undefined ? "Too far from the climb for the terrain here" : sp === null ? "No height on file at this pin" : sp.length ? "Sun " + spanText(sp) : "In the terrain’s shade from sunrise to sunset";
      return <div key={p.key} style={{ display: "grid", gridTemplateColumns: "104px minmax(0,1fr)", gap: 10, padding: "6px 0", borderTop: "1px solid " + C.borderLight, fontSize: 12.5, lineHeight: 1.45 }}><span style={{ color: C.textMuted, fontSize: 12 }}>{p.label}</span><span style={{ color: sp && sp.length ? C.yellow : C.textSub }}>{txt}</span></div>;
    })}</div>;
  }
  const btn = { background: C.surface, color: C.blue, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
  const sw = function (col) { return <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: col, marginRight: 5, verticalAlign: "-1px" }} />; };
  return <div ref={boxRef} data-shade-map="1">
    <div style={{ position: "relative", height: 260, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.border, background: "#0a0f1a", isolation: "isolate" }}>
      {mapFail ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontSize: 12.5, color: C.amber, textAlign: "center", lineHeight: 1.5 }}>The map couldn’t load. The sun times below still come from the terrain.</div> : <div ref={mapDiv} style={{ position: "absolute", inset: 0 }} />}
      {ready ? <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} /> : null}
      {seen && !terr ? <div aria-live="polite" style={{ position: "absolute", left: 10, bottom: 10, zIndex: 1000, background: C.surface, border: "1px solid " + C.border, borderRadius: 8, padding: "5px 9px", fontSize: 11.5, color: C.textSub }}>Loading the terrain…</div> : null}
    </div>
    {terr && terr.error ? <div style={{ marginTop: 10 }}><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5, marginBottom: 8 }}>{"Couldn’t load the terrain around this " + (place || "crag") + ", so no shade is drawn. This says nothing about sun or shade."}</div><button onClick={function () { setTries(tries + 1); }} style={btn}>Try again</button></div> : null}
    {steep ? <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 12px", marginTop: 8, fontSize: 11.5, color: C.textSub }}>
      <span>{sw("rgba(12,18,40,0.75)")}Shade</span>
      <button onClick={function () { setSteepOn(!steepOn); }} aria-pressed={steepOn} style={{ padding: "4px 9px", borderRadius: 8, border: "1px solid " + (steepOn ? C.orange : C.border), background: steepOn ? C.orangeBg : "transparent", color: steepOn ? C.orange : C.textSub, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>{sw("rgba(240,136,62,0.85)")}{"Steep (" + STEEP_DEG + "°+) and in sun"}</button>
    </div> : null}
    <div style={{ marginTop: 10 }}>
      <input type="range" min={rise} max={set} step={STEP} value={t} onChange={function (e) { setT(+e.target.value); }} aria-label="Time of day for the shade" aria-valuetext={clock(t)} style={{ width: "100%", accentColor: C.yellow, margin: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 2 }}><span>{"Sunrise " + clock(rise)}</span><span>{"Sunset " + clock(set)}</span></div>
    </div>
    <div aria-live="polite" style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginTop: 6 }}><b>{clock(t)}</b>{" · " + sunLine + pinLine}</div>
    {spanEl}
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>{named
      ? "Shadows the terrain casts under a clear sky, from heights about " + Math.round(grid.pxM) + " m apart: ridges, faces and gullies — not trees, cornices, or a step of rock steeper than the model can see. Times are for the route’s own pins. Ground more than about " + reachKm + " km from the climb isn’t counted, which matters only when the sun is very low." + (steep ? " Steep ground is read from the same heights, so a short steep step can read gentler than it is." : "") + (d && d.partial ? " Some ground near the climb has no height on file and is drawn without shade." : "")
      : "Shadows the terrain casts under a clear sky, from heights about " + Math.round(grid.pxM) + " m apart: ridges, canyon walls and slopes — not trees, overhangs, or which way one face of the rock points. The pin is the " + (place || "crag") + "’s location on file, not a particular wall. Ground more than about " + reachKm + " km away isn’t counted, which matters only when the sun is very low." + (d && d.partial ? " Some ground near the " + (place || "crag") + " has no height on file and is drawn without shade." : "")}</div>
  </div>;
}
