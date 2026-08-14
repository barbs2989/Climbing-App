// The Fire map — a full-screen view of active wildfires, mapped fire perimeters,
// and NWS fire-weather warnings, from the federal sources in lib/fire.js.
//
// Its own view rather than a layer bolted onto the route map, because the question
// it answers is a different question. A route map answers "where is this climb";
// this answers "is the range on fire, and where" — which you ask before you have
// picked a climb at all, and which spans a whole region rather than one objective.
//
// Two shapes of honesty are load-bearing here, both of them this repo's recurring
// bug class pointed at a safety surface:
//
//   1. An empty result and a failed request must never look the same. "No active
//      wildfires in view" is a claim; it is rendered ONLY when a query actually
//      succeeded and returned nothing. Any error renders as an error, and the list
//      keeps working when the map itself cannot load (Leaflet comes off a CDN, so
//      "the map is blank" is a real state) because the list is the part that
//      carries the information.
//   2. This data covers fires and fire weather. It does NOT cover closures or fire
//      restrictions — there is no national API for those (see lib/fire.js) — so the
//      footer says so and links out, instead of leaving a climber to infer that a
//      quiet map means an open road.
//
// Portalled to document.body: #appscroll is a permanent stacking context beneath
// the header's zIndex 30, so a position:fixed overlay rendered inside it paints
// under the chrome no matter what z-index it asks for (see check:overlay-portals).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle } from "./mapKit";
import { useActiveFires, useFirePerimeters, useFireWeather, fireColor, fireLevel, fmtAcres, fmtContained, fmtDiscovered, fmtEnds, fmtStarts, zoneInEffect, fireDistMi, FIRE_SOURCES } from "./fire";

const Z = 3000;
// Continental US, the honest default when we have nothing better to centre on.
const US = { lat: 39.5, lng: -98.5, zoom: 4 };
// How many fires the list renders. Measured: a zoomed-out August viewport returned
// 223 incidents, which is a real number of real fires and an unreadable list.
const LIST_CAP = 60;

// Marker radius in pixels by acreage. Deliberately compressed — a 138,000-acre
// fire is not 1,000x more clickable than a 130-acre one, and the perimeter layer
// is what conveys true extent. This only has to rank them at a glance.
function radiusFor(acres) {
  if (acres == null) return 6;
  return Math.max(5, Math.min(20, 4 + Math.log10(Math.max(1, acres)) * 3));
}

function bboxOf(map) {
  const b = map.getBounds();
  return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() };
}

// The one place that decides where this map opens. Both the seed below and the real
// `setView` read it, so a change to the framing cannot move one without the other —
// and a drift between them is invisible (it costs a duplicate fetch, not an error).
// The caller picks the zoom, because only it knows whether `focus` is a crag or a
// whole state; clamped so a bad value cannot hand Leaflet an out-of-range zoom.
function viewFor(focus) {
  if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return [US.lat, US.lng, US.zoom];
  return [focus.lat, focus.lng, Number.isFinite(focus.zoom) ? Math.min(14, Math.max(3, focus.zoom)) : 9];
}

// The viewport Leaflet WILL show, computed before Leaflet exists.
//
// Every one of the three federal queries is gated on `bbox`, and `bbox` was only
// ever written from the live map — so the data could not start loading until the
// Leaflet CDN had answered, the map had initialised and a 150ms settle had fired.
// Measured on a warm CDN that put the first NIFC request 4.5s after the click with
// ~460ms of it pure Leaflet download; on a cold or throttled connection the CDN leg
// is the whole story. Nothing about "which fires are in this box" needs a map to be
// on screen, so this reproduces Leaflet's own EPSG:3857 bounds arithmetic from the
// container size and the view the map is about to be given. The queries then run in
// PARALLEL with the CDN fetch rather than behind it.
//
// It has to be Leaflet's exact arithmetic rather than a rough box: `bboxKey` rounds
// to 0.01deg, so a guess that lands on a different key costs a second round of
// requests against NIFC and NOAA rather than saving anything. Verified equal to
// map.getBounds() at mount — see scripts/oneoff/probe-firemap-timing.mjs.
function bboxForView(el, lat, lng, zoom) {
  if (!el) return null;
  const w = el.clientWidth, h = el.clientHeight;
  if (!w || !h) return null;
  const scale = 256 * Math.pow(2, zoom);
  const latRad = lat * Math.PI / 180;
  const cx = (lng + 180) / 360 * scale;
  const cy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * scale;
  const unLng = x => x / scale * 360 - 180;
  const unLat = y => {
    const n = Math.PI - 2 * Math.PI * y / scale;
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };
  // Leaflet ROUNDS its pixel origin to whole pixels (_getNewPixelOrigin) and takes the
  // far corner as origin + size, so its bounds are pixel-snapped and an unrounded
  // computation is off by the sub-pixel remainder. That sounds ignorable and is not:
  // measured at zoom 4 the remainder was 0.29px, which is 0.025deg of longitude — two
  // and a half times `bboxKey`'s 0.01deg rounding, so it produced a different key and
  // fetched everything twice. Round here and the keys are identical.
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2);
  return {
    minLng: unLng(x0), maxLng: unLng(x0 + w),
    minLat: unLat(y0 + h), maxLat: unLat(y0),
  };
}

