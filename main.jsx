import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./ClimbMatch.jsx";
import AppErrorBoundary from "./AppErrorBoundary.jsx";

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
const queryClient = new QueryClient({ defaultOptions: { queries: { networkMode: "always" } } });

// The boundary wraps the provider too: a throw from a query-client consumer during render
// is just as fatal, and outside it there is nothing left to render a fallback with.
createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </AppErrorBoundary>
);

// Registered only in production builds so it never interferes with Vite's
// dev-server module graph / HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").catch(() => {});
  });
}
