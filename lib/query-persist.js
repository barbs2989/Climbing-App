// "Show the last state, refresh when ready" for the PUBLIC CATALOG, across page loads.
//
// On boot the last-seen catalog queries are restored from IndexedDB, so the area browser,
// a state's crags and a route's own row paint from the previous visit instead of from a
// spinner. They are restored with their ORIGINAL fetch time, so under the app's staleTime
// they read as stale and every one of them is refetched as soon as a screen mounts it —
// the network answer replaces the restored one the moment it lands. Nothing restored is
// ever presented as fresher than it is.
//
// WHAT IS PERSISTED IS AN ALLOW-LIST, AND IT IS PUBLIC DATA ONLY. Areas and routes are
// readable by anyone holding the anon key, so storing them on the device discloses nothing.
// Everything personal — messages, crews, connections, logs, profiles, searches (a route
// search's key carries the climber's home state) — is excluded by construction, so a
// shared phone never shows the previous person's data after sign-out. Add a key here only
// if the table it reads is public.
//
// A separate database from lib/offline.js on purpose: that one is the explicit "download a
// state" store with its own version and upgrade path, and this cache must be free to be
// thrown away at any moment. Every failure here is swallowed — the cache is an accelerator,
// never a source of truth, and a broken IndexedDB must degrade to the ordinary network path.
import { dehydrate, hydrate } from "@tanstack/react-query";

export const PERSISTED_QUERY_KEYS = new Set([
  "area-children", "area", "area-path", "area-routes", "area-names", "area-countries",
  "subtree-route-count", "routes-by-ids", "nearby-areas", "nearby-peaks",
]);
const DB = "climbmatch-qcache", STORE = "kv", KEY = "catalog";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_QUERIES = 200;
// The bundle's own URL carries the deploy's content hash, so a new deploy (which may change
// a select list or a row shape) starts from an empty cache rather than restoring old shapes.
const BUSTER = String(import.meta.url || "");

function openDb() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("no indexedDB"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function tx(mode, fn) {
  return openDb().then(db => new Promise((res, rej) => {
    const t = db.transaction(STORE, mode); const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req && req.result); };
    t.onerror = t.onabort = () => { db.close(); rej(t.error); };
  }));
}

export function isPersistedQuery(q) {
  return q.state.status === "success" && PERSISTED_QUERY_KEYS.has(q.queryKey[0]);
}

// Resolves when the restore is done OR after `waitMs`, whichever is first, so a slow disk
// can delay the first paint by at most that long. A restore that lands later still helps:
// hydrate never overwrites a query that already holds newer data.
export function restoreQueryCache(queryClient, waitMs = 150) {
  const work = tx("readonly", s => s.get(KEY)).then(rec => {
    if (!rec || rec.buster !== BUSTER || !(Date.now() - rec.at < MAX_AGE_MS)) return;
    hydrate(queryClient, rec.state);
  }).catch(() => {});
  return Promise.race([work, new Promise(r => setTimeout(r, waitMs))]);
}

export function persistQueryCache(queryClient) {
  let timer = null;
  const write = () => {
    timer = null;
    try {
      const state = dehydrate(queryClient, { shouldDehydrateQuery: isPersistedQuery });
      state.queries = state.queries.sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt).slice(0, MAX_QUERIES);
      tx("readwrite", s => s.put({ buster: BUSTER, at: Date.now(), state }, KEY)).catch(() => {});
    } catch (e) { /* an accelerator must never take the app down */ }
  };
  return queryClient.getQueryCache().subscribe(ev => {
    if (ev.type !== "updated" || !ev.query || !PERSISTED_QUERY_KEYS.has(ev.query.queryKey[0])) return;
    if (!timer) timer = setTimeout(write, 2000);
  });
}
