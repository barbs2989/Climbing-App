// The DB-catalog area finder: state picker -> drill-down area pages (mirrors the
// static catalog's AreaBrowse -> AreaView chain) -> Route finder / Near-me map /
// "View all N routes", all fetched on demand from Supabase instead of walking the
// in-memory MOUNTAINS/ROUTES arrays (the DB catalog is 47k+ areas / 200k+ routes,
// far too large to hold in memory). Rendered only when USE_DB is on.
import { useEffect, useMemo, useRef, useState } from "react";
import { useAreaChildren, useAreaRoutes, useAreaTopContributors, useStates, useSubtreeRoutes, useSubtreeRouteCount, useNearbyAreas, fetchAreaBreadcrumb } from "./db";

const DISCIPLINES = [["", "All"], ["sport", "Sport"], ["trad", "Trad"], ["bouldering", "Boulder"], ["alpine", "Alpine"], ["ice", "Ice"], ["mountaineering", "Mtneering"], ["aid", "Aid"], ["scrambling", "Scramble"]];

function haversineMi(a, b) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function Breadcrumb({ path, onJump, C }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10, fontSize: 13 }}>
      <button onClick={() => onJump(-1)} style={{ background: "none", border: "none", color: path.length ? C.blue : C.text, fontWeight: 700, cursor: "pointer", padding: 0 }}>All areas</button>
      {path.map((a, i) => (
        <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: C.textMuted }}>{"›"}</span>
          <button onClick={() => onJump(i)} style={{ background: "none", border: "none", color: i === path.length - 1 ? C.text : C.blue, fontWeight: 700, cursor: "pointer", padding: 0 }}>{a.name}</button>
        </span>
      ))}
    </div>
  );
}

function DbTopContributors({ areaId, C }) {
  const { data } = useAreaTopContributors(areaId, 3);
  if (!data || !data.length) return null;
  const medal = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "8px 10px", marginTop: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5, color: C.blue, textTransform: "uppercase", marginBottom: 6 }}>Top Contributors</div>
      {data.map((c, i) => (
        <div key={c.contributor} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: i ? 5 : 0 }}>
          <span style={{ width: 16, textAlign: "center", fontSize: 12 }}>{medal[i]}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.contributor}</span>
          {i === 0 ? <span style={{ fontSize: 9.5, fontWeight: 700, color: C.amber, background: C.amberBg, padding: "1px 6px", borderRadius: 8 }}>{"★ Top Contributor"}</span> : null}
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>{c.n}</span>
        </div>
      ))}
    </div>
  );
}

function RouteRow({ r, onOpen, C }) {
  return (
    <div onClick={() => onOpen(r)} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{r.name}</span>
        <span style={{ color: C.textMuted, fontSize: 12 }}>{r.rock_grade || r.ice_grade || r.alpine_grade || r.grade || r.commitment || ""}</span>
      </div>
      <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{r.discipline}{r.sort_order != null ? " · #" + r.sort_order + " on the cliff" : ""}</div>
    </div>
  );
}

// ── state picker: DB-catalog equivalent of the static "Pick a state" AreaBrowse ──
function StatePicker({ onPick, C }) {
  const { data: states, isLoading, error } = useStates();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    if (!states) return [];
    const t = q.trim().toLowerCase();
    return t ? states.filter(s => s.name.toLowerCase().includes(t)) : states;
  }, [states, q]);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: C.blue, textTransform: "uppercase", marginBottom: 8 }}>Explore by area</div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search states…" style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", marginBottom: 10 }} />
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading states…</div>}
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load states — check your connection and try again.</div>}
      {!isLoading && !error && shown.map(s => (
        <div key={s.id} onClick={() => onPick(s)} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{s.name}</span>
          <span style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}>{s.route_count + " climb" + (s.route_count !== 1 ? "s" : "") + " ›"}</span>
        </div>
      ))}
      {!isLoading && !error && !shown.length && <div style={{ color: C.textMuted, fontSize: 12.5 }}>{'No states match "' + q + '".'}</div>}
    </div>
  );
}

