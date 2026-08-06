// Real offline "download a state": pulls a state's full areas subtree + routes
// out of Supabase into IndexedDB, so the Climbs catalog keeps working with no
// signal. lib/db.js hooks fall back to these readers when the network fails.
// Rows are stored raw (snake_case, exactly as PostgREST returns them) so the
// existing dbRouteToCamel path applies unchanged at read time.
import { supabase } from "./supabase";

const DB_NAME = "climbmatch-offline", DB_VER = 1;
const PAGE = 500;
let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      const areas = db.createObjectStore("areas", { keyPath: "id" });
      areas.createIndex("parent_id", "parent_id");
      areas.createIndex("_state", "_state");
      const routes = db.createObjectStore("routes", { keyPath: "id" });
      routes.createIndex("area_id", "area_id");
      routes.createIndex("_state", "_state");
      db.createObjectStore("meta", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { _dbPromise = null; reject(req.error); };
    // `blocked` fires when another tab still holds the database at an older version. Neither
    // onsuccess nor onerror follows it, so without this the promise never settles -- and because
    // _dbPromise is memoised, every later caller awaits that same dead promise for the life of
    // the page. Nothing reading offline data would ever resolve or reject: no data, no error,
    // no timeout. Clear the memo so a retry can succeed once the other tab closes.
    req.onblocked = () => { _dbPromise = null; reject(new Error("offline database is open in another tab at a different version")); };
  });
  return _dbPromise;
}

function p(idbRequest) {
  return new Promise((resolve, reject) => {
    idbRequest.onsuccess = () => resolve(idbRequest.result);
    idbRequest.onerror = () => reject(idbRequest.error);
  });
}

async function idbGet(store, key) { const db = await openDb(); return p(db.transaction(store).objectStore(store).get(key)); }
async function idbGetAll(store) { const db = await openDb(); return p(db.transaction(store).objectStore(store).getAll()); }
async function idbIndexAll(store, index, key) { const db = await openDb(); return p(db.transaction(store).objectStore(store).index(index).getAll(IDBKeyRange.only(key))); }

