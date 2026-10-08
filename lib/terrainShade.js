/* THE SHADE MAP's arithmetic: which ground the TERRAIN puts in shadow, for one position of the sun.
   Pure (no DOM, no fetch), so check:conditions-score runs it on a made-up ridge with known answers.
   The fetch and the drawing live in lib/ShadeMap.jsx.

   Heights are the open Terrain Tiles (terrarium encoding: metres = R*256 + G + B/256 - 32768) on the
   map's own 256-px Web-Mercator grid. At zoom 14 a pixel is ~9.5 m × cos(latitude) — about 7 m in
   the northern US — sampled from the USGS 3DEP 10 m model across the US and from each country's own
   model elsewhere. It knows ridges, canyon walls and the cliff band as a slope; it does not know a
   tree, a roof of rock, or which way one particular face of a boulder points.

   Why we compute it rather than embed a shade-map service: that needs a paid key, and this is a
   few hundred lines over free tiles. */
import { sunPosition } from "./conditionsScore.js";

export const SHADE_Z = 14;
// A 4×4 block of tiles chosen so the pin sits 1.5-2.5 tiles from every edge: at least ~2.5 km of
// terrain on every side at 47°N. A ridge farther out than that can still shade the pin at a very
// low sun, which the card says.
export const SHADE_TILES = 4;
export const TERRAIN_TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/";

