// Does the ROUTE BETA (route stages) section still overlap or run off a 390px phone?
//
// Renders the real RouteDetail with the WORST REAL stage entries in the catalog — the
// long prose labels and, more importantly, the prose `grade` values ("Class 2-3 rock
// scramble (easy snow ridge in winter)") that the row draws as a nowrap chip — then
// measures the laid-out geometry in Chrome at 390x844.
import { build } from "esbuild";
import { createRequire } from "module";
import { chromium } from "playwright-core";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-stage-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// Worst real rows, lifted verbatim from the live catalog (probe-stage-labels.mjs).
const PD = [
  { pitch: "Section 2 — from the col, bear back and cross the head of the glacier to the north face",
    grade: "Glacier travel to a bergschrund/moat", lengthM: 131, notes: "Cross the glacier head under the north face." },
  { pitch: "Section 2 - southeast ridge from the 5,640 ft saddle to the summit",
    grade: "Class 2-3 rock scramble (easy snow ridge in winter)", lengthM: 62, crux: true,
    notes: "Follow the ridge crest; loose blocks throughout." },
  { pitch: "Fryingpan/Whitman glacier crossing and steep snow to the east shoulder",
    grade: "Steep snow/ice, up to ~45°", lengthM: 335, notes: "Crampons and a second tool are worth carrying." },
  { pitch: "1 - Granite slabs and cliff-band navigation, ~4,850 ft to the 5,720+ ft saddle",
    grade: "Class 2-3 with route-finding", lengthM: 265, anchor: "No fixed anchor" },
];

const route = {
  id: "probe_stages", name: "Probe Stages", grade: "Class 3", gradeSystem: "yds",
  discipline: "mountaineering", pitches: 0, mountainId: "probe_area",
  pitchDetail: PD,
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
};

const html = render(route, "planner");
const page_html = `<div id="root" style="width:390px;margin:0;padding:0">${html}</div>`;
const file = path.join(os.tmpdir(), "stage-probe.html");
fs.writeFileSync(file, `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#0b0f18}</style>${page_html}`);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("file://" + file);
await page.waitForTimeout(400);

const findings = await page.evaluate(() => {
  // Locate the ROUTE BETA section by its heading, then measure inside it.
  const all = [...document.querySelectorAll("*")];
  const head = all.find(e => (e.textContent || "").trim() === "ROUTE BETA");
  if (!head) return { error: "ROUTE BETA heading not rendered" };
  // Climb only as far as the element that also holds the section's own caption, so the
  // walk cannot swallow the page header and report ITS geometry as a stages finding.
  let sec = head;
  while (sec.parentElement && !/How the route goes, section by section/.test(sec.textContent || "")) sec = sec.parentElement;

  const over = [];
  for (const e of sec.querySelectorAll("*")) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > 390.5) over.push({ right: Math.round(r.right), w: Math.round(r.width), text: (e.textContent || "").trim().slice(0, 70), style: (e.getAttribute("style") || "").slice(0, 110) });
  }

  // Text-node overlap: two leaf elements whose rects intersect by more than a hair.
  const leaves = [...sec.querySelectorAll("*")].filter(e => e.children.length === 0 && (e.textContent || "").trim());
  const hits = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i].getBoundingClientRect(), b = leaves[j].getBoundingClientRect();
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 2 && oy > 2) hits.push({ a: (leaves[i].textContent || "").trim().slice(0, 45), b: (leaves[j].textContent || "").trim().slice(0, 45), ox: Math.round(ox), oy: Math.round(oy) });
  }
  return { over, hits, secWidth: Math.round(sec.getBoundingClientRect().width), scrollW: document.documentElement.scrollWidth };
});

console.log(JSON.stringify(findings, null, 2).slice(0, 4000));
await browser.close();
