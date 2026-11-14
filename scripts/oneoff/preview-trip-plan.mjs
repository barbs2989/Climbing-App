// Renders the Trip plan (ItineraryView) for a few real route shapes into one static HTML page, so the
// section can be looked at without the live app (owner note 2026-11-11: "make the whole trip plan
// better ui"). Read-only; reads only the research-data inputs on disk.
// Usage: node scripts/oneoff/preview-trip-plan.mjs <out.html>
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2] || path.join(os.tmpdir(), "trip-plan-preview.html");
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ItineraryView from ${JSON.stringify(path.join(ROOT, "src/components/ItineraryView.tsx"))};
const noop = () => {};
export function render(route, extra) {
  return renderToStaticMarkup(React.createElement(ItineraryView, Object.assign({ route, activity: [], onSeeReports: noop, onSeeSeason: noop, onContribute: noop, onSaveMyItin: noop, myItin: null, notify: noop }, extra || {})));
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-tripplan-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error",
});
const { render } = createRequire(import.meta.url)(out);
const IN = path.join(ROOT, "research-data/trip-plans-wa-2026-11-11/inputs");
const template = JSON.parse(fs.readFileSync(path.join(IN, "template.json"), "utf8"));
const gap = JSON.parse(fs.readFileSync(path.join(IN, "gap-routes.json"), "utf8"));
const bacon = gap.find((r) => r.id === "wa_bacon_peak_diobsud");
const base = { discipline: "mountaineering", grade: "Class 4", season: "Jul-Sep", mountainId: "x", _dbArea: { id: "x", name: "X", areaType: "peak" } };
const cases = [
  ["Structured, complete (Bonanza Mary Green)", { ...base, id: "a", name: "Mary Green Glacier", itinerary: template, seasonalGuidance: { x: 1 } }],
  ["Structured, days missing figures (Bacon Diobsud)", { ...base, id: "b", name: "Diobsud", itinerary: bacon.itinerary }],
  ["Prose, Day 1/Day 2", { ...base, id: "c", name: "Prose", itinerary: "Day 1: Hike 6 mi to the lake; set up camp below the moraine. Day 2: Climb the glacier to the summit; return to camp. Day 3: Hike out." }],
  ["None", { ...base, id: "d", name: "Empty", itinerary: null }],
  ["My plan saved", { ...base, id: "e", name: "Mary Green Glacier", itinerary: template }, { myItin: template, crewsForRoute: [{ id: 1, date: "2026-07-12" }], onShareItinToCrew: () => {} }],
];
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trip plan preview</title>
<style>body{background:#0d1117;color:#e6edf3;font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:16px}.col{max-width:400px;margin:0 auto 48px}h1{font:600 12px monospace;color:#f0883e;margin:24px 0 6px}button{font-family:inherit}</style>
${cases.map(([t, r, x]) => `<div class="col"><h1>${t}</h1>${render(r, x)}</div>`).join("\n")}`;
fs.writeFileSync(OUT, html);
console.log("wrote " + OUT);
