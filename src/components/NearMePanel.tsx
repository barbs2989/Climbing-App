import { tx } from "../../lib/tapWords.js";
import { useRef, useState, useLayoutEffect, useEffect, useMemo, useContext, lazy, Suspense } from "react";
import type { FormEvent } from "react";
import { useNearbyAreas, useRoutesByIds, useAreaFootprint } from "../../lib/db";
import { ClimberCtx } from "../../lib/climberCtx.js";
import MapAreaClimbs from "./MapAreaClimbs.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import { applyBaseLayer, loadLeaflet, useFollowMe, searchPlaces, BaseLayerToggle, locateLabel, ViewToggle } from "../../lib/mapKit";
import { discIconMarkup } from "../../lib/disciplines";
import { haversineMi } from "../../lib/areaBrowserShared.js";
import { CHIP, BTN } from "../../lib/buttonStyles.js";
import { POP_CLOSE_MEDIA, POP_CLOSE, POP_BACK, POP_REMOVE } from "../../lib/popupChrome.js";
import ActionIcon from "./ActionIcon.tsx";
import { clickable } from "../../lib/clickable";
import { createPortal } from "react-dom";
import LoadingRows from "./LoadingRows.tsx";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
// The 3D view is MapLibre GL from a CDN: loaded only when the climber presses 3D.
const Route3DView = lazy(() => import("../../lib/Route3DView.jsx"));

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
const ZOOM_BY_AREA_TYPE: Record<string, number> = { world: 2, country: 3, state: 6, range: 8, region: 8, canyon: 10, peak: 12, crag: 13, wall: 14 };
export type NearMePanelDisc = keyof typeof DL;
export interface NearMePanelBounds { minLat: number; maxLat: number; minLng: number; maxLng: number }
export interface NearMePanelPlace { name: string; sub: string; lat: number; lng: number; bbox: number[][] | null }
export interface NearMePanelArea { id: string; name: string; lat: number; lng: number; route_count: number; dominant_discipline: NearMePanelDisc; disciplines?: NearMePanelDisc[] | null; path?: string | null }
export interface NearMePanelPick { areas: NearMePanelArea[]; cluster: boolean }
export interface NearMePanelProps {
  /** Where the map opens; null opens on the whole country. */
  center0: { lat: number; lng: number } | null;
  /** The area_type the map was opened from; picks the first zoom. */
  areaType: string;
  name?: string | null;
  onBack: () => void;
  onOpenArea: (a: NearMePanelArea) => void;
  C: typeof Palette;
  /** Formats miles in the climber's units; absent falls back to miles. */
  uDistMi?: (mi: number) => string;
  /** Opens a climb straight from the map (the tapped crag's climbs, listed under it); absent lists areas only. */
  onOpenRoute?: (r: RouteRowRoute) => void;
  /** A "Near me" tap opened the map (a new number per tap): find the climber and centre there, ASKING
      for location if the browser has not been told yet. */
  autoLocate?: number | false | null;
  /** The area "View map" was pressed on: the map frames every peak and crag under its ltree `path`, and marks its point with the bullseye. */
  focus?: { path?: string | null; lat?: number | null; lng?: number | null } | null;
}
/* THE CIRCLES ARE MOUNTAIN PROJECT'S SHAPE, IN ONE COLOUR, EVERY ONE WITH ITS NUMBER (owner, 2026-11-23:
   "Replicate what they do" from MP's map code (maps.js createDonutChart), then "i also don't like how
   there's different colors for the circles ... make it consistent also every ring needs text").
   Every area and cluster is a DONUT: an 8px ring in the app's brand orange, a light middle holding its
   climb count (9px, black, thousands separated), the middle growing in steps with the count so the
   number fits (7px up to 99, 9px from 100, 13px from 1,000, 15px from 10,000). MP splits the ring by
   route type and leaves a ring under 10 routes blank; on the owner's word ours does neither.
   The marker's box is at least 36px whatever the ring's size, so a small ring is still a tap target.
   A SINGLE AREA carries its NAME under the ring (owner, 2026-11-24: "it has a name when applicable?"),
   dark on a white halo as MP labels its map; a cluster has no one name, so it shows the count alone,
   which is also how a cluster is told from a crag. Where two names would collide, the busier area keeps
   its label and the other's appears as the climber zooms in (`labelFits`, in the marker effect).
   An area holding climbs from your list wears a small amber STAR at the ring's shoulder: the amber ring
   it used to wear vanished against the orange one. */
