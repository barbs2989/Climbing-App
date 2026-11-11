/* SLOPE ANGLE — the route map's overlay that colours ground by how steep it is, in the bands avalanche
   courses teach (competitor review item 23, owner 2026-11-11: "do what you recommend").

   Heights are the same open Terrain Tiles the shade map and the 3D view read (lib/terrainShade.js:
   terrarium encoding, ~7 m a pixel at zoom 14 in the northern US, from the USGS 3DEP 10 m model across
   the US). Slope is computed here, from the heights, by central differences — no slope-tile service:
   the ones that exist are proprietary (CalTopo, Gaia) or Alps-only with commercial limits.

   Honesty limits, said on screen: a slope is averaged over the model's spacing, so a short step or a
   cornice steeper than ~7 m reads gentler than it is; and below zoom 13 the coarser terrain would read
   every slope gentler still, so the layer draws nothing there and the legend says to zoom in. At zoom 13
   each map pixel takes the STEEPEST of the four zoom-14 pixels under it, so zooming out never hides a
   steep patch.

   The pure part (slopeGrid, slopeBand, SLOPE_BANDS) needs no DOM; the tile layer needs Leaflet. */
import { TERRAIN_TILE_URL, decodeTerrarium, terrainCredits } from "./terrainShade.js";

export const SLOPE_SRC_Z = 14;
export const SLOPE_MIN_Z = 13;

/* The bands, low to high. 27° is where slab avalanches start to become possible; most release on
   30–45°; above ~50° snow rarely builds up enough to slide as a slab. Colours follow the convention
   the major mapping apps share (yellow, orange, red, purple, then dark for the steepest rock). */
export const SLOPE_BANDS = [
  { min: 27, label: "27–29°", rgb: [244, 223, 72] },
  { min: 30, label: "30–34°", rgb: [247, 151, 46] },
  { min: 35, label: "35–44°", rgb: [226, 52, 52] },
  { min: 45, label: "45–49°", rgb: [168, 66, 205] },
  { min: 50, label: "50°+", rgb: [40, 32, 70] },
];

/* Band index for a slope in degrees: -1 under 27° or unknown. */
export function slopeBand(deg) {
  if (!(deg >= SLOPE_BANDS[0].min)) return -1;
  for (let i = SLOPE_BANDS.length - 1; i >= 0; i--) if (deg >= SLOPE_BANDS[i].min) return i;
  return -1;
}

/* Slope in degrees for every pixel of a W×H height grid whose pixels are pxM metres apart, by Horn's
   method — the 3×3 weighted difference GIS slope tools use. A plain two-pixel difference on a ~7 m model
   drew the DEM's own noise as streaks across a glacier; Horn's averaging keeps a true plane exact and the
   streaks out. A pixel on the edge uses the neighbours it has; next to an unknown height (NaN) it is unknown. */
export function slopeGrid(E, W, H, pxM) {
  const out = new Float32Array(W * H);
  for (let r = 0; r < H; r++) {
    const ru = r > 0 ? r - 1 : r, rd = r < H - 1 ? r + 1 : r;
    for (let c = 0; c < W; c++) {
      const cl = c > 0 ? c - 1 : c, cr = c < W - 1 ? c + 1 : c;
      const row = function (q) { return E[q * W + cr] - E[q * W + cl]; }, col = function (q) { return E[rd * W + q] - E[ru * W + q]; };
      const dx = (row(ru) + 2 * row(r) + row(rd)) / (4 * (cr - cl) * pxM);
      const dy = (col(cl) + 2 * col(c) + col(cr)) / (4 * (rd - ru) * pxM);
      out[r * W + c] = Math.atan(Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI;
    }
  }
  return out;
}

/* Metres per pixel of a zoom-14 tile in row y (its centre latitude). */
export function srcPxM(y) {
  const n = Math.pow(2, SLOPE_SRC_Z), lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 0.5) / n)));
  return 40075016.686 * Math.cos(lat) / (256 * n);
}

/* Which zoom-14 pixel(s) feed output pixel (u, v) of map tile (x, y, z): for z ≥ 14 one source tile and
   the pixel under it; for z = 13 a 2×2 block of tiles, so the caller takes the steepest. Pure, so the
   arithmetic can be checked without a map. */