async function idbPutAll(store, rows) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    const s = t.objectStore(store);
    rows.forEach((r) => s.put(r));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function idbDeleteByState(store, stateId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    const cur = t.objectStore(store).index("_state").openCursor(IDBKeyRange.only(stateId));
    cur.onsuccess = () => { const c = cur.result; if (c) { c.delete(); c.continue(); } };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ── download ────────────────────────────────────────────────────────────────
// stateName is the display name ("Washington") used by the Manage Areas list.
// Pages the subtree + its routes by keyset (ordered .gt on id) — offset paging
// over an unordered range silently skips/duplicates rows (see CLAUDE.md).
export async function downloadStateOffline(stateName, onProgress) {
  if (!supabase) throw new Error("Catalog backend not configured");
  const { data: st, error: stErr } = await supabase.from("areas").select("id,path").eq("area_type", "state").eq("name", stateName).maybeSingle();
  if (stErr) throw stErr;
  if (!st || !st.path) throw new Error("No catalog data for " + stateName + " yet");

  // Mark INCOMPLETE up front. Each page below commits in its own IndexedDB
  // transaction, so a download that dies partway — quota exceeded, connection
  // dropped, tab closed — leaves real rows behind. Without a marker written
  // first, the readers cannot tell a half-downloaded state from a finished one
  // and would serve a silently truncated catalog to someone who is offline and
  // has no way to notice. readers below ignore any state not marked complete.
  await idbPutAll("meta", [{ key: "state:" + st.id, name: stateName, complete: false, areaCount: 0, routeCount: 0, savedAt: Date.now() }]);

  try {
    let areaCount = 0, last = "";
    for (;;) {
      const { data, error } = await supabase.from("areas").select("*").filter("path", "cd", st.path).order("id").gt("id", last).limit(PAGE);
      if (error) throw error;
      if (!data.length) break;
      await idbPutAll("areas", data.map((a) => ({ ...a, _state: st.id })));
      areaCount += data.length; last = data[data.length - 1].id;
      if (onProgress) onProgress({ phase: "areas", count: areaCount });
      if (data.length < PAGE) break;
    }

    let routeCount = 0; last = "";
    for (;;) {
      const { data, error } = await supabase.from("routes").select("*, areas!inner(path)").filter("areas.path", "cd", st.path).order("id").gt("id", last).limit(PAGE);
      if (error) throw error;
      if (!data.length) break;
      await idbPutAll("routes", data.map((r) => { const { areas: _drop, ...row } = r; return { ...row, _state: st.id }; }));
      routeCount += data.length; last = data[data.length - 1].id;
      if (onProgress) onProgress({ phase: "routes", count: routeCount });
      if (data.length < PAGE) break;
    }

    // Only now is the state safe to read offline.
    await idbPutAll("meta", [{ key: "state:" + st.id, name: stateName, complete: true, areaCount, routeCount, savedAt: Date.now() }]);
    return { areaCount, routeCount };
  } catch (err) {
    // Bin the partial rows rather than leave them unreadable-but-present, so a
    // retry starts clean and storage isn't held by data nothing will ever serve.
    try { await removeStateOffline(stateName); } catch (e) { /* best effort */ }
    if (err && (err.name === "QuotaExceededError" || /quota/i.test(err.message || ""))) {
      throw new Error("Not enough device storage for " + stateName + " — free some space and try again");
    }
    throw err;
  }
}

export async function removeStateOffline(stateName) {
  const metas = await idbGetAll("meta");
  const meta = metas.find((m) => m.name === stateName);
  if (!meta) return;
  const stateId = meta.key.slice("state:".length);
  await idbDeleteByState("areas", stateId);
  await idbDeleteByState("routes", stateId);
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const t = db.transaction("meta", "readwrite");
    t.objectStore("meta").delete(meta.key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ── readers (mirror the row shapes lib/db.js queryFns return) ───────────────
// Every reader is gated on the state being marked complete. Serving rows from a
// half-finished download would show a truncated catalog as if it were the whole
// thing, and the only time these readers run is when the network is down — so
// the user has no way to cross-check. Read fresh each time rather than caching:
// meta is a handful of rows, and a stale cache here would reintroduce the bug.
async function completeStates() {
  try {
    const metas = await idbGetAll("meta");
    return new Set(metas.filter((m) => m.complete && String(m.key).startsWith("state:")).map((m) => m.key.slice("state:".length)));
  } catch (e) { return new Set(); }
}

async function areaEmbed(areaId) {
  if (!areaId) return null;
  const area = await idbGet("areas", areaId);
  if (!area) return null;
  const parent = area.parent_id ? await idbGet("areas", area.parent_id) : null;
  return { name: area.name, area_type: area.area_type, region: area.region, lat: area.lat, lng: area.lng, elevation_ft: area.elevation_ft, prominence_ft: area.prominence_ft, avy_zone: area.avy_zone, blurb: area.blurb, parent: parent ? { name: parent.name } : null };
}

export async function offlineAreaChildren(parentId) {
  const ok = await completeStates();
  const rows = parentId ? await idbIndexAll("areas", "parent_id", parentId) : (await idbGetAll("areas")).filter((a) => a.parent_id == null);
  return rows.filter((a) => ok.has(a._state))
    .sort((a, b) => (b.route_count || 0) - (a.route_count || 0) || String(a.name).localeCompare(String(b.name)));
}

export async function offlineArea(id) {
  const area = await idbGet("areas", id);
  if (!area) return null;
  const ok = await completeStates();
  return ok.has(area._state) ? area : null;
}

export async function offlineAreaRoutes(areaId) {
  const ok = await completeStates();
  const rows = (await idbIndexAll("routes", "area_id", areaId)).filter((r) => ok.has(r._state));
  if (!rows.length) return [];
  const embed = await areaEmbed(areaId);
  return rows
    .map((r) => ({ ...r, areas: embed }))
    .sort((a, b) => (((a.sort_order ?? 1e9) - (b.sort_order ?? 1e9)) || String(a.name).localeCompare(String(b.name))));
}

export async function offlineStates() {
  const ok = await completeStates();
  return (await idbGetAll("areas")).filter((a) => a.area_type === "state" && ok.has(a._state)).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

// Downloaded states that finished, for rehydrating the Manage Areas list on load.
// Partial/aborted rows are excluded for the same reason the readers exclude them.
export async function offlineDownloads() {
  try {
    const metas = await idbGetAll("meta");
    return metas.filter((m) => m.complete && String(m.key).startsWith("state:"));
  } catch (e) { return []; }
}