const LABEL_MAX = 120;
const labelWidth = (name: string) => Math.min(LABEL_MAX, Math.round(name.length * 6.4) + 8);
function ringHtml(color: string, total: number, listed: boolean, label: string | null): { html: string; box: number } {
  const a = total >= 10000 ? 15 : total >= 1000 ? 13 : total >= 100 ? 9 : 7;
  const R = a + 8, box = Math.max(36, 2 * R + 8), c = box / 2;
  const band = "<circle cx='" + c + "' cy='" + c + "' r='" + (a + 4) + "' fill='none' stroke='" + color + "' stroke-width='8'/>";
  const hole = "<circle cx='" + c + "' cy='" + c + "' r='" + a + "' fill='#f2f2f2'/>";
  const num = "<text x='" + c + "' y='" + c + "' dy='3' text-anchor='middle' font-size='9' font-weight='700' font-family='system-ui,sans-serif' fill='#000'>" + total.toLocaleString("en-US") + "</text>";
  const edge = "<circle cx='" + c + "' cy='" + c + "' r='" + (R - 0.25) + "' fill='none' stroke='#f2f2f2' stroke-width='0.5'/>";
  const sx = c + R * 0.72, sy = c - R * 0.72, s = 6.5;
  const star = listed ? "<polygon points='" + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const r = k % 2 ? s * 0.45 : s, t = -Math.PI / 2 + k * Math.PI / 5; return (sx + r * Math.cos(t)).toFixed(1) + "," + (sy + r * Math.sin(t)).toFixed(1); }).join(" ") + "' fill='#e3b341' stroke='#1a1916' stroke-width='1.2' stroke-linejoin='round'/>" : "";
  const svg = "<svg width='" + box + "' height='" + box + "' viewBox='0 0 " + box + " " + box + "' style='display:block;overflow:visible;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.55))' aria-hidden='true'>" + band + hole + num + edge + star + "</svg>";
  if (!label) return { box, html: svg };
  const safe = label.replace(/[<>&"']/g, "");
  const tag = "<div aria-hidden='true' style='position:absolute;left:50%;top:" + (c + R + 2) + "px;transform:translateX(-50%);max-width:" + LABEL_MAX + "px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:700 11px/14px system-ui,sans-serif;color:#1a1916;text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 3px #fff,0 0 3px #fff;pointer-events:none'>" + safe + "</div>";
  return { box, html: "<div style='position:relative;width:" + box + "px;height:" + box + "px'>" + svg + tag + "</div>" };
}
// The area you came from, marked as MP marks it (/img/map/locator.svg): a fixed red bullseye, 120px,
// on the area's own point. It takes no taps; the rings above it do.
const LOCATOR_HTML = "<svg width='120' height='120' viewBox='0 0 120 120' aria-hidden='true'>" +
  "<circle cx='60' cy='60' r='51' fill='none' stroke='#fff' stroke-opacity='0.35' stroke-width='16'/>" +
  "<circle cx='60' cy='60' r='18.1' fill='none' stroke='#fff' stroke-opacity='0.15' stroke-width='14.75'/>" +
  "<g fill='none' stroke='#c00'><circle cx='60' cy='60' r='59' stroke-width='1.5'/><circle cx='60' cy='60' r='43'/><circle cx='60' cy='60' r='25.5' stroke-width='1.5'/><circle cx='60' cy='60' r='10.75'/>" +
  "<path d='M60 1v9M60 110v9M1 60h9M110 60h9M60 34.5v5M60 80.5v5M34.5 60h5M80.5 60h5' stroke-width='1.5'/></g></svg>";
// A stray coordinate (one crag filed hundreds of miles off) must not stretch the frame over a whole
// region: with enough pins, the outer 2% on each side is left out of it.
function trimOutliers<T extends { lat: number; lng: number }>(pts: T[]): T[] {
  if (pts.length < 40) return pts;
  const q = (arr: number[], f: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(f * (arr.length - 1))))];
  const la = pts.map(p => p.lat).sort((a, b) => a - b), ln = pts.map(p => p.lng).sort((a, b) => a - b);
  const [a0, a1, n0, n1] = [q(la, 0.02), q(la, 0.98), q(ln, 0.02), q(ln, 0.98)];
  return pts.filter(p => p.lat >= a0 && p.lat <= a1 && p.lng >= n0 && p.lng <= n1);
}
export default function NearMePanel({ center0, areaType, name, onBack, onOpenArea, C, uDistMi, onOpenRoute, autoLocate, focus }: NearMePanelProps) {
  const mapDiv = useRef<HTMLDivElement | null>(null), mapRef = useRef<LeafletAny>(null), markRef = useRef<LeafletAny>(null), tileRef = useRef<LeafletAny>(null), placeMarkRef = useRef<LeafletAny>(null);
  const movedRef = useRef(false), framedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [mapFail, setMapFail] = useState(false);
  const [bounds, setBounds] = useState<NearMePanelBounds | null>(null);
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
  const [pick, setPick] = useState<NearMePanelPick | null>(null);
  // Go to a town, county, or zip/postal code (US and Canada). `alts` are the other matches, offered as "Not it?".
  const [placeQ, setPlaceQ] = useState("");
  const [place, setPlace] = useState<{ busy: boolean; err: string; alts: NearMePanelPlace[] }>({ busy: false, err: "", alts: [] });
  const [fullscreen, setFullscreen] = useState(false);
  // 3D (owner, 2026-11-14): the box the flat map shows, tilted over the terrain, with the areas in it.
  const [view3d, setView3d] = useState(false);
  // Type-of-climbing filter over what is in view. Matches EVERY type an area holds
  // (`disciplines`, 0198: any type with at least one climb; on a peak, crag types count as
  // alpine; top rope is its own type since 0202), so a mostly-sport crag with trad lines shows under both.
  // Falls back to the main type for a row read before that column existed.
  const [disc, setDisc] = useState<NearMePanelDisc | null>(null);

  // FULL SCREEN IS A REAL FULL-SCREEN VIEW, drawn over the whole app like the route map's. It used
  // to stretch the map in place, in the page's flow: on a phone it ran on under the bottom bar, the
  // header stayed on top of it, the controls above it vanished so the ✕ jumped ~100px up the screen,
  // and the height was ANIMATED, so the map's ResizeObserver re-measured and re-read the view on
  // every frame of the transition. The owner reported a crash on closing it (2026-10-23).
  // It is still the SAME Leaflet instance -- same markers, zoom, pan and your dot, so collapsing
  // back drops you exactly where you were. The map is rendered through a portal into `host`, a div
  // this panel owns, and only `host` moves: into document.body for full screen, back into the
  // inline slot for the page. Moving a node keeps everything inside it, Leaflet included.
  const hostRef = useRef<HTMLDivElement | null>(null), slotRef = useRef<HTMLDivElement | null>(null), wasFullRef = useRef(false);
  if (!hostRef.current && typeof document !== "undefined") hostRef.current = document.createElement("div");
  // Layout, not passive: the map div must be in the document before Leaflet's init effect measures it.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (fullscreen) { wasFullRef.current = true; document.body.appendChild(host); }
    else if (slotRef.current) {
      slotRef.current.appendChild(host);
      // While the map was away the page was shorter and its scroll clamped: put the map back in view.
      if (wasFullRef.current) { wasFullRef.current = false; try { slotRef.current.scrollIntoView({ block: "nearest" }); } catch (e) { /* the map is gone or not laid out yet; nothing to update */ } }
    }
    if (mapRef.current) { try { mapRef.current.invalidateSize(); } catch (e) { /* the map is gone or not laid out yet; nothing to update */ } }
  }, [fullscreen]);
  useEffect(() => () => { if (hostRef.current) hostRef.current.remove(); }, []);
  useEffect(() => {
    if (!fullscreen) return;
    // Escape over the 3D view closes only the 3D view (it listens for itself).
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !view3d) setFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen, view3d]);
  // THE AREA YOU CAME FROM (owner, 2026-11-23: "it should be highlighted on the map"): every peak and
  // crag under it, so the map opens with all of it in view, and a bullseye on it (below).
  const focusPath = focus && focus.path ? focus.path : null;
  const { data: fp } = useAreaFootprint(focusPath ? focus : null);
  const fpPts = useMemo(() => fp ? trimOutliers(fp.points as { lat: number; lng: number }[]) : [], [fp]);
  const { data, isLoading, error } = useNearbyAreas(bounds);
  const nearbyAll: NearMePanelArea[] | undefined = data && data.rows;
  const typesOf = (a: NearMePanelArea) => Array.isArray(a.disciplines) ? a.disciplines : (a.dominant_discipline ? [a.dominant_discipline] : []);
  const nearby = useMemo(() => nearbyAll && (disc ? nearbyAll.filter(a => typesOf(a).includes(disc)) : nearbyAll), [nearbyAll, disc]);
  // YOUR LIST ON THE MAP (the seed map ringed areas holding your objectives and said "★ N on your
  // list"). The wishlist routes are read by id with their area's ltree path embedded — the same small
  // read the Climbs list uses — and an area counts the ones whose path sits under its own.
  const { wishlist } = useContext(ClimberCtx);
  const { data: wlRoutes } = useRoutesByIds((wishlist || []).filter(id => typeof id === "string"));
  const wlByArea = useMemo(() => {
    const out: Record<string, number> = {};
    const paths = ((wlRoutes || []) as { areas?: { path?: string | null } | null }[]).map(r => r.areas && r.areas.path).filter((p): p is string => !!p);
    if (!paths.length) return out;
    (nearbyAll || []).forEach(a => { if (!a.path) return; const n = paths.filter(p => p === a.path || p.startsWith(a.path + ".")).length; if (n) out[a.id] = n; });
    return out;
  }, [wlRoutes, nearbyAll]);
  const onList = (n: number) => "★ " + n + " on your list";
  /* A PIN IS A BUTTON WITH A NAME (check:axe, 2026-11-18, once Home drew this map): Leaflet makes an
     interactive marker a role=button whose only content is the drawn pin, so a screen reader heard
     "button" — the curved label is SVG text, and a cluster's number alone says nothing. The name is the
     tooltip's words, set on the marker's element when it reaches the map (a cluster group re-adds it). */
  const named = (mk: LeafletAny, label: string) => { mk.on("add", () => { const el = mk.getElement && mk.getElement(); if (el) el.setAttribute("aria-label", label); }); };
  // A single tapped pin opens with its climbs showing; in a tapped CLUSTER each area opens its own.
  const [climbsOpen, setClimbsOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { setClimbsOpen({}); }, [pick]);
  const discsInView = useMemo(() => {
    const n: Record<string, number> = {};
    (nearbyAll || []).forEach(a => typesOf(a).forEach(d => { n[d] = (n[d] || 0) + 1; }));
    if (disc && !n[disc]) n[disc] = 0; // keep the active chip on screen so it can be cleared
    return (Object.entries(n) as [NearMePanelDisc, number][]).sort((a, b) => b[1] - a[1]);
  }, [nearbyAll, disc]);

  const readBounds = (map: LeafletAny) => {
    try {
      const b = map.getBounds();
      setBounds({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
    } catch (e) { /* the map is gone or not laid out yet; nothing to update */ }
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
      map.on("dragstart", () => { movedRef.current = true; });
      map.on("click", () => setPick(null));
      setTimeout(() => { try { map.invalidateSize(); readBounds(map); } catch (e) { /* the map is gone or not laid out yet; nothing to update */ } }, 150);
      // ...and again whenever the map's box really changes size. On a slow phone the box can still
      // be unlaid-out at 150ms: the query then asked for a near-zero box, got no areas, and the
      // map said "No climbs in view" over a whole state until the climber panned.
      if (typeof ResizeObserver !== "undefined") {
        let last = "";
        ro = new ResizeObserver(([e]) => {
          const k = Math.round(e.contentRect.width) + "x" + Math.round(e.contentRect.height);
          if (k === last || !mapRef.current) return;
          last = k;
          try { map.invalidateSize(); readBounds(map); } catch (err) { /* the map is gone or not laid out yet; nothing to update */ }
        });
        ro.observe(mapDiv.current);
      }
    };
    let ro: ResizeObserver | null = null;
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => { cancelled = true; clearTimeout(ft); if (ro) ro.disconnect(); if (mapRef.current) { try { mapRef.current.remove(); } catch (e) { /* the map is gone or not laid out yet; nothing to update */ } mapRef.current = null; markRef.current = null; tileRef.current = null; placeMarkRef.current = null; } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- builds the Leaflet map once; area type, base layer and centre are applied by their own effects and a rebuild would reset the view
  useEffect(() => { if (!mapRef.current) return; applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);

  // THE BULLSEYE on the area you came from: on its own coordinate, else the middle of its pins (a range
  // filed with no point of its own). In a pane of its own under the rings, so every ring stays tappable.
  const focusPt = useMemo(() => {
    if (!focusPath) return null;
    if (focus && focus.lat != null && focus.lng != null) return { lat: focus.lat, lng: focus.lng };
    if (!fpPts.length) return null;
    return { lat: fpPts.reduce((s, p) => s + p.lat, 0) / fpPts.length, lng: fpPts.reduce((s, p) => s + p.lng, 0) / fpPts.length };
  }, [focusPath, focus, fpPts]);

  // FRAME THE AREA ONCE, when its pins arrive: the whole of it in view, its bullseye included, not a
  // fixed zoom on its one point (a region's point is its middle, so a fixed zoom cut half of
  // Leavenworth off). The padding is the bullseye's own half-width, so it is never cut by the edge.
  // Skipped when the climber has already dragged the map, or a Near me tap asked for their own position.
  useEffect(() => {
    const L = window.L, map = mapRef.current;
    if (!ready || !L || !map || framedRef.current || autoLocate || !fpPts.length) return;
    framedRef.current = true;
    if (movedRef.current) return;
    const pts = focusPt ? fpPts.concat([focusPt]) : fpPts;
    const one = pts.every(p => Math.abs(p.lat - pts[0].lat) < 1e-4 && Math.abs(p.lng - pts[0].lng) < 1e-4);
    try {
      if (one) map.setView([pts[0].lat, pts[0].lng], Math.max(map.getZoom(), ZOOM_BY_AREA_TYPE[areaType] || 12));
      else map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 14 });
    } catch (e) { /* the map is gone or not laid out yet; nothing to update */ }
  }, [ready, fpPts, focusPt]); // eslint-disable-line react-hooks/exhaustive-deps -- frames once per footprint; areaType and autoLocate are fixed for this panel's life (it is keyed on the area)

  useEffect(() => {
    const L = window.L, map = mapRef.current;
    if (!ready || !L || !map || !focusPt) return;
    let mk: LeafletAny = null;
    try {
      if (!map.getPane("cmLocator")) { const pane = map.createPane("cmLocator"); pane.style.zIndex = "450"; pane.style.pointerEvents = "none"; }
      mk = L.marker([focusPt.lat, focusPt.lng], { pane: "cmLocator", interactive: false, keyboard: false, icon: L.divIcon({ html: LOCATOR_HTML, className: "", iconSize: [120, 120], iconAnchor: [60, 60] }) }).addTo(map);
    } catch (e) { /* the map is gone or not laid out yet; nothing to update */ }
    return () => { if (mk) { try { map.removeLayer(mk); } catch (e) { /* the map is gone; nothing to remove */ } } };
  }, [ready, focusPt]);

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
    // Kept above the largest ring (44px) so tightly spaced but distinct areas cluster instead of
    // visually overlapping.
    const CLUSTER_PX = 48;
    const pts = nearby.filter(a => a.lat != null && a.lng != null).map(a => ({ a, pt: map.latLngToContainerPoint([a.lat, a.lng]) }));
    const used = new Array(pts.length).fill(false);
    const groups: (typeof pts)[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue;
      const group = [pts[i]]; used[i] = true;
      for (let j = i + 1; j < pts.length; j++) {
        if (used[j]) continue;
        if (Math.hypot(pts[i].pt.x - pts[j].pt.x, pts[i].pt.y - pts[j].pt.y) < CLUSTER_PX) { group.push(pts[j]); used[j] = true; }
      }
      groups.push(group);
    }
    // NAMES THAT FIT: every ring's box is known first; then, busiest area first (`nearby` is ordered by
    // climbs), a name is drawn only where it overlaps no ring and no name already placed.
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const hit = (p: Box, q: Box) => p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1;
    const ringR = (t: number) => (t >= 10000 ? 15 : t >= 1000 ? 13 : t >= 100 ? 9 : 7) + 8;
    const ringBoxes = groups.map(g => {
      const n = g.length, x = g.reduce((s, p) => s + p.pt.x, 0) / n, y = g.reduce((s, p) => s + p.pt.y, 0) / n;
      const r = ringR(g.reduce((s, p) => s + (p.a.route_count || 0), 0));
      return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
    });
    const placed: Box[] = [];
    const labelFits = (gi: number, name: string) => {
      const rb = ringBoxes[gi], cx = (rb.x0 + rb.x1) / 2, w = labelWidth(name);
      const lb = { x0: cx - w / 2, y0: rb.y1 + 2, x1: cx + w / 2, y1: rb.y1 + 16 };
      if (placed.some(p => hit(p, lb)) || ringBoxes.some((q, k) => k !== gi && hit(q, lb))) return false;
      placed.push(lb);
      return true;
    };
    groups.forEach((group, gi) => {
      if (group.length === 1) {
        const a = group[0].a;
        const wl = wlByArea[a.id] || 0;
        const { html, box } = ringHtml(C.brand, a.route_count || 0, !!wl, a.name && labelFits(gi, a.name) ? a.name : null);
        const mk = L.marker([a.lat, a.lng], { icon: L.divIcon({ html, className: "", iconSize: [box, box], iconAnchor: [box / 2, box / 2] }) });
        // MP's hover card: the name in bold, then the count.
        const tipName = "<b>" + (a.name || "").replace(/[<>&]/g, "") + "</b>";
        mk.bindTooltip(tipName + "<br>" + a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") + (wl ? "<br>" + onList(wl) : ""), { direction: "top" });
        named(mk, a.name + ", " + a.route_count + " climb" + (a.route_count !== 1 ? "s" : "") + (wl ? ", " + onList(wl) : ""));
        mk.on("click", () => setPick({ areas: [a], cluster: false }));
        grp.addLayer(mk);
      } else {
        const areas = group.map(g => g.a);
        const n = areas.length;
        const climbs = areas.reduce((s, a) => s + (a.route_count || 0), 0);
        const avgLat = areas.reduce((s, a) => s + a.lat, 0) / n, avgLng = areas.reduce((s, a) => s + a.lng, 0) / n;
        const wl = areas.reduce((s, a) => s + (wlByArea[a.id] || 0), 0);
        // A cluster is one ring for all its areas, as MP's parent-area ring is: their climbs added up.
        const { html, box } = ringHtml(C.brand, climbs, !!wl, null);
        const mk = L.marker([avgLat, avgLng], { icon: L.divIcon({ html, className: "", iconSize: [box, box], iconAnchor: [box / 2, box / 2] }) });
        mk.bindTooltip("<b>" + n + " areas</b><br>" + climbs + (climbs === 1 ? " climb" : " climbs") + (wl ? "<br>" + onList(wl) : "") + "<br>" + tx("Tap to zoom in"), { direction: "top" });
        named(mk, n + " areas, " + climbs + (climbs === 1 ? " climb" : " climbs") + (wl ? ", " + onList(wl) : "") + tx(", tap to zoom in"));
        mk.on("click", () => {
          setPick({ areas, cluster: true });
          try { map.fitBounds(L.latLngBounds(areas.map(a => [a.lat, a.lng])), { padding: [50, 50], maxZoom: 15 }); } catch (e) { /* the map is gone or not laid out yet; nothing to update */ }
        });
        grp.addLayer(mk);
      }
    });
  }, [ready, nearby, wlByArea]); // eslint-disable-line react-hooks/exhaustive-deps -- markers are redrawn when the map is ready, the nearby list changes or your list's counts arrive; theme colours are constants

  // Live, and refining: see useFollowMe in lib/mapKit.jsx. Only the FIRST fix re-centres the
  // nearby list -- re-querying on every step of a walk would refetch for nothing.
  const me = useFollowMe(mapRef, { C, zoom: 10, onFix: (f, first) => {
    if (!first) return;
    setCenter({ lat: f.lat, lng: f.lng });
    const map = mapRef.current;
    if (map) setTimeout(() => readBounds(map), 350); // after the pan/zoom animation settles
  } });
  const locate = me.locate, locating = me.locating, geoErr = me.err;
  // A list reads "44 mi", not "43.51 mi" (walkthrough 2026-11-18): whole numbers from 10 up, one
  // decimal below, in whichever unit the climber set (uDistMi picks it; this only rounds its number).
  const fmtMi = (mi: number) => (uDistMi ? uDistMi(mi) : mi.toFixed(1) + " mi").replace(/^\d+(?:\.\d+)?/, n => { const v = parseFloat(n); return String(v >= 10 ? Math.round(v) : Math.round(v * 10) / 10); });
  // Your dot is on the map from the start when location is already allowed -- without moving the
  // map off the area you opened it on. Never asks: the button above does that.
  useEffect(() => { if (ready) me.showDot(); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps -- shows the dot once when the map becomes ready; me is a per-render hook result
  // A NEAR ME TAP IS THE ASK (owner, 2026-11-18: "when i click near me it doesn't show climbs or areas
  // near me"). It used to centre on the climber only when the browser said location was ALREADY
  // granted; a phone that still had to ask (Safari answers "prompt" most days) stayed on the whole
  // country until a second press on "Me". The tap now requests the position itself, once per tap.
  useEffect(() => { if (ready && autoLocate) me.locate(); }, [ready, autoLocate]); // eslint-disable-line react-hooks/exhaustive-deps -- once per Near me tap, when the map is ready; me is a per-render hook result

  const goToPlace = (p: NearMePanelPlace) => {
    const L = window.L, map = mapRef.current;
    if (!L || !map || !p) return;
    me.release();
    try {
      if (p.bbox) map.fitBounds(p.bbox, { maxZoom: 13 }); else map.setView([p.lat, p.lng], 12);
      if (placeMarkRef.current) map.removeLayer(placeMarkRef.current);
      const html = "<div style='width:16px;height:16px;border-radius:50%;background:" + C.blueSolid + ";border:3px solid #fff;box-shadow:0 0 0 4px " + C.blueSolid + "55,0 2px 7px rgba(0,0,0,0.6);'></div>";
      placeMarkRef.current = L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: "", iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 1000 }).bindTooltip(p.name, { direction: "top", permanent: true }).addTo(map);
    } catch (e) { /* the map is gone or not laid out yet; nothing to update */ }
  };
  const findPlace = (e?: FormEvent) => {
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
  // THE MILES ON A ROW ARE FROM THE CLIMBER, OR THERE ARE NONE (owner, 2026-11-18: "fix distance before
  // location is allowed"). They were measured from the middle of the map view, so before any fix the
  // rows read "194 mi" from the middle of the country, and after a pan they were miles from nowhere
  // the screen named. With a position the list is nearest-to-you first; without one it keeps the
  // middle-of-the-view order and prints no distance.
  const here = me.at;
  const viewCenter = useMemo(() => bounds ? { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 } : center, [bounds, center]);
  const sorted = useMemo(() => {
    if (!nearby) return [];
    const from = here || viewCenter;
    const withDist = nearby.map(a => ({ ...a, _key: from ? haversineMi(from, a) : 1e9, _mi: here ? haversineMi(here, a) : null }));
    return withDist.sort((a, b) => a._key - b._key).slice(0, 60);
  }, [nearby, viewCenter, here]);
  const discChip = (k: NearMePanelDisc | null, label: string, on: boolean) => <button key={k || "all"} onClick={() => setDisc(k)} aria-pressed={on} style={{ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</button>;

  const searchUI = (
    <>
        <form onSubmit={findPlace} role="search" style={{ display: "flex", gap: 6, marginBottom: place.err || place.alts.length ? 4 : 8 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}><input type="search" value={placeQ} onChange={e => setPlaceQ(e.target.value)} placeholder="Go to a town, county or zip/postal code" aria-label="Go to a town, county or zip/postal code" enterKeyHint="search" style={{ width: "100%", boxSizing: "border-box", padding: "10px 40px 10px 12px", borderRadius: 10, border: "1px solid " + C.field, background: C.surface, color: C.text, fontSize: 16 }} />{placeQ ? <button type="button" onClick={() => setPlaceQ("")} aria-label="Clear search" style={{ ...POP_REMOVE, position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>✕</button> : null}</div>
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
      <BaseLayerToggle baseLayer={baseLayer} setBaseLayer={setBaseLayer} C={C} snow snowAt={center} on3d={ready && bounds ? () => setView3d(true) : undefined} />
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
  const pickRows = pick ? pick.areas.map(a => { const from = here || viewCenter; return { ...a, _key: from ? haversineMi(from, a) : 1e9, _mi: here ? haversineMi(here, a) : null }; }).sort((a, b) => a._key - b._key) : [];
  const pickClimbs = pickRows.reduce((n, a) => n + (a.route_count || 0), 0);
  const pickUI = pick ? (
    <section aria-label={tx("Areas you tapped on the map")} style={{ marginTop: 8, flexShrink: 0, maxHeight: fullscreen ? "42%" : "none", display: "flex", flexDirection: "column", minHeight: 0, background: C.surface, border: "1px solid " + C.blue + "66", borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", borderBottom: "1px solid " + C.border }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}>{(pickRows.length === 1 ? "1 area" : pickRows.length + " areas") + " · " + pickClimbs + " climb" + (pickClimbs !== 1 ? "s" : "")}</div>
        <button onClick={() => setPick(null)} title="Close" aria-label={tx("Close the list of tapped areas")} style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "6px 8px 0" }}>
        {pickRows.map(a => {
          const open = !!onOpenRoute && (pickRows.length === 1 || !!climbsOpen[a.id]);
          const openRoute = open ? onOpenRoute : undefined;
          const wl = wlByArea[a.id] || 0;
          return <div key={a.id} style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
              <div {...clickable(() => onOpenArea(a))} style={{ flex: 1, minWidth: 0, background: C.card, border: "1px solid " + (wl ? C.amber : C.border), borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.text, overflowWrap: "anywhere" }}>{a.name}</span>
                  {wl ? <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.amber }}>{onList(wl)}</span> : null}
                </span>
                <span style={{ color: C.textMuted, fontSize: 12, flexShrink: 0 }}>{a._mi != null ? fmtMi(a._mi) + " · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
              </div>
              {onOpenRoute && pickRows.length > 1 && a.route_count > 0 ? <button onClick={() => setClimbsOpen(o => ({ ...o, [a.id]: !o[a.id] }))} aria-expanded={open} aria-label={(open ? "Hide" : "Show") + " the climbs at " + a.name} style={{ ...CHIP, flexShrink: 0, minHeight: 44, border: "1px solid " + (open ? C.blue : C.border), background: open ? C.blueBg : C.surface, color: open ? C.onSolid : C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{open ? "Hide" : "Climbs"}</button> : null}
            </div>
            {openRoute && a.route_count > 0 ? <MapAreaClimbs area={a} onOpenRoute={openRoute} onOpenArea={() => onOpenArea(a)} C={C} /> : null}
          </div>;
        })}
      </div>
    </section>
  ) : null;
  const errUI = geoErr ? <div role="status" style={{ color: me.asking ? C.textMuted : C.red, fontSize: 12, marginTop: 6 }}>{geoErr}</div> : null;
  const title = "Map" + (name ? " · " + name : "");
  // The areas in view (type filter applied), busiest first, as 3D pins: each opens its area.
  const view3dEl = view3d && bounds ? (
    <Suspense fallback={null}>
      <Route3DView view={bounds} title={name || undefined} onClose={() => setView3d(false)}
        waypoints={(nearby || []).filter(a => a.lat != null && a.lng != null).slice(0, 200).map(a => ({
          lat: a.lat, lng: a.lng, name: a.name,
          color: C.brand, iconHtml: discIconMarkup(a.dominant_discipline, 14),
          sub: a.route_count + (a.route_count === 1 ? " climb" : " climbs") + (wlByArea[a.id] ? " · " + onList(wlByArea[a.id]) : ""),
          openLabel: "View area", onOpen: () => { setView3d(false); setFullscreen(false); onOpenArea(a); },
        }))} />
    </Suspense>
  ) : null;
  return (
    <div>
      <ViewToggle mode="map" onList={onBack} onMap={() => {}} C={C} />
      {view3dEl}
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
          {!center && !bounds ? <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{tx('Tap "Me" on the map to find climbs near you.')}</div> : null}
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
          {disc && ((nearby as unknown[]).length > sorted.length || (data && (data.total as number) > (nearbyAll as unknown[]).length)) ? <div style={{ color: C.textMuted, fontSize: 11.5, marginBottom: 8 }}>{"Showing " + sorted.length + " " + (DL[disc] || disc).toLowerCase() + (sorted.length === 1 ? " area" : " areas") + " — zoom in to see more."}</div> : null}
          {sorted.map(a => (
            <div key={a.id} {...clickable(() => onOpenArea(a))} style={{ background: C.card, border: "1px solid " + (wlByArea[a.id] ? C.amber : C.border), borderRadius: 12, padding: "11px 13px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, color: C.text }}>{a.name}</span>
                {wlByArea[a.id] ? <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: C.amber }}>{onList(wlByArea[a.id])}</span> : null}
              </span>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{a._mi != null ? fmtMi(a._mi) + " · " : ""}{a.route_count} climb{a.route_count !== 1 ? "s" : ""}</span>
            </div>
          ))}
          {!isLoading && bounds && !sorted.length && !error ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>{disc && nearbyAll && nearbyAll.length ? "No " + (DL[disc] || disc).toLowerCase() + tx(" areas in view — pan, zoom out, or tap All.") : "No climbs in view — pan or zoom out to see more."}</div> : null}
        </>
      ) : null}
    </div>
  );
}
