// The DB-catalog area finder: state picker -> drill-down area pages -> Route
// finder / Near-me map / Objectives / "View all N routes". Deliberately mirrors
// the static catalog's AreaBrowse -> AreaView -> RouteFinder/OverviewMap chain
// (same layout, copy, and C-palette styling) so the two feel like one product —
// just fetched on demand from Supabase instead of walking the in-memory
// MOUNTAINS/ROUTES arrays, since the DB catalog (47k+ areas / 200k+ routes) is
// far too large to hold in memory. Rendered only when USE_DB is on.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAreaChildren, useAreaRoutes, useAreaTopContributors, useStates, useSubtreeRoutes, useSubtreeRouteCount, useNearbyAreas, useScopedWishlistRoutes, useAreaSearch, fetchAreaBreadcrumb } from "./db";

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

// ── in-page area/route search — the DB-catalog equivalent of the static
// catalog's SearchSplit, embedded on any non-leaf area page so you can jump
// straight to a sub-area or route anywhere in this subtree instead of
// drilling down one level at a time. Area hits can be at any depth, so they
// navigate via onJumpToArea (rebuilds the real breadcrumb from the area's
// path) rather than onDrill (which assumes a direct child). ──
function DbSearchSplit({ scope, onJumpToArea, onOpenRoute, C }) {
  const [mode, setMode] = useState("areas");
  const [q, setQ] = useState("");
  const qq = q.trim();
  const { data: areaHits, isLoading: la, error: ea } = useAreaSearch(scope.id, qq);
  const { data: routeHits, isLoading: lr, error: er } = useSubtreeRoutes(scope.id, { q: qq, page: 0, pageSize: 40 });
  const tab = on => ({ flex: 1, padding: "7px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 7, background: on ? C.blue : "transparent", color: on ? "#fff" : C.textSub });
  const row = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", cursor: "pointer", borderBottom: "1px solid " + C.borderLight };
  return (
    <div style={{ marginBottom: 14 }}>
      <SL C={C}>{"Search " + scope.name}</SL>
      <div style={{ display: "flex", gap: 4, background: C.surface, border: "1px solid " + C.border, borderRadius: 9, padding: 3, marginBottom: 8 }}>
        <div onClick={() => setMode("areas")} style={tab(mode === "areas")}>Areas</div>
        <div onClick={() => setMode("routes")} style={tab(mode === "routes")}>Routes</div>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
      {qq ? (
        <div style={{ marginTop: 6, maxHeight: "46vh", overflowY: "auto" }}>
          {mode === "areas" ? (
            la ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>Loading…</div>
            : ea ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search areas.</div>
            : !areaHits || !areaHits.length ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>No areas match.</div>
            : areaHits.map(a => (
              <div key={a.id} onClick={() => onJumpToArea(a)} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(ATYPE[a.area_type] || a.area_type) + (a.parent_name ? " · " + a.parent_name : "")}</div>
                </div>
                {a.route_count > 0 ? <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{a.route_count}</span> : null}
              </div>
            ))
          ) : (
            lr ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>Loading…</div>
            : er ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search routes.</div>
            : !routeHits || !routeHits.length ? <div style={{ fontSize: 13, color: C.textMuted, padding: "14px 4px", textAlign: "center" }}>No routes match.</div>
            : routeHits.map(r => (
              <div key={r.id} onClick={() => onOpenRoute(r)} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                </div>
                <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{r.rock_grade || r.ice_grade || r.alpine_grade || r.grade || r.commitment || ""}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── one area's own page: hero + save + View all/Near me/Route finder/Objectives + sub-areas ──
function AreaPage({ area, booked, onToggleSave, onDrill, onFinder, onNear, onObjectives, onAllAreas, onOpenRoute, onJumpToArea, C, ActionIcon }) {
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
        <button onClick={onNear} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>View map</button>
        <button onClick={onFinder} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.blue, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Route finder</button>
        <button onClick={onObjectives} style={{ flex: 1, padding: "14px 6px", borderRadius: 11, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Objectives</button>
      </div>
      <button onClick={onAllAreas} style={{ width: "100%", padding: 15, borderRadius: 11, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 14 }}>All areas</button>

      {!loading && !error && isLeaf === false ? <DbSearchSplit scope={area} onJumpToArea={onJumpToArea} onOpenRoute={onOpenRoute} C={C} /> : null}

      {loading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {error && <div style={{ color: C.red, fontSize: 12.5, lineHeight: 1.5 }}>Couldn't load this area — check your connection and try again.</div>}

      {!loading && !error && children && children.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <SL C={C}>{childNoun(children)}</SL>
          {children.map(a => (
            <div key={a.id} onClick={() => onDrill(a)} style={{ background: C.card, borderRadius: 12, padding: "12px 14px", marginBottom: 11, border: "1px solid " + C.borderHi, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{a.name}</span>
                <span style={{ fontSize: 12, color: a.route_count > 0 ? C.blue : C.textMuted, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") + " →"}</span>
              </div>
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

// ── Route finder: search + Filters sheet (discipline, sort, stars, pitches,
// length), paged via routes_in_subtree (0015; filters added in 0018). Grade
// range is deliberately NOT offered here: grade_num is only comparable
// within a single grading system (a YDS 5.9 and a V9 boulder problem both
// have grade_num≈9 but mean nothing alike), and for alpine routes the
// static catalog's own display grades ("Grade I", "Class 3") don't match
// the import pipeline's grade_num parser, so a range filter there could
// silently exclude routes it shouldn't. Sorting by grade still works safely
// since unparsed routes just sort last, so it's offered once a single
// discipline is picked (where the comparison is at least meaningful). ──
const LEN_BUCKETS = [["any", "Any", null, null], ["u200", "< 200 ft", null, 61], ["200", "200–600 ft", 61, 183], ["600", "600–1500 ft", 183, 457], ["1500", "1500+ ft", 457, null]];
function RouteFinderPanel({ scope, onOpen, onBack, C }) {
  const DEF = { disc: "", sortBy: "name", minStars: 0, minPitches: 0, len: "any" };
  const [q, setQ] = useState("");
  const [af, setAf] = useState(DEF);
  const [df, setDf] = useState(DEF);
  const [sheet, setSheet] = useState(false);
  const [page, setPage] = useState(0);
  const [all, setAll] = useState([]);
  const lenRange = (LEN_BUCKETS.find(l => l[0] === af.len) || LEN_BUCKETS[0]);
  const queryArgs = { q, disc: af.disc, minStars: af.minStars || null, minPitches: af.minPitches || null, minLengthM: lenRange[2], maxLengthM: lenRange[3], sortBy: af.sortBy, page };
  const { data: batch, isLoading, error } = useSubtreeRoutes(scope.id, queryArgs);
  const { data: total } = useSubtreeRouteCount(scope.id, queryArgs);

  useEffect(() => { setPage(0); setAll([]); }, [q, af, scope.id]);
  useEffect(() => {
    if (!batch) return;
    setAll(prev => page === 0 ? batch : [...prev, ...batch]);
  }, [batch, page]);

  const nF = (af.disc ? 1 : 0) + (af.minStars ? 1 : 0) + (af.minPitches ? 1 : 0) + (af.len !== "any" ? 1 : 0) + (af.sortBy !== "name" ? 1 : 0);
  const afChips = [];
  if (af.disc) afChips.push({ k: "d", label: (DISCIPLINES.find(d => d[0] === af.disc) || [, af.disc])[1], clear: () => setAf(a => ({ ...a, disc: "", sortBy: a.sortBy === "grade_asc" || a.sortBy === "grade_desc" ? "name" : a.sortBy })) });
  if (af.minStars) afChips.push({ k: "s", label: af.minStars + "★+", clear: () => setAf(a => ({ ...a, minStars: 0 })) });
  if (af.minPitches) afChips.push({ k: "p", label: af.minPitches + "+ pitches", clear: () => setAf(a => ({ ...a, minPitches: 0 })) });
  if (af.len !== "any") afChips.push({ k: "len", label: lenRange[1], clear: () => setAf(a => ({ ...a, len: "any" })) });
  if (af.sortBy !== "name") afChips.push({ k: "sort", label: { name_desc: "Z→A", grade_asc: "↓ Easiest", grade_desc: "↑ Hardest", stars_desc: "Most starred" }[af.sortBy], clear: () => setAf(a => ({ ...a, sortBy: "name" })) });

  const chip = (label, on, fn) => <button key={label} onClick={fn} style={{ padding: "7px 12px", borderRadius: 20, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>;
  const lab = s => <div style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, margin: "20px 0 8px", borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{s}</div>;

  return (
    <div>
      {backRow(onBack, "Route finder" + (scope ? " · " + scope.name : ""), C)}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search routes…" style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 8 }} />
      <button onClick={() => { setDf(af); setSheet(true); }} style={{ width: "100%", padding: 13, borderRadius: 10, border: "1px solid " + (nF ? C.blue : C.border), background: nF ? C.blueBg : C.surface, color: nF ? C.blue : C.text, fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 10 }}>{"Filters" + (nF ? " (" + nF + ")" : "")}</button>
      {afChips.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 9 }}>
          {afChips.map(c => <button key={c.k} onClick={c.clear} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px 7px 12px", borderRadius: 16, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c.label}<span style={{ opacity: 0.7 }}>✕</span></button>)}
          <button onClick={() => setAf(DEF)} style={{ padding: "5px 8px", background: "none", border: "none", color: C.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Clear all</button>
        </div>
      ) : null}
      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8, padding: "0 2px" }}>{(total != null ? total : all.length) + " route" + ((total != null ? total : all.length) !== 1 ? "s" : "") + " · sorted by " + ({ name: "name", name_desc: "name (Z→A)", grade_asc: "easiest", grade_desc: "hardest", stars_desc: "most starred" }[af.sortBy])}</div>
      {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't search routes — check your connection and try again.</div>}
      {all.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}
      {isLoading && <div style={{ color: C.textMuted, fontSize: 12 }}>Loading…</div>}
      {!isLoading && all.length > 0 && total != null && all.length < total && (
        <button onClick={() => setPage(p => p + 1)} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>Load more</button>
      )}
      {!isLoading && !error && !all.length && <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "26px 12px" }}>No routes match these filters.</div>}

      {sheet ? (
        <div onClick={() => setSheet(false)} role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", maxWidth: 440, borderRadius: "16px 16px 0 0", padding: "16px 16px 18px", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Filter routes</div>
              <button onClick={() => setSheet(false)} aria-label="Close" style={{ background: C.borderLight, border: "none", color: C.textSub, borderRadius: 8, width: 34, height: 34, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            {lab("Discipline")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {DISCIPLINES.filter(d => d[0]).map(d => chip(d[1], df.disc === d[0], () => setDf(x => ({ ...x, disc: x.disc === d[0] ? "" : d[0], sortBy: (x.sortBy === "grade_asc" || x.sortBy === "grade_desc") && x.disc === d[0] ? "name" : x.sortBy }))))}
            </div>
            {lab("Sort by")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {[["name", "Name A→Z"], ["name_desc", "Name Z→A"], ["stars_desc", "Most starred"]].map(o => chip(o[1], df.sortBy === o[0], () => setDf(d => ({ ...d, sortBy: o[0] }))))}
              {df.disc ? [["grade_asc", "↓ Easiest"], ["grade_desc", "↑ Hardest"]].map(o => chip(o[1], df.sortBy === o[0], () => setDf(d => ({ ...d, sortBy: o[0] })))) : null}
            </div>
            {!df.disc ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>Pick a discipline above to sort by grade — grades aren't comparable across climbing types.</div> : null}
            {lab("Minimum stars")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[[0, "Any"], [2, "★★+"], [3, "★★★+"], [4, "★★★★+"]].map(o => chip(o[1], df.minStars === o[0], () => setDf(d => ({ ...d, minStars: o[0] }))))}</div>
            {lab("Pitches")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[[0, "Any"], [1, "1+ (single)"], [2, "2+ (multi-pitch)"], [3, "3+"], [5, "5+"], [10, "10+"]].map(o => chip(o[1], df.minPitches === o[0], () => setDf(d => ({ ...d, minPitches: o[0] }))))}</div>
            {lab("Length")}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{LEN_BUCKETS.map(o => chip(o[1], df.len === o[0], () => setDf(d => ({ ...d, len: o[0] }))))}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setDf(DEF)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Clear all</button>
              <button onClick={() => { setAf(df); setSheet(false); }} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: C.blue, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Show routes</button>
            </div>
          </div>
        </div>
      ) : null}
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
// pins from useNearbyAreas driven by the LIVE map viewport — panning/zooming
// re-fetches (mirrors the static OverviewMap's moveend/zoomend re-render), so
// the map never gets stuck showing only what was near the very first center. ──
function NearMePanel({ center0, onBack, onOpenArea, C }) {
  const mapDiv = useRef(null), mapRef = useRef(null), markRef = useRef(null), userRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [center, setCenter] = useState(center0 || null);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  // Full screen just resizes the same Leaflet instance in place (same map div,
  // same markers, same zoom/pan) rather than tearing it down and rebuilding it
  // elsewhere — collapsing back drops you exactly where you were, no reload.
  useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => { try { mapRef.current.invalidateSize(); } catch (e) {} }, 220);
    return () => clearTimeout(t);
  }, [fullscreen]);
  const { data, isLoading, error } = useNearbyAreas(bounds);
  const nearby = data && data.rows;

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
      const map = L.map(mapDiv.current, { attributionControl: false }).setView(center ? [center.lat, center.lng] : [39.5, -98.5], center ? 10 : 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      markRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      map.on("moveend", () => readBounds(map));
      setTimeout(() => { try { map.invalidateSize(); readBounds(map); } catch (e) {} }, 150);
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
    const CLUSTER_PX = 44;
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
        const safeName = (a.name || "").replace(/[<>&]/g, "");
        const html = "<div style='display:flex;align-items:center;gap:5px;transform:translate(-3px,-3px)'>" +
          "<div style='width:12px;height:12px;border-radius:50%;background:" + C.blue + ";border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.5);flex-shrink:0'></div>" +
          "<div style='background:rgba(13,17,23,0.88);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;box-shadow:0 1px 3px rgba(0,0,0,0.45)'>" + safeName + "</div>" +
          "</div>";
        const mk = L.marker([a.lat, a.lng], { icon: L.divIcon({ html, className: "", iconSize: [166, 20], iconAnchor: [6, 10] }) });
        mk.bindTooltip(a.name + " · " + a.route_count + " climb" + (a.route_count !== 1 ? "s" : ""), { direction: "top" });
        mk.on("click", () => onOpenArea(a));
        grp.addLayer(mk);
      } else {
        const areas = group.map(g => g.a);
        const n = areas.length;
        const climbs = areas.reduce((s, a) => s + (a.route_count || 0), 0);
        const avgLat = areas.reduce((s, a) => s + a.lat, 0) / n, avgLng = areas.reduce((s, a) => s + a.lng, 0) / n;
        const sz = Math.min(22 + n, 44);
        const html = "<div style='width:" + sz + "px;height:" + sz + "px;border-radius:50%;background:" + C.blue + ";border:2px solid #fff;color:#fff;font-weight:700;font-size:" + (n > 99 ? 10 : 12) + "px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.55);'>" + n + "</div>";
        const mk = L.marker([avgLat, avgLng], { icon: L.divIcon({ html, className: "", iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }) });
        mk.bindTooltip(n + " areas · " + climbs + " climbs — tap to zoom in", { direction: "top" });
        mk.on("click", () => {
          try { map.fitBounds(L.latLngBounds(areas.map(a => [a.lat, a.lng])), { padding: [50, 50], maxZoom: 15 }); } catch (e) {}
        });
        grp.addLayer(mk);
      }
    }
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
        setTimeout(() => readBounds(map), 350); // after the pan/zoom animation settles
      }
    }, err => {
      setLocating(false);
      setGeoErr(err && err.code === 1 ? "Location permission denied — enable it to see climbs near you." : "Couldn't get your location right now.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };

  // Sort the list by distance from the CURRENT viewport center, not the fixed
  // point the map opened at — otherwise, once you've panned somewhere else, the
  // "closest" areas at the top of the list stop matching what's actually
  // showing on screen, which reads as broken.
  const viewCenter = bounds ? { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 } : center;
  const sorted = useMemo(() => {
    if (!nearby) return [];
    const withDist = viewCenter ? nearby.map(a => ({ ...a, _mi: haversineMi(viewCenter, a) })) : nearby.map(a => ({ ...a, _mi: null }));
    return withDist.sort((a, b) => (a._mi ?? 1e9) - (b._mi ?? 1e9)).slice(0, 60);
  }, [nearby, bounds, center]);

  return (
    <div>
      {!fullscreen ? backRow(onBack, "View map", C) : null}
      {!fullscreen ? (
        <>
          <button onClick={locate} disabled={locating} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: locating ? "default" : "pointer", marginBottom: 8 }}>{locating ? "Locating…" : "Use my location"}</button>
          {geoErr ? <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{geoErr}</div> : null}
        </>
      ) : null}
      <div style={{ position: "relative", marginBottom: fullscreen ? 0 : 8 }}>
        <div ref={mapDiv} style={{ width: "100%", height: fullscreen ? "calc(100vh - 210px)" : 260, borderRadius: fullscreen ? 0 : 12, overflow: "hidden", background: C.surface, transition: "height 0.2s" }} />
        <button onClick={() => setFullscreen(f => !f)} aria-label={fullscreen ? "Exit full screen" : "Full screen"} style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "rgba(13,17,23,0.85)", border: "1px solid " + C.border, color: C.text, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{fullscreen ? "✕ Exit full screen" : "⤢ Full screen"}</button>
      </div>
      {!fullscreen ? (
        <>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>Pan or zoom the map to see areas anywhere else.</div>
          {!center && !bounds ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{'Tap "Use my location" to find climbs near you.'}</div> : null}
          {error && <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load nearby areas — check your connection and try again.</div>}
          {isLoading && bounds ? <div style={{ color: C.textMuted, fontSize: 12 }}>Loading nearby climbs…</div> : null}
          {data && data.total != null && data.total > sorted.length ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing the busiest " + sorted.length + " of " + data.total + " areas in view — zoom in to see more."}</div> : null}
          {sorted.map(a => (
            <div key={a.id} onClick={() => onOpenArea(a)} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{a.name}</span>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{a._mi != null ? a._mi.toFixed(1) + " mi · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {!isLoading && bounds && !sorted.length && !error ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>No climbs in view — pan or zoom out to see more.</div> : null}
        </>
      ) : null}
    </div>
  );
}

// ── All areas: full-screen expandable tree, DB-catalog equivalent of the static
// AreaTree. Only WA's hierarchy is deep enough to matter here, and even a single
// state can run to thousands of areas, so unlike the static version (which
// preloads and expands the whole subtree from the in-memory MOUNTAINS array)
// this fetches each node's children only once it's actually expanded. ──
function DbAreaTreeNode({ area, depth, currentId, expanded, onToggle, onNavigate, C }) {
  const isOpen = expanded.has(area.id);
  const { data: children, isLoading } = useAreaChildren(area.id, { enabled: isOpen });
  const cur = area.id === currentId;
  const n = area.route_count;
  const pad = 14 + depth * 22;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px 12px " + pad + "px", borderBottom: "1px solid " + C.borderLight, background: cur ? C.blueBg : "transparent" }}>
        <button onClick={() => onToggle(area.id)} aria-label={isOpen ? "Collapse" : "Expand"} style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, border: "1.5px solid " + C.blue, background: C.blueBg, color: C.blue, fontSize: 18, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isOpen ? "▾" : "▸"}</button>
        <button onClick={() => onNavigate(area)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
          <div style={{ fontSize: 14.5, fontWeight: cur ? 800 : 700, color: cur ? C.blue : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{area.name}{cur ? <span style={{ marginLeft: 7, fontSize: 10, fontWeight: 800, color: C.blue, background: C.bg, border: "1px solid " + C.blueDim, borderRadius: 20, padding: "1px 7px" }}>You are here</span> : null}</div>
        </button>
        {n > 0 ? <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: C.textSub, background: C.surface, border: "1px solid " + C.border, borderRadius: 20, padding: "2px 9px" }}>{n}</span> : null}
        <span onClick={() => onNavigate(area)} style={{ flexShrink: 0, color: C.textMuted, fontSize: 16, cursor: "pointer", padding: "0 2px" }}>{"›"}</span>
      </div>
      {isOpen ? (
        isLoading
          ? <div style={{ padding: "10px 14px 10px " + (pad + 22) + "px", color: C.textMuted, fontSize: 12 }}>Loading…</div>
          : children && children.length
            ? children.map(k => <DbAreaTreeNode key={k.id} area={k} depth={depth + 1} currentId={currentId} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} C={C} />)
            : <div style={{ padding: "10px 14px 10px " + (pad + 22) + "px", color: C.textMuted, fontSize: 12 }}>No sub-areas.</div>
      ) : null}
    </div>
  );
}

function DbAreaTree({ stateRoot, current, ancestorIds, onNavigate, onClose, C }) {
  const [expanded, setExpanded] = useState(() => new Set([stateRoot.id, ...(ancestorIds || [])]));
  const [q, setQ] = useState("");
  const { data: results, isLoading: searching, error: searchError } = useAreaSearch(stateRoot.id, q.trim());
  const toggle = id => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Portal to <body> — this component mounts deep inside the tab content tree,
  // and an ancestor there creates its own stacking context, which traps a plain
  // position:fixed child under the app's own sticky top nav despite a higher
  // z-index. Escaping to <body> sidesteps that entirely.
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 400, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Back" style={{ flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, padding: "9px 13px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{"← Back"}</button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 800, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>All areas</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stateRoot.name + " — tap a name to jump, ▸ to expand"}</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, background: C.surface, border: "1px solid " + C.border, color: C.text, borderRadius: 9, width: 38, height: 38, fontSize: 18, cursor: "pointer" }}>{"×"}</button>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter areas & crags…" style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13.5, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 30 }}>
        {q.trim() ? (
          searching ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading…</div>
          : searchError ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.red, fontSize: 13 }}>Couldn't search areas — check your connection and try again.</div>
          : !results || !results.length ? <div style={{ padding: "26px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>{'No areas match "' + q.trim() + '"'}</div>
          : results.map(m => (
            <div key={m.id} onClick={() => onNavigate(m)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid " + C.borderLight, cursor: "pointer" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.parent_name || ""}</div>
              </div>
              {m.route_count > 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub }}>{m.route_count}</span> : null}
              <span style={{ color: C.textMuted, fontSize: 16 }}>{"›"}</span>
            </div>
          ))
        ) : (
          <DbAreaTreeNode area={stateRoot} depth={0} currentId={current.id} expanded={expanded} onToggle={toggle} onNavigate={onNavigate} C={C} />
        )}
      </div>
    </div>,
    document.body
  );
}

export default function DbAreaBrowser({ onOpenRoute, C, ActionIcon, bookmarks, onToggleBookmark, wishlist }) {
  const [stateNode, setStateNode] = useState(null);
  const [stack, setStack] = useState([]); // drill path within the state; last entry is "current"
  const [screen, setScreen] = useState("areas"); // "areas" | "finder" | "near" | "objectives"
  const [treeOpen, setTreeOpen] = useState(false);

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
  // Jump straight to any area reached by something other than drilling — a
  // near-me map pin, a tree-search hit, or a tree-node tap — by rebuilding its
  // real state/region breadcrumb from the area's own ltree path.
  const jumpToArea = async a => {
    setTreeOpen(false);
    setStateNode(a); setStack([]); setScreen("areas");
    const ancestors = await fetchAreaBreadcrumb(a).catch(() => []);
    const state = ancestors.find(x => x.area_type === "state");
    if (!state) return;
    setStateNode(state);
    setStack([...ancestors.filter(x => x.area_type !== "state"), a]);
  };

  return (
    <div>
      {crumbs.length && screen === "areas" ? (
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
        <NearMePanel center0={current && current.lat != null ? { lat: current.lat, lng: current.lng } : null} onBack={() => setScreen("areas")} onOpenArea={jumpToArea} C={C} />
      ) : (
        <AreaPage area={current} booked={bookmarks.includes(current.id)} onToggleSave={() => onToggleBookmark(current.id)} onDrill={drill} onFinder={() => setScreen("finder")} onNear={() => setScreen("near")} onObjectives={() => setScreen("objectives")} onAllAreas={() => setTreeOpen(true)} onOpenRoute={onOpenRoute} onJumpToArea={jumpToArea} C={C} ActionIcon={ActionIcon} />
      )}
      {treeOpen && stateNode ? (
        <DbAreaTree stateRoot={stateNode} current={current} ancestorIds={stack.map(a => a.id)} onNavigate={jumpToArea} onClose={() => setTreeOpen(false)} C={C} />
      ) : null}
    </div>
  );
}
