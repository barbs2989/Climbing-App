// lib/db-shared.js — helpers every domain uses: debounced search terms, the network-first offline fallback, device-first reads, keyset paging.
// Split out of lib/db.js (maintainability audit, 2026-11-25). Import from "./db.js", which re-exports
// every public name; import from this file only inside the lib/db-*.js domain files.
import { useEffect, useState } from "react";
import { isFreshLocalArea, localSubtreeRouteCount } from "./offline";

// SEARCH IS DEBOUNCED HERE, ONCE, rather than at each of the eleven boxes that call these
// three hooks. Every keystroke used to be its own query key, so typing "north ridge" fired
// eleven fetches — and route search runs TWO legs per call, so twenty-two — of which only
// the last answered anything the climber asked. 250ms is below the point where a pause
// reads as lag.
//
// Three properties, each load-bearing:
//   - clearing the box is NOT delayed: an empty term disables the query at once;
//   - the previous results stay on screen while the next term settles, but NEVER after the
//     box is cleared (keepPreviousData alone would do that — a disabled query is pending,
//     and pending is exactly when placeholderData applies);
//   - while the debounce is pending the hook reports isLoading, because the query itself is
//     idle then, and a caller reading "not loading, no rows" would print "No results" for a
//     term nobody has searched yet.
const SEARCH_DEBOUNCE_MS = 250;
export function useDebouncedTerm(value) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (!value) { setV(value); return; }
    const t = setTimeout(() => setV(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);
  const term = value ? v : value;
  return [term, !!value && term !== value];
}
export const holdWhileTyping = term => prev => (term ? prev : undefined);
export function withPending(res, pending) {
  return pending ? { ...res, isLoading: true, isFetching: true } : res;
}

// Network-first with an IndexedDB fallback for downloaded states (lib/offline.js).
// Only substitutes offline data when the network genuinely failed AND the local
// store has something for this query — an empty offline result rethrows the
// original error so undownloaded areas still show the normal error state.
export async function orOffline(networkFn, offlineFn) {
  try { return await networkFn(); }
  catch (err) {
    try {
      const local = await offlineFn();
      if (local && (Array.isArray(local) ? local.length : true)) return local;
    } catch (e) { /* fall through to the network error */ }
    throw err;
  }
}

// The same thing for a query whose answer can legitimately be EMPTY. orOffline treats an empty
// result as "nothing is stored", which is right for a route list or a state list — those are
// unfiltered, so empty means undownloaded. A FILTERED search is different: "no route in this
// area is under 5.6" and "this area was never downloaded" are different facts, and reporting the
// first as a failed read is a false claim of its own kind. A count of 0 is the sharpest case,
// because 0 is falsy and orOffline would rethrow on it every time.
//
// So the fallback signals absence with `undefined` and anything else — including `[]` and `0` —
// is a real answer. Kept as a sibling rather than a widening of orOffline: that helper's
// emptiness rule is load-bearing for the readers already using it, and loosening it there would
// let an undownloaded area serve an empty catalog as though it were the whole one.
export async function orOfflineExact(networkFn, offlineFn) {
  try { return await networkFn(); }
  catch (err) {
    try { const local = await offlineFn(); if (local !== undefined) return local; }
    catch (e) { /* fall through to the network error */ }
    throw err;
  }
}

// DEVICE FIRST for a downloaded state. A pinned state is on the device in full, so while that copy
// is fresh (lib/offline.js isFreshLocalArea: complete, and saved within the nightly file's own
// trust window) the Climbs tab answers from it and never asks the database — browsing a pinned
// state costs Supabase nothing, which is how the catalog scales with climbers. The readers it uses
// are the same faithful mirrors the offline fallback already relies on, so the answer is the one
// the network would give as of that night. Anything else (not downloaded, an old copy, the country
// level above a state, a reader with nothing stored) falls through to the network path unchanged.
//
// preferNetworkReads() turns it off for the session, for the one screen whose own write must show
// at once: approving a new route puts it in the catalog now, and the nightly file has it tomorrow.
let _deviceFirst = true;
export function preferNetworkReads() { _deviceFirst = false; }
export async function deviceFirst(areaId, offlineFn, networkPath) {
  if (_deviceFirst && await isFreshLocalArea(areaId)) {
    try { const v = await offlineFn(); if (v !== undefined && v !== null) return v; }
    catch (e) { /* the network path below */ }
  }
  return networkPath();
}

// THE ROUTE-FINDER SCANS ARE DEVICE-FIRST ONLY FOR A SUBTREE THE DEVICE CAN SCAN QUICKLY. IndexedDB
// has no index on name, grade or discipline, so routes_in_subtree's device copy reads every climb
// under the root and filters and sorts in JavaScript. Over a whole pinned state that was the slow
// screen the owner reported (2026-10-23, "Washington from saved areas takes a while to load"):
// Suggested climbs on the Washington page waits on that list, 14,270 full rows, while the same
// answer is ~0.4 s from the database. Above this many climbs the network answers first and the
// device copy is only the no-signal fallback, as it is for a state nobody pinned. A crag, a peak
// or a range is under it and still costs the database nothing.
const DEVICE_SCAN_MAX_ROUTES = 2000;
export async function deviceFirstScan(areaId, offlineFn, networkPath) {
  const n = await localSubtreeRouteCount(areaId);
  if (n != null && n > DEVICE_SCAN_MAX_ROUTES) return networkPath();
  return deviceFirst(areaId, offlineFn, networkPath);
}

// PostgREST answers at most max_rows per request (1000 on this instance: an unlimited read of
// routes comes back 206 with 0-999/315735) and the body says nothing about the rest, so a reader
// handed exactly 1000 rows cannot tell a full answer from a truncated one. Measured 2026-10-08
// across the whole catalog: the largest DIRECT fan-out is 356 routes under one area and 134
// children under one parent, so no page is cut today — and the import keeps growing. Pages only
// when a request comes back full, so the common case is still one request. `build` returns a
// fresh ordered builder each call; the order is what makes two pages one list.
const PAGE = 1000;
export async function allRows(build) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}
