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
import { POP_CLOSE, POP_CLOSE_MEDIA } from "./popupChrome.js";
import { TEXT_TAP } from "./buttonStyles.js";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle, useFollowMe, locateLabel } from "./mapKit";
import { useActiveFires, useFirePerimeters, useFireWeather, useHeat, useFireAlert, nwsPointPage, HEAT_MIN_ZOOM, HEAT_HOURS, fmtHoursAgo, useSmokeWindow, smokeHours, smokeTileUrl, fmtSmokeHour, SMOKE_BANDS, SMOKE_MAX_NATIVE_ZOOM, fireColor, fireLevel, fmtAcres, fmtContained, fmtDiscovered, fmtEnds, fmtStarts, zoneInEffect, fireDistMi } from "./fire";
import LoadingRows from "../src/components/LoadingRows.tsx";

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
  const perimRef = useRef(null), wxRef = useRef(null), fireRef = useRef(null), heatRef = useRef(null), smokeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bbox, setBbox] = useState(null);
  const [baseLayer, setBaseLayer] = useState("topo");
  const [show, setShow] = useState({ fires: true, perims: true, wx: true, heat: true, smoke: true });
  const [sel, setSel] = useState(null);
  // Map-only view: the list and its notes step aside and the map takes the screen, as the
  // area map's and the route map's ⤢ do. The legend stays — a map you cannot read is not
  // a bigger map.
  const [fullscreen, setFullscreen] = useState(false);
  // The fire-weather product whose words are open in the sheet below.
  const [wxOpen, setWxOpen] = useState(null);
  const [zoom, setZoom] = useState(() => viewFor(focus)[2]);

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
  const heatOn = show.heat && zoom >= HEAT_MIN_ZOOM;
  const heatQ = useHeat(bbox, heatOn);
  // The smoke forecast: which hours it holds, and the one being drawn (an index into
  // them; 0 is the current hour). `smokeErr` is set by a tile that failed to load, so
  // a blank overlay from a dead service never passes for clean air.
  const smokeQ = useSmokeWindow(show.smoke);
  const hours = useMemo(() => smokeHours(smokeQ.data), [smokeQ.data]);
  const [hourIx, setHourIx] = useState(0);
  const smokeAt = hours.length ? hours[Math.min(hourIx, hours.length - 1)] : null;
  const [smokeErr, setSmokeErr] = useState(false);

  const fires = (firesQ.data && firesQ.data.fires) || [];
  const perims = (perimQ.data && perimQ.data.perims) || [];
  const zones = (wxQ.data && wxQ.data.zones) || [];
  const heatData = heatQ.data;
  const heat = useMemo(() => (heatOn && heatData && heatData.heat) || [], [heatOn, heatData]);

  // --- map bootstrap -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L;
      // Same view the bbox was seeded from — see viewFor.
      const [vLat, vLng, vZoom] = viewFor(focus);
      // Zoom sits TOP-RIGHT, a corner nothing else on this map uses. It used to sit
      // top-left under the base-layer toggle, pushed down by a hand-tuned 46px — which
      // cleared the toggle's ~44px by two pixels, so any taller rendering of the
      // toggle's text put the Satellite button over the + button on a phone.
      const map = L.map(mapDiv.current, { attributionControl: false, zoomControl: false }).setView([vLat, vLng], vZoom);
      // Pushed down past the ⤢ full-screen button, which takes the top-right corner as
      // it does on the area map.
      const zc = L.control.zoom({ position: "topright" }).addTo(map);
      try { zc.getContainer().style.marginTop = "68px"; } catch (e) {}
      applyBaseLayer(map, tileRef, baseLayer);
      // Order matters: perimeters and weather zones are fills, incident points sit
      // on top so a marker inside a perimeter stays clickable.
      wxRef.current = L.layerGroup().addTo(map);
      perimRef.current = L.layerGroup().addTo(map);
      heatRef.current = L.layerGroup().addTo(map);
      smokeRef.current = L.layerGroup().addTo(map);
      fireRef.current = L.layerGroup().addTo(map);
      // The place the map was opened FOR, named on the map itself. A route page asks for
      // this (focus.pin) because "zoom in until you can find Vesper Peak" was the job the
      // climber was left with: the base layer labels peaks only from about zoom 12, a crag
      // or a sector is never labelled at all, and Satellite labels nothing. An area focus
      // does not get a pin — a state's or a range's centroid is not a place to point at.
      if (focus && focus.pin && focus.name) {
        try {
          L.circleMarker([vLat, vLng], { radius: 7, color: "#ffffff", weight: 3, fillColor: C.blue, fillOpacity: 1, interactive: false })
            .addTo(map)
            .bindTooltip(focus.pinLabel || focus.name, { permanent: true, direction: "top", offset: [0, -8] });
        } catch (e) {}
      }
      mapRef.current = map;
      setReady(true);
      map.on("moveend", () => { setBbox(bboxOf(map)); setZoom(map.getZoom()); });
      setTimeout(() => { try { map.invalidateSize(); setBbox(bboxOf(map)); } catch (e) {} }, 150);
    };
    loadLeaflet(init, () => setMapFail(true));
    // Same 9s ceiling NearMePanel uses: a CDN that neither loads nor errors (a
    // captive portal swallowing the request) would otherwise spin forever.
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => {
      cancelled = true; clearTimeout(ft);
      if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} }
      mapRef.current = null; tileRef.current = null; perimRef.current = null; wxRef.current = null; fireRef.current = null; heatRef.current = null; smokeRef.current = null;
    };
  }, []);

  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);
  // The map div changes size when the list steps aside; Leaflet only measures on resize.
  useEffect(() => { const m = mapRef.current; if (m) setTimeout(() => { try { m.invalidateSize(); setBbox(bboxOf(m)); } catch (e) {} }, 60); }, [fullscreen]);

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
        .on("click", () => setWxOpen(z))
        .addTo(grp);
    });
  }, [ready, zones, show.wx, C, locale]);

  // --- draw satellite heat detections ---------------------------------------
  // Each detection is a pixel about 375 m across, so it is drawn at that size on the
  // ground once the map is zoomed in far enough for that to be bigger than a speck —
  // the dot then covers what the satellite actually saw, no more precise and no less.
  // Newer is brighter: a detection from this morning and one from two days ago are
  // different news about the same fire.
  useEffect(() => {
    const L = window.L, grp = heatRef.current, map = mapRef.current;
    if (!ready || !L || !grp || !map) return;
    grp.clearLayers();
    if (!heatOn) return;
    let mpp = 0;
    try { const c = map.getCenter(); mpp = 156543.03 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, map.getZoom()); } catch (e) {}
    const r = mpp ? Math.max(3, Math.min(60, 187 / mpp)) : 3;
    heat.forEach(h => {
      const op = h.hours == null ? 0.5 : h.hours < 12 ? 0.95 : h.hours < 24 ? 0.6 : 0.32;
      L.circleMarker([h.lat, h.lng], { radius: r, stroke: false, fillColor: C.yellow, fillOpacity: op })
        .bindTooltip("Satellite heat detection · " + fmtHoursAgo(h.hours), { direction: "top" })
        .addTo(grp);
    });
  }, [ready, heat, heatOn, zoom, C]);

  // --- draw the smoke forecast ---------------------------------------------
  // A tile layer whose tiles are one forecast hour's image for that tile's box, in a
  // pane above the base map and below every fill and dot, so smoke tints the ground
  // without hiding a fire or a perimeter.
  useEffect(() => {
    const L = window.L, grp = smokeRef.current, map = mapRef.current;
    if (!ready || !L || !grp || !map) return;
    grp.clearLayers();
    setSmokeErr(false);
    if (!show.smoke || smokeAt == null) return;
    if (!map.getPane("smoke")) { const pane = map.createPane("smoke"); pane.style.zIndex = 350; pane.style.pointerEvents = "none"; }
    const Smoke = L.TileLayer.extend({
      getTileUrl(c) {
        const size = 40075016.68557849 / Math.pow(2, c.z), o = 20037508.342789244;
        return smokeTileUrl([c.x * size - o, o - (c.y + 1) * size, (c.x + 1) * size - o, o - c.y * size], smokeAt);
      },
    });
    const layer = new Smoke("", { pane: "smoke", opacity: 0.55, maxNativeZoom: SMOKE_MAX_NATIVE_ZOOM, maxZoom: 19, tileSize: 256 });
    layer.on("tileerror", () => setSmokeErr(true));
    layer.addTo(grp);
  }, [ready, show.smoke, smokeAt]);

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
  // The control is GPXMap's "📍 Me" button, and like it, locating draws where you are —
  // a dot and an accuracy ring — rather than only moving the map, which left nothing
  // on screen to say which point was you.
  // GPXMap's "↺ Reset view", offered — as there — only once locating has moved the map
  // away from where it opened. It returns to that opening view (viewFor), so a climber
  // who located themselves 200 miles from the area they were browsing can get back.
  const [locatedOnce, setLocatedOnce] = useState(false);
  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    me.release();
    const [vLat, vLng, vZoom] = viewFor(focus);
    try { map.setView([vLat, vLng], vZoom, { animate: true }); } catch (e) {}
  };
  // Live, and refining: see useFollowMe in lib/mapKit.jsx for why one reading was "a little off".
  const me = useFollowMe(mapRef, { C, zoom: 9, onFix: (f, first) => { if (first) setLocatedOnce(true); } });
  const [mapMsg, setMapMsg] = useState("");
  const locateMsg = me.err || mapMsg;
  const locate = () => {
    if (!mapRef.current) { setMapMsg("The map isn't loaded, so there's nothing to centre."); return; }
    setMapMsg(""); me.locate();
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

  const smokeFailed = show.smoke && (!!smokeQ.error || smokeErr);
  const anyError = firesQ.error || perimQ.error || wxQ.error || (heatOn && heatQ.error);
  const anyLoading = (show.fires && firesQ.isFetching) || (show.perims && perimQ.isFetching) || (show.wx && wxQ.isFetching) || (heatOn && heatQ.isFetching);
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
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 11px", minHeight: 36, borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 700, background: show[key] ? C.card : C.surface, color: show[key] ? C.text : C.textMuted, border: "1px solid " + (show[key] ? color : C.border), boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
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
            Active wildfires, smoke &amp; fire weather
          </div>
        </div>
        {/* In the map-only view the ✕ leaves THAT view, as the area map's full screen does —
            one tap back to the list, not out of the fire map altogether. */}
        {fullscreen
          ? <button onClick={() => setFullscreen(false)} aria-label="Close full-screen map" style={POP_CLOSE}>✕</button>
          : <button onClick={onClose} aria-label="Close fire map" style={POP_CLOSE}>✕</button>}
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
          {/* Opens the product's own words in the app. This was a link to topZone.url,
              which is api.weather.gov's machine record: raw JSON while the product is
              live and a 404 once it expires — the "broken page" a climber landed on. */}
          <button onClick={() => setWxOpen(topZone)} style={{ fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none", padding: "8px 4px", cursor: "pointer", flexShrink: 0 }}>Full text →</button>
        </div>
      ) : null}

      {/* map */}
      <div style={{ position: "relative", flex: fullscreen ? "1 1 auto" : "1 1 45%", minHeight: 180 }}>
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
            {/* right: 80 leaves the bottom-right corner to the Me button below. */}
            <div style={{ position: "absolute", bottom: 26, left: 10, right: 80, zIndex: 1000, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {chip("fires", "Fires", C.red, firesQ.data ? fires.length : null)}
              {chip("perims", "Perimeters", C.orange, perimQ.data ? perims.length : null)}
              {chip("wx", "Red flag", C.amber, wxQ.data ? zones.length : null)}
              {chip("heat", "Heat", C.yellow, heatOn && heatQ.data ? heat.length : null)}
              {chip("smoke", "Smoke", C.textSub, null)}
            </div>
            {/* Inside the map branch, so it is not offered when the map failed to load —
                there is nothing to centre, and a button whose only outcome is an apology
                is worse than absent. Styled exactly as GPXMap's. */}
            {/* The area map's button, exactly: "📍 Me". It was a line-drawn pin icon in
                the same white as its word, which read as decoration, not "where am I". */}
            <button onClick={locate} disabled={me.locating} aria-label="Show my location on the map"
              style={{ position: "absolute", bottom: 26, right: 10, zIndex: 1000, background: C.blueSolid, color:C.onSolid, border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, cursor: me.locating ? "default" : "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ActionIcon name="pin" size={14} color="currentColor" />{locateLabel(me, "Me")}</span></button>
            {fullscreen ? null : <button onClick={() => setFullscreen(true)} aria-label="Full screen" title="Full screen" style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 10, right: 10, zIndex: 1000 })}>⤢</button>}
            {/* Top-right under the zoom buttons (which end ~140px down, below the ⤢), not
                GPXMap's bottom-left: that corner holds the layer chips here. */}
            {locatedOnce ? (
              <button onClick={resetView}
                style={{ position: "absolute", top: 148, right: 10, zIndex: 1000, background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 9, padding: "7px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>↺ Reset view</button>
            ) : null}
          </>
        )}
      </div>

      {/* The legend, under the map: every colour the map draws, the grey of a contained
          fire included — it was only ever named in a comment in lib/fire.js. */}
      {mapFail ? null : (
        <div style={{ flexShrink: 0, padding: "8px 12px", borderTop: "1px solid " + C.border, background: C.surface, display: "flex", flexWrap: "wrap", gap: "5px 12px", fontSize: 11, color: C.textSub }}>
          {[[C.red, "Uncontained or not reported"], [C.orange, "50–99% contained"], [C.textMuted, "Contained"]].map(([col, t]) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: col, flexShrink: 0 }} />{t}</span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ width: 11, height: 8, borderRadius: 2, background: C.red + "33", border: "1.5px solid " + C.red, flexShrink: 0 }} />Mapped perimeter (coloured as its fire)</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ width: 11, height: 8, borderRadius: 2, border: "1.5px dashed " + C.orange, flexShrink: 0 }} />Red Flag Warning</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ width: 11, height: 8, borderRadius: 2, border: "1.5px dashed " + C.amber, flexShrink: 0 }} />Fire Weather Watch</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: C.yellow, flexShrink: 0 }} />{"Heat seen by satellite, last " + HEAT_HOURS + " h (brighter = newer)"}</span>
          {show.smoke ? (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5, paddingTop: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: C.text, flex: 1, minWidth: 0 }}>{smokeAt != null ? "Smoke forecast, " + fmtSmokeHour(smokeAt, locale) : "Smoke forecast"}</span>
                <button onClick={() => setHourIx(i => Math.max(0, i - 1))} disabled={!hours.length || hourIx <= 0} aria-label="Earlier smoke forecast"
                  style={{ minWidth: 36, minHeight: 32, borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: hourIx <= 0 ? C.textMuted : C.text, fontSize: 13, fontWeight: 700, cursor: hourIx <= 0 ? "default" : "pointer" }}>‹</button>
                <button onClick={() => setHourIx(i => Math.min(hours.length - 1, i + 1))} disabled={!hours.length || hourIx >= hours.length - 1} aria-label="Later smoke forecast"
                  style={{ minWidth: 36, minHeight: 32, borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: hourIx >= hours.length - 1 ? C.textMuted : C.text, fontSize: 13, fontWeight: 700, cursor: hourIx >= hours.length - 1 ? "default" : "pointer" }}>›</button>
              </div>
              {smokeFailed ? (
                <div style={{ color: C.amber, lineHeight: 1.45 }}>Couldn&apos;t load the smoke forecast, so smoke is not shown. This is not a clean-air reading.</div>
              ) : smokeQ.isLoading ? <div style={{ color: C.textMuted }}>Loading the smoke forecast…</div> : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px" }}>
                  {SMOKE_BANDS.map(([lo, col, word], i) => (
                    <span key={word} style={{ display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ width: 11, height: 8, borderRadius: 2, background: col, opacity: 0.75, flexShrink: 0 }} />{word + " (" + (i + 1 < SMOKE_BANDS.length ? lo + "–" + (SMOKE_BANDS[i + 1][0] - 0.1).toFixed(1) : lo + " and up") + " µg/m³)"}</span>
                  ))}
                </div>
              )}
              <div style={{ color: C.textMuted, lineHeight: 1.45 }}>Fine smoke near the ground, an hour&apos;s average, forecast for the region up to two days out — not a reading at your route. Clear map means under 9 µg/m³.</div>
            </div>
          ) : null}
          <div style={{ width: "100%", color: C.textMuted, lineHeight: 1.45 }}>
            A fire&apos;s dot is where it started, sized by acres — not its edge. The perimeter and the heat show where it is burning.
            {show.heat && zoom < HEAT_MIN_ZOOM ? " Zoom in to see heat." : ""}
          </div>
        </div>
      )}

      {/* list + status.
          `overscrollBehavior: contain` stops a drag that runs out of list from
          scrolling the document underneath — this overlay is position:fixed over a
          page that is still scrollable, so without it the pane reads as frozen.
          check:overlay-scroll enforces this for every overlay. */}
      <div style={{ display: fullscreen ? "none" : "block", flex: "1 1 40%", minHeight: 150, overflowY: "auto", overscrollBehavior: "contain", borderTop: "1px solid " + C.border, background: C.bg }}>
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
                <button onClick={() => { firesQ.refetch(); perimQ.refetch(); wxQ.refetch(); if (heatOn) heatQ.refetch(); }}
                  style={{ marginTop: 8, padding: "6px 11px", borderRadius: 7, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>Try again</button>
              </div>
            </div>
          ) : null}

          {heatOn && heatQ.data && heatQ.data.truncated ? (
            <div style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.5 }}>
              Too much satellite heat to draw at this zoom — showing the newest. Zoom in for all of it.
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
              <button key={f.id} onClick={() => flyTo(f)} aria-current={open ? "true" : undefined}
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
                <a href="https://www.fs.usda.gov/alerts" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontWeight: 700, ...TEXT_TAP }}>Forest Service alerts →</a>
                <a href="https://www.nps.gov/planyourvisit/alerts.htm" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontWeight: 700, ...TEXT_TAP }}>National Park alerts →</a>
                <a href="https://inciweb.wildfire.gov/" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: "none", fontWeight: 700, ...TEXT_TAP }}>InciWeb →</a>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10.5, color: C.textMuted, lineHeight: 1.6, marginTop: 2 }}>
            <div>Acreage and containment are as last reported by the managing agency, not live measurements.</div>
          </div>
        </div>
      </div>

      {wxOpen ? <FireAlertSheet zone={wxOpen} onClose={() => setWxOpen(null)} C={C} locale={locale} /> : null}
    </div>,
    document.body
  );
}

