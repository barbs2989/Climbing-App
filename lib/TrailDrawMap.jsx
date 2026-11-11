import { tx } from "./tapWords.js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadLeaflet, applyBaseLayer } from "./mapKit";
import { loadUnits } from "./units-pref";
import { MIN_RECORDED_PTS } from "./track";
import { POP_CLOSE, POP_CLOSE_MEDIA } from "./popupChrome.js";
import { distM, pathLenM, routeLeg } from "./trailRouting.js";

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
// In the climber's units (check:units): feet/miles or metres/kilometres.
export function fmtTrailLen(m) {
  if (loadUnits() === "metric") return m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(2) + " km";
  const ft = m * 3.28084;
  return ft < 1000 ? Math.round(ft / 10) * 10 + " ft" : (ft / 5280).toFixed(2) + " mi";
}
export function trailLenM(pts) { return pathLenM(pts || []); }

let nextId = 1;
const round = (p) => [+(+p[0]).toFixed(6), +(+p[1]).toFixed(6)];
const node = (a, via) => ({ id: nextId++, a: round(a), via: via || [], pending: false, born: Date.now() });
const routed = (n) => !!(n && n.via && n.via.length);
// What a leg whose anchors changed keeps of what it was told: a reason the climber is shaping it by
// hand for (no trail, a detour, too long, kept) stays, so the router's same answer again is not news;
// "answered" (ok) and "did not answer" (false) go, since the new anchors are a new question.
const carry = (t) => (t === false || t === "ok" ? undefined : t);
const flatten = (nodes) => { const out = []; nodes.forEach((n, i) => { if (i > 0) out.push(...n.via); out.push(n.a); }); return out; };
const legPts = (nodes, i) => [nodes[i - 1].a].concat(nodes[i].via, [nodes[i].a]);
const sameP = (p, q) => !!p && !!q && p[0] === q[0] && p[1] === q[1];
const HISTORY_CAP = 50;
// The run of routed points at one end of a leg that sit within `m` metres of `at` (the anchor being
// removed): dropped, so the joined leg no longer visits that spot, while a bend elsewhere that
// merely passes near it is kept. With `toward` (where a moved anchor went) the run is cut back only
// to its point nearest the new spot, when that is nearer than the trail outside the run: an anchor
// dragged back along its own routed trail keeps the trail up to where it now sits, instead of a
// chord over the old spot that skips trail that was right.
function dropNear(via, at, end, m = 40, toward) {
  if (end === "end") {
    let e = via.length; while (e > 0 && distM(via[e - 1], at) <= m) e--;
    if (toward && e < via.length) { let best = -1, bd = e > 0 ? distM(via[e - 1], toward) : Infinity; for (let k = e; k < via.length; k++) { const d = distM(via[k], toward); if (d < bd) { bd = d; best = k; } } if (best >= 0) e = best + 1; }
    return via.slice(0, e);
  }
  let s = 0; while (s < via.length && distM(via[s], at) <= m) s++;
  if (toward && s > 0) { let best = -1, bd = s < via.length ? distM(via[s], toward) : Infinity; for (let k = 0; k < s; k++) { const d = distM(via[k], toward); if (d < bd) { bd = d; best = k; } } if (best >= 0) s = best; }
  return via.slice(s);
}
// Remembered for the session, not across them: a climber tracing two crags in one sitting keeps the mode.
let followDefault = false;

/* `marks` names the two pins: the crag default (P parking, C crag), or the desktop drawing tool's
   T trailhead and S summit / B base on a route that is not a crag. */