export function tileFrac(lat, lng, z) {
  const n = Math.pow(2, z), s = Math.sin(lat * Math.PI / 180);
  return { x: (lng + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}
export function tileLatLng(x, y, z) {
  const n = Math.pow(2, z);
  return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI, lng: x / n * 360 - 180 };
}

// The block of tiles around a crag, and where the crag falls on it (in grid pixels).
export function shadeGrid(lat, lng) {
  const f = tileFrac(lat, lng, SHADE_Z), half = SHADE_TILES / 2;
  const x0 = Math.round(f.x) - half, y0 = Math.round(f.y) - half, W = SHADE_TILES * 256;
  const tiles = [];
  for (let j = 0; j < SHADE_TILES; j++) for (let i = 0; i < SHADE_TILES; i++) tiles.push({ x: x0 + i, y: y0 + j, ox: i * 256, oy: j * 256 });
  return {
    key: SHADE_Z + "/" + x0 + "/" + y0, z: SHADE_Z, x0: x0, y0: y0, W: W, H: W, tiles: tiles,
    pxM: 40075016.686 * Math.cos(lat * Math.PI / 180) / (256 * Math.pow(2, SHADE_Z)),
    nw: tileLatLng(x0, y0, SHADE_Z), se: tileLatLng(x0 + SHADE_TILES, y0 + SHADE_TILES, SHADE_Z),
    pin: { c: Math.floor((f.x - x0) * 256), r: Math.floor((f.y - y0) * 256) },
  };
}

// One tile's RGBA into the grid. A pixel with no data stays NaN: "not measured", never sea level.
export function decodeTerrarium(rgba, E, W, ox, oy) {
  for (let r = 0; r < 256; r++) for (let c = 0; c < 256; c++) {
    const k = (r * 256 + c) * 4;
    E[(oy + r) * W + ox + c] = rgba[k] * 256 + rgba[k + 1] + rgba[k + 2] / 256 - 32768;
  }
}

/* The shadow of the terrain for a sun at azimuth `az` (degrees clockwise from north) and altitude
   `alt` (degrees above the horizon). 0 = lit, 1 = in shade, 2 = no height known.

   A SWEEP, not a ray per pixel: lines run across the grid AWAY from the sun, one pixel apart, and
   each carries the height of the shadow surface — the highest terrain seen so far, sinking by
   tan(alt) per metre travelled. A pixel under that surface is in shade. Each pixel is visited
   once per line crossing it, so a whole 1024² grid costs a couple of million steps, whatever the
   sun's height; a ray per pixel at a low sun costs hundreds of millions. A slope that faces away
   from the sun more steeply than the sun is high falls under the surface too, so it needs no
   separate "self-shade" test. */
export function shadeMask(E, W, H, pxM, az, alt, out) {
  const m = out || new Uint8Array(W * H);
  if (!(alt > 0)) { m.fill(1); for (let i = 0; i < m.length; i++) if (E[i] !== E[i]) m[i] = 2; return m; }
  m.fill(0);
  const a = az * Math.PI / 180, t = Math.tan(alt * Math.PI / 180);
  const dx = -Math.sin(a), dy = Math.cos(a); // away from the sun; grid rows run SOUTH
  const xMajor = Math.abs(dx) >= Math.abs(dy);
  const nMaj = xMajor ? W : H, nMin = xMajor ? H : W;
  const fwd = (xMajor ? dx : dy) >= 0;
  const slope = xMajor ? dy / Math.abs(dx) : dx / Math.abs(dy);
  const drop = Math.sqrt(1 + slope * slope) * pxM * t;
  const span = slope * (nMaj - 1);
  const kLo = Math.floor(Math.min(0, -span)) - 1, kHi = Math.ceil(Math.max(nMin - 1, nMin - 1 - span)) + 1;
  for (let k = kLo; k <= kHi; k++) {
    let s = -Infinity, entered = false;
    for (let j = 0; j < nMaj; j++) {
      // k is whole, so consecutive lines land on consecutive rows: every pixel, exactly once.
      const mi = Math.round(k + slope * j);
      if (mi < 0 || mi >= nMin) { if (entered) break; continue; }
      entered = true;
      const ma = fwd ? j : nMaj - 1 - j;
      const idx = xMajor ? mi * W + ma : ma * W + mi;
      const e = E[idx];
      s -= drop;
      if (e !== e) { m[idx] = 2; continue; }
      if (e >= s) s = e; else m[idx] = 1;
    }
  }
  return m;
}

/* Is the ground at grid pixel (c, r) in the terrain's shade? A ray toward the sun, one pixel at a
   time, until it leaves the grid or rises above its highest point. true / false, or null when the
   pin's own height is unknown. */
export function pointShaded(E, W, H, pxM, c, r, az, alt, emax) {
  if (!(alt > 0)) return true;
  const e0 = E[r * W + c];
  if (e0 !== e0) return null;
  const a = az * Math.PI / 180, t = Math.tan(alt * Math.PI / 180), ux = Math.sin(a), uy = -Math.cos(a);
  for (let d = 1; ; d++) {
    const cc = Math.round(c + ux * d), rr = Math.round(r + uy * d);
    if (cc < 0 || rr < 0 || cc >= W || rr >= H) return false;
    const need = e0 + d * pxM * t;
    if (emax != null && need > emax) return false;
    const e = E[rr * W + cc];
    if (e === e && e > need) return true;
  }
}

// Where a coordinate falls on the grid, in pixels; null when it is off the block of terrain.
export function gridPx(grid, lat, lng) {
  const f = tileFrac(lat, lng, grid.z), c = Math.floor((f.x - grid.x0) * 256), r = Math.floor((f.y - grid.y0) * 256);
  return c >= 0 && r >= 0 && c < grid.W && r < grid.H ? { c: c, r: r } : null;
}

/* A SUMMIT is read at the model's own high point: the highest pixel within `rad` of the pin. The
   pixel under a summit pin is often below the model's top, and that top then "shades" it: Colchuck
   Peak's pin sat 6 m off and read first sun 8:30 AM against a 7:10 sunrise and a 2° horizon; The
   Tooth's sat 20 m down its north face and lost the midday sun (both measured 2026-10-07, hence
   30 m). Only a summit: beside a base or camp pin, a wall one pixel away is real shade. */
export const SUMMIT_SNAP_M = 30;
export function highestNear(E, W, H, px, rad) {
  let best = px, bh = E[px.r * W + px.c];
  for (let r = Math.max(0, px.r - rad); r <= Math.min(H - 1, px.r + rad); r++) for (let c = Math.max(0, px.c - rad); c <= Math.min(W - 1, px.c + rad); c++) {
    if ((r - px.r) * (r - px.r) + (c - px.c) * (c - px.c) > rad * rad) continue;
    const h = E[r * W + c];
    if (h === h && !(h <= bh)) { bh = h; best = { c: c, r: r }; }
  }
  return best;
}

/* STEEP GROUND: 1 where the slope is 35° or more. Avalanche centres put wet snow sliding on sunlit
   slopes from about 35° (Utah: stay off and out from under anything approaching 35° once the sun
   wets it; loose snow needs 35-40° to start). From the heights by central differences, so a short
   step steeper than the model's ~7 m spacing reads gentler than it is. */
export const STEEP_DEG = 35;
export function steepMask(E, W, H, pxM) {
  const m = new Uint8Array(W * H), t = Math.tan(STEEP_DEG * Math.PI / 180) * 2 * pxM;
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
    const i = r * W + c, dx = E[i + 1] - E[i - 1], dy = E[i + W] - E[i - W];
    if (dx === dx && dy === dy && dx * dx + dy * dy >= t * t) m[i] = 1;
  }
  return m;
}

