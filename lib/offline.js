// Real offline "download a state": pulls a state's full areas subtree + routes
// out of Supabase into IndexedDB, so the Climbs catalog keeps working with no
// signal. lib/db.js hooks fall back to these readers when the network fails.
// Rows are stored raw (snake_case, exactly as PostgREST returns them) so the
// existing dbRouteToCamel path applies unchanged at read time.
import { supabase } from "./supabase";

const DB_NAME = "climbmatch-offline", DB_VER = 2;
const PAGE = 500;
let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    // Idempotent per store rather than a switch on oldVersion. Installs in the wild are at
    // v1 (areas/routes/meta) and a fresh one starts at 0, so a bare createObjectStore for the
    // v1 set throws ConstraintError on the upgrade path -- which aborts the transaction, fails
    // the open, and takes the ALREADY-DOWNLOADED catalog offline for someone who is offline.
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("areas")) {
        const areas = db.createObjectStore("areas", { keyPath: "id" });
        areas.createIndex("parent_id", "parent_id");
        areas.createIndex("_state", "_state");
      }
      if (!db.objectStoreNames.contains("routes")) {
        const routes = db.createObjectStore("routes", { keyPath: "id" });
        routes.createIndex("area_id", "area_id");
        routes.createIndex("_state", "_state");
      }
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      // v2: the trip pack. One row per route a climber asked for BY NAME, independent of any
      // state download -- so packing a single climb does not require pulling a whole catalog,
      // and deleting a state cannot take a packed route with it.
      if (!db.objectStoreNames.contains("pack")) db.createObjectStore("pack", { keyPath: "id" });
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

