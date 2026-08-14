// Recently-viewed climbs, persisted across reloads.
//
// This is the ONE place in the app outside auth that writes to localStorage, and it is
// deliberate rather than drift: CLAUDE.md's rule is that "saving" means React state unless
// persistence was explicitly asked for, and it was — a browse history that dies on refresh
// answers "what was I just looking at?" with nothing on exactly the reload where you wanted
// it. Everything else (crews, logs, trip reports) stays session state.
//
// WHAT IS STORED IS ONLY THE ROUTE ID. That is the whole design decision here. Storing a
// display snapshot (name/grade/area) would render faster and is what a cache wants, but this
// app opens a route by handing `openRoute(x)` a real route object — a snapshot handed to it
// renders a broken route page — and a stored name silently goes stale when the catalog is
// corrected. Ids resolve through the same `useScopedWishlistRoutes`/`ROUTES` lookups the
// objectives list already uses, so a recents row is a real route row or it is not shown.
//
// No search STRINGS are stored. Recording them was considered and dropped: nothing reads a
// raw query, and a stored-but-unread value is the `check:dead-flag-gates` shape — it reads as
// a feature that is already plumbed. A climb you opened from a search is the signal that
// actually survives, and that is what this records.

import { useSyncExternalStore } from "react";

const KEY = "climbmatch-recent-routes";

// 25 is well past what any section renders (the panel shows a handful) — the surplus is for
// the discipline weighting, which wants enough history to see a pattern rather than the last
// three taps.
export const RECENT_MAX = 25;

// localStorage throws rather than returning null in Safari private mode and when a profile
// is out of quota, so every access is wrapped. A recents list is a convenience; it must never
// be able to take a screen down with it.
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    // Shape-check on read, not just on write. The key is user-writable (devtools), survives
    // across deploys, and an older build could have left a different shape here.
    if (!Array.isArray(v)) return [];
    return v.filter(e => e && typeof e.id === "string").slice(0, RECENT_MAX);
  } catch { return []; }
}

function save(entries) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* full or blocked — keep the in-memory copy */ }
}

// The snapshot must be REFERENTIALLY STABLE between changes: useSyncExternalStore compares
// with Object.is and re-renders forever if a fresh array is returned each call. So the array
// is replaced only inside record/clear, never rebuilt in the getter.
let _entries = load();
let _ids = _entries.map(e => e.id);

const _subs = new Set();
function subscribe(fn) { _subs.add(fn); return () => { _subs.delete(fn); }; }
function emit() { _subs.forEach(fn => { try { fn(); } catch {} }); }

function getEntries() { return _entries; }
function getIds() { return _ids; }

// Server snapshot: this is client-only state, and returning the live one during SSR would
// make the markup depend on a browser API. The guards render components with
// renderToStaticMarkup, so this path is exercised by check:bare and friends.
const EMPTY = [];
function getServerEntries() { return EMPTY; }
function getServerIds() { return EMPTY; }

/** Record that the user opened a climb. Most-recent-first, deduped by id. */
export function recordRouteView(id) {
  if (!id || typeof id !== "string") return;
  const at = Date.now();
  const next = [{ id, at }].concat(_entries.filter(e => e.id !== id)).slice(0, RECENT_MAX);
  _entries = next;
  _ids = next.map(e => e.id);
  save(next);
  emit();
}

export function clearRecentRoutes() {
  _entries = [];
  _ids = [];
  save([]);
  emit();
}

/** Ids of recently-opened climbs, most recent first. Stable reference between changes. */
export function useRecentRouteIds() {
  return useSyncExternalStore(subscribe, getIds, getServerIds);
}

/** Full `{id, at}` entries, most recent first. */
export function useRecentRoutes() {
  return useSyncExternalStore(subscribe, getEntries, getServerEntries);
}

// Non-hook reads, for the seed path and for tests.
export function recentRouteIds() { return _ids; }
export function recentRouteEntries() { return _entries; }
