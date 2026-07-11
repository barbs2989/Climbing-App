// The DB-catalog area finder: state picker -> drill-down area pages -> Route
// finder / Near-me map / Objectives / "View all N routes". Deliberately mirrors
// the static catalog's AreaBrowse -> AreaView -> RouteFinder/OverviewMap chain
// (same layout, copy, and C-palette styling) so the two feel like one product —
// just fetched on demand from Supabase instead of walking the in-memory
// MOUNTAINS/ROUTES arrays, since the DB catalog (47k+ areas / 200k+ routes) is
// far too large to hold in memory. Rendered only when USE_DB is on.
import { useEffect, useMemo, useRef, useState } from "react";
import { useAreaChildren, useAreaRoutes, useAreaTopContributors, useStates, useSubtreeRoutes, useSubtreeRouteCount, useNearbyAreas, useScopedWishlistRoutes, fetchAreaBreadcrumb } from "./db";

const HERO_BG = "linear-gradient(160deg,#0a0e16,#142a47)";
const HERO_SHEEN = "inset 0 1px 0 rgba(255,255,255,0.07)";
const ATYPE = { world: "World", country: "Country", state: "State", range: "Range", canyon: "Canyon", peak: "Peak", crag: "Crag", region: "Region", wall: "Wall" };
const CHILD_NOUN = { crag: "Areas", peak: "Peaks", canyon: "Canyons", range: "Ranges", region: "Areas", wall: "Areas", state: "States", country: "Countries" };
const DISCIPLINES = [["", "All"], ["sport", "Sport"], ["trad", "Trad"], ["bouldering", "Boulder"], ["alpine", "Alpine"], ["ice", "Ice"], ["mountaineering", "Mtneering"], ["aid", "Aid"], ["scrambling", "Scramble"]];

function haversineMi(a, b) {
  const R = 3958.8, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}
