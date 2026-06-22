import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match your repo name so links work on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: "/Climbing-App/",
  build: {
    // The app is a single large component by design (see CLAUDE.md), so the main
    // chunk is intentionally big; raise the limit so the warning reflects reality.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split React + React Query into their own long-cached chunks so the main
        // app chunk is smaller and vendor code isn't re-downloaded on app updates.
        // (@supabase is unused with USE_DB off and tree-shakes away entirely.)
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@tanstack")) return "react-query";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "react";
        },
      },
    },
  },
});
