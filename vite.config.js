import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cspPlugin } from "./scripts/lib/vite-csp.mjs";

// base must match your repo name so links work on GitHub Pages
export default defineConfig({
  plugins: [react(), cspPlugin()],
  base: "/Climbing-App/",
  build: {
    // The app is a single large component by design (see CLAUDE.md), so the main
    // chunk is intentionally big; raise the limit so the warning reflects reality.
    chunkSizeWarningLimit: 1200,
    // HIDDEN source maps: written beside each chunk, but the bundle carries no sourceMappingURL, so
    // no browser fetches them. The deploy moves them OUT of dist/ into the Actions artifact
    // `sourcemaps-<entry script>` (.github/workflows/deploy.yml), and `npm run errors:read` uses them
    // to turn a crash filed to app_errors from "index-x.js:1:482113" into a file, line and function.
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Split React + React Query into their own long-cached chunks so the main
        // app chunk is smaller and vendor code isn't re-downloaded on app updates.
        // (@supabase is unused with USE_DB off and tree-shakes away entirely.)
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@tanstack")) return "react-query";
          // Only matters for CI/prod builds where the VITE_SUPABASE_* env is set;
          // without it the client tree-shakes away and this rule emits nothing.
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "react";
        },
      },
    },
  },
});
