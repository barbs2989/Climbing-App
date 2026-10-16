// The trip pack's MAP: the ground from the trailhead (or parking) to the climb, on the device.
//
// WHAT IS SAVED. Packing a climb saves map tiles for a corridor along its own way in — the GPS
// track, the waypoints, the trailhead pin in approach_logistics, and the crag/peak point — with
// 1 km either side, so the nearby slabs, gullies and the next crag over are on it too. A climb
// that only has ONE point (94% of a 4,000-route WA sample: most crags) gets a 2 km circle around
// it instead, which reaches the parking at a typical crag. Zooms 15-16 follow that corridor;
// 8-14 take the whole box round the route, wide enough for the view the route map OPENS on
// (see routeTileKeys). Measured per layer: 170 tiles for an Index crag, 424 for Mount Stickney,
// 1,003 for Buck Mountain's 11.6 km approach -- ~7, ~19 and ~44 MB for both layers.
//
// WHICH TILES, AND WHY NOT THE ONES ON SCREEN. The online map draws Esri imagery, OpenTopoMap and
// OpenStreetMap, and none of them may be bulk-downloaded for offline use: OSM's tile policy forbids
// pre-fetching an area for later, Esri's basemap terms require an ArcGIS licence to take tiles
// offline, and OpenTopoMap runs on donated servers that ask for no bulk download. The USGS
// National Map's own tile services are US-government work in the PUBLIC DOMAIN, so saving them
// is allowed: USGSImageryOnly (satellite) and USGSTopo (topo), both with real tiles to zoom 16
// (~2.4 m a pixel), ~20-30 KB each, and CORS-open. Outside the US they hold little or nothing.
//
// HOW THE MAP USES THEM (lib/mapKit.jsx baseTileLayer). Every map keeps its normal layer; a tile
// that fails to load (no signal) is replaced by the saved one, and past zoom 16 by an enlarged
// crop of its zoom-16 ancestor. Online nothing changes.
//
// WHERE THEY LIVE. Their own IndexedDB, not Cache Storage: public/sw.js deletes every cache but
// the app shell on activate, so tiles there would vanish the next time the worker changes. Each
// route's tile keys are recorded, so removing a climb from the pack deletes only the tiles no
// other packed climb still needs.

const DB_NAME = "climbmatch-tiles", DB_VER = 1;
export const OFFLINE_MAX_Z = 16;
export const OFFLINE_TILE_URLS = {
  imagery: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
  topo: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
};
// The online layer each saved layer stands in for.
export function offlineLayerFor(baseLayer) { return baseLayer === "sat" ? "imagery" : baseLayer === "topo" || baseLayer === "street" ? "topo" : null; }

export const CORRIDOR_M = 1000;      // either side of the way in
export const LONE_POINT_M = 2000;    // around a climb we only know one point of
export const PER_LAYER_CAP = 1500;   // ~40 MB a layer at worst; past it the corridor narrows at z16
const NEAR_Z = 11, FAR_Z = 8, FAR_PAD_M = 5000;

let _dbPromise = null;
function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { _dbPromise = null; reject(new Error("no IndexedDB")); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("tiles")) db.createObjectStore("tiles", { keyPath: "k" });
      if (!db.objectStoreNames.contains("routes")) db.createObjectStore("routes", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { _dbPromise = null; reject(req.error); };
    // Same trap lib/offline.js records: without this a tab at another version leaves the promise
    // unsettled for the life of the page.
    req.onblocked = () => { _dbPromise = null; reject(new Error("offline map is open in another tab at a different version")); };
  });
  return _dbPromise;
}
const p = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
async function get(store, key) { const db = await openDb(); return p(db.transaction(store).objectStore(store).get(key)); }
async function getAll(store) { const db = await openDb(); return p(db.transaction(store).objectStore(store).getAll()); }
async function getAllKeys(store) { const db = await openDb(); return p(db.transaction(store).objectStore(store).getAllKeys()); }
async function put(store, row) {
  const db = await openDb();
  return new Promise((resolve, reject) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).put(row); t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); });
}
async function delMany(store, keys) {
  if (!keys.length) return;
  const db = await openDb();
  return new Promise((resolve, reject) => { const t = db.transaction(store, "readwrite"); const s = t.objectStore(store); keys.forEach((k) => s.delete(k)); t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); });
}

// ── which ground ────────────────────────────────────────────────────────────
const M = 111320;
const okPt = (la, ln) => Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 85 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0);
function distM(a, b) { const k = Math.cos(((a[0] + b[0]) / 2) * Math.PI / 180); return Math.hypot((a[0] - b[0]) * M, (a[1] - b[1]) * M * k); }