/* THE FACE A ROUTE CLIMBS, and when the sun first reaches the ground that sheds onto it. Research
   2026-10-08: rock, ice and wet snow start to move once direct sun reaches the steep slopes ABOVE a
   party — the ground that drains onto the line, up to the ridge — after a lag of minutes to hours
   that no source pins down, so guides and rescuers say to be past a section before the sun reaches
   the slopes above it (Portland Mountain Rescue on Hood; the AAC on Torreys' Dead Dog and Whitehorn;
   the Goûter couloir seismic record).
   With almost no route carrying a base-of-climb pin (1 of ~935 snow/ice routes), the LINE is the
   fall line from the summit down the route's aspect — on a couloir or a face, the gully itself; on
   a ridge, one flank (said on screen). The ground that sheds onto it is found by steepest descent
   (D8): each pixel's water, and so its loose rock, follows the steepest drop to a neighbour, and a
   pixel whose path reaches the line feeds it at that ENTRY point. Debris entering below a party
   passes below it, so a source binds at its entry height, not its own. A first draft took every
   steep slope within 45° of the aspect seen from the summit: it took in the top of Willis Wall
   beside Liberty Ridge, lit at sunrise, and read "leave camp 7:15 PM" for a 12 h climb.
   [{ e: metres, at: utc ms }]: per 25 m of entry height, the first instant (every `stepMin` from
   sunrise) the sun reaches a steep (35°+) pixel feeding it, every second pixel; a band never lit is
   left out. `minE` (metres) ends the line where the push starts. null when the top has no height. */
