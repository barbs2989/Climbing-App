import { useRef, useState, useLayoutEffect, useEffect, useMemo } from "react";
import { useNearbyAreas } from "../../lib/db";
import { applyBaseLayer, loadLeaflet, pinHtml, useFollowMe, searchPlaces, BaseLayerToggle, locateLabel, ViewToggle } from "../../lib/mapKit";
import { DISC_COLORS, discIconMarkup } from "../../lib/disciplines";
import { haversineMi } from "../../lib/areaBrowserShared.js";
import { CHIP, BTN } from "../../lib/buttonStyles.js";
import { POP_CLOSE_MEDIA, POP_CLOSE, POP_BACK } from "../../lib/popupChrome.js";
import ActionIcon from "./ActionIcon.tsx";
import { clickable } from "../../lib/clickable";
import { createPortal } from "react-dom";
import LoadingRows from "./LoadingRows.tsx";
import { DISC_LABELS as DL } from "../../lib/discLabels";

// ── Near me: real Leaflet map (same CDN as the static OverviewMap), geolocated,
// pins from useNearbyAreas driven by the LIVE map viewport — panning/zooming
// re-fetches (mirrors the static OverviewMap's moveend/zoomend re-render), so
// the map never gets stuck showing only what was near the very first center. ──
// Pin markup now comes from the shared lib/mapKit.jsx `pinHtml` (same curved
// name-around-the-circle technique, promoted from the static catalog's map so
// both maps render identical-looking pins from one implementation).

