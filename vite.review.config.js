// Second build for the owner's standalone Review desk (review.html, 2026-11-14).
//
// A separate build, not a second `input` in vite.config.js, ON PURPOSE: a shared multi-page build
// renamed the app's entry chunk (index-* → main-*) and split a 660 kB chunk out of it to share with
// this page, changing what every climber downloads for a page only the owner opens. Built on its
// own, the app's bundle is byte-for-byte what it was, and this page duplicates the code it reuses.
//
// It writes INTO the app's dist/ (emptyOutDir false) after the app build, with its scripts under
// review-assets/ so the service worker's per-deploy /assets/ prune and precache never see them.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Climbing-App/",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    assetsDir: "review-assets",
    chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { review: "review.html" } },
  },
});
