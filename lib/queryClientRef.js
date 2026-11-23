// The app's ONE QueryClient, reachable from plain async functions in lib/ — a write that must
// refresh the queries reading its table, and a sign-out that must drop the climber's cached
// answers. main.jsx sets it once; nothing else assigns it. Before main.jsx runs (or in a guard
// that imports lib/ without a client) every helper here is a no-op, never a throw.
let qc = null;
export function setQueryClient(c) { qc = c; listenForCatalogChanges(); }
export function getQueryClient() { return qc; }
// Marks every query under each key prefix stale and refetches the mounted ones. A prefix with a
// trailing undefined (an unknown uid) would match nothing, so such keys are dropped first.
export function invalidateKeys(keys) {
  if (!qc) return;
  keys.filter((k) => Array.isArray(k) && !k.some((p) => p === undefined)).forEach((k) => qc.invalidateQueries({ queryKey: k }));
}
// ACROSS TABS. The Review desk (review.html) is its own page with its own QueryClient, so a write there
// refreshed nothing in a ClimbMatch tab the owner had open: an approved wall order kept showing the old
// order for up to 15 minutes (the list is persisted and fresh for CATALOG_STALE_MS), which read as "my
// approval did not work" (2026-11-23). A tab that changes the public catalog announces the key prefixes
// on a BroadcastChannel and every other tab of this browser marks them stale. Only keys on the list below
// are honoured, and a browser without BroadcastChannel simply keeps the old behaviour. The channel is
// opened lazily and only in a window: a guard that imports lib/ in Node must not be kept alive by it.
const CATALOG_CHANNEL = "cm-catalog-changed";
const ANNOUNCEABLE = new Set(["area-routes", "area-routes-full", "subtree-routes", "my-notices"]);
let channel = null;
function catalogChannel() {
  if (channel || typeof window === "undefined" || typeof window.BroadcastChannel !== "function") return channel;
  try { channel = new window.BroadcastChannel(CATALOG_CHANNEL); } catch (_e) { channel = null; }
  return channel;
}
function listenForCatalogChanges() {
  const ch = catalogChannel();
  if (!ch) return;
  ch.onmessage = (e) => {
    const keys = e && e.data && Array.isArray(e.data.keys) ? e.data.keys : [];
    invalidateKeys(keys.filter((k) => Array.isArray(k) && k.length === 1 && ANNOUNCEABLE.has(k[0])));
  };
}
// Tell the other tabs. The sender's own cache is refreshed by its own invalidateKeys() call.
export function announceCatalogChange(keys) {
  const ch = catalogChannel();
  if (!ch) return;
  try { ch.postMessage({ keys: keys.filter((k) => Array.isArray(k) && k.length === 1 && ANNOUNCEABLE.has(k[0])) }); } catch (_e) { /* the other tabs catch up on their next read */ }
}
// OPTIMISTIC UI: change every cached answer under a key prefix NOW, before the write's round trip,
// and hand back the undo. `update(data, key)` returns the new data (or the same object to leave a
// query alone). The write's own invalidateKeys() then replaces the guess with the server's answer;
// on failure the caller runs the undo, which restores the snapshot AND refetches, so a change that
// landed from elsewhere in between is not lost under the restored copy.
export function patchQueries(key, update) {
  if (!qc) return () => {};
  qc.cancelQueries({ queryKey: key });
  const snap = qc.getQueriesData({ queryKey: key });
  snap.forEach(([k, d]) => { if (d !== undefined) { const n = update(d, k); if (n !== d) qc.setQueryData(k, n); } });
  return () => { snap.forEach(([k, d]) => qc.setQueryData(k, d)); qc.invalidateQueries({ queryKey: key }); };
}