// Initial zoom keyed to how big a footprint each area_type actually covers —
// a whole state needs a far wider view than a single crag, and using one
// fixed zoom for every level (the old behavior) zoomed a state-scale "View
// map" in absurdly tight since it centered on the state's single lat/lng
// point at the same zoom used for a crag.
const ZOOM_BY_AREA_TYPE = { world: 2, country: 3, state: 6, range: 8, region: 8, canyon: 10, peak: 12, crag: 13, wall: 14 };
export default function NearMePanel({ center0, areaType, name, onBack, onOpenArea, C, uDistMi }) {
  const mapDiv = useRef(null), mapRef = useRef(null), markRef = useRef(null), tileRef = useRef(null), placeMarkRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [center, setCenter] = useState(center0 || null);
  const [baseLayer, setBaseLayer] = useState("street");
  // WHAT YOU TAPPED, listed BELOW the map (2026-10-24, owner: "Sometimes when you click on the circle,
  // the climbs don't show up. The blue circles in particular ... I would prefer if the climbs showed
  // up in list view below the map"). A blue circle used to ONLY zoom: the zoomed view refetched,
  // re-clustered the larger set it found into new circles with BIGGER numbers, and the areas you
  // tapped were never shown; when they sat on one spot (or the map was already at its deepest
  // zoom) nothing happened at all. Now a circle zooms AND lists its areas here, and a single pin
  // lists its one area here instead of a card over the map. The list survives the zoom it causes:
  // it is cleared by its own ✕, a tap on the bare map, or a tap on another circle.
  const [pick, setPick] = useState(null);
  // Go to a town, county, or zip/postal code (US and Canada). `alts` are the other matches, offered as "Not it?".
  const [placeQ, setPlaceQ] = useState("");
  const [place, setPlace] = useState({ busy: false, err: "", alts: [] });
  const [fullscreen, setFullscreen] = useState(false);
  // Type-of-climbing filter over what is in view. Matches EVERY type an area holds
  // (`disciplines`, 0198: any type with at least one climb; on a peak, crag types count as
  // alpine; top rope is its own type since 0202), so a mostly-sport crag with trad lines shows under both.
  // Falls back to the main type for a row read before that column existed.
  const [disc, setDisc] = useState(null);

  // FULL SCREEN IS A REAL FULL-SCREEN VIEW, drawn over the whole app like the route map's. It used
  // to stretch the map in place, in the page's flow: on a phone it ran on under the bottom bar, the
  // header stayed on top of it, the controls above it vanished so the ✕ jumped ~100px up the screen,
  // and the height was ANIMATED, so the map's ResizeObserver re-measured and re-read the view on
  // every frame of the transition. The owner reported a crash on closing it (2026-10-23).
  // It is still the SAME Leaflet instance -- same markers, zoom, pan and your dot, so collapsing
  // back drops you exactly where you were. The map is rendered through a portal into `host`, a div
  // this panel owns, and only `host` moves: into document.body for full screen, back into the
  // inline slot for the page. Moving a node keeps everything inside it, Leaflet included.
  const hostRef = useRef(null), slotRef = useRef(null), wasFullRef = useRef(false);
  if (!hostRef.current && typeof document !== "undefined") hostRef.current = document.createElement("div");
  // Layout, not passive: the map div must be in the document before Leaflet's init effect measures it.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (fullscreen) { wasFullRef.current = true; document.body.appendChild(host); }
    else if (slotRef.current) {
      slotRef.current.appendChild(host);
      // While the map was away the page was shorter and its scroll clamped: put the map back in view.
      if (wasFullRef.current) { wasFullRef.current = false; try { slotRef.current.scrollIntoView({ block: "nearest" }); } catch (e) {} }
    }
    if (mapRef.current) { try { mapRef.current.invalidateSize(); } catch (e) {} }
  }, [fullscreen]);
  useEffect(() => () => { if (hostRef.current) hostRef.current.remove(); }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = e => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);
  const { data, isLoading, error } = useNearbyAreas(bounds);
  const nearbyAll = data && data.rows;
  const typesOf = a => Array.isArray(a.disciplines) ? a.disciplines : (a.dominant_discipline ? [a.dominant_discipline] : []);
  const nearby = useMemo(() => nearbyAll && (disc ? nearbyAll.filter(a => typesOf(a).includes(disc)) : nearbyAll), [nearbyAll, disc]);
  const discsInView = useMemo(() => {
    const n = {};
    (nearbyAll || []).forEach(a => typesOf(a).forEach(d => { n[d] = (n[d] || 0) + 1; }));
    if (disc && !n[disc]) n[disc] = 0; // keep the active chip on screen so it can be cleared
    return Object.entries(n).sort((a, b) => b[1] - a[1]);
  }, [nearbyAll, disc]);

  const readBounds = map => {
    try {
      const b = map.getBounds();
      setBounds({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
    } catch (e) {}
  };

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L;
      // Zoom sits BOTTOM-LEFT, a corner nothing else on this map uses (the fire map moved its own
      // to a free corner the same way). Top-left it shared with the Street/Satellite/Topo/Snow row,
      // and pushing it 56px down (#2411) still left the owner reporting the row over the + / −.
      const map = L.map(mapDiv.current, { attributionControl: false, zoomControl: false }).setView(center ? [center.lat, center.lng] : [39.5, -98.5], center ? (ZOOM_BY_AREA_TYPE[areaType] || 10) : 4);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      applyBaseLayer(map, tileRef, baseLayer);
      markRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      map.on("moveend", () => readBounds(map));
      map.on("click", () => setPick(null));
      setTimeout(() => { try { map.invalidateSize(); readBounds(map); } catch (e) {} }, 150);
      // ...and again whenever the map's box really changes size. On a slow phone the box can still
      // be unlaid-out at 150ms: the query then asked for a near-zero box, got no areas, and the
      // map said "No climbs in view" over a whole state until the climber panned.
      if (typeof ResizeObserver !== "undefined") {
        let last = "";
        ro = new ResizeObserver(([e]) => {
          const k = Math.round(e.contentRect.width) + "x" + Math.round(e.contentRect.height);
          if (k === last || !mapRef.current) return;
          last = k;
          try { map.invalidateSize(); readBounds(map); } catch (err) {}
        });
        ro.observe(mapDiv.current);
      }
    };
    let ro = null;
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => { cancelled = true; clearTimeout(ft); if (ro) ro.disconnect(); if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} mapRef.current = null; markRef.current = null; tileRef.current = null; placeMarkRef.current = null; } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- builds the Leaflet map once; area type, base layer and centre are applied by their own effects and a rebuild would reset the view
  useEffect(() => { if (!mapRef.current) return; applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);

  // Screen-space clustering: at national/state scale a single viewport can hold
  // hundreds of crags, and one dot per area (the first version of this map) is
  // unreadable and gives no sense of "zoom in to see more" the way the static
  // map's own zoom-keyed clustering did. Bucket by on-screen proximity — cheap,
  // needs no extra dependency, and naturally uncluster as you zoom in since
  // pixel distances between the same two areas grow with zoom.
  useEffect(() => {
    if (!ready || !nearby) return;
    const L = window.L, map = mapRef.current, grp = markRef.current;
    if (!L || !map || !grp) return;
    grp.clearLayers();
    // Kept comfortably above the max single-pin size below (52px) so tightly
    // spaced but distinct areas cluster instead of visually overlapping.
    const CLUSTER_PX = 56;
    const pts = nearby.filter(a => a.lat != null && a.lng != null).map(a => ({ a, pt: map.latLngToContainerPoint([a.lat, a.lng]) }));
    const used = new Array(pts.length).fill(false);
    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue;
      const group = [pts[i]]; used[i] = true;
      for (let j = i + 1; j < pts.length; j++) {
        if (used[j]) continue;
        if (Math.hypot(pts[i].pt.x - pts[j].pt.x, pts[i].pt.y - pts[j].pt.y) < CLUSTER_PX) { group.push(pts[j]); used[j] = true; }
      }
      if (group.length === 1) {
        const a = group[0].a;
        // Bigger circles for longer names — a fixed 34px pin only ever fits ~9
        // characters before ellipsis, so a name like "Index Town Walls" reads
        // as "Index To…". Growing the circle with name length buys more arc
        // length for the curved label without blowing up short names.
        const sz = Math.max(36, Math.min(52, 28 + (a.name || "").length * 1.4));
        const color = DISC_COLORS[a.dominant_discipline] || C.blue;
        const html = pinHtml(a.name, null, sz, color, C.onSolid, discIconMarkup(a.dominant_discipline, 18));
        const mk = L.marker([a.lat, a.lng], { icon: L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
        mk.bindTooltip(a.name + " · " + a.route_count + " climb" + (a.route_count !== 1 ? "s" : ""), { direction: "top" });
        mk.on("click", () => setPick({ areas: [a], cluster: false }));
        grp.addLayer(mk);
      } else {
        const areas = group.map(g => g.a);
        const n = areas.length;
        const climbs = areas.reduce((s, a) => s + (a.route_count || 0), 0);
        const avgLat = areas.reduce((s, a) => s + a.lat, 0) / n, avgLng = areas.reduce((s, a) => s + a.lng, 0) / n;
        const sz = Math.min(22 + n, 44);
        const html = "<div style='width:" + sz + "px;height:" + sz + "px;border-radius:50%;background:" + C.blueSolid + ";border:2px solid #fff;color:#fff;font-weight:700;font-size:" + (n > 99 ? 10 : 12) + "px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.55);'>" + n + "</div>";
        const mk = L.marker([avgLat, avgLng], { icon: L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
        mk.bindTooltip(n + " areas · " + climbs + (climbs === 1 ? " climb" : " climbs") + " — tap to zoom in", { direction: "top" });
        mk.on("click", () => {
          setPick({ areas, cluster: true });
          try { map.fitBounds(L.latLngBounds(areas.map(a => [a.lat, a.lng])), { padding: [50, 50], maxZoom: 15 }); } catch (e) {}
        });
        grp.addLayer(mk);
      }
    }
  }, [ready, nearby]); // eslint-disable-line react-hooks/exhaustive-deps -- markers are redrawn only when the map is ready or the nearby list changes; theme colours are constants

  // Live, and refining: see useFollowMe in lib/mapKit.jsx. Only the FIRST fix re-centres the
  // nearby list -- re-querying on every step of a walk would refetch for nothing.
  const me = useFollowMe(mapRef, { C, zoom: 10, onFix: (f, first) => {
    if (!first) return;
    setCenter({ lat: f.lat, lng: f.lng });
    const map = mapRef.current;
    if (map) setTimeout(() => readBounds(map), 350); // after the pan/zoom animation settles
  } });
  const locate = me.locate, locating = me.locating, geoErr = me.err;
  // Your dot is on the map from the start when location is already allowed -- without moving the
  // map off the area you opened it on. Never asks: the button above does that.
  useEffect(() => { if (ready) me.showDot(); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps -- shows the dot once when the map becomes ready; me is a per-render hook result

  const goToPlace = p => {
    const L = window.L, map = mapRef.current;
    if (!L || !map || !p) return;
    me.release();
    try {
      if (p.bbox) map.fitBounds(p.bbox, { maxZoom: 13 }); else map.setView([p.lat, p.lng], 12);
      if (placeMarkRef.current) map.removeLayer(placeMarkRef.current);
      const html = "<div style='width:16px;height:16px;border-radius:50%;background:" + C.blueSolid + ";border:3px solid #fff;box-shadow:0 0 0 4px " + C.blueSolid + "55,0 2px 7px rgba(0,0,0,0.6);'></div>";
      placeMarkRef.current = L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 1000 }).bindTooltip(p.name, { direction: "top", permanent: true }).addTo(map);
    } catch (e) {}
  };
  const findPlace = e => {
    if (e) e.preventDefault();
    const q = placeQ.trim();
    if (!q || place.busy) return;
    setPlace({ busy: true, err: "", alts: [] });
    searchPlaces(q, bounds).then(rows => {
      if (!rows.length) { setPlace({ busy: false, err: "No town, county or zip/postal code called “" + q + "” found.", alts: [] }); return; }
      goToPlace(rows[0]);
      setPlace({ busy: false, err: "", alts: rows.slice(1, 4) });
    }, () => setPlace({ busy: false, err: "Couldn't search places just now — check your connection and try again.", alts: [] }));
  };

  // Sort the list by distance from the CURRENT viewport center, not the fixed
  // point the map opened at — otherwise, once you've panned somewhere else, the
  // "closest" areas at the top of the list stop matching what's actually
  // showing on screen, which reads as broken.
  const viewCenter = useMemo(() => bounds ? { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 } : center, [bounds, center]);
  const sorted = useMemo(() => {
    if (!nearby) return [];
    const withDist = viewCenter ? nearby.map(a => ({ ...a, _mi: haversineMi(viewCenter, a) })) : nearby.map(a => ({ ...a, _mi: null }));
    return withDist.sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9)).slice(0, 60);
  }, [nearby, viewCenter]);
  const discChip = (k, label, on) => <button key={k || "all"} onClick={() => setDisc(k)} aria-pressed={on} style={{ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>;

  const searchUI = (
    <>
        <form onSubmit={findPlace} role="search" style={{ display: "flex", gap: 6, marginBottom: place.err || place.alts.length ? 4 : 8 }}>
          <input type="search" value={placeQ} onChange={e => setPlaceQ(e.target.value)} placeholder="Go to a town, county or zip/postal code" aria-label="Go to a town, county or zip/postal code" enterKeyHint="search" style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16 }} />
          <button type="submit" disabled={!placeQ.trim() || place.busy} style={{ ...BTN, background: C.blueSolid, color:C.onSolid, border: "none", flexShrink: 0, opacity: !placeQ.trim() || place.busy ? 0.6 : 1 }}>{place.busy ? "Finding…" : "Go"}</button>
        </form>
        {place.err ? <div role="status" style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{place.err}</div> : null}
        {place.alts.length ? (
          <div role="group" aria-label="Other places with that name" style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center", marginBottom: 8, paddingBottom: 2 }}>
            <span style={{ fontSize: 11.5, color: C.textMuted, flexShrink: 0 }}>Not it?</span>
            {place.alts.map((p, i) => <button key={i} onClick={() => { goToPlace(p); setPlace(s => ({ ...s, alts: s.alts.filter(x => x !== p) })); }} style={{ ...CHIP, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{p.name + (p.sub ? ", " + p.sub.split(", ").slice(-1)[0] : "")}</button>)}
          </div>
        ) : null}
    </>
  );
  const mapBox = (
    <div style={{ position: "relative", flex: fullscreen ? 1 : "none", minHeight: 0 }}>
      <div ref={mapDiv} style={{ width: "100%", height: fullscreen ? "100%" : 260, borderRadius: 12, overflow: "hidden", background: C.surface }} />
      {!ready ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 12.5, pointerEvents: "none", textAlign: "center", padding: 16 }}>{mapFail ? "Map couldn't load — the nearest areas are listed below." : "Loading map…"}</div> : null}
      <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} snow snowAt={center} />
      {/* ⤢ to go full screen and ✕ to leave it, in the SAME spot on the map, so the way out is where the
          way in was (owner, 2026-10-24: "Exit full screen is a little hidden on the map"). Drawn OPAQUE, with a
          shadow: the translucent fill let the circles beneath show through it. Full screen also has
          ← Back in its title row. */}
      <button onClick={() => setFullscreen(f => !f)} aria-label={fullscreen ? "Exit full screen" : "Full screen"} title={fullscreen ? "Exit full screen" : "Full screen"} style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 10, right: 10, zIndex: 1000, background: C.surface, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" })}>{fullscreen ? "✕" : "⤢"}</button>
      {/* WHERE AM I, on the map itself, as the route map has it: bottom-right, above the tile
          credit, in full screen too. It used to be a full-width button above the map, which full
          screen hid. */}
      <button onClick={locate} disabled={locating} aria-label="Show my location on the map" style={{ position: "absolute", bottom: 26, right: 10, zIndex: 1000, background: C.blueSolid, color:C.onSolid, border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, cursor: locating ? "default" : "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ActionIcon name="pin" size={14} color="currentColor" />{locateLabel(me, "Me")}</span></button>
    </div>
  );
  // The tapped circle's areas, nearest the middle of the map first.
  const pickRows = pick ? pick.areas.map(a => ({ ...a, _mi: viewCenter ? haversineMi(viewCenter, a) : null })).sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9)) : [];
  const pickClimbs = pickRows.reduce((n, a) => n + (a.route_count || 0), 0);
  const pickUI = pick ? (
    <section aria-label="Areas you tapped on the map" style={{ marginTop: 8, flexShrink: 0, maxHeight: fullscreen ? "42%" : "none", display: "flex", flexDirection: "column", minHeight: 0, background: C.surface, border: "1px solid " + C.blue + "66", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", borderBottom: "1px solid " + C.border }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}>{(pickRows.length === 1 ? "1 area" : pickRows.length + " areas") + " · " + pickClimbs + " climb" + (pickClimbs !== 1 ? "s" : "")}</div>
        <button onClick={() => setPick(null)} title="Close" aria-label="Close the list of tapped areas" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "6px 8px 0" }}>
        {pickRows.map(a => (
          <div key={a.id} {...clickable(() => onOpenArea(a))} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{a.name}</span>
            <span style={{ color: C.textMuted, fontSize: 12, flexShrink: 0 }}>{a._mi != null ? (uDistMi ? uDistMi(a._mi) : a._mi.toFixed(1) + " mi") + " · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </section>
  ) : null;
  const errUI = geoErr ? <div role="status" style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{geoErr}</div> : null;
  const title = "Map" + (name ? " · " + name : "");
  return (
    <div>
      <ViewToggle mode="map" onList={onBack} onMap={() => {}} C={C} />
      {fullscreen ? null : searchUI}
      {/* The inline slot the map's host div sits in when it is not full screen. React renders it
          empty and never touches its children; only the effect above moves the host in and out. */}
      <div ref={slotRef} style={{ marginBottom: 8 }} />
      {/* ONE wrapper in both modes, its children in fixed slots (null when unused): a different
          element around `mapBox` in full screen would make React unmount the map's div, and with it
          the Leaflet map, every time the climber went in or out. */}
      {hostRef.current ? createPortal(
        <div role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen ? "true" : undefined} aria-label={fullscreen ? title : undefined} style={fullscreen ? { position: "fixed", inset: 0, zIndex: 9700, background: C.bg, padding: "calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px)", display: "flex", flexDirection: "column" } : { position: "relative" }}>
          {/* The title row clears the notch (safe-area-inset-top): the page is viewport-fit=cover, so
              with a flat 12px it sat under the phone's status bar and the ✕ was hidden until you
              looked for it (owner, 2026-10-24). ← Back leads, as on every other screen. */}
          {fullscreen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <button onClick={() => setFullscreen(false)} aria-label="Back" style={POP_BACK}>← Back</button>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title}</span>
            </div>
          ) : null}
          {fullscreen ? searchUI : null}
          {mapBox}
          {pickUI}
          {errUI}
        </div>, hostRef.current) : null}
      {!fullscreen ? (
        <>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>{"Pan or zoom the map, or type a town above, to see areas anywhere else." + (me.acc != null ? " The green dot is you." : "")}</div>
          {!center && !bounds ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{'Tap "Me" on the map to find climbs near you.'}</div> : null}
          {error && !sorted.length ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load nearby areas — check your connection and try again.</div> : null}
          {error && sorted.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the areas from your last load.</div> : null}
          {isLoading && bounds ? <LoadingRows C={C} label="Loading nearby climbs…"/> : null}
          {discsInView.length > 1 || disc ? (
            <div style={{ marginBottom: 8 }}>
              <div role="group" aria-label="Filter areas by type of climbing" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                {discChip(null, "All", !disc)}
                {discsInView.map(([k, n]) => discChip(k, (DL[k] || k) + " · " + n, disc === k))}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Shows areas with at least one climb of that type — on the map too.</div>
            </div>
          ) : null}
          {data && data.total != null && !disc && data.total > sorted.length ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing the busiest " + sorted.length + " of " + data.total + " areas in view — zoom in to see more."}</div> : null}
          {disc && (nearby.length > sorted.length || (data && data.total > nearbyAll.length)) ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing " + sorted.length + " " + (DL[disc] || disc).toLowerCase() + (sorted.length === 1 ? " area" : " areas") + " — zoom in to see more."}</div> : null}
          {sorted.map(a => (
            <div key={a.id} {...clickable(() => onOpenArea(a))} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{a.name}</span>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{a._mi != null ? (uDistMi ? uDistMi(a._mi) : a._mi.toFixed(1) + " mi") + " · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {!isLoading && bounds && !sorted.length && !error ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>{disc && nearbyAll && nearbyAll.length ? "No " + (DL[disc] || disc).toLowerCase() + " areas in view — pan, zoom out, or tap All." : "No climbs in view — pan or zoom out to see more."}</div> : null}
        </>
      ) : null}
    </div>
  );
}