// `uDistMi` is the app's unit-aware distance FORMATTER (ClimbMatchCore.jsx), not a
// boolean flag — `mi => "35.5 mi" | "57.2 km"` depending on the user's setting. This
// component originally destructured it as `uDistMi = true` and branched on its
// truthiness, so the function object was always truthy and every distance rendered
// in miles: a climber with metric selected was shown "mi" on every row, and the km
// branch was unreachable. The default here is a formatter, not `true`, so a caller
// that forgets to pass it degrades to imperial rather than crashing.
export default function FireMap({ onClose, C, ActionIcon, uDistMi = mi => Math.round(mi) + " mi", focus = null, locale = undefined }) {
  const mapDiv = useRef(null), mapRef = useRef(null), tileRef = useRef(null);
  const perimRef = useRef(null), wxRef = useRef(null), fireRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bbox, setBbox] = useState(null);
  const [baseLayer, setBaseLayer] = useState("topo");
  const [show, setShow] = useState({ fires: true, perims: true, wx: true });
  const [sel, setSel] = useState(null);

  // Seed the viewport before Leaflet is anywhere near ready, so the three federal
  // queries below start on mount instead of waiting out the CDN. useLayoutEffect
  // rather than useEffect because the map div only has a measurable size once the
  // DOM is committed, and this needs to run at the FIRST opportunity after that —
  // every millisecond here is a millisecond added to the fire list.
  useLayoutEffect(() => {
    const [vLat, vLng, vZoom] = viewFor(focus);
    const seed = bboxForView(mapDiv.current, vLat, vLng, vZoom);
    if (seed) setBbox(b => b || seed);
  }, []);

  const firesQ = useActiveFires(bbox, show.fires);
  const perimQ = useFirePerimeters(bbox, show.perims);
  const wxQ = useFireWeather(bbox, show.wx);

  const fires = (firesQ.data && firesQ.data.fires) || [];
  const perims = (perimQ.data && perimQ.data.perims) || [];
  const zones = (wxQ.data && wxQ.data.zones) || [];

  // --- map bootstrap -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L;
      // Same view the bbox was seeded from — see viewFor.
      const [vLat, vLng, vZoom] = viewFor(focus);
      const map = L.map(mapDiv.current, { attributionControl: false }).setView([vLat, vLng], vZoom);
      applyBaseLayer(map, tileRef, baseLayer);
      // Order matters: perimeters and weather zones are fills, incident points sit
      // on top so a marker inside a perimeter stays clickable.
      wxRef.current = L.layerGroup().addTo(map);
      perimRef.current = L.layerGroup().addTo(map);
      fireRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      map.on("moveend", () => setBbox(bboxOf(map)));
      setTimeout(() => { try { map.invalidateSize(); setBbox(bboxOf(map)); } catch (e) {} }, 150);
    };
    loadLeaflet(init, () => setMapFail(true));
    // Same 9s ceiling NearMePanel uses: a CDN that neither loads nor errors (a
    // captive portal swallowing the request) would otherwise spin forever.
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => {
      cancelled = true; clearTimeout(ft);
      if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} }
      mapRef.current = null; tileRef.current = null; perimRef.current = null; wxRef.current = null; fireRef.current = null;
    };
  }, []);

  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);

  // When Leaflet never loads there is no map to read a viewport from, so nothing
  // would ever fetch. Fall back to a fixed bbox around the focus point (or the
  // whole lower 48) so the LIST still has data — the map is the nicer half of this
  // screen, but the list is the useful half.
  useEffect(() => {
    if (!mapFail || bbox) return;
    setBbox(focus
      ? { minLat: focus.lat - 1.5, maxLat: focus.lat + 1.5, minLng: focus.lng - 2, maxLng: focus.lng + 2 }
      : { minLat: 24.5, maxLat: 49.5, minLng: -125, maxLng: -66.9 });
  }, [mapFail, bbox, focus]);

  // --- draw perimeters -----------------------------------------------------
  useEffect(() => {
    const L = window.L, grp = perimRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers();
    if (!show.perims) return;
    perims.forEach(p => {
      const color = fireColor(p, C);
      L.geoJSON(p.geometry, { style: { color, weight: 1.5, opacity: 0.9, fillColor: color, fillOpacity: fireLevel(p) === "contained" ? 0.12 : 0.28 } })
        .bindTooltip(p.name + " — " + fmtAcres(p.acres), { sticky: true })
        .addTo(grp);
    });
  }, [ready, perims, show.perims, C]);

  // --- draw fire-weather zones --------------------------------------------
  useEffect(() => {
    const L = window.L, grp = wxRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers();
    if (!show.wx) return;
    zones.forEach(z => {
      // A product issued for later is drawn fainter and unfilled, and its tooltip
      // says "from …" instead of "until …". Drawing the two identically is what let a
      // warning starting tomorrow look like weather you are standing in.
      const live = zoneInEffect(z);
      const color = z.kind === "warning" ? C.orange : C.amber;
      const when = live ? fmtEnds(z.ends, locale) : fmtStarts(z.starts, locale);
      L.geoJSON(z.geometry, { style: { color, weight: live ? 1.5 : 1, opacity: live ? 0.75 : 0.4, dashArray: live ? "5 4" : "2 6", fillColor: color, fillOpacity: live ? 0.08 : 0 } })
        .bindTooltip(z.label + (live ? "" : " (issued for later)") + (when ? " " + when : ""), { sticky: true })
        .addTo(grp);
    });
  }, [ready, zones, show.wx, C, locale]);

  // --- draw incident points ------------------------------------------------
  useEffect(() => {
    const L = window.L, grp = fireRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers();
    if (!show.fires) return;
    fires.forEach(f => {
      const color = fireColor(f, C);
      L.circleMarker([f.lat, f.lng], { radius: radiusFor(f.acres), color: "#0d1117", weight: 1.5, fillColor: color, fillOpacity: 0.95 })
        .bindTooltip(f.name + " — " + fmtAcres(f.acres), { direction: "top" })
        .on("click", () => setSel(f.id))
        .addTo(grp);
    });
  }, [ready, fires, show.fires, C]);

  const flyTo = f => {
    setSel(f.id);
    const map = mapRef.current;
    if (map) { try { map.setView([f.lat, f.lng], Math.max(map.getZoom(), 9), { animate: true }); } catch (e) {} }
  };

  // Every branch reports something. The first version returned silently when
  // geolocation was unavailable or the map had not loaded, and swallowed the error
  // callback too — so a denied permission, a timeout, and a browser without
  // geolocation all produced a button that visibly did nothing.
  const [locateMsg, setLocateMsg] = useState("");
  const locate = () => {
    if (!navigator.geolocation) { setLocateMsg("This browser can't share your location."); return; }
    if (!mapRef.current) { setLocateMsg("The map isn't loaded, so there's nothing to centre."); return; }
    setLocateMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      p => {
        setLocateMsg("");
        try { mapRef.current.setView([p.coords.latitude, p.coords.longitude], 9); } catch (e) { setLocateMsg("Couldn't move the map."); }
      },
      err => setLocateMsg(err && err.code === 1 ? "Location permission is off for this site." : "Couldn't get your location."),
      { timeout: 8000 }
    );
  };

  // Which product to headline. Priority order, and each step is load-bearing:
  //   1. in effect NOW beats one issued for later — a warning that starts tomorrow
  //      lunchtime is not current danger and must not be banner-ed as though it were
  //   2. a Warning beats a Watch
  //   3. soonest to expire, so the banner tracks the nearest deadline
  // The end-time fallback is `Infinity`, not 0. Written as `Date.parse(z.ends || 0)`
  // it stringified null to "0" and parsed as the year 2000, so a product with no end
  // time sorted ahead of every real one and became the headline — the least
  // informative zone winning, and then rendering with no "until" line at all.
  const inEffect = useMemo(() => zones.filter(z => zoneInEffect(z)), [zones]);
  const upcoming = useMemo(() => zones.filter(z => !zoneInEffect(z)), [zones]);
  const topZone = useMemo(() => {
    const rank = pool => pool.slice().sort((a, b) => (Date.parse(a.ends) || Infinity) - (Date.parse(b.ends) || Infinity))[0];
    const nowW = inEffect.filter(z => z.kind === "warning");
    return rank(nowW.length ? nowW : inEffect.length ? inEffect : upcoming.filter(z => z.kind === "warning").length ? upcoming.filter(z => z.kind === "warning") : upcoming) || null;
  }, [inEffect, upcoming]);
  const topIsUpcoming = topZone ? !zoneInEffect(topZone) : false;
  // How many others share the headline's footing, so "and N more" counts comparable
  // things rather than lumping tomorrow's watch in with tonight's warning.
  const peerCount = Math.max(0, (topIsUpcoming ? upcoming.length : inEffect.length) - 1);

  const anyError = firesQ.error || perimQ.error || wxQ.error;
  const anyLoading = (show.fires && firesQ.isFetching) || (show.perims && perimQ.isFetching) || (show.wx && wxQ.isFetching);
  // The weather layer was missing here, so a viewport hitting CAP.wx drew a subset of
  // Red Flag polygons and said nothing — against this module's own stated contract
  // that a capped result is always disclosed.
  const truncated = (firesQ.data && firesQ.data.truncated) || (perimQ.data && perimQ.data.truncated) || (wxQ.data && wxQ.data.truncated);
  // Distances need a reference the user can name, and it must not move when they
  // tap a row: flying to a fire re-centres the map, so measuring from the map
  // centre made the fire you just selected read "0 mi from" — true, meaningless,
  // and it looked like a bug. A focus point (the area you were browsing) is stable
  // and nameable, so it wins whenever we have one.
  const [mapCenter, setMapCenter] = useState(focus || null);
  useEffect(() => {
    if (!ready || !mapRef.current || focus) return;
    const map = mapRef.current;
    const read = () => { try { const c = map.getCenter(); setMapCenter({ lat: c.lat, lng: c.lng }); } catch (e) {} };
    read();
    map.on("moveend", read);
    return () => { try { map.off("moveend", read); } catch (e) {} };
  }, [ready, focus]);
  const ref = focus || mapCenter;
  const refLabel = focus ? (focus.name ? "from " + focus.name : "from where you were browsing") : "from the centre of the map";

  const chip = (key, label, color, n) => (
    <button onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))} aria-pressed={show[key]}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 9px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, background: show[key] ? C.card : C.surface, color: show[key] ? C.text : C.textMuted, border: "1px solid " + (show[key] ? color : C.border), boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: show[key] ? color : "transparent", border: "1.5px solid " + color, flexShrink: 0 }} />
      {label}{n != null && show[key] ? " " + n : ""}
    </button>
  );

  const hd = { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.textSub };

  return createPortal(
    <div role="dialog" aria-label="Fire map" onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: Z, background: C.bg, display: "flex", flexDirection: "column" }}>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.border, background: C.surface, flexShrink: 0 }}>
        <ActionIcon name="fire" size={19} color={C.red} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>Fire map</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Active wildfires &amp; fire weather
          </div>
        </div>
        {/* Not offered at all when the map failed to load — there is nothing to centre,
            and a button whose only possible outcome is an apology is worse than absent. */}
        {mapFail ? null : (
          <button onClick={locate} aria-label="Centre on my location"
            style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.textSub, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <ActionIcon name="target" size={15} color={C.textSub} />
          </button>
        )}
        <button onClick={onClose} aria-label="Close fire map"
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
      </div>

      {/* headline fire-weather banner — the danger half, above the map so it is not
          something you have to go looking for */}
      {show.wx && topZone ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: topIsUpcoming ? C.amberBg : topZone.kind === "warning" ? C.redBg : C.amberBg, borderBottom: "1px solid " + (topIsUpcoming ? C.amber : topZone.kind === "warning" ? C.red : C.amber), flexShrink: 0 }}>
          <ActionIcon name="alert" size={15} color={topIsUpcoming ? C.amber : topZone.kind === "warning" ? C.red : C.amber} />
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.45, color: C.text }}>
            {/* "in view" vs "issued for later" is the difference between conditions you
                are standing in and conditions forecast for tomorrow. Both are worth
                showing; conflating them is what made a future warning read as current. */}
            <b>{topZone.label}</b>{peerCount ? " and " + peerCount + " more" : ""}{topIsUpcoming ? " issued for later" : " in view"}
            {/* Its own line rather than " · until 8PM" appended inline: at phone width
                the inline version wrapped and left the separator stranded on a line
                of its own. Same reason the source list below is one line per source. */}
            {(topIsUpcoming ? fmtStarts(topZone.starts, locale) : fmtEnds(topZone.ends, locale))
              ? <div style={{ color: C.textSub }}>{topIsUpcoming ? fmtStarts(topZone.starts, locale) : fmtEnds(topZone.ends, locale)}</div> : null}
            {/* When something is in effect AND more is queued behind it, say so — the
                banner otherwise hides the fact that tonight gets worse. */}
            {!topIsUpcoming && upcoming.length ? <div style={{ color: C.textMuted, fontSize: 11 }}>{upcoming.length + " more issued for later"}</div> : null}
          </div>
          {topZone.url ? <a href={topZone.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 700, color: C.blue, textDecoration: "none", flexShrink: 0 }}>Full text →</a> : null}
        </div>
      ) : null}

      {/* map */}
      <div style={{ position: "relative", flex: "1 1 45%", minHeight: 180 }}>
        {mapFail ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 20, textAlign: "center" }}>
            <ActionIcon name="map" size={22} color={C.textMuted} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textSub }}>Map couldn&apos;t load</div>
            <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, maxWidth: 300 }}>
              The map library is served from a CDN and didn&apos;t arrive. The fire list below still works.
            </div>
          </div>
        ) : (
          <>
            <div ref={mapDiv} style={{ position: "absolute", inset: 0, background: C.card }} />
            <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} />
            <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, zIndex: 1000, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {chip("fires", "Fires", C.red, firesQ.data ? fires.length : null)}
              {chip("perims", "Perimeters", C.orange, perimQ.data ? perims.length : null)}
              {chip("wx", "Red flag", C.amber, wxQ.data ? zones.length : null)}
            </div>
          </>
        )}
      </div>

      {/* list + status.
          `overscrollBehavior: contain` stops a drag that runs out of list from
          scrolling the document underneath — this overlay is position:fixed over a
          page that is still scrollable, so without it the pane reads as frozen.
          check:overlay-scroll enforces this for every overlay. */}
      <div style={{ flex: "1 1 40%", minHeight: 150, overflowY: "auto", overscrollBehavior: "contain", borderTop: "1px solid " + C.border, background: C.bg }}>
        <div style={{ padding: "12px 14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={hd}>Fires in view</div>
              {anyLoading ? <span style={{ fontSize: 11, color: C.textMuted }}>updating…</span> : null}
            </div>
            {/* Says what the mileage on each row is measured from — "750 mi" with no
                stated reference is a number nobody can act on. */}
            {ref && fires.length ? <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>Distances {refLabel}</div> : null}
            {locateMsg ? <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>{locateMsg}</div> : null}
          </div>

          {/* With the Fires chip off, the query is disabled — so there is no data, no
              error and no loading state, and this section used to render a heading over
              nothing at all. Say which layer is off instead. */}
          {!show.fires ? (
            <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>
              The Fires layer is turned off.
              <div style={{ color: C.textMuted, fontSize: 11.5, marginTop: 4 }}>Tap “Fires” on the map to list active wildfires again.</div>
            </div>
          ) : null}

          {/* An error is an error. It never collapses into "no fires nearby". */}
          {anyError ? (
            <div style={{ border: "1px solid " + C.red, background: C.redBg, borderRadius: 10, padding: "11px 12px", display: "flex", gap: 9 }}>
              <ActionIcon name="alert" size={15} color={C.red} />
              <div style={{ fontSize: 12, lineHeight: 1.5, color: C.text }}>
                <b>Couldn&apos;t load fire data.</b>
                <div style={{ color: C.textSub, marginTop: 3 }}>
                  {navigator.onLine === false
                    ? "You're offline — this map needs a connection, and there is no downloaded copy of it."
                    : "The federal service didn't answer. This is not a report that nothing is burning."}
                </div>
                <button onClick={() => { firesQ.refetch(); perimQ.refetch(); wxQ.refetch(); }}
                  style={{ marginTop: 8, padding: "6px 11px", borderRadius: 7, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Try again</button>
              </div>
            </div>
          ) : null}

          {truncated ? (
            <div style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.5 }}>
              Too many to draw at this zoom — showing the largest. Zoom in for the full picture.
            </div>
          ) : null}

          {/* The one honest empty state: the query came back, and it came back empty.
              Also gated on the layer being ON — with it off, React Query serves the last
              cached result for this key, so an ungated list would show stale rows under
              a heading claiming they are what is in view. */}
          {show.fires && !anyError && firesQ.data && fires.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>
              No active wildfire incidents reported in this view.
              <div style={{ color: C.textMuted, fontSize: 11.5, marginTop: 4 }}>
                Pan or zoom out to widen the search. Prescribed burns are not shown.
              </div>
            </div>
          ) : null}

          {/* Every fire in view is drawn on the map; the LIST is capped, because a
              continental viewport in August legitimately holds 200+ incidents and a
              200-row list is not something anyone reads. The cap is stated rather
              than applied quietly — a list that stops at 60 while claiming to be
              "fires in view" is the same lie as an empty state over a failed query. */}
          {show.fires && fires.length > LIST_CAP ? (
            <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>
              Showing the {LIST_CAP} largest of {fires.length} in view. All {fires.length} are on the map — zoom in to narrow the list.
            </div>
          ) : null}

          {(show.fires ? fires.slice(0, LIST_CAP) : []).map(f => {
            const open = sel === f.id, color = fireColor(f, C), mi = ref ? fireDistMi(ref.lat, ref.lng, f.lat, f.lng) : null;
            return (
              <button key={f.id} onClick={() => flyTo(f)}
                style={{ textAlign: "left", border: "1px solid " + (open ? color : C.border), background: open ? C.card : C.surface, borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  {/* Formatted by the app's unit-aware formatter, and never suppressed:
                      the old `mi >= 1` guard hid the distance for the very nearest
                      fires, which is the one case where the number matters most. */}
                  {mi != null ? <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{uDistMi(Math.round(mi * 10) / 10)}</span> : null}
                </div>
                <div style={{ fontSize: 11.5, color: C.textSub, lineHeight: 1.5 }}>
                  {/* Joined with a NO-BREAK space before each "·" so the separator can
                      only ever wrap forward with the text that follows it, never be
                      left stranded at the end of a line — the same defect check:zero
                      caught in the source list below. */}
                  {[fmtAcres(f.acres), fmtContained(f.contained), fmtDiscovered(f.discovered)].filter(Boolean).join(" · ")}
                </div>
                {open ? (
                  <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.55, marginTop: 3, borderTop: "1px solid " + C.border, paddingTop: 6 }}>
                    {f.county ? <div>{f.county} County{f.state ? ", " + f.state : ""}</div> : null}
                    {f.agency ? <div>Protecting agency: {f.agency}</div> : null}
                    {f.note ? <div style={{ marginTop: 3, color: C.textSub }}>{f.note}</div> : null}
                    {!f.county && !f.agency && !f.note ? <div>No further detail reported for this incident.</div> : null}
                  </div>
                ) : null}
              </button>
            );
          })}

          {/* What this map does not know. Not a disclaimer for its own sake — a
              quiet map is exactly what would otherwise imply an open trailhead. */}
          <div style={{ marginTop: 6, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", background: C.surface, display: "flex", gap: 9 }}>
            <ActionIcon name="info" size={15} color={C.textMuted} />
            <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.6 }}>
              <b style={{ color: C.textSub }}>This map does not show closures.</b> Trail, road and area
              closures and fire restrictions are issued per-forest as written orders, and there is no
              national feed for them. A fire far from your route can still close its access road. Check
              the managing agency before you drive.
              <div style={{ marginTop: 7, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href="https://www.fs.usda.gov/alerts" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontWeight: 700 }}>Forest Service alerts →</a>
                <a href="https://www.nps.gov/planyourvisit/alerts.htm" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontWeight: 700 }}>National Park alerts →</a>
                <a href="https://inciweb.wildfire.gov/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontWeight: 700 }}>InciWeb →</a>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.6, marginTop: 2 }}>
            {FIRE_SOURCES.map(s => (
              <div key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: C.textSub, textDecoration: "none" }}>{s.label}</a>
              </div>
            ))}
            <div style={{ marginTop: 3 }}>Acreage and containment are as last reported by the managing agency, not live measurements.</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