export function d8(E, W, H) {
  const down = new Int32Array(W * H).fill(-1), R2 = Math.SQRT1_2;
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
    const i = r * W + c, e = E[i];
    if (e !== e) continue;
    let best = 0, to = -1;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const j = i + dr * W + dc, d = (e - E[j]) * (dr && dc ? R2 : 1);
      if (d > best) { best = d; to = j; }
    }
    down[i] = to;
  }
  return down;
}
export function faceSunBands(T, grid, top, aspectDeg, lat, lng, rise, set, stepMin, minE) {
  const E = T.E, W = grid.W, H = grid.H, pxM = grid.pxM, e0 = E[top.r * W + top.c];
  if (e0 !== e0) return null;
  const down = T.down || (T.down = d8(E, W, H));
  /* The line: from three pixels (~20 m) out from the top along the aspect, downhill to where the push
     starts. Not the top itself: its neighbours belong to every face, and marking them handed the line
     the first light on all of them (a pyramid's north face read sunrise in October). */
  const a0 = aspectDeg * Math.PI / 180, line = new Uint8Array(W * H), mark = function (i) { const r = (i / W) | 0, c = i % W; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < H && cc < W) line[rr * W + cc] = 1; } };
  let p = Math.round(top.r - Math.cos(a0) * 3) * W + Math.round(top.c + Math.sin(a0) * 3);
  for (let n = 0; p >= 0 && n < W * H && !(E[p] < minE); n++) { mark(p); p = down[p]; }
  // Where each pixel's path first meets the line (-1: it never does), filled along each path once.
  const entry = new Int32Array(W * H).fill(-2), path = [];
  for (let i = 0; i < W * H; i++) {
    let q = i;
    while (q >= 0 && entry[q] === -2 && !line[q]) { path.push(q); q = down[q]; }
    const ent = q < 0 ? -1 : line[q] ? q : entry[q];
    if (q >= 0 && line[q]) entry[q] = q;
    while (path.length) entry[path.pop()] = ent;
  }
  const tt = Math.tan(STEEP_DEG * Math.PI / 180) * 2 * pxM, cand = [];
  for (let r = 1; r < H - 1; r += 2) for (let c = 1; c < W - 1; c += 2) {
    const i = r * W + c, en = entry[i];
    if (en < 0 || !(E[en] >= minE) || !(E[en] <= e0)) continue;
    const dx = E[i + 1] - E[i - 1], dy = E[i + W] - E[i - W];
    if (!(dx * dx + dy * dy >= tt * tt)) continue;
    cand.push(c, r, E[en], Math.atan(Math.sqrt(dx * dx + dy * dy) / (2 * pxM)), Math.atan2(-dx, dy));
  }
  const n = cand.length / 5, first = new Float64Array(n).fill(NaN), step = (stepMin || 10) * 60e3;
  let left = n;
  for (let u = rise; u <= set && left; u += step) {
    const sp = sunPosition(lat, lng, u);
    if (!(sp.alt > 0)) continue;
    const sa = Math.sin(sp.alt * Math.PI / 180), ca = Math.cos(sp.alt * Math.PI / 180), az = sp.az * Math.PI / 180;
    for (let k = 0; k < n; k++) {
      if (first[k] === first[k]) continue;
      // Direct sun needs the slope itself to face it (a face turned away is in its own shadow, which
      // the terrain test cannot see), and no terrain in the way.
      const sl = cand[5 * k + 3];
      if (Math.cos(sl) * sa + Math.sin(sl) * ca * Math.cos(az - cand[5 * k + 4]) <= 0) continue;
      if (pointShaded(E, W, H, pxM, cand[5 * k], cand[5 * k + 1], sp.az, sp.alt, T.emax) === false) { first[k] = u; left--; }
    }
  }
  /* A height on the line is in the sun's reach once FACE_MIN_LIT sampled pixels feeding it at or
     above that height are lit (each stands for 4 pixels: ~1,500 m², a 40 m patch). Fewer is a sliver
     of ridge the model cannot resolve: one NE-facing pixel beside a pyramid's top, draining onto its
     NORTH line by a tie in D8, read sunrise on a face that sees no sun all day. Not a published
     number — the model's own floor. */
  const lit = [];
  for (let k = 0; k < n; k++) if (first[k] === first[k]) lit.push([cand[5 * k + 2], first[k]]);
  lit.sort(function (x, y) { return y[0] - x[0]; });
  const out = [], times = [];
  let top25 = null;
  for (let k = 0; k < lit.length; k++) {
    const b = Math.floor(lit[k][0] / 25);
    if (k === 0 || b !== Math.floor(lit[k - 1][0] / 25)) top25 = lit[k][0];
    // The FACE_MIN_LIT earliest times among the sources entering at or above this height.
    times.push(lit[k][1]); times.sort(function (x, y) { return x - y; }); if (times.length > FACE_MIN_LIT) times.pop();
    const last = k === lit.length - 1 || Math.floor(lit[k + 1][0] / 25) !== b;
    if (last && times.length === FACE_MIN_LIT) out.push({ e: top25, at: times[FACE_MIN_LIT - 1] });
  }
  return out.sort(function (x, y) { return x.e - y.e; });
}
export const FACE_MIN_LIT = 8;
/* The way a route's face looks, in degrees from north, from its `aspect` text — only when that text
   names one direction (or two neighbours): "NE", "S/SW", "South / Southeast", "N (summit tower faces
   E)". Prose, "varies" or a list of three is null, and the start then counts no sun. */
