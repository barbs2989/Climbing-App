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
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadLeaflet, applyBaseLayer, BaseLayerToggle } from "./mapKit";
import { useActiveFires, useFirePerimeters, useFireWeather, fireColor, fireLevel, fmtAcres, fmtContained, fmtDiscovered, fmtEnds, fireDistMi, FIRE_SOURCES } from "./fire";

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

export default function FireMap({ onClose, C, ActionIcon, uDistMi = true, focus = null, locale = undefined }) {
  const mapDiv = useRef(null), mapRef = useRef(null), tileRef = useRef(null);
  const perimRef = useRef(null), wxRef = useRef(null), fireRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bbox, setBbox] = useState(null);
  const [baseLayer, setBaseLayer] = useState("topo");
  const [show, setShow] = useState({ fires: true, perims: true, wx: true });
  const [sel, setSel] = useState(null);

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
      const map = L.map(mapDiv.current, { attributionControl: false })
        .setView(focus ? [focus.lat, focus.lng] : [US.lat, US.lng], focus ? 9 : US.zoom);
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
      const color = z.kind === "warning" ? C.orange : C.amber;
      L.geoJSON(z.geometry, { style: { color, weight: 1.5, opacity: 0.75, dashArray: "5 4", fillColor: color, fillOpacity: 0.08 } })
        .bindTooltip(z.label + (fmtEnds(z.ends, locale) ? " " + fmtEnds(z.ends, locale) : ""), { sticky: true })
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

  const locate = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      p => { try { mapRef.current.setView([p.coords.latitude, p.coords.longitude], 9); } catch (e) {} },
      () => {}, { timeout: 8000 }
    );
  };

  // A warning covering the middle of the viewport is the one worth headlining;
  // a warning clipped by the corner of the map is not. No geometry test here —
  // just prefer warnings over watches and take the soonest to expire.
  const topZone = useMemo(() => {
    const w = zones.filter(z => z.kind === "warning");
    const pool = w.length ? w : zones;
    return pool.slice().sort((a, b) => (Date.parse(a.ends || 0) || 0) - (Date.parse(b.ends || 0) || 0))[0] || null;
  }, [zones]);

  const anyError = firesQ.error || perimQ.error || wxQ.error;
  const anyLoading = (show.fires && firesQ.isFetching) || (show.perims && perimQ.isFetching) || (show.wx && wxQ.isFetching);
  const truncated = (firesQ.data && firesQ.data.truncated) || (perimQ.data && perimQ.data.truncated);
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
        <button onClick={locate} aria-label="Centre on my location"
          style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.textSub, cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ActionIcon name="target" size={15} color={C.textSub} />
        </button>
        <button onClick={onClose} aria-label="Close fire map"
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
      </div>

      {/* headline fire-weather banner — the danger half, above the map so it is not
          something you have to go looking for */}
      {show.wx && topZone ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: topZone.kind === "warning" ? C.redBg : C.amberBg, borderBottom: "1px solid " + (topZone.kind === "warning" ? C.red : C.amber), flexShrink: 0 }}>
          <ActionIcon name="alert" size={15} color={topZone.kind === "warning" ? C.red : C.amber} />
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.45, color: C.text }}>
            <b>{topZone.label}</b>{zones.length > 1 ? " and " + (zones.length - 1) + " more" : ""} in view
            {/* Its own line rather than " · until 8PM" appended inline: at phone width
                the inline version wrapped and left the separator stranded on a line
                of its own. Same reason the source list below is one line per source. */}
            {fmtEnds(topZone.ends, locale) ? <div style={{ color: C.textSub }}>{fmtEnds(topZone.ends, locale)}</div> : null}
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

      {/* list + status */}
      <div style={{ flex: "1 1 40%", minHeight: 150, overflowY: "auto", borderTop: "1px solid " + C.border, background: C.bg }}>
        <div style={{ padding: "12px 14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={hd}>Fires in view</div>
              {anyLoading ? <span style={{ fontSize: 11, color: C.textMuted }}>updating…</span> : null}
            </div>
            {/* Says what the mileage on each row is measured from — "750 mi" with no
                stated reference is a number nobody can act on. */}
            {ref && fires.length ? <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>Distances {refLabel}</div> : null}
          </div>

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
              Too many fires to draw at this zoom — showing the largest. Zoom in for the full picture.
            </div>
          ) : null}

          {/* The one honest empty state: the query came back, and it came back empty. */}
          {!anyError && firesQ.data && fires.length === 0 ? (
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
          {fires.length > LIST_CAP ? (
            <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5 }}>
              Showing the {LIST_CAP} largest of {fires.length} in view. All {fires.length} are on the map — zoom in to narrow the list.
            </div>
          ) : null}

          {fires.slice(0, LIST_CAP).map(f => {
            const open = sel === f.id, color = fireColor(f, C), mi = ref ? fireDistMi(ref.lat, ref.lng, f.lat, f.lng) : null;
            return (
              <button key={f.id} onClick={() => flyTo(f)}
                style={{ textAlign: "left", border: "1px solid " + (open ? color : C.border), background: open ? C.card : C.surface, borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  {mi != null && mi >= 1 ? <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{uDistMi ? Math.round(mi) + " mi" : Math.round(mi * 1.609) + " km"}</span> : null}
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