export function slopeSource(x, y, z) {
  if (z >= SLOPE_SRC_Z) {
    const s = Math.pow(2, z - SLOPE_SRC_Z), sx = Math.floor(x / s), sy = Math.floor(y / s);
    return { tiles: [{ x: sx, y: sy }], scale: s, ox: (x - sx * s) * 256 / s, oy: (y - sy * s) * 256 / s };
  }
  return { tiles: [{ x: 2 * x, y: 2 * y }, { x: 2 * x + 1, y: 2 * y }, { x: 2 * x, y: 2 * y + 1 }, { x: 2 * x + 1, y: 2 * y + 1 }], scale: 0.5, ox: 0, oy: 0 };
}

export function decodeBlob(b) {
  const draw = function (img) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    return cx.getImageData(0, 0, 256, 256).data;
  };
  // colorSpaceConversion "none": the PNG's bytes ARE the heights (see ShadeMap.jsx).
  if (typeof window.createImageBitmap === "function") return window.createImageBitmap(b, { colorSpaceConversion: "none", premultiplyAlpha: "none" }).then(function (bm) { const d = draw(bm); if (bm.close) bm.close(); return d; });
  return new Promise(function (res, rej) {
    const u = URL.createObjectURL(b), im = new Image();
    im.onload = function () { try { res(draw(im)); } catch (e) { rej(e); } URL.revokeObjectURL(u); };
    im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("decode")); };
    im.src = u;
  });
}

/* Zoom-14 slope grids, shared by every slope layer this session (a pan back costs nothing). */
const _src = new Map();
function sourceSlope(x, y) {
  const k = x + "/" + y;
  if (_src.has(k)) return _src.get(k);
  let head = null;
  const p = fetch(TERRAIN_TILE_URL + SLOPE_SRC_Z + "/" + x + "/" + y + ".png")
    .then(function (r) { if (!r.ok) throw new Error("tile " + r.status); head = r.headers.get("x-amz-meta-x-imagery-sources"); return r.blob(); })
    .then(decodeBlob)
    .then(function (px) { const E = new Float32Array(256 * 256); decodeTerrarium(px, E, 256, 0, 0); return { deg: slopeGrid(E, 256, 256, srcPxM(y)), head: head }; });
  _src.set(k, p);
  p.catch(function () { _src.delete(k); });
  if (_src.size > 160) _src.delete(_src.keys().next().value);
  return p;
}

/* The Leaflet layer. `onCredits(list)` hears the licence credits of every terrain source drawn so far
   (only the sources whose licence asks for one; the US models are public domain). */
export function makeSlopeLayer(L, onCredits) {
  const heads = [];
  let said = "";
  const note = function (h) {
    if (h == null || heads.indexOf(h) >= 0) return;
    heads.push(h);
    const c = terrainCredits(heads), s = c.join("|");
    if (s !== said) { said = s; if (onCredits) onCredits(c); }
  };
  const Layer = L.GridLayer.extend({
    createTile: function (coords, done) {
      const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
      const src = slopeSource(coords.x, coords.y, coords.z);
      Promise.all(src.tiles.map(function (t) { return sourceSlope(t.x, t.y).catch(function () { return null; }); })).then(function (grids) {
        grids.forEach(function (g) { if (g) note(g.head); });
        const ctx = cv.getContext("2d"), img = ctx.createImageData(256, 256), d = img.data;
        for (let v = 0; v < 256; v++) for (let u = 0; u < 256; u++) {
          let deg = NaN;
          if (src.scale >= 1) {
            const g = grids[0];
            if (g) deg = g.deg[Math.floor(src.oy + v / src.scale) * 256 + Math.floor(src.ox + u / src.scale)];
          } else {
            const g = grids[(v >= 128 ? 2 : 0) + (u >= 128 ? 1 : 0)];
            if (g) {
              const c0 = (u % 128) * 2, r0 = (v % 128) * 2, a = g.deg;
              deg = Math.max(a[r0 * 256 + c0], a[r0 * 256 + c0 + 1], a[(r0 + 1) * 256 + c0], a[(r0 + 1) * 256 + c0 + 1]);
            }
          }
          const b = slopeBand(deg);
          if (b < 0) continue;
          const k = (v * 256 + u) * 4, rgb = SLOPE_BANDS[b].rgb;
          d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 150;
        }
        ctx.putImageData(img, 0, 0);
        done(null, cv);
      });
      return cv;
    },
  });
  return new Layer({ minZoom: SLOPE_MIN_Z, maxZoom: 22, zIndex: 250, className: "cm-slope-layer" });
}
