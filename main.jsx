import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./ClimbMatch.jsx";
import AppErrorBoundary from "./AppErrorBoundary.jsx";
import { restoreQueryCache, persistQueryCache } from "./lib/query-persist.js";

// networkMode "always" is load-bearing, not a tuning knob. React Query's default is
// "online": when the browser reports itself offline it sets fetchStatus "paused" and
// NEVER CALLS queryFn. lib/db.js puts its IndexedDB fallback (orOffline) *inside*
// queryFn, so under the default the downloaded-state catalog is unreachable in exactly
// the situation it exists for -- losing signal with the app open.
//
// It fails silently rather than loudly, because a paused query reports isLoading false
// (isLoading is isPending && isFetching, and a paused query is not fetching) with no
// error and no data. Every "not loading, no error, no rows" branch in the UI then renders
// its empty state, so the state picker tells a climber holding a downloaded copy of
// Washington "No states found". Measured against this exact library version:
//
//   online   -> fetchStatus "idle",   queryFn calls 1, fallback reached, data shown
//   offline  -> fetchStatus "paused", queryFn calls 0, fallback never called, "No states found"
//
// With "always" the queryFn runs regardless, the network attempt fails immediately, and
// orOffline serves local data on the first try (no retry delay). Queries that have no
// offline fallback are better off too: they surface an honest "couldn't load" instead of
// claiming the catalog is empty.
//
// Scoped to queries so that any future useMutation keeps the default offline-queue
// behaviour, where pausing a write until reconnect is the right thing. There are no
// mutations in the tree today.
//
// `retry` exists because networkMode "always" has a cost: queries now genuinely run with no
// signal, and the default 3 retries make the user wait out the backoff before seeing anything.
// Measured on the live site, going offline with the app open — every START and FAIL landed on
// the SAME timestamp, so the request fails instantly and the entire wait is backoff:
//
//   3.1s 7.1s 8.1s 9.1s 11.1s 15.1s 17.1s 18.1s 20.1s 24.1s 28.1s 29.1s 31.1s 35.1s
//   16 attempts for one query, settling at ~35s on "Loading states…"
//
// Retrying is pointless when the device itself reports no network: nothing changed between
// attempts and no amount of backoff conjures a connection. Only `navigator.onLine === false`
// is trusted, never `true` — the browser sets false when the OS says there is no link, which
// is reliable, while true merely means an interface exists and says nothing about reachability
// (captive portals, dead uplinks). So a genuinely offline device fails on the first attempt
// and shows its real state at once, while every online failure keeps the full retry budget.
//
// This does not weaken the offline catalog: orOffline consults IndexedDB inside the FIRST
// attempt, so a downloaded state is served immediately either way. What collapses is only the
// dead waiting when there is nothing local to serve.
// A TIMEOUT is never retried, and the reason is that the retrying already happened one layer
// down. supabase-js retries a failed PostgREST request FOUR times on its own, with backoff —
// measured against a backend that accepts and never answers, one `.select()` produced fetches
// at t+1.0s, t+8.0s, t+16.0s and t+26.0s, all to the identical URL. So a single queryFn call
// is already four network attempts, and the `failureCount < 3` below multiplies it to SIXTEEN.
// That is the same 16 the note above measured going offline, from the same cause.
//
// With the 25s per-request deadline in lib/supabase.js that is 16 x 25s of "Loading countries…",
// which is why a dead database produced a spinner that had still not settled after FIVE
// MINUTES of watching. Retrying a request that already exhausted its deadline, after the client
// beneath already retried it four times, cannot discover anything new — it only makes the user
// wait longer to be told the same thing.
//
// Deliberately narrow: only aborts/timeouts skip the retry budget. A 500, a dropped connection
// or an RLS error still gets the full three, because those genuinely can differ on a second
// attempt. Matched on the message because the value reaching here is the plain object
// supabase-js returns, not a DOMException, so `err.name` is unreliable.
const isTimeout = (err) => /TimeoutError|AbortError|aborted due to timeout|signal is aborted/i.test(String((err && err.message) || err || ""));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      // A query answered in the last minute is not refetched just because a screen remounted
      // or the tab regained focus. The default (0) refetched on every tab switch — most of
      // the network traffic in a normal session, for data that had not changed. Writes do not
      // depend on it: every write path updates its screen through a setter, refetch() or an
      // invalidate, which ignore staleTime.
      staleTime: 60 * 1000,
      // Long enough that a restored catalog query (lib/query-persist.js) survives a session
      // in which nothing happens to mount it.
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, error) => {
        if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
        if (isTimeout(error)) return false;
        return failureCount < 3;
      },
    },
  },
});