// Two lines, from the RAW route row the pack stores (lib/offline.js): the GPS track, and the way in
// as the stored points give it (logistics trailhead, waypoints in their stored order, the climb's
// own area). Each is densified so a corridor between two pins 5 km apart has no hole in it.
export function routeMapLines(row) {
  if (!row) return [];
  const lines = [];
  const g = Array.isArray(row.gpx) ? row.gpx.map((q) => Array.isArray(q) ? [+q[0], +q[1]] : null).filter((q) => q && okPt(q[0], q[1])) : [];
  if (g.length) lines.push(g);
  const way = [];
  const L = row.approach_logistics;
  if (L && okPt(+L.trailheadLat, +L.trailheadLng)) way.push([+L.trailheadLat, +L.trailheadLng]);
  let w = row.waypoints; if (typeof w === "string") { try { w = JSON.parse(w); } catch (e) { w = null; } }
  (Array.isArray(w) ? w : []).forEach((q) => { const la = q && q.lat != null && q.lat !== "" ? Number(q.lat) : NaN, ln = q && q.lng != null && q.lng !== "" ? Number(q.lng) : NaN; if (okPt(la, ln)) way.push([la, ln]); });
  const a = row.areas;
  if (a && okPt(+a.lat, +a.lng)) way.push([+a.lat, +a.lng]);
  if (way.length) lines.push(way);
  return lines.map(densify);
}
function densify(line) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], n = Math.min(200, Math.floor(distM(a, b) / 250));
    for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / (n + 1), a[1] + (b[1] - a[1]) * j / (n + 1)]);
    out.push(b);
  }
  return out;
}