// One fire-weather product, in its own words, over the fire map. Read from the
// product's api.weather.gov record rather than linking to it (that record is JSON, and
// gone once the product expires). Every state says what it is: loading, the text, a
// product NWS no longer publishes, and a failed read — and every one of them offers
// weather.gov's own page for the place, which lists whatever is in effect there now.
function FireAlertSheet({ zone, onClose, C, locale }) {
  const q = useFireAlert(zone.url);
  // ✕ or Escape closes the sheet (not the map under it).
  useEffect(() => { const k = e => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  const live = zoneInEffect(zone);
  const when = live ? fmtEnds(zone.ends, locale) : fmtStarts(zone.starts, locale);
  const d = q.data;
  const para = { fontSize: 12.5, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
  return (
    <div role="dialog" aria-label={zone.label}
      style={{ position: "fixed", inset: 0, zIndex: Z + 100, background:C.scrim, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "85%", background: C.surface, borderTop: "1px solid " + C.border, borderRadius: "16px 16px 0 0", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: zone.kind === "warning" ? C.red : C.amber }}>{zone.label}</div>
            {when ? <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 2 }}>{(live ? "In effect " : "Issued for later, ") + when}</div> : null}
          </div>
          <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
        </div>
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "12px 14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {!zone.url ? <div style={{ fontSize: 12.5, color: C.textSub }}>No text was published with this product.</div>
            : q.error ? <div style={{ fontSize: 12.5, color: C.textSub }}>Couldn&apos;t load the text — the weather service didn&apos;t answer.</div>
            : !d ? <LoadingRows C={C} label="Loading…"/>
            : d.gone ? <div style={{ fontSize: 12.5, color: C.textSub }}>This product has expired or been replaced, so its text is no longer published.</div>
            : (
              <>
                {d.headline ? <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.45 }}>{d.headline}</div> : null}
                {d.areaDesc ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>{d.areaDesc}</div> : null}
                {d.description ? <div style={para}>{d.description}</div> : null}
                {d.instruction ? <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.textSub, marginBottom: 4 }}>What to do</div><div style={para}>{d.instruction}</div></div> : null}
              </>
            )}
          <a href={nwsPointPage(zone.pt)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: C.blue, textDecoration: "none", marginTop: 4 }}>Forecast and alerts for this area on weather.gov →</a>
        </div>
      </div>
    </div>
  );
}