// The boundary wraps the provider too: a throw from a query-client consumer during render
// is just as fatal, and outside it there is nothing left to render a fallback with.
//
// Paint from the last visit's catalog if it is on the device (lib/query-persist.js), then
// keep it current. The restore is capped at 150ms so a slow disk cannot hold the first paint.
restoreQueryCache(queryClient).finally(() => {
  persistQueryCache(queryClient);
  createRoot(document.getElementById("root")).render(
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
});

// A deploy replaces every hashed chunk in dist/, and Pages serves only the new ones. So a tab
// opened BEFORE a deploy still holds the old index chunk, whose lazy imports name files that no
// longer exist: the first visit to a lazily-loaded screen (Partners, Ranks, a route page) 404s,
// the import throws, and AppErrorBoundary shows "This screen hit a bug" — which a reload fixes,
// because the reload fetches the new index.html (sw.js is network-first for navigations).
// Vite fires `vite:preloadError` for exactly that failure, so do the reload for the climber.
// ONCE: a second failure within the window is not a stale deploy (offline, or a genuinely
// missing file), and reloading again would loop — let it reach the boundary instead. If
// sessionStorage is unavailable the guard cannot be recorded, so do not reload at all.
const CHUNK_RELOAD_KEY = "climbmatch:chunk-reload-at";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0;
    if (Date.now() - last < 30 * 1000) return;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch { return; }
  event.preventDefault();
  window.location.reload();
});

// The screens split off the startup bundle (React.lazy in ClimbMatch.jsx) are fetched once the
// first screen is up and the browser is idle, so a climber opening Crew or Logbook later gets
// the tab at once rather than a skeleton — the split buys a faster start without making every
// later tab switch pay for it. Each import() resolves to the same chunk React.lazy loads, so
// nothing downloads twice.
//
// Two conditions keep it from misfiring, and the second exists because of the handler above:
//   - Save-Data: those bytes are then fetched only when the screen is actually opened.
//   - OFFLINE: a failed import() fires `vite:preloadError`, and the handler above answers that
//     with a RELOAD. A prefetch that fails for want of a signal must not reload the page out from
//     under a climber at the trailhead. (A prefetch failing because a deploy landed seconds after
//     load reloads onto the new build, which is what the handler is for.)
const prefetchSplitScreens = () => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (typeof navigator !== "undefined" && navigator.connection && navigator.connection.saveData) return;
  [() => import("./RouteDetail.jsx"), () => import("./lib/CrewCard.jsx"), () => import("./lib/ListsManager.jsx"),
   () => import("./lib/PartnerSearch.jsx"), () => import("./lib/Leaderboards.jsx"), () => import("./lib/CrewFinder.jsx"),
   () => import("./lib/LogAscent.jsx"), () => import("./lib/TripReport.jsx"), () => import("./lib/AddRoute.jsx"),
   () => import("./lib/EditProfileScreen.jsx")].forEach((load) => load().catch(() => {}));
};
window.addEventListener("load", () => {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  setTimeout(() => idle(prefetchSplitScreens, { timeout: 5000 }), 1500);
});

// Registered only in production builds so it never interferes with Vite's
// dev-server module graph / HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
  });
}