function childNoun(children) {
  const types = [...new Set((children || []).map(c => c.area_type))];
  return (types.length === 1 && CHILD_NOUN[types[0]]) || "Areas";
}
const SL = ({ children, C }) => <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 18, marginBottom: 9 }}><span style={{ width: 3, height: 14, borderRadius: 2, background: C.blue, flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</span></div>;
const Pill = ({ label, color, bg, sm }) => <span style={{ background: bg, color, padding: sm ? "2px 7px" : "3px 10px", borderRadius: 20, fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>{label}</span>;
const backRow = (onBack, title, C) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <button onClick={onBack} style={{ background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "6px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{"← Back"}</button>
    <span style={{ color: C.text, fontSize: 16, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{title}</span>
  </div>
);

function DbTopContributors({ areaId, C, ActionIcon }) {
  const { data } = useAreaTopContributors(areaId, 3);
  if (!data || !data.length) return null;
  const medal = ["#d4af37", "#c0c0c0", "#cd7f32"];
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: "12px 14px", border: "1px solid " + C.border, marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 10 }}>TOP CONTRIBUTORS</div>
      {data.map((c, i) => (
        <div key={c.contributor} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: i ? 9 : 0 }}>
          <span style={{ width: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><ActionIcon name="award" size={15} color={medal[i]} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.contributor}</div>
            {i === 0 ? <span style={{ display: "inline-block", fontSize: 10.5, fontWeight: 700, color: C.amber, background: C.amberBg, padding: "1px 7px", borderRadius: 9, letterSpacing: 0.3, marginTop: 2 }}>{"★ Top Contributor"}</span> : null}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>{c.n}</span>
        </div>
      ))}
    </div>
  );
}

function RouteRow({ r, onOpen, C }) {
  const stars = r.stars ? Math.round(r.stars) : 0;
  const sub = [r.discipline ? r.discipline[0].toUpperCase() + r.discipline.slice(1) : null, r.sort_order != null ? "#" + r.sort_order + " on the cliff" : null].filter(Boolean).join(" · ");
  return (
    <div onClick={() => onOpen(r)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 11, cursor: "pointer" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
          {stars ? <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0 }}>{"★".repeat(stars)}</span> : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, fontWeight: 700 }}>{r.rock_grade || r.ice_grade || r.alpine_grade || r.grade || r.commitment || ""}</span>
    </div>
  );
}

// ── state picker: exact match for the static "Pick a state" AreaBrowse ──
function StatePicker({ onPick, C }) {
  const { data: states, isLoading, error } = useStates();
  return (
    <div style={{ marginBottom: 14 }}>
      <SL C={C}>Pick a state</SL>
      <select value="" onChange={e => { const s = (states || []).find(x => x.id === e.target.value); if (s) onPick(s); }} style={{ width: "100%", WebkitAppearance: "none", appearance: "none", background: C.card, color: C.text, border: "1px solid " + C.border, borderRadius: 12, padding: "13px 34px 13px 13px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
        <option value="">Select a state…</option>
        {(states || []).map(s => <option key={s.id} value={s.id}>{s.name + " · " + s.route_count + " climb" + (s.route_count !== 1 ? "s" : "")}</option>)}
      </select>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 9, lineHeight: 1.5 }}>Tap a state to drill in to its crags and climbs. Use a route or crag Route finder to filter and search by type, grade, stars and more.</div>
      {isLoading ? <div style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Loading states…</div> : null}
      {error ? <div style={{ color: C.red, fontSize: 12.5, marginTop: 8 }}>Couldn't load states — check your connection and try again.</div> : null}
    </div>
  );
}

// ── one area's own page: hero + save + View all/Near me/Route finder/Objectives + sub-areas ──
function AreaPage({ area, booked, onToggleSave, onDrill, onFinder, onNear, onObjectives, onOpenRoute, C, ActionIcon }) {
  const { data: children, isLoading: lc, error: ec } = useAreaChildren(area.id);
  const { data: routes, isLoading: lr, error: er } = useAreaRoutes(area.id);
  const isLeaf = Array.isArray(children) && children.length === 0;
  const loading = lc || (isLeaf && lr);
  const error = ec || er;
  const chips = [area.avy_zone].filter(Boolean);
  const noun = childNoun(children).toLowerCase();

  return (
    <div>
      <div style={{ background: HERO_BG, boxShadow: HERO_SHEEN, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 14, padding: 16, marginBottom: 14, position: "relative", border: "1px solid " + C.border }}>
        {area.area_type !== "country" && area.area_type !== "state" ? (
          <button onClick={onToggleSave} aria-label={booked ? "Remove from Saved Areas" : "Save this area"} style={{ position: "absolute", top: 13, right: 13, display: "flex", alignItems: "center", gap: 5, height: 34, padding: "0 12px", background: booked ? C.amber : "rgba(255,255,255,0.08)", border: "1px solid " + (booked ? C.amber : C.border), borderRadius: 9, fontSize: 12, fontWeight: 800, color: booked ? "#1a1200" : C.text, cursor: "pointer", lineHeight: 1, whiteSpace: "nowrap" }}>{booked ? "Saved" : "Save area"}</button>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap", paddingRight: 118 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{area.name}</div>
          <Pill label={ATYPE[area.area_type] || "Area"} color={C.blue} bg={C.blueBg} sm />
        </div>
        <div style={{ fontSize: 12, color: C.textSub }}>{area.region}{area.elevation_ft ? " · " + area.elevation_ft.toLocaleString() + " ft" : ""}</div>
        {chips.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{chips.map((t, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: C.text, background: "rgba(255,255,255,0.12)", border: "1px solid " + C.border, borderRadius: 7, padding: "3px 9px" }}>{t}</span>)}</div> : null}
        {area.blurb ? <div style={{ marginTop: 8, fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{area.blurb}</div> : null}
        <div style={{ fontSize: 13, color: C.blue, marginTop: 8 }}>{children && children.length ? children.length + " " + noun + " · " + area.route_count + " climbs" : area.route_count + " climb" + (area.route_count !== 1 ? "s" : "")}</div>
      </div>

      {area.route_count > 0 ? (
        <button onClick={onFinder} style={{ width: "100%", padding: 13, marginBottom: 8, borderRadius: 11, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {"View all " + area.route_count + " routes"}<span style={{ fontSize: 16 }}>{"→"}</span>
        </button>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={onNear} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Near me</button>
        <button onClick={onFinder} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.blue, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Route finder</button>
        <button onClick={onObjectives} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Objectives</button>
      </div>

      {loading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ color: C.red, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't load this area — check your connection and try again.</div>}

      {!loading && !error && children && children.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <SL C={C}>{childNoun(children)}</SL>
          {children.map(a => (
            <div key={a.id} onClick={() => onDrill(a)} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 11, border: "1px solid " + C.borderHi, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: a.blurb ? 5 : 0 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{a.name}</span>
                <span style={{ fontSize: 12, color: a.route_count > 0 ? C.blue : C.textMuted, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") + " →"}</span>
              </div>
              {a.blurb ? <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{a.blurb}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && isLeaf && (
        routes && routes.length > 0
          ? routes.map(r => <RouteRow key={r.id} r={r} onOpen={onOpenRoute} C={C} />)
          : <div style={{ color: C.textMuted, fontSize: 12 }}>No routes in this crag yet.</div>
      )}

      <DbTopContributors areaId={area.id} C={C} ActionIcon={ActionIcon} />
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
      {backRow(onBack, "Route finder" + (scope ? " · " + scope.name : ""), C)}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search routes…" style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 9 }}>
        {DISCIPLINES.map(([v, label]) => (
          <button key={v} onClick={() => setDisc(v)} style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 20, border: "1px solid " + (disc === v ? C.blue : C.border), background: disc === v ? C.blueBg : C.surface, color: disc === v ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, padding: "0 2px" }}>{(total != null ? total : all.length) + " route" + ((total != null ? total : all.length) !== 1 ? "s" : "") + " · sorted by name"}</div>
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search routes — check your connection and try again.</div>}
      {all.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {!isLoading && all.length > 0 && total != null && all.length < total && (
        <button onClick={() => setPage(p => p + 1)} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Load more</button>
      )}
      {!isLoading && !error && !all.length && <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "26px 12px" }}>No routes match these filters.</div>}
    </div>
  );
}

// ── Objectives: your wishlisted routes that fall within the current area ──
function ObjectivesPanel({ area, wishlist, onOpen, onBack, C }) {
  const { data, isLoading, error } = useScopedWishlistRoutes(area, wishlist);
  return (
    <div>
      {backRow(onBack, "My objectives" + (area ? " · " + area.name : ""), C)}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load your objectives — check your connection and try again.</div>}
      {!isLoading && !error && (!data || !data.length) && (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "26px 12px", lineHeight: 1.5 }}>No objectives here yet — open a climb and tap to add it to your objectives.</div>
      )}
      {(data || []).map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}
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
      {backRow(onBack, "Near me", C)}
      <button onClick={locate} disabled={locating} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: locating ? "default" : "pointer", marginBottom: 8 }}>{locating ? "Locating…" : "Use my location"}</button>
      {geoErr ? <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{geoErr}</div> : null}
      <div ref={mapDiv} style={{ width: "100%", height: 260, borderRadius: 12, overflow: "hidden", background: C.surface, marginBottom: 12 }} />
      {!center ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{'Tap "Use my location" to find climbs near you.'}</div> : null}
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

export default function DbAreaBrowser({ onOpenRoute, C, ActionIcon, bookmarks, onToggleBookmark, wishlist }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near" | "objectives"

  const current = stack.length ? stack[stack.length - 1] : stateNode;
  const crumbs = stateNode ? [stateNode, ...stack] : [];

  const jump = i => {
    setScreen("areas");
    if (i < 0) { setStateNode(null); setStack([]); return; }
    if (i === 0) { setStack([]); return; }
    setStack(crumbs.slice(1, i + 1));
  };
  const back = () => jump(crumbs.length - 2);
  const drill = a => { setScreen("areas"); setStack(s => [...s, a]); };
  const pickState = s => { setStateNode(s); setStack([]); setScreen("areas"); };
  const openFromNear = async a => {
    // Near-me pins can land anywhere in the country; rebuild the real state/region
    // breadcrumb from the area's own ltree path instead of just dropping in flat.
    setStateNode(a); setStack([]); setScreen("areas");
    const ancestors = await fetchAreaBreadcrumb(a).catch(() => []);
    const state = ancestors.find(x => x.area_type === "state");
    if (!state) return;
    setStateNode(state);
    setStack([...ancestors.filter(x => x.area_type !== "state"), a]);
  };

  return (
    <div>
      {crumbs.length ? (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, marginBottom: 12, background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 11px" }}>
          <button onClick={back} style={{ background: C.card, border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "5px 11px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", marginRight: 4 }}>{"← Back"}</button>
          {[null, ...crumbs].map((c, i) => {
            const last = i === crumbs.length;
            return (
              <span key={c ? c.id : "root"} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {i > 0 ? <span style={{ color: C.textSub, fontSize: 16, fontWeight: 700 }}>{"›"}</span> : null}
                {last
                  ? <span style={{ color: C.text, fontWeight: 800, fontSize: 15.5 }}>{c ? c.name : ""}</span>
                  : <button onClick={() => jump(c ? i - 1 : -1)} style={{ background: "transparent", border: "none", color: C.blue, fontSize: 15, cursor: "pointer", fontWeight: 700, padding: 0 }}>{c ? c.name : "All areas"}</button>}
              </span>
            );
          })}
        </div>
      ) : null}
      {!stateNode ? (
        <StatePicker onPick={pickState} C={C} />
      ) : screen === "finder" ? (
        <RouteFinderPanel scope={current} onOpen={onOpenRoute} onBack={() => setScreen("areas")} C={C} />
      ) : screen === "objectives" ? (
        <ObjectivesPanel area={current} wishlist={wishlist} onOpen={onOpenRoute} onBack={() => setScreen("areas")} C={C} />
      ) : screen === "near" ? (
        <NearMePanel center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} onBack={() => setScreen("areas")} onOpenArea={openFromNear} C={C} />
      ) : (
        <AreaPage area={current} booked={bookmarks.includes(current.id)} onToggleSave={() => onToggleBookmark(current.id)} onDrill={drill} onFinder={() => setScreen("finder")} onNear={() => setScreen("near")} onObjectives={() => setScreen("objectives")} onOpenRoute={onOpenRoute} C={C} ActionIcon={ActionIcon} />
      )}
    </div>
  );
}
