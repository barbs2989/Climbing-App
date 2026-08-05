import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./ClimbMatch.jsx";
import AppErrorBoundary from "./AppErrorBoundary.jsx";

const queryClient = new QueryClient();

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