async function idbDelete(store, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    t.objectStore(store).delete(key);
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

// A cold page can exceed the anon role's 3s statement_timeout and come back 57014, which
// aborts the whole download and shows "Download failed". It is a cold-start effect, not a
// bad query: measured against production, the same request repeated is 9311ms (500), then
// 3662ms, then 589ms, and once warm it sits at ~600ms indefinitely. So retry the page rather
// than lose the download — the retry is the request that succeeds.
//
// Only 57014 is retried. Any other error (RLS, a bad filter, offline) is a real answer and
// must surface immediately; retrying those would just slow the failure down.
//
// The backoff is sized from the warming curve, not guessed. A first attempt at 400/800ms
// was measured at 2 of 3 downloads succeeding: retrying that fast just spends all the
// attempts inside the same cold window. Spacing them ~1s/2s/4s gives the statement ~7s to
// warm, which covers the observed 9.3s -> 3.7s -> 0.6s progression, and each failed attempt
// itself does warming work. Four attempts, then the error is real and the climber is told.
const TIMEOUT_CODE = "57014";
async function pageWithRetry(build) {
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await build();
    if (!error) return data;
    if (error.code !== TIMEOUT_CODE) throw error;
    lastErr = error;
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }
  throw lastErr;
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
      const data = await pageWithRetry(() => supabase.from("areas").select("*").filter("path", "cd", st.path).order("id").gt("id", last).limit(PAGE));
      if (!data.length) break;
      await idbPutAll("areas", data.map((a) => ({ ...a, _state: st.id })));
      areaCount += data.length; last = data[data.length - 1].id;
      if (onProgress) onProgress({ phase: "areas", count: areaCount });
      if (data.length < PAGE) break;
    }

    let routeCount = 0; last = "";
    for (;;) {
      const data = await pageWithRetry(() => supabase.from("routes").select("*, areas!inner(path)").filter("areas.path", "cd", st.path).order("id").gt("id", last).limit(PAGE));
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

// ── the trip pack: ONE ROUTE, on the device, on purpose ─────────────────────
// A state download is the right tool for "I am going to Washington"; it is the wrong tool for
// "I am climbing this one route on Saturday", which is what the pack button on a route page
// asks. Before this the pack was a list of ids in React state: nothing was written, the list
// did not survive a reload, and the copy beside it had to say so in five places.
//
// The row is stored RAW, exactly as PostgREST returns it, with the same `areas` embed
// useRoutesByIds asks for — so `dbRouteToCamel` applies unchanged at read time and a packed
// route is the same object the network path would have produced. That embed shape is exported
// and imported by lib/db.js rather than written twice: a pack carrying fewer area fields than
// the network select would render "undefined" where the peak name goes, which is a defect this
// repo has already shipped once from exactly that kind of drift.
export const ROUTE_AREA_EMBED = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";

// A seed route ships inside the JS bundle, so it is on the device whenever the app is. There
// is nothing to fetch and nothing to store but the id — recorded so the LIST survives a reload
// like every other entry, rather than being a second kind of pack entry every reader has to
// know about. `seed:true` rows are excluded from offlineRoutesByIds for that reason.
export async function packRouteOffline(routeId, opts) {
  if (opts && opts.seed) {
    await idbPutAll("pack", [{ id: routeId, seed: true, packedAt: Date.now() }]);
    return { seed: true };
  }
  if (!supabase) throw new Error("Catalog backend not configured");
  const { data, error } = await supabase.from("routes").select(ROUTE_AREA_EMBED).eq("id", routeId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("That climb is no longer in the catalog");
  await idbPutAll("pack", [{ ...data, packedAt: Date.now() }]);
  return { seed: false };
}

export async function unpackRouteOffline(routeId) { await idbDelete("pack", routeId); }

// Ids only, for rehydrating the pack list on load. Cheap enough to read on every mount: the
// pack is a handful of routes a person chose by hand, not a catalog.
export async function packedRouteIds() {
  try { return (await idbGetAll("pack")).map((r) => r.id); } catch (e) { return []; }
}

// The fallback behind useRoutesByIds. Two sources, and the pack wins: a packed row was fetched
// for that route specifically, while a state row is whatever the bulk download happened to
// capture. Rows from a state are gated on that state being marked COMPLETE, for the reason
// every other reader here is — a truncated catalog served to somebody with no signal is one
// they have no way to cross-check.
export async function offlineRoutesByIds(ids) {
  const want = new Set(ids || []);
  if (!want.size) return [];
  const out = [], seen = new Set();
  try {
    for (const row of await idbGetAll("pack")) {
      if (!want.has(row.id) || row.seed) continue;
      const { packedAt: _drop, ...r } = row;
      out.push(r); seen.add(row.id);
    }
  } catch (e) { /* pack unreadable — the state store may still answer */ }
  const missing = [...want].filter((id) => !seen.has(id));
  if (missing.length) {
    const ok = await completeStates();
    for (const id of missing) {
      let row = null;
      try { row = await idbGet("routes", id); } catch (e) { row = null; }
      if (!row || !ok.has(row._state)) continue;
      out.push({ ...row, areas: await areaEmbed(row.area_id) });
    }
  }
  return out;
}

// ── saved areas ─────────────────────────────────────────────────────────────
// Bookmarks were a useState seeded with two seed-catalog ids, cleared on sign-in and written
// nowhere — so Home's "Saved areas · N areas" tile read 0 after every reload and the Profile
// list was empty for a real account however many areas it had saved. Device-local and keyed by
// account, so signing out does not hand the next person your list and signing back in restores
// it. Not a `profiles` column: that is a schema change and a sync story, and this is the same
// device the catalog those areas point at is downloaded to.
const BOOKMARK_KEY = (who) => "bookmarks:" + (who || "anon");

// null means "nothing has ever been stored for this account", which is NOT the same as an
// empty list — the caller keeps its seed default in the first case and honours a deliberate
// empty list in the second. Collapsing the two would resurrect a bookmark you had removed.
export async function savedAreaIds(who) {
  try { const row = await idbGet("meta", BOOKMARK_KEY(who)); return row && Array.isArray(row.ids) ? row.ids : null; }
  catch (e) { return null; }
}

export async function saveAreaIds(who, ids) {
  await idbPutAll("meta", [{ key: BOOKMARK_KEY(who), ids: (ids || []).slice(), savedAt: Date.now() }]);
}

// ── the float plan ──────────────────────────────────────────────────────────
// The eleven-field form (vehicle, parking, depart, turnaround, HARD RETURN, comms, emergency
// contact) was a plain `useState` at BOTH call sites and reached no storage at all, so a safety
// document a climber filled in at the trailhead was gone on the next load. #1577/#1581 fixed the
// TAB-SWITCH unmount — surviving a sub-tab switch is not surviving a reload, and nothing had
// asked the second question.
//
// A DIFFERENT, SMALLER OBJECT is what `crews.float_plan` holds ({filedAt, contact, returnBy},
// filed by another control), so this is not that column and must not be confused with it.
//
// Device-local and KEYED BY ACCOUNT, exactly like the bookmarks above and for a sharper reason:
// this form holds somebody's emergency contact, so signing out must not hand it to the next
// person on the same phone. Not a `profiles` column — that is a schema change and a sync story,
// and the plan is for the phone you are carrying.
const FLOATPLAN_KEY = (who, scope) => "floatplan:" + (who || "anon") + ":" + scope;

// null means "nothing has ever been stored for this account and scope", which the caller keeps
// distinct from a plan that was stored and then emptied.
export async function savedFloatPlan(who, scope) {
  if (!scope) return null;
  try {
    const row = await idbGet("meta", FLOATPLAN_KEY(who, scope));
    return row && row.form && typeof row.form === "object" ? { form: row.form, saved: !!row.saved } : null;
  } catch (e) { return null; }
}

// `checkedIn` is DELIBERATELY NOT STORED, and the asymmetry is the reason. It is a claim about
// one trip's OUTCOME ("✓ Checked In Safe"), so reviving it for a later trip on the same route
// would state a safety fact that has not happened — over-claiming. Losing it across a reload
// under-claims instead, which costs a tap. Those two are not equally bad, so the safe branch is
// not the one that preserves more.
export async function saveFloatPlan(who, scope, st) {
  if (!scope) return;
  await idbPutAll("meta", [{ key: FLOATPLAN_KEY(who, scope), form: (st && st.form) || {}, saved: !!(st && st.saved), savedAt: Date.now() }]);
}

// ── searching a downloaded state, with no signal ─────────────────────────────
// The BROWSE chain has worked offline since the state download shipped: states, an area's
// children, an area's own routes. SEARCH did not. "View all N", the in-area route finder and
// the area filter box all go through RPCs, so with no signal you could drill down and never
// look anything up — on the one screen whose entire purpose is a catalog you took with you.
//
// These mirror routes_in_subtree / routes_in_subtree_count / areas_in_subtree (migrations
// 0015, 0018, 0019, 0074, 0147). They ARE a second implementation of those functions, and that
// is stated rather than hidden: an offline reader cannot call a stored procedure, so the choice
// is between mirroring one and having no search at all. What they must not do is DISAGREE — a
// filter that admits different rows offline is a catalog that changes when the signal drops —
// so the SQL's own null semantics are reproduced exactly, including the two that are easy to
// get wrong:
//
//   * a NULL grade_num or length_m FAILS a min/max filter. `null >= 5` is NULL in SQL, not
//     true; in JS `Number(null) >= 5` is `0 >= 5`, which is false for a minimum and TRUE for a
//     maximum. Written naively, every ungraded route would flood a "5.9 and under" search.
//   * `pitches` 0 means "unknown" for a roped route and "no pitches" for a boulder problem.
//     0074 exists for exactly that: coalesce(nullif(pitches,0), bouldering ? 0 : 1).
//
// NO SCHEMA CHANGE, which is the reason this could be done at all: `areas` rows are stored with
// their ltree `path`, so a subtree is a prefix test over rows already on the device, and routes
// carry `area_id`. Existing downloads gain search without being re-downloaded.
const numOrNull = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

// Descendant-or-self, the way `path <@ root.path` reads. The "." guard is what stops
// `wa_index` matching `wa_index_town_wall` — a label boundary, not a bare prefix.
async function subtreeScope(rootId) {
  if (!rootId) return null;
  let root = null;
  try { root = await idbGet("areas", rootId); } catch (e) { return null; }
  if (!root || !root.path) return null;
  const ok = await completeStates();
  if (!ok.has(root._state)) return null;
  const prefix = root.path + ".";
  const areas = (await idbGetAll("areas")).filter((a) => a._state === root._state);
  const ids = new Set(), nameById = new Map();
  for (const a of areas) {
    nameById.set(a.id, a.name);
    if (a.id === rootId || (typeof a.path === "string" && a.path.startsWith(prefix))) ids.add(a.id);
  }
  return { root, areas, ids, nameById, stateId: root._state };
}

// `q is null or q = ''` in the SQL — an empty filter is no filter, not a filter for "".
function normFilters(o) {
  const f = o || {};
  return {
    q: String(f.q || "").trim().toLowerCase(),
    disc: f.disc || "",
    minGrade: numOrNull(f.minGrade), maxGrade: numOrNull(f.maxGrade),
    minStars: numOrNull(f.minStars), minPitches: numOrNull(f.minPitches),
    minLengthM: numOrNull(f.minLengthM), maxLengthM: numOrNull(f.maxLengthM),
    sortBy: f.sortBy || "name",
    page: Number(f.page) || 0,
    pageSize: Number(f.pageSize) || 40,
  };
}

function routeMatches(r, f) {
  if (f.q && !String(r.name || "").toLowerCase().includes(f.q)) return false;
  if (f.disc && r.discipline !== f.disc) return false;
  const gn = numOrNull(r.grade_num);
  if (f.minGrade != null && (gn == null || gn < f.minGrade)) return false;
  if (f.maxGrade != null && (gn == null || gn > f.maxGrade)) return false;
  if (f.minStars != null && (numOrNull(r.stars) ?? 0) < f.minStars) return false;
  if (f.minPitches != null) {
    const raw = numOrNull(r.pitches);
    const p = raw ? raw : (r.discipline === "bouldering" ? 0 : 1);
    if (p < f.minPitches) return false;
  }
  const lm = numOrNull(r.length_m);
  if (f.minLengthM != null && (lm == null || lm < f.minLengthM)) return false;
  if (f.maxLengthM != null && (lm == null || lm > f.maxLengthM)) return false;
  return true;
}

// `nulls last` on BOTH directions, because that is what the SQL says and it is not the
// database's default for `desc` — Postgres puts nulls first there unless told otherwise. Get
// that wrong and every route with no stars leads a "best first" list.
function cmpNullsLast(a, b, desc) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return desc ? (b < a ? -1 : b > a ? 1 : 0) : (a < b ? -1 : a > b ? 1 : 0);
}

function subtreeComparer(sortBy, nameOf) {
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
  if (sortBy === "area") return (a, b) => cmpNullsLast(nameOf(a.area_id), nameOf(b.area_id), false) || byName(a, b);
  if (sortBy === "grade_asc") return (a, b) => cmpNullsLast(numOrNull(a.grade_num), numOrNull(b.grade_num), false) || byName(a, b);
  if (sortBy === "grade_desc") return (a, b) => cmpNullsLast(numOrNull(a.grade_num), numOrNull(b.grade_num), true) || byName(a, b);
  if (sortBy === "stars_desc") return (a, b) => cmpNullsLast(numOrNull(a.stars), numOrNull(b.stars), true) || byName(a, b);
  if (sortBy === "name_desc") return (a, b) => -byName(a, b);
  return byName;
}

async function matchingRoutes(scope, f) {
  return (await idbIndexAll("routes", "_state", scope.stateId))
    .filter((r) => scope.ids.has(r.area_id) && routeMatches(r, f));
}

// UNDEFINED means "nothing is stored for this query", which is NOT the same as "no route
// matched" — see orOfflineExact in lib/db.js. Collapsing the two would show a filter that
// legitimately matches nothing as a failed read, which is a false claim of its own kind.
export async function offlineSubtreeRoutes(rootId, opts) {
  const scope = await subtreeScope(rootId);
  if (!scope) return undefined;
  const f = normFilters(opts);
  const rows = await matchingRoutes(scope, f);
  rows.sort(subtreeComparer(f.sortBy, (id) => scope.nameById.get(id) ?? null));
  const off = f.page * f.pageSize;
  // The RPC returns `setof routes` — bare rows with no `areas` embed — so the caller's own
  // backfill runs exactly as it does online. Adding an embed here would make an offline hit a
  // different shape from a network one, which is the drift ROUTE_AREA_EMBED exists to prevent.
  return rows.slice(off, off + f.pageSize);
}

export async function offlineSubtreeRouteCount(rootId, opts) {
  const scope = await subtreeScope(rootId);
  if (!scope) return undefined;
  return (await matchingRoutes(scope, normFilters(opts))).length;
}

// The relevance ladder from 0147, which that migration wrote to mirror routeSearchScore in
// lib/db.js — so this is the third copy of one ranking, and the same argument applies: the two
// search boxes in this app should not disagree about what a good match is, and neither should
// the same box with and without a signal. `bare` drops the honorific so "baker" scores against
// "Mount Baker" as an exact match rather than as a mid-word hit.
const deHonorific = (s) => s.replace(/^(?:mount|mt\.?|the)\s+/, "");
function areaScore(lname, bname, raw, bare) {
  if (lname === raw) return 100;
  if (bare !== "" && (bname === raw || lname === bare || bname === bare)) return 90;
  if (lname.startsWith(raw)) return 80;
  if (bare !== "" && (bname.startsWith(raw) || lname.startsWith(bare))) return 70;
  if (lname.includes(" " + raw)) return 60;
  return 10;
}

export async function offlineAreaSearch(rootId, q, lim) {
  const raw = String(q || "").trim().toLowerCase();
  if (!raw) return undefined;
  const scope = await subtreeScope(rootId);
  if (!scope) return undefined;
  const bare = deHonorific(raw);
  const hits = scope.areas.filter((a) => a.id !== rootId && scope.ids.has(a.id)
    && String(a.name || "").toLowerCase().includes(raw));
  // `total` is the match count BEFORE the limit, and it is the same number on every row — a
  // window function in the SQL. Without it a truncated offline search reads as the whole
  // answer, which is the silent alphabetical cut 0147 exists to have fixed.
  const total = hits.length;
  const scored = hits.map((a) => {
    const lname = String(a.name || "").toLowerCase();
    return { a, score: areaScore(lname, deHonorific(lname), raw, bare) };
  });
  scored.sort((x, y) => (y.score - x.score)
    || cmpNullsLast(numOrNull(x.a.route_count), numOrNull(y.a.route_count), true)
    || String(x.a.name || "").localeCompare(String(y.a.name || "")));
  return scored.slice(0, Number(lim) || 40).map(({ a }) => ({
    id: a.id, name: a.name, area_type: a.area_type, route_count: a.route_count,
    parent_id: a.parent_id, parent_name: a.parent_id ? (scope.nameById.get(a.parent_id) ?? null) : null,
    total,
  }));
}

// ── opening a search hit, with no signal ─────────────────────────────────────
// The area filter box became searchable offline before the thing you do with a hit did,
// and that combination is worse than no search at all: `areas_in_subtree` returns a NARROW
// projection with no ltree `path`, so `jumpToArea` hydrates the full row and then builds a
// breadcrumb from it. Offline both of those threw, the breadcrumb came back empty, and the
// handler bailed AFTER it had already switched screens — a tap that visibly goes somewhere
// and lands on an area with no ancestors and no panels.
//
// Every row needed is already on the device: `path` is stored on the area row, and its
// labels ARE the ancestor ids. The one label that is never stored is the leading ROOT
// COUNTRY — `downloadStateOffline` keeps only descendants of the state — and that is the
// exact label `fetchAreaBreadcrumb` drops before it looks anything up, because the
// breadcrumb does not show the country. So the ids that survive are all present.
export async function offlineAreasByIds(ids) {
  const want = (ids || []).filter(Boolean);
  if (!want.length) return [];
  const ok = await completeStates();
  const out = [];
  for (const id of want) {
    let row = null;
    try { row = await idbGet("areas", id); } catch (e) { row = null; }
    if (row && ok.has(row._state)) out.push(row);
  }
  return out;
}

// A MAP rather than rows, mirroring useAreaNamesByIds — and `undefined` rather than `{}`
// when nothing resolved, because an empty map is truthy and would let orOffline substitute
// it for a failed read: the names would silently degrade to their placeholder as though
// they had been looked up. A PARTIAL map is a real answer and is kept.
export async function offlineAreaNamesByIds(ids) {
  const rows = await offlineAreasByIds(ids);
  if (!rows.length) return undefined;
  const map = {};
  for (const a of rows) map[a.id] = a.name;
  return map;
}
