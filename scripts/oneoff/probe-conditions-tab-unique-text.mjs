#!/usr/bin/env node
// What text is UNIQUE to the Conditions sub-tab?
//
// check:outage's Conditions walk was attempted twice and reverted twice (#1405, #1411). The second
// attempt's blocker: the browser capture came back byte-length-identical to Overview, so there was
// no way to tell "the tab changed" from "the click did nothing". The fix recorded there is to
// assert on TEXT ONLY ConsensusPanel renders rather than on a length — and this finds that text.
//
// SSR, no browser and no database, so it runs on a loaded box where a browser walk would not be
// evidence. RouteDetail takes `initialSubTab`, so each sub-tab can be rendered directly.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab, extra) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, Object.assign({
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      }, extra || {}))));
}
`;
// Inside the project: node resolves react from the nearest node_modules, so a bundle in the OS
// temp dir throws ERR_MODULE_NOT_FOUND.
const outDir = fs.mkdtempSync(path.join(ROOT, ".cm-cond-"));
const out = path.join(outDir, "bundle.cjs");
const entryFile = path.join(outDir, "entry.jsx");
fs.writeFileSync(entryFile, ENTRY);
try {
  await build({
    entryPoints: [entryFile], bundle: true, outfile: out, platform: "node", format: "cjs",
    jsx: "automatic", loader: { ".jsx": "jsx" }, logLevel: "silent",
    define: { "import.meta.env": "{}" },
  });
  const { render } = await import(out);

  const route = { id: "probe_r", name: "Probe Route", grade: "5.9", pitches: 6, discipline: "trad",
                  areaName: "Probe Area", lat: 47.5, lng: -121.5 };

  const strip = (h) => h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // Render Overview TWICE, a moment apart. If the page carries a live clock, two captures of the
  // SAME screen differ — which is exactly what would defeat a "did the screen change?" assertion.
  const a1 = strip(render(route, "overview"));
  await new Promise((r) => setTimeout(r, 1100));
  const a2 = strip(render(route, "overview"));
  console.log("SAME screen rendered twice: identical? " + (a1 === a2) + "  (lengths " + a1.length + " / " + a2.length + ")");
  if (a1 !== a2) {
    for (let i = 0; i < Math.min(a1.length, a2.length); i++) if (a1[i] !== a2[i]) {
      console.log("  first difference at " + i + ": " + JSON.stringify(a1.slice(i-40, i+30)) + "  vs  " + JSON.stringify(a2.slice(i-40, i+30)));
      break;
    }
  }
  console.log("");
  const tabs = ["overview", "conditions", "photos"];
  const text = {};
  for (const t of tabs) text[t] = strip(render(route, t));

  console.log("rendered lengths (SSR, no browser):");
  for (const t of tabs) console.log(`  ${t.padEnd(12)} ${String(text[t].length).padStart(6)} chars`);
  console.log("");
  console.log(`conditions === overview ? ${text.conditions === text.overview}`);
  console.log(`conditions === photos   ? ${text.conditions === text.photos}`);
  console.log("");

  // Words present on conditions and on NEITHER of the others — what an assertion can key on.
  const words = (s) => new Set(s.split(" ").filter((w) => w.length > 3));
  const c = words(text.conditions), o = words(text.overview), p = words(text.photos);
  const only = [...c].filter((w) => !o.has(w) && !p.has(w));
  console.log(`${only.length} word(s) unique to the Conditions render:`);
  console.log("  " + only.slice(0, 40).join(" "));

  // The specific sentence check:outage would want to assert on.
  const NEEDLE = "Couldn’t load this route";
  console.log(`\nConsensusPanel's outage copy present in the healthy render? ${text.conditions.includes(NEEDLE)}`);
  console.log("(expected false — the healthy render should NOT claim a failure)");
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}