const FACE_DEG = { n: 0, nne: 22.5, ne: 45, ene: 67.5, e: 90, ese: 112.5, se: 135, sse: 157.5, s: 180, ssw: 202.5, sw: 225, wsw: 247.5, w: 270, wnw: 292.5, nw: 315, nnw: 337.5, north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315 };
export function faceBearing(text) {
  const s = String(text || "").replace(/\([^)]*\)/g, " ").trim().toLowerCase();
  if (!s || s.length > 24) return null;
  const toks = s.split(/\s*(?:\/|,|\bto\b|\band\b)\s*/).map(function (t) { return t.replace(/[\s-]+/g, ""); }).filter(Boolean);
  if (!toks.length || toks.length > 2 || toks.some(function (t) { return !(t in FACE_DEG); })) return null;
  if (toks.length === 1) return FACE_DEG[toks[0]];
  const a = FACE_DEG[toks[0]], b = FACE_DEG[toks[1]], d = ((b - a + 540) % 360) - 180;
  return Math.abs(d) > 90 ? null : (a + d / 2 + 360) % 360;
}

/* When the sun reaches a point over one day, every `stepMin` minutes from sunrise to sunset: a list
   of [from, to] instants (utc ms). Geometry only — a clear sky. `at` is the grid pixel to read
   (default: the pin the grid was built around). */
export function pinSunSpans(T, grid, lat, lng, rise, set, stepMin, at) {
  const step = (stepMin || 10) * 60e3, spans = [], px = at || grid.pin;
  let on = null;
  for (let u = rise; u <= set; u += step) {
    const sp = sunPosition(lat, lng, u);
    const sh = pointShaded(T.E, grid.W, grid.H, grid.pxM, px.c, px.r, sp.az, sp.alt, T.emax);
    if (sh === null) return null;
    if (!sh && on == null) on = u;
    if (sh && on != null) { spans.push([on, u]); on = null; }
  }
  if (on != null) spans.push([on, set]);
  return spans;
}

/* The credit a terrain source's LICENCE makes a condition of use — and only that (owner rule
   2026-10-04: credit only where legally required). Keyed by the folder each tile names in its
   `x-amz-meta-x-imagery-sources` header (checked against live tiles 2026-10-07). The US 3DEP/NED
   models (ned, ned13, ned19), SRTM, GMTED and ETOPO1 are public domain and need none. */
export const TERRAIN_LICENCE_CREDIT = {
  nrcan_cdem: "Contains information licensed under the Open Government Licence – Canada",
  eudem: "Produced using Copernicus data and information funded by the European Union - EU-DEM layers",
  uk_lidar: "© Environment Agency copyright and/or database right 2015. All rights reserved",
  kartverket: "© Kartverket",
  nzlinz: "Crown copyright © Land Information New Zealand and the New Zealand Government",
  austria: "© offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich",
  pgdc_5m: "DEM created from DigitalGlobe, Inc. imagery and funded under National Science Foundation awards 1043681, 1559691 and 1542736",
};
export function terrainCredits(headers) {
  const out = [];
  (headers || []).forEach(function (h) {
    String(h || "").split(",").forEach(function (s) {
      const k = s.trim().split("/")[0], c = TERRAIN_LICENCE_CREDIT[k];
      if (c && out.indexOf(c) < 0) out.push(c);
    });
  });
  return out;
}