const CRAG_MARKS = { start: "P", end: "C", startName: "the parking pin", endName: "the crag" };
const HIT = 32; // the whole hit box of an anchor or handle; the dot inside is smaller
// The point ON the leg nearest a tap: the hit line is 18px wide, and a tap at its edge would otherwise bend the leg out to it.
function onLeg(map, L, leg, latlng) {
  const p = map.latLngToLayerPoint(latlng);
  let best = null, bd = Infinity;
  for (let k = 1; k < leg.length; k++) {
    const a = map.latLngToLayerPoint(leg[k - 1]), b = map.latLngToLayerPoint(leg[k]);
    const c = L.LineUtil.closestPointOnSegment(p, a, b), d = p.distanceTo(c);
    if (d < bd) { bd = d; best = c; }
  }
  return best ? map.layerPointToLatLng(best) : latlng;
}
// `initialShape` / `onShape` carry the line as anchors + routed points between two drawers (the
// desktop tool hands its line to the submission sheet): flat `pts` alone would come back as one
// anchor per routed point.
export default function TrailDrawMap({ start, end, pts, setPts, C, marks, title, active, initialShape, onShape, minPts }) {
  const need = minPts || MIN_RECORDED_PTS; // what the host can do with the line needs this many points
  const mk = marks || CRAG_MARKS;
  const mapDiv = useRef(null), mapRef = useRef(null), tileRef = useRef(null), drawn = useRef([]);
  // `ready` is a GENERATION, not a flag: the full-screen rebuild sets it to 0 in the cleanup and
  // to the next number in init, and when Leaflet is already loaded both land in one React batch.
  // A boolean would read true → true and the redraw effect would never run on the new map.
  const [ready, setReady] = useState(0), [mapFail, setMapFail] = useState(false);
  const genRef = useRef(0);
  const dialogRef = useRef(null);
  const builtHidden = useRef(false); // built behind another tab (0×0 box): refit when shown
  const expandBtn = useRef(null); // focus returns here when full screen closes
  const [baseLayer, setBaseLayer] = useState("topo");
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomN, setZoomN] = useState(0);
  const [follow, setFollow] = useState(followDefault);
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState("");
  const [nodes, setNodes] = useState(() => (initialShape && initialShape.length ? initialShape.map((s) => node(s.a, (s.via || []).map(round))) : (pts || []).map((p) => node(p))));
  const dragging = useRef(false), redrawAfterDrag = useRef(false);
  const nodesRef = useRef(nodes);
  const undoRef = useRef([]), redoRef = useRef([]);
  const [histN, setHistN] = useState({ undo: 0, redo: 0 });
  const routing = useRef(new Map()); // node id -> AbortController
  const viewRef = useRef(null); // {center, zoom} kept across a full-screen rebuild
  const dragEndAt = useRef(0);
  const noteT = useRef(null);
  const lastTap = useRef(null); // the last tap on the map or a leg, to fold a double tap into one point
  const fails = useRef({ far: 0, none: 0, down: 0, detour: 0, kept: 0, gone: 0, t: null }); // legs that came back straight, said once per burst
  // The pins by value, so a fresh-but-equal object from the host is not a change.
  const startKey = start ? start.lat + "," + start.lng : "", endKey = end ? end.lat + "," + end.lng : "";
  const propsRef = useRef({ start, end, follow, setPts, onShape });
  propsRef.current = { start, end, follow, setPts, onShape };

  // The line is owned here (nodes); `pts` is written out, never read back after mount. A host that
  // wants the line cleared re-mounts the drawer (a new route) or uses its Clear.
  useEffect(() => () => { routing.current.forEach((c) => c.abort()); clearTimeout(noteT.current); clearTimeout(fails.current.t); }, []);
  // Hidden behind another tab of the host sheet (display:none) and shown again: Leaflet measured a
  // 0×0 box while hidden, so it is told the real size. The host keeps this mounted rather than
  // unmounting it, or a routed line would come back as one anchor per routed point.
  useEffect(() => {
    if (active === false || !mapRef.current) return;
    const m = mapRef.current;
    const t = setTimeout(() => { try { m.invalidateSize(); if (builtHidden.current) { builtHidden.current = false; fitView(m); } } catch (e) {} }, 60);
    return () => clearTimeout(t);
  }, [active]);

  // Pins and the line, or the whole country when there is nothing yet to show.
  const fitView = (map) => {
    const L = window.L, { start: s0, end: e0 } = propsRef.current;
    const anchors = [s0, e0].filter(Boolean).map((p) => [p.lat, p.lng]).concat(nodesRef.current.map((x) => x.a));
    if (anchors.length > 1) map.fitBounds(L.latLngBounds(anchors).pad(0.4), { maxZoom: 17 });
    else if (anchors.length) map.setView(anchors[0], 16);
    else map.setView([39.5, -98.5], 4);
  };
  // A tap counts once: not the click that ends a marker drag (Leaflet swallows it on most browsers;
  // the 250 ms is for the rest), and not the second half of a double tap (within 300 ms and 10 px).
  // `kind` names the target (map, leg, handle, anchor): only two taps of ONE kind fold, so the tap
  // that selects an anchor just made by tapping a handle in the same spot still counts.
  const tapOk = (e, kind) => {
    const now = Date.now();
    if (now - dragEndAt.current < 250) return false;
    if (e && e.originalEvent && e.originalEvent.detail > 1) return false; // the second click of a double click, as the browser counts it
    const p = e && e.containerPoint, last = lastTap.current;
    if (last && last.kind === kind && now - last.t < 300 && p && Math.hypot(p.x - last.x, p.y - last.y) < 10) return false;
    lastTap.current = { t: now, kind, x: p ? p.x : 0, y: p ? p.y : 0 };
    return true;
  };
  const setBoth = (next) => { nodesRef.current = next; setNodes(next); propsRef.current.setPts(flatten(next)); if (propsRef.current.onShape) propsRef.current.onShape(next.map((x) => ({ a: x.a, via: x.via, pending: !!x.pending }))); };
  const say = (s) => { setNote(s); clearTimeout(noteT.current); noteT.current = setTimeout(() => setNote(""), 8000); };
  // Legs that came back straight are said ONCE per burst (Follow trails on over a long line answers
  // many at once), with a count per reason, not one note overwriting the last.
  const noteFailure = (why) => {
    const f = fails.current;
    if (why === "far") f.far++; else if (why === "detour") f.detour++; else if (why === "kept") f.kept++; else if (why === "gone") f.gone++; else if (why === "none") f.none++; else if (why === false) f.down++; else f.none++;
    clearTimeout(f.t);
    f.t = setTimeout(() => {
      const legs = (k) => k + (k === 1 ? " leg" : " legs");
      const parts = [];
      if (f.none) parts.push(legs(f.none) + " with no mapped trail to follow (drag the point, or tap the hollow dot to add one between)");
      if (f.detour) parts.push(legs(f.detour) + " where the mapped trail goes a long way round (tap a point where you cross)");
      if (f.far) parts.push(legs(f.far) + " too long for one leg (tap a point between)");
      if (f.gone) parts.push(legs(f.gone) + " cut back: the point moved past most of the trail they followed (to ask again, nudge the point, or switch Follow trails off and on)");
      if (f.kept) parts.push(legs(f.kept) + " keeping the earlier path, which could not be re-followed between its points (nudge one to ask again)");
      if (f.down) parts.push(legs(f.down) + " the trail router didn't answer for (offline, or busy: move the point a little, or switch Follow trails off and on, to ask again)");
      const total = f.none + f.far + f.down + f.detour + f.kept + f.gone;
      say(tx((total === 1 ? "One leg could not be followed: " : total + " legs could not be followed: ") + parts.join("; ") + "."));
      fails.current = { far: 0, none: 0, down: 0, detour: 0, kept: 0, gone: 0, t: null };
    }, 700);
  };
  const abortRoute = (id) => { const c = routing.current.get(id); if (c) { c.abort(); routing.current.delete(id); } };
  // Ask the trails for the leg that ends at node `id`; the answer lands only if both anchors still stand.
  const startRoute = (id) => {
    const cur = nodesRef.current, k = cur.findIndex((n) => n.id === id);
    if (k < 1) return;
    const a = cur[k - 1].a, b = cur[k].a;
    abortRoute(id);
    const ctl = new AbortController();
    routing.current.set(id, ctl);
    // routeLeg never rejects; the catch at the END of the chain is so that no future change to the
    // landing below can leave a leg pending for good: it settles straight, and the error still surfaces.
    routeLeg(a, b, ctl.signal).then((via) => {
      if (ctl.signal.aborted) return;
      routing.current.delete(id);
      const now = nodesRef.current, j = now.findIndex((n) => n.id === id);
      if (j < 0) return;
      // Meanwhile it became the first anchor (the one before it was deleted): no leg to route.
      if (j === 0) { if (now[0].pending) { const next = now.slice(); next[0] = Object.assign({}, next[0], { via: [], pending: false }); setBoth(next); } return; }
      // The anchors moved on meanwhile: whoever moved them asked again, but never leave a leg dashed.
      if (!sameP(now[j].a, b) || !sameP(now[j - 1].a, a)) { if (now[j].pending) { const nx = now.slice(); nx[j] = Object.assign({}, nx[j], { pending: false }); setBoth(nx); } return; }
      const next = now.slice();
      // No answer: the leg keeps the routed points it was split from (a nudge with Follow on), else straight.
      // Said once per leg and reason (`told`): a cached answer on Undo/Redo or a Follow toggle is not news.
      const keptVia = Array.isArray(via) ? via : next[j].via;
      // The reason word: "none" for the router's own "no trail", so it is never mistaken for "nothing to tell".
      const why = Array.isArray(via) ? undefined : via === false ? false : (via === "far" || via === "detour") ? via : keptVia.length ? (next[j].stub === true ? "gone" : "kept") : "none";
      const fresh = why !== undefined && next[j].told !== why;
      next[j] = Object.assign({}, next[j], { via: keptVia, pending: false, told: Array.isArray(via) ? "ok" : why, stub: undefined }); // "ok": answered, even when every point trimmed away
      setBoth(next);
      // History froze this leg as still pending: give those snapshots the answer (and what was told) too,
      // or an Undo would ask again for a leg that had settled, or flatten it with Follow off since.
      const settle = (snap) => snap.map((x, k) => (x.id === id && x.pending && k > 0 && sameP(x.a, b) && sameP(snap[k - 1].a, a) ? Object.assign({}, x, { via: keptVia, pending: false, told: next[j].told, stub: undefined }) : x));
      undoRef.current = undoRef.current.map(settle); redoRef.current = redoRef.current.map(settle);
      if (fresh) noteFailure(why);
    }).catch((e) => { routing.current.delete(id); const now = nodesRef.current, j = now.findIndex((n) => n.id === id); if (j >= 0 && now[j].pending) { const nx = now.slice(); nx[j] = Object.assign({}, nx[j], { pending: false }); setBoth(nx); } throw e; });
  };
  // `idxs` are the legs this change touched: straight again, or routed when Follow trails is on
  // (`all` routes them whatever the switch says: Follow trails being switched on). A leg that was
  // itself routed is handled by its caller (insertAt splits it, moveAnchor and deleteAnchor keep its
  // points), never here.
  const withLegs = (next, idxs, all) => {
    const touched = [];
    idxs.forEach((i) => {
      if (i < 0 || i >= next.length) return;
      const want = propsRef.current.follow || !!all;
      // The first anchor has no leg; a leg of no length (the same spot twice) is straight and silent.
      const zero = i === 0 || sameP(next[i - 1].a, next[i].a);
      // A leg going straight gives up the answer it was waiting for, so the slot goes to a live leg.
      if (!(want && !zero)) abortRoute(next[i].id);
      next[i] = Object.assign({}, next[i], { via: (next[i].stub || next[i].told === false) && want && !zero ? next[i].via : [], pending: want && !zero, told: all && next[i].told !== false ? next[i].told : undefined });
      if (want && !zero) touched.push(next[i].id);
    });
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
  // Undo/Redo. A snapshot taken while a leg was still being looked up keeps that leg pending and
  // asks again, so Redo across an in-flight route does not quietly leave a straight line.
  // Legs a snapshot (or a handed-over shape) left pending: asked again with Follow trails on, left
  // straight with it off, so a line never reshapes itself against the switch.
  // Returns the list to show (pending legs cleared when Follow trails is off) and starts the asks.
  const clearPending = (list, skip) => list.map((n) => (n.pending && !(skip && skip.has(n.id)) ? Object.assign({}, n, { pending: false }) : n));
  const startPending = (list, skip) => list.forEach((n, i) => { if (n.pending && i > 0 && !(skip && skip.has(n.id))) startRoute(n.id); });
  // Undo/Redo keeps a request on its way when the restored snapshot holds that same leg still
  // pending between the same two anchors; every other request is given up.
  const restore = (snap) => {
    const cur = nodesRef.current, keep = new Set();
    snap.forEach((n, i) => { if (!n.pending || i < 1 || !routing.current.has(n.id)) return; const k = cur.findIndex((x) => x.id === n.id); if (k > 0 && sameP(cur[k].a, n.a) && sameP(cur[k - 1].a, snap[i - 1].a)) keep.add(n.id); });
    routing.current.forEach((c, id) => { if (!keep.has(id)) { c.abort(); routing.current.delete(id); } });
    setSelectedId(null);
    // One write: the snapshot with its Follow-off legs already cleared, then the asks for the rest.
    const on = propsRef.current.follow;
    setBoth(on ? snap : clearPending(snap, keep));
    if (on) startPending(snap, keep);
  };
  const undo = () => { if (!undoRef.current.length) return; redoRef.current.push(nodesRef.current); restore(undoRef.current.pop()); setHistN({ undo: undoRef.current.length, redo: redoRef.current.length }); };
  const redo = () => { if (!redoRef.current.length) return; undoRef.current.push(nodesRef.current); restore(redoRef.current.pop()); setHistN({ undo: undoRef.current.length, redo: redoRef.current.length }); };
  // A tap on the spot the line already ends at (Finish at C twice, a slow double tap) adds nothing.
  const append = (lat, lng) => { const cur = nodesRef.current, nn = node([lat, lng]); if (cur.length && distM(cur[cur.length - 1].a, nn.a) < 3) return; const next = cur.concat([nn]); commit(next, withLegs(next, [next.length - 1])); };
  // A point added ON a routed leg splits the routed points at the nearest one (nothing is asked of
  // the router, so nothing can come back straight); on a straight leg it is two straight legs, or
  // two routed ones when Follow trails is on.
  const insertAt = (i, lat, lng) => {
    const cur = nodesRef.current, nn = node([lat, lng]);
    // On (or within a few metres of) a neighbouring anchor: nothing to add, no stacked duplicate.
    if ((cur[i - 1] && distM(cur[i - 1].a, nn.a) < 3) || (cur[i] && distM(cur[i].a, nn.a) < 3)) return false;
    const next = cur.slice();
    // On a routed leg the routed points are split beside the nearest one (every point kept). With
    // Follow trails ON both halves are then routed afresh through the new anchor, since a point
    // dragged off the path means "the way goes HERE"; if the router cannot answer, the split stays,
    // so an outage never flattens a switchback that was already right.
    if (routed(cur[i])) {
      const via = cur[i].via;
      let best = 0, bd = Infinity;
      via.forEach((p, k) => { const d = distM(p, nn.a); if (d < bd) { bd = d; best = k; } });
      // Before or after its nearest routed point: whichever of the two path segments beside that
      // point the drop is closer to (a switchback doubles back, so distance to the previous anchor
      // would pick the wrong side and draw a tiny out-and-back).
      const segD = (p, q) => { if (!p || !q) return Infinity; const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; return Math.min(distM(nn.a, m), distM(nn.a, p), distM(nn.a, q)); };
      const before = via[best - 1] || cur[i - 1].a, after = via[best + 1] || cur[i].a;
      const cut = segD(before, via[best]) <= segD(via[best], after) ? best : best + 1;
      nn.via = via.slice(0, cut); nn.stub = cur[i].stub;
      next[i] = Object.assign({}, cur[i], { via: via.slice(cut), told: carry(cur[i].told) }); nn.told = next[i].told; // both halves carry what the leg was told: the same answer again is not news
      next.splice(i, 0, nn);
      // A point placed ON the path (a tap on the hollow dot, a drop a few metres from a routed point)
      // is an exact split: nothing to ask, even with Follow trails on.
      // How far the drop is from the leg AS DRAWN (metres, to the nearest segment), not from its nearest point: routed points can be 50 m apart.
      if (!propsRef.current.follow) { commit(next, []); return true; }
      const kx = Math.cos(nn.a[0] * Math.PI / 180) * 111320, ky = 110540, P = [nn.a[0] * ky, nn.a[1] * kx];
      const full = [cur[i - 1].a].concat(via, [cur[i].a]);
      let offM = Infinity;
      for (let k = 1; k < full.length; k++) { const A = [full[k - 1][0] * ky, full[k - 1][1] * kx], B = [full[k][0] * ky, full[k][1] * kx]; const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / l2)) : 0; offM = Math.min(offM, Math.hypot(P[0] - (A[0] + t * dx), P[1] - (A[1] + t * dy))); }
      // ...unless the leg was being re-asked (a moved anchor): then both halves are, in its place.
      if (offM < 15) { abortRoute(cur[i].id); if (!cur[i].pending) { commit(next, []); return true; } }
      const touched = [];
      [i, i + 1].forEach((k) => { next[k] = Object.assign({}, next[k], { pending: true }); touched.push(next[k].id); });
      commit(next, touched);
      return true;
    }
    next.splice(i, 0, nn);
    const touched = withLegs(next, [i, i + 1]);
    // Both halves keep what the leg was told (withLegs forgets it for a changed leg): the note says to
    // shape a leg with no trail by hand, and the router's same answer for each half is not news.
    const told = carry(cur[i] ? cur[i].told : undefined);
    if (told !== undefined) [i, i + 1].forEach((k) => { if (next[k]) next[k] = Object.assign({}, next[k], { told }); });
    commit(next, touched);
    return true;
  };
  const moveAnchor = (id, lat, lng) => { const cur = nodesRef.current, i = cur.findIndex((n) => n.id === id); if (i < 0) return false; const at = round([lat, lng]); if ([cur[i - 1], cur[i + 1]].some((nb) => nb && distM(nb.a, at) < 3)) { deleteAnchor(id); return true; } /* dropped onto a neighbour: the two are one point, so the dragged one goes (never two anchors on one spot, nor a sub-metre leg) */ if (sameP(cur[i].a, at)) return false; /* a press and release is not a move */ const next = cur.slice(); next[i] = Object.assign({}, cur[i], { a: at, told: carry(cur[i].told) }); if (next[i + 1]) next[i + 1] = Object.assign({}, next[i + 1], { told: carry(next[i + 1].told) });
    // A routed leg beside the moved anchor keeps its points (they now end a few metres off, which
    // is honest). With Follow trails ON it is asked again and keeps them if the router cannot
    // answer; OFF asks nothing, as the switch promises. Other legs go straight, or route when ON.
    const touched = [], on = propsRef.current.follow;
    // With Follow off the routed points that sat within the moved distance of the anchor's OLD spot
    // are dropped, or the line would run out to the old spot and back: the rest of the path stays.
    const oldA = cur[i].a, movedM = distM(oldA, next[i].a);
    // Only the RUN of routed points next to the old spot (the end of the leg into it, the start of the
    // leg out of it), never a bend elsewhere that merely passes within reach.
    const trim = (via, k) => dropNear(via, oldA, k === i ? "end" : "start", movedM, next[i].a); // a trim that takes most of a leg is said ("gone")
    [i, i + 1].forEach((k) => { if (k < 1 || k >= next.length) return; const zero = sameP(next[k - 1].a, next[k].a); if (routed(cur[k]) && !zero) { const kept = trim(next[k].via, k), most = kept.length < cur[k].via.length / 2; next[k] = Object.assign({}, next[k], { via: kept, pending: on, stub: most }); if (on) touched.push(next[k].id); else { abortRoute(next[k].id); if (most) noteFailure("gone"); } } else { next[k] = Object.assign({}, next[k], { via: [], pending: on && !zero }); if (on && !zero) touched.push(next[k].id); else abortRoute(next[k].id); } });
    commit(next, touched); return true; };
  const deleteAnchor = (id) => { const cur = nodesRef.current, i = cur.findIndex((n) => n.id === id); if (i < 0) return; const next = cur.slice(); next.splice(i, 1); abortRoute(id); setSelectedId(null);
    // The merged leg keeps the routed points of both legs it joins (the deleted anchor is the one
    // point that goes); with Follow on it is asked again and keeps them if the router cannot answer.
    const wasRouted = routed(cur[i]) || routed(cur[i + 1]);
    if (wasRouted && i > 0 && i < next.length) {
      abortRoute(cur[i + 1].id); // the leg out of the deleted point is merged: its own answer is no longer wanted
      if (sameP(next[i - 1].a, next[i].a)) { next[i] = Object.assign({}, next[i], { via: [], pending: false, told: undefined }); commit(next, []); return; } // the two it joins are one spot: no leg
      next[i] = Object.assign({}, next[i], { via: dropNear(cur[i].via || [], cur[i].a, "end").concat(dropNear(cur[i + 1].via || [], cur[i].a, "start")), pending: !!propsRef.current.follow, stub: "joined", told: undefined }); commit(next, propsRef.current.follow ? [next[i].id] : []); return; }
    commit(next, withLegs(next, [i])); };
  // Clear gives up every answer still on its way, so a new line's legs do not queue behind dead ones.
  const clearAll = () => { if (!nodesRef.current.length) return; routing.current.forEach((c) => c.abort()); routing.current.clear(); setSelectedId(null); commit([], []); };
  // Switching Follow trails ON routes every leg that is still straight, and every stub (a routed leg a
  // move cut down to a few points, which the "straightened" note says this switch re-asks), as one
  // undoable step (the help says it bends each leg, so it does); OFF leaves what is drawn alone, and stops asking for
  // the legs still being looked up, so the line does not reshape itself after the switch.
  const toggleFollow = () => {
    const on = !follow;
    followDefault = on; setFollow(on); propsRef.current.follow = on;
    if (!on) {
      routing.current.forEach((c) => c.abort()); routing.current.clear();
      const cur = nodesRef.current;
      if (cur.some((x) => x.pending)) setBoth(cur.map((x) => (x.pending ? Object.assign({}, x, { pending: false }) : x)));
      return;
    }
    const cur = nodesRef.current, idxs = [];
    cur.forEach((x, i) => { if (i > 0 && ((!routed(x) && x.told !== "ok") || x.stub || x.told === false) && !x.pending && !sameP(cur[i - 1].a, x.a)) idxs.push(i); /* ...and a leg the router never answered for, kept points or not: the note says this switch asks again */ });
    if (!idxs.length) return;
    const next = cur.slice();
    commit(next, withLegs(next, idxs, true));
  };
  const api = useRef(null);
  api.current = { append, insertAt, moveAnchor, select: (id) => setSelectedId((s) => (s === id ? null : id)), flushRedraw: () => { if (redrawAfterDrag.current) { redrawAfterDrag.current = false; setZoomN((z) => z + 1); } } };
  const exitFullscreen = () => { setFullscreen(false); setTimeout(() => { try { expandBtn.current && expandBtn.current.focus({ preventScroll: true }); } catch (e) {} }, 0); };

  // The Leaflet map is rebuilt when the drawer goes full screen or comes back (the box it lives in
  // changes), keeping its centre and zoom, as the route map does (GPXMap).
  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || !mapDiv.current || mapRef.current || !window.L) return;
      const L = window.L, map = L.map(mapDiv.current, { attributionControl: false, doubleClickZoom: false });
      applyBaseLayer(map, tileRef, baseLayer);
      const v = viewRef.current;
      if (v) map.setView(v.center, v.zoom); else fitView(map);
      // The climber switched to Paste or Upload before Leaflet had loaded: the box is 0×0 and the fit
      // above collapsed to zoom 0, so it is done again when the Draw tab returns.
      builtHidden.current = !(mapDiv.current.clientWidth > 0 && mapDiv.current.clientHeight > 0);
      // Leaflet swallows the click that ends a marker drag; the guard is for the browsers where it does not.
      // A double tap is ONE point: with doubleClickZoom off Leaflet still fires click twice, and the
      // first version zoomed AND dropped two points on top of each other.
      map.on("click", (e) => { if (tapOk(e, "map")) api.current.append(e.latlng.lat, e.latlng.lng); });
      // Which legs are long enough for a midpoint handle depends on the zoom, so a zoom redraws.
      map.on("zoomend", () => setZoomN((z) => z + 1));
      mapRef.current = map; genRef.current += 1; setReady(genRef.current);
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 220);
    };
    loadLeaflet(init, () => setMapFail(true));
    const ft = setTimeout(() => { if (!cancelled && !mapRef.current) setMapFail(true); }, 9000);
    return () => {
      cancelled = true; clearTimeout(ft);
      const m = mapRef.current;
      if (m) { try { viewRef.current = { center: m.getCenter(), zoom: m.getZoom() }; m.remove(); } catch (e) {} mapRef.current = null; tileRef.current = null; drawn.current = []; }
      setReady(0);
    };
  }, [fullscreen]); // eslint-disable-line react-hooks/exhaustive-deps -- rebuilt on `fullscreen` ONLY; the base layer is applied by its own effect below and the pins/line by the redraw effect
  useEffect(() => { if (mapRef.current) applyBaseLayer(mapRef.current, tileRef, baseLayer); }, [baseLayer]);
  // Escape leaves full screen. Listened for on the dialog itself (focused when it opens), not the
  // window, so a key pressed in the host sheet's inputs behind it is not ours.
  useEffect(() => {
    const el = fullscreen ? dialogRef.current : null;
    if (!el) return undefined;
    try { el.focus({ preventScroll: true }); } catch (e) {}
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); exitFullscreen(); return; }
      // A modal keeps Tab inside it: the sheet behind (its date box, its Submit) must not take focus.
      if (e.key === "Tab") {
        const f = Array.from(el.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !L || !ready) return;
    // Never tear the layers out from under a drag (a route answer can land mid-drag): redraw when it ends.
    if (dragging.current) { redrawAfterDrag.current = true; return; }
    drawn.current.forEach((l) => { try { map.removeLayer(l); } catch (e) {} });
    drawn.current = [];
    const keep = (l) => { l.addTo(map); drawn.current.push(l); return l; };
    const dot = (size, fill, border, ring) => L.divIcon({ className: "", iconSize: [HIT, HIT], iconAnchor: [HIT / 2, HIT / 2], html: '<div style="width:' + size + "px;height:" + size + "px;margin:" + (HIT - size) / 2 + "px;border-radius:50%;background:" + fill + ";border:2px solid " + border + ";box-sizing:border-box;box-shadow:" + (ring ? "0 0 0 3px " + ring + "," : "") + '0 1px 4px rgba(0,0,0,.5)"></div>' });
    const pin = (p, label, color) => keep(L.marker([p.lat, p.lng], { keyboard: false, interactive: false, icon: L.divIcon({ className: "", iconSize: [24, 24], iconAnchor: [12, 12], html: '<div style="width:24px;height:24px;border-radius:50%;background:' + color + ';border:2px solid #fff;color:#fff;font:700 12px/20px system-ui;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.5)">' + label + "</div>" }) }));
    const { start: s0, end: e0 } = propsRef.current;
    if (s0) pin(s0, mk.start, C.accent);
    if (e0) pin(e0, mk.end, C.warning);
    // One polyline per leg, dashed while its trail is being looked up; a wide invisible twin takes the taps.
    for (let i = 1; i < nodes.length; i++) {
      const leg = legPts(nodes, i), n = nodes[i];
      keep(L.polyline(leg, { color: C.warning, weight: 4, opacity: 0.95, dashArray: n.pending ? "6 8" : null, interactive: false }));
      keep(L.polyline(leg, { color: C.border, weight: 18, opacity: 0, bubblingMouseEvents: false })).on("click", (e) => { if (!tapOk(e, "leg")) return; const q = onLeg(map, L, leg, e.latlng); api.current.insertAt(i, q.lat, q.lng); });
      // The hollow dot: drag it out (or tap it) to add an anchor on this leg. Not on a leg shorter
      // than its own hit box on screen, where it would sit on the anchors and steal their taps.
      // Measured along the leg as drawn (a routed leg can loop far from two close anchors), and the
      // handle sits halfway along it, not at the median point of an unevenly sampled path.
      const px = leg.map((p) => map.latLngToContainerPoint(p));
      const seg = []; let tot = 0;
      for (let k = 1; k < px.length; k++) { const d = Math.hypot(px[k].x - px[k - 1].x, px[k].y - px[k - 1].y); seg.push(d); tot += d; }
      if (tot < HIT + 12) continue;
      let want = tot / 2, k = 0;
      while (k < seg.length - 1 && want > seg[k]) { want -= seg[k]; k++; }
      const f = seg[k] ? Math.min(1, want / seg[k]) : 0, m0 = leg[k], m1 = leg[k + 1];
      const h = keep(L.marker([m0[0] + (m1[0] - m0[0]) * f, m0[1] + (m1[1] - m0[1]) * f], { draggable: true, keyboard: false, bubblingMouseEvents: false, icon: dot(14, C.bg70, C.warning) }));
      h.on("dragstart", () => { dragging.current = true; });
      h.on("dragend", () => { dragEndAt.current = Date.now(); dragging.current = false; const q = h.getLatLng(); if (!api.current.insertAt(i, q.lat, q.lng)) redrawAfterDrag.current = true; api.current.flushRedraw(); }); // a drop ON an anchor adds nothing, and the handle must not stay where it was dropped
      h.on("click", (e) => { if (!tapOk(e, "handle")) return; const q = h.getLatLng(); api.current.insertAt(i, q.lat, q.lng); });
    }
    nodes.forEach((n, i) => {
      const last = i === nodes.length - 1, sel = n.id === selectedId;
      const m = keep(L.marker(n.a, { draggable: true, keyboard: false, autoPan: true, bubblingMouseEvents: false, icon: dot(last ? 18 : 14, C.warning, "#fff", sel ? C.accent : null) }));
      m.on("dragstart", () => { dragging.current = true; });
      m.on("dragend", () => { dragEndAt.current = Date.now(); dragging.current = false; const q = m.getLatLng(); if (api.current.moveAnchor(n.id, q.lat, q.lng)) redrawAfterDrag.current = false; api.current.flushRedraw(); }); // a move redraws by itself; only a press-and-release needs the deferred one
      // The second half of a double tap on empty map lands on the anchor the first half just made.
      m.on("click", (e) => { if (Date.now() - (n.born || 0) < 350) return; if (tapOk(e, "anchor")) api.current.select(n.id); });
    });
  // The pins are read through propsRef and keyed by VALUE (startKey/endKey): the host builds fresh
  // {lat,lng} objects every render, and keying on the objects rebuilt every layer per tick.
  }, [nodes, ready, zoomN, startKey, endKey, selectedId, C.accent, C.warning, C.bg70, C.border, mk.start, mk.end]);

  const flat = flatten(nodes), n = flat.length, selected = selectedId != null && nodes.some((x) => x.id === selectedId);
  const anyPending = nodes.some((x) => x.pending);
  const atEnd = !!(end && n && distM(flat[n - 1], round([end.lat, end.lng])) < 3); // the same reach as append's "nothing to add"
  const btn = { padding: "8px 11px", borderRadius: 8, border: "1px solid " + C.border, background: C.bg70, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const off = { opacity: 0.4, cursor: "default" };
  const b = (on) => (on ? btn : Object.assign({}, btn, off));
  const layerBtns = ready ? <div style={{ position: "absolute", top: 7, left: 7, zIndex: 1000, display: "flex", gap: 3 }}>{[["topo", "Topo"], ["sat", "Satellite"], ["street", "Street"]].map(([k, lbl]) => <button key={k} onClick={() => setBaseLayer(k)} aria-current={baseLayer === k ? "true" : undefined} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid " + (baseLayer === k ? C.accent : C.border), background: C.bg, color: baseLayer === k ? C.accent : C.text70, fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>{lbl}</button>)}</div> : null;
  const status = n ? (n < need ? n + " of at least " + need + " points" : n + " points") + " · " + fmtTrailLen(pathLenM(flat)) + (anyPending ? " · following the trail…" : tx(" · tap to keep going")) : start ? tx("Tap the map along the trail, starting at " + mk.start) : tx("Tap where you park, then along the trail to " + mk.endName);
  const mapBox = (
    <div style={{ position: "relative", flex: fullscreen ? 1 : "none", minHeight: fullscreen ? 160 : 0 }}>
      <div ref={mapDiv} role="application" aria-label={tx("Map: tap to add a point to the trail, drag a point to move it")} style={{ height: fullscreen ? "100%" : 300, borderRadius: 9, border: "1px solid " + C.border, overflow: "hidden", background: "#0a0f1a", cursor: "crosshair" }} />
      {!ready ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.text70, fontSize: 13, pointerEvents: "none", textAlign: "center", padding: 16 }}>{mapFail ? "The map couldn't load. Upload or paste a recorded track instead." : "Loading map…"}</div> : null}
      {layerBtns}
      {/* ⤢ to go full screen and ✕ to leave it, in the SAME spot on the map, as the area map has it. */}
      {fullscreen ? null : <button ref={expandBtn} onClick={() => setFullscreen(true)} aria-label="Full screen" title="Full screen" style={Object.assign({}, POP_CLOSE_MEDIA, { position: "absolute", top: 7, right: 7, zIndex: 1000, background: C.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" })}>⤢</button>}
      {ready ? <div style={{ position: "absolute", bottom: 7, left: 7, right: 7, zIndex: 1000, background: "rgba(13,17,23,0.85)", borderRadius: 7, padding: "4px 8px", fontSize: 12, color: "#fff", textAlign: "center", pointerEvents: "none" }}>{status}</div> : null}
    </div>
  );
  const tools = (
    <>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {start ? <button onClick={() => { if (!nodesRef.current.length) append(start.lat, start.lng); }} disabled={n > 0} style={b(!n)}>{"Start at " + mk.start}</button> : null}
        {end ? <button onClick={() => append(end.lat, end.lng)} disabled={!n || atEnd} style={b(n && !atEnd)}>{"Finish at " + mk.end}</button> : null}
        <button onClick={undo} disabled={!histN.undo} style={b(histN.undo)}>Undo</button>
        <button onClick={redo} disabled={!histN.redo} style={b(histN.redo)}>Redo</button>
        {selected ? <button onClick={() => deleteAnchor(selectedId)} style={Object.assign({}, btn, { border: "1px solid " + C.error, color: C.error })}>Delete point</button> : null}
        <button onClick={clearAll} disabled={!n} style={b(n)}>Clear</button>
        <button onClick={toggleFollow} aria-pressed={follow} style={Object.assign({}, btn, follow ? { border: "1px solid " + C.accent, color: C.accent } : {})}>{"Follow trails" + (follow ? ": on" : ": off")}</button>
      </div>
      {note ? <div role="status" style={{ fontSize: 12, color: C.warning, margin: "8px 0 0", lineHeight: 1.45 }}>{note}</div> : null}
      <p style={{ fontSize: 12, color: C.text70, margin: "8px 0 0", lineHeight: 1.45 }}>
        {start ? <><b style={{ color: C.accent }}>{mk.start}</b>{" is " + mk.startName + (end ? " and " : ". ")}</> : null}{end ? <><b style={{ color: C.warning }}>{mk.end}</b>{(start ? " " : " is ") + mk.endName + ". "}</> : null}
        {tx("Tap along the trail the way you walk it. Drag a point to move it, drag or tap the hollow dot between two points to add one, tap a point and Delete to remove it.")} <b>Follow trails</b> {tx("bends each leg along the mapped footpaths between your points, so a switchbacking path takes two taps.")} Zoom in: Topo shows mapped paths, Satellite shows the ones that aren't.
      </p>
    </>
  );
  if (fullscreen) {
    return createPortal(<div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title || "Draw the trail"} style={{ position: "fixed", inset: 0, zIndex: 10000, background: C.bg, padding: 12, display: "flex", flexDirection: "column", boxSizing: "border-box", overscrollBehavior: "contain" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title || "Draw the trail"}</span>
        <button onClick={exitFullscreen} aria-label="Close full-screen map" style={POP_CLOSE}>✕</button>
      </div>
      {mapBox}
      {/* On a short screen (a phone on its side) the tools scroll under a map that keeps at least 160px. */}
      <div style={{ flexShrink: 1, minHeight: 0, maxHeight: "45%", overflowY: "auto", overscrollBehavior: "contain" }}>{tools}</div>
    </div>, document.body);
  }
  return <div>{mapBox}{tools}</div>;
}