function tileXY(la, ln, z) {
  const n = 2 ** z, r = la * Math.PI / 180;
  return [Math.floor((ln + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
}
function addAround(set, z, la, ln, rM) {
  const dLa = rM / M, dLn = rM / (M * Math.cos(la * Math.PI / 180));
  const [x0, y1] = tileXY(Math.max(-85, la - dLa), ln - dLn, z), [x1, y0] = tileXY(Math.min(85, la + dLa), ln + dLn, z);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set.add(z + "/" + x + "/" + y);
}

// The tile list for one layer: "z/x/y" strings, zoomed-out first so a cut-short download still
// leaves a usable overview.
export function routeTileKeys(row) {
  const lines = routeMapLines(row);
  const all = lines.flat();
  if (!all.length) return [];
  let span = 0; for (const q of all) span = Math.max(span, distM(all[0], q));
  const lone = span < 300;
  // Up to zoom 14 the WHOLE box round the route, not a corridor: tested offline, a corridor-only
  // pack opened the route map with its corners blank. And the box must be bigger than the route's
  // own padded bounds, because the map is WIDE AND SHORT (470x300 on a phone): fitting a 6 km
  // route lands on zoom 11, which shows ~24 x 15 km (Mount Stickney, measured). So zooms 8-13
  // carry the route's own span plus 2 km on every side -- cheap at those zooms -- zoom 14 a 30%
  // margin, and 15-16, where tiles multiply, follow the way in.
  let la0 = 90, la1 = -90, ln0 = 180, ln1 = -180;
  all.forEach((q) => { la0 = Math.min(la0, q[0]); la1 = Math.max(la1, q[0]); ln0 = Math.min(ln0, q[1]); ln1 = Math.max(ln1, q[1]); });
  const k = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  const spanM = Math.max((la1 - la0) * M, (ln1 - ln0) * M * k);
  const padM = Math.max(lone ? LONE_POINT_M : CORRIDOR_M, 0.3 * spanM);
  const widePadM = Math.max(padM, spanM + 2000);
  const boxKeys = (z, pad) => {
    const dLa = pad / M, dLn = pad / (M * k);
    const [x0, y1] = tileXY(Math.max(-85, la0 - dLa), ln0 - dLn, z), [x1, y0] = tileXY(Math.min(85, la1 + dLa), ln1 + dLn, z);
    const out = []; for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push(z + "/" + x + "/" + y);
    return out;
  };
  const build = (z16R) => {
    const keys = [];
    for (let z = FAR_Z; z < NEAR_Z; z++) keys.push(...boxKeys(z, widePadM + FAR_PAD_M));
    for (let z = NEAR_Z; z <= 13; z++) keys.push(...boxKeys(z, widePadM));
    keys.push(...boxKeys(14, padM));
    for (let z = 15; z <= OFFLINE_MAX_Z; z++) {
      const r = z === OFFLINE_MAX_Z ? z16R : (lone ? LONE_POINT_M : CORRIDOR_M);
      if (r <= 0) continue;
      const s = new Set(); all.forEach((q) => addAround(s, z, q[0], q[1], r)); keys.push(...s);
    }
    return keys;
  };
  let keys = build(lone ? LONE_POINT_M : CORRIDOR_M);
  if (keys.length > PER_LAYER_CAP) keys = build(400);
  if (keys.length > PER_LAYER_CAP) keys = build(0);
  return keys.slice(0, PER_LAYER_CAP);
}

// ── saving ──────────────────────────────────────────────────────────────────
const urlFor = (layer, key) => { const [z, x, y] = key.split("/"); return OFFLINE_TILE_URLS[layer].replace("{z}", z).replace("{x}", x).replace("{y}", y); };
async function fetchTile(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 20000) : null;
    try {
      const r = await fetch(url, { mode: "cors", credentials: "omit", signal: ctl ? ctl.signal : undefined });
      if (r.status === 404) return null; // no tile there (sea, outside coverage): nothing to save, not a failure
      if (!r.ok) throw new Error("HTTP " + r.status);
      const b = await r.blob();
      if (!/^image\//.test(b.type || "")) return null;
      return b;
    } catch (e) {
      if (attempt === 1) throw e;
    } finally { if (timer) clearTimeout(timer); }
  }
  return null;
}

// Saves the map for one packed route. Never throws for a network problem: the pack itself is the
// promise the button makes, and the result says how much of the map made it so the toast can.
// { ok, saved, total, bytes, missing } — `missing` counts tiles that failed to download.
export async function saveRouteMapOffline(routeId, row, onProgress) {
  const keys = routeTileKeys(row);
  // No point to map: still recorded, so the background refresh does not re-pack it every session.
  if (!keys.length) { await put("routes", { id: routeId, keys: [], total: 0, missing: 0, at: Date.now() }).catch(() => {}); return { ok: false, reason: "no_location", saved: 0, total: 0, bytes: 0, missing: 0 }; }
  try { await openDb(); } catch (e) { return { ok: false, reason: "no_storage", saved: 0, total: 0, bytes: 0, missing: 0 }; }
  const have = new Set(await getAllKeys("tiles").catch(() => []));
  const jobs = [];
  for (const layer of Object.keys(OFFLINE_TILE_URLS)) for (const k of keys) jobs.push(layer + "/" + k);
  let done = 0, bytes = 0, missing = 0, quota = false;
  const kept = [];
  const queue = jobs.slice();
  const worker = async () => {
    while (queue.length && !quota) {
      const tk = queue.shift();
      if (have.has(tk)) { kept.push(tk); done++; continue; }
      const i = tk.indexOf("/");
      try {
        const blob = await fetchTile(urlFor(tk.slice(0, i), tk.slice(i + 1)));
        if (blob) { await put("tiles", { k: tk, blob }); bytes += blob.size; kept.push(tk); }
      } catch (e) {
        if (e && (e.name === "QuotaExceededError" || /quota/i.test(e.message || ""))) quota = true;
        else missing++;
      }
      done++;
      if (onProgress && (done % 10 === 0 || done === jobs.length)) onProgress({ done, total: jobs.length });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await put("routes", { id: routeId, keys: kept, total: jobs.length, missing: missing + (quota ? queue.length : 0), at: Date.now() }).catch(() => {});
  return { ok: kept.length > 0, reason: quota ? "quota" : null, saved: kept.length, total: jobs.length, bytes, missing: missing + (quota ? queue.length : 0) };
}

// Deletes this route's tiles, except any another packed route still needs.
export async function removeRouteMapOffline(routeId) {
  let mine;
  try { mine = await get("routes", routeId); } catch (e) { return; }
  if (!mine) return;
  const others = (await getAll("routes")).filter((r) => r.id !== routeId);
  const keep = new Set(); others.forEach((r) => (r.keys || []).forEach((k) => keep.add(k)));
  await delMany("tiles", (mine.keys || []).filter((k) => !keep.has(k)));
  await delMany("routes", [routeId]);
}

// For the pack card: is there a map for this route, and how complete. Map of id -> info.
export async function routeMapInfo() {
  try {
    const rows = await getAll("routes");
    const out = {};
    rows.forEach((r) => { out[r.id] = { tiles: (r.keys || []).length, total: r.total || 0, missing: r.missing || 0, at: r.at || null }; });
    return out;
  } catch (e) { return {}; }
}

// ── reading, for the map ────────────────────────────────────────────────────
// A blob for (layer, z, x, y): the exact tile, or past zoom 16 a crop of its zoom-16 ancestor.
// Returns an object URL the caller must revoke, or null.
export async function offlineTileUrl(layer, z, x, y) {
  if (!OFFLINE_TILE_URLS[layer]) return null;
  try {
    if (z <= OFFLINE_MAX_Z) {
      const r = await get("tiles", layer + "/" + z + "/" + x + "/" + y);
      return r && r.blob ? URL.createObjectURL(r.blob) : null;
    }
    const d = z - OFFLINE_MAX_Z, f = 2 ** d;
    const ax = Math.floor(x / f), ay = Math.floor(y / f);
    const r = await get("tiles", layer + "/" + OFFLINE_MAX_Z + "/" + ax + "/" + ay);
    if (!r || !r.blob || typeof document === "undefined") return null;
    const src = URL.createObjectURL(r.blob);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const cv = document.createElement("canvas"); cv.width = cv.height = 256;
      const sz = img.width / f;
      const g = cv.getContext("2d"); g.imageSmoothingEnabled = true;
      g.drawImage(img, (x - ax * f) * sz, (y - ay * f) * sz, sz, sz, 0, 0, 256, 256);
      const blob = await new Promise((res) => cv.toBlob(res, "image/jpeg", 0.9));
      return blob ? URL.createObjectURL(blob) : null;
    } finally { URL.revokeObjectURL(src); }
  } catch (e) { return null; }
}
