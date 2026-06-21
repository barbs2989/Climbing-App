import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match your repo name so links work on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: "/Climbing-App/",
});
