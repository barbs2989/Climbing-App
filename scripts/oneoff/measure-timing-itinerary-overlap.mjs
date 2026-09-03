import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(ROOT, ".cm-ti-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });
const entry = path.join(dir, "e.js"), out = path.join(dir, "b.mjs");
fs.writeFileSync(entry, [
  `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`,
  `export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};`].join("\n"));
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("x"); } };
const { RouteDetail, dbRouteToCamel } = await import(out);

// ── how big is the class? two columns holding the SAME string, catalog-wide ─────────────
const rows = await selectAll("routes", "id,timing,itinerary", "timing=not.is.null&itinerary=not.is.null", { pageSize: 1000 });
const leaves = (v, acc = []) => {
  if (typeof v === "string") { const t = v.trim(); if (t.length >= 25) acc.push(t); return acc; }
  if (Array.isArray(v)) { v.forEach((x) => leaves(x, acc)); return acc; }
  if (v && typeof v === "object") { Object.values(v).forEach((x) => leaves(x, acc)); return acc; }
  return acc;
};
let shared = 0, sharedRows = [];
for (const r of rows) {
  const a = new Set(leaves(r.timing)), b = new Set(leaves(r.itinerary));
  const both = [...a].filter((x) => b.has(x));
  if (both.length) { shared++; sharedRows.push([r.id, both.length]); }
}
console.log(`routes carrying BOTH timing and itinerary: ${rows.length}`);
console.log(`  ...of those, sharing at least one identical string: ${shared} (${(shared / rows.length * 100).toFixed(1)}%)`);
console.log(`  worst: ${sharedRows.sort((x, y) => y[1] - x[1]).slice(0, 5).map(([id, n]) => id + " x" + n).join(", ")}`);

// ── and what does the SCREEN do with it? ─────────────────────────────────────────────────
const id = sharedRows[0][0];
const [raw] = await selectAll("routes", "*", "id=eq." + id, { pageSize: 5 });
const route = dbRouteToCamel(raw);
route.mountainId = "a"; route._dbArea = { id: "a", name: "Probe", areaType: "peak", region: "Washington" };
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
  React.createElement(RouteDetail, { route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
    contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
    gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
const lines = html.replace(/<[^>]*>/g, "\n").replace(/&amp;/g, "&").replace(/&#x27;/g, "'")
  .split("\n").map((l) => l.trim()).filter(Boolean);
const dup = [...new Set(leaves(raw.timing))].filter((x) => new Set(leaves(raw.itinerary)).has(x))[0];
console.log(`\n--- ${id}: the string stored in BOTH timing and itinerary:\n    ${JSON.stringify(dup.slice(0, 110))}`);
lines.forEach((l, i) => { if (l.includes(dup.slice(0, 50))) console.log(`\n--- on the Planner tab at line ${i}:\n` + lines.slice(Math.max(0, i - 5), i + 2).map((x) => "    " + x).join("\n")); });