// ── one area's own page: children grid (or leaf routes) + View all / Route finder / Near me ──
function AreaPage({ area, onDrill, onFinder, onNear, onOpenRoute, C }) {
  const { data: children, isLoading: lc, error: ec } = useAreaChildren(area.id);
  const { data: routes, isLoading: lr, error: er } = useAreaRoutes(area.id);
  const isLeaf = Array.isArray(children) && children.length === 0;
  const loading = lc || (isLeaf && lr);
  const error = ec || er;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{area.name}</div>
        {area.blurb ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>{area.blurb}</div> : null}
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{area.route_count} climb{area.route_count !== 1 ? "s" : ""}{area.elevation_ft ? " · " + area.elevation_ft.toLocaleString() + " ft" : ""}</div>
      </div>

      {area.route_count > 0 ? (
        <button onClick={onFinder} style={{ width: "100%", padding: 13, marginBottom: 8, borderRadius: 11, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {"View all " + area.route_count + " routes"}<span style={{ fontSize: 16 }}>{"→"}</span>
        </button>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={onNear} style={{ flex: 1, padding: "12px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Near me</button>
        <button onClick={onFinder} style={{ flex: 1, padding: "12px 6px", borderRadius: 11, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.blue, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Route finder</button>
      </div>

      {loading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ color: C.red, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't load this area — check your connection and try again.</div>}

      {!loading && !error && children && children.length > 0 && children.map(a => (
        <div key={a.id} onClick={() => onDrill(a)} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{a.name}</span>
          <span style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}>{a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") + " ›"}</span>
        </div>
      ))}

      {!loading && !error && isLeaf && (
        routes && routes.length > 0
          ? routes.map(r => <RouteRow key={r.id} r={r} onOpen={onOpenRoute} C={C} />)
          : <div style={{ color: C.textMuted, fontSize: 12 }}>No routes in this crag yet.</div>
      )}

      <DbTopContributors areaId={area.id} C={C} />
    </div>
  );
}

// ── Route finder: search + discipline filter, paged via routes_in_subtree (0015) ──
function RouteFinderPanel({ scope, onOpen, onBack, C }) {
  const [q, setQ] = useState("");
  const [disc, setDisc] = useState("");
  const [page, setPage] = useState(0);
  const [all, setAll] = useState([]);
  const { data: batch, isLoading, error } = useSubtreeRoutes(scope.id, { q, disc, page });
  const { data: total } = useSubtreeRouteCount(scope.id, { q, disc });

  useEffect(() => { setPage(0); setAll([]); }, [q, disc, scope.id]);
  useEffect(() => {
    if (!batch) return;
    setAll(prev => page === 0 ? batch : [...prev, ...batch]);
  }, [batch, page]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "6px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
        <span style={{ color: C.text, fontSize: 16, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{"Route finder · " + scope.name}</span>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search routes…" style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>
        {DISCIPLINES.map(([v, label]) => (
          <button key={v} onClick={() => setDisc(v)} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 20, border: "1px solid " + (disc === v ? C.blue : C.border), background: disc === v ? C.blueBg : C.surface, color: disc === v ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      {total != null ? <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>{total} route{total !== 1 ? "s" : ""}</div> : null}
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search routes — check your connection and try again.</div>}
      {all.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {!isLoading && all.length > 0 && total != null && all.length < total && (
        <button onClick={() => setPage(p => p + 1)} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Load more</button>
      )}
      {!isLoading && !error && !all.length && <div style={{ color: C.textMuted, fontSize: 12.5 }}>No routes match your search.</div>}
    </div>
  );
}

// ── Near me: real Leaflet map (same CDN as the static OverviewMap), geolocated,
// pins from useNearbyAreas (a lat/lng box query, no PostGIS needed at this scale) ──
function NearMePanel({ center0, onBack, onOpenArea, C }) {
  const mapDiv = useRef(null), mapRef = useRef(null), markRef = useRef(null), userRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [center, setCenter] = useState(center0 || null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const { data: nearby, isLoading, error } = useNearbyAreas(center);

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L;
      const map = L.map(mapDiv.current, { attributionControl: false }).setView(center ? [center.lat, center.lng] : [39.5, -98.5], center ? 10 : 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      markRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 150);
    };
    if (window.L) { init(); }
    else {
      if (!document.getElementById("leaflet-css")) { const lk = document.createElement("link"); lk.id = "leaflet-css"; lk.rel = "stylesheet"; lk.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(lk); }
      let sc = document.getElementById("leaflet-js");
      if (!sc) { sc = document.createElement("script"); sc.id = "leaflet-js"; sc.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; sc.onload = init; document.body.appendChild(sc); }
      else sc.addEventListener("load", init);
    }
    return () => { cancelled = true; if (mapRef.current) { try { mapRef.current.remove(); } catch (e) {} mapRef.current = null; markRef.current = null; userRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!ready || !nearby) return;
    const L = window.L, map = mapRef.current, grp = markRef.current;
    if (!L || !map || !grp) return;
    grp.clearLayers();
    nearby.forEach(a => {
      if (a.lat == null || a.lng == null) return;
      const mk = L.circleMarker([a.lat, a.lng], { radius: 7, color: "#ffffff", weight: 2, fillColor: C.blue, fillOpacity: 0.9 });
      mk.bindTooltip(a.name + " · " + a.route_count + " climb" + (a.route_count !== 1 ? "s" : ""), { direction: "top" });
      mk.on("click", () => onOpenArea(a));
      grp.addLayer(mk);
    });
  }, [ready, nearby]);

  const locate = () => {
    if (!navigator.geolocation) { setGeoErr("Location isn't available on this device."); return; }
    setLocating(true); setGeoErr("");
    navigator.geolocation.getCurrentPosition(pos => {
      setLocating(false);
      const la = pos.coords.latitude, ln = pos.coords.longitude;
      setCenter({ lat: la, lng: ln });
      const L = window.L, map = mapRef.current;
      if (L && map) {
        if (userRef.current) userRef.current.setLatLng([la, ln]);
        else userRef.current = L.circleMarker([la, ln], { radius: 7, color: "#ffffff", weight: 3, fillColor: C.green, fillOpacity: 1 }).addTo(map).bindTooltip("You are here", { direction: "top" });
        map.setView([la, ln], 10);
      }
    }, err => {
      setLocating(false);
      setGeoErr(err && err.code === 1 ? "Location permission denied — enable it to see climbs near you." : "Couldn't get your location right now.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  const sorted = useMemo(() => {
    if (!nearby) return [];
    const withDist = center ? nearby.map(a => ({ ...a, _mi: haversineMi(center, a) })) : nearby.map(a => ({ ...a, _mi: null }));
    return withDist.sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9)).slice(0, 60);
  }, [nearby, center]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "6px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
        <span style={{ color: C.text, fontSize: 16, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>Near me</span>
      </div>
      <button onClick={locate} disabled={locating} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: locating ? "default" : "pointer", marginBottom: 8 }}>{locating ? "Locating…" : "Use my location"}</button>
      {geoErr ? <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{geoErr}</div> : null}
      <div ref={mapDiv} style={{ width: "100%", height: 260, borderRadius: 12, overflow: "hidden", background: C.surface, marginBottom: 12 }} />
      {!center ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>Tap "Use my location" to find climbs near you.</div> : null}
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load nearby areas — check your connection and try again.</div>}
      {isLoading && center ? <div style={{ color: C.textMuted, fontSize: 12 }}>Loading nearby climbs…</div> : null}
      {sorted.map(a => (
        <div key={a.id} onClick={() => onOpenArea(a)} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{a.name}</span>
          <span style={{ color: C.textMuted, fontSize: 12 }}>{a._mi != null ? a._mi.toFixed(1) + " mi · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
        </div>
      ))}
      {!isLoading && center && !sorted.length && !error ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>No climbs found within range — try a bigger area.</div> : null}
    </div>
  );
}

export default function DbAreaBrowser({ onOpenRoute, C }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near"

  const current = stack.length ? stack[stack.length - 1] : stateNode;
  const crumbs = stateNode ? [stateNode, ...stack] : [];

  const jump = i => {
    setScreen("areas");
    if (i < 0) { setStateNode(null); setStack([]); return; }
    if (i === 0) { setStack([]); return; }
    setStack(crumbs.slice(1, i + 1));
  };
  const drill = a => { setScreen("areas"); setStack(s => [...s, a]); };
  const pickState = s => { setStateNode(s); setStack([]); setScreen("areas"); };
  const openFromNear = async a => {
    // Near-me pins can land anywhere in the country — rebuild the real state/region
    // breadcrumb from the area's own ltree path instead of just dropping in flat.
    setStateNode(a); setStack([]); setScreen("areas");
    const ancestors = await fetchAreaBreadcrumb(a).catch(() => []);
    const state = ancestors.find(x => x.area_type === "state");
    if (!state) return;
    setStateNode(state);
    setStack([...ancestors.filter(x => x.area_type !== "state"), a]);
  };

  return (
    <div style={{ border: "1px solid " + C.blue, borderRadius: 14, padding: 12, marginBottom: 14, background: C.blueBg }}>
      <Breadcrumb path={crumbs} onJump={jump} C={C} />
      {!stateNode ? (
        <StatePicker onPick={pickState} C={C} />
      ) : screen === "finder" ? (
        <RouteFinderPanel scope={current} onOpen={onOpenRoute} onBack={() => setScreen("areas")} C={C} />
      ) : screen === "near" ? (
        <NearMePanel center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} onBack={() => setScreen("areas")} onOpenArea={openFromNear} C={C} />
      ) : (
        <AreaPage area={current} onDrill={drill} onFinder={() => setScreen("finder")} onNear={() => setScreen("near")} onOpenRoute={onOpenRoute} C={C} />
      )}
    </div>
  );
}
