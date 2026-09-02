#!/usr/bin/env node
// Does ROUTE BREAKDOWN fit a 390px phone?
//
// check:overflow walks the route page with `?zr=1`, which opens ROUTES[0] — `kings_hf`, a scramble
// whose pitchDetail is null. So the section this probe measures renders in NO screen that guard
// walks: "0 offenders" there is a statement about a page these rows were never on. Same shape as
// check:a11y-badges being green about the pitch badge for the same reason.
//
// The risk is real rather than theoretical. A stage's `grade` is TERRAIN PROSE running to 51
// characters in the live catalog, and it once measured 315px wide inside a nowrap flexShrink:0
// group and put its row's right edge at x=392. The merge puts PITCH rows into that same group —
// they used to be full-width with nowrap — and adds a 26px spine column plus a 3px accent to
// every row, so each row lost 39px of content width. That is the direction that overflows.
//
// It renders the real component to markup and lays it out in Chrome at 390x844. No dev server and
// no database: the widths come from the same inline styles the app ships, which is the whole
// reason this measurement is worth anything.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(ROOT, ".cm-bdov-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });
const entry = path.join(dir, "e.js"), out = path.join(dir, "b.mjs");
fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };
const { RouteDetail } = await import(out);

/* THE STRESS FIXTURE IS THE MEASURED WORST CASE, not a plausible one: the 51-character terrain
   prose this file already records, a long descriptive pitch title, a compound grade, and a crux
   flag so the CRUX span is in the row too. A fixture of short labels measures nothing. */
const PD = [
  { pitch: "Approach gully from the lower basin", grade: "Class 2-3 rock scramble (easy snow ridge in winter)", notes: "Loose.", lengthM: 300, crux: true },
  { pitch: "Glacier crossing below the bergschrund", grade: "Glacier travel to a bergschrund/moat", notes: "Roped." },
  { pitch: "1", grade: "Grade III, 5.10a (5 pitches, 900 ft)", notes: "Sustained.", lengthM: 45, anchor: "2 bolts", bolts: 4, crux: true },
  { pitch: "Chimney pitch below the gendarme", grade: "5.9+", notes: "Wide.", lengthM: 50, anchor: "gear" },
  { pitch: "3", grade: "5.6", notes: "Slab.", lengthM: 40 },
];
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const body = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
  React.createElement(RouteDetail, {
    route: { id: "probe_ov", name: "Probe", grade: "5.10a", discipline: "alpine", pitches: 8,
      mountainId: "probe_area", areaType: "peak", pitchDetail: PD },
    initialSubTab: "planner", onBack: noop, onSubTab: noop,
    contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
    gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null,
  })));
if (!body.includes("ROUTE BREAKDOWN")) { console.log("BROKEN PROBE: ROUTE BREAKDOWN did not render — ANCHOR LOST"); process.exit(1); }

const page404 = path.join(dir, "p.html");
fs.writeFileSync(page404, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:390px}*{box-sizing:border-box}</style><body>${body}</body>`);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("file://" + page404);
const bad = await page.evaluate(() => {
  /* SCOPED TO THE ROWS THEMSELVES, not to an ancestor found by walking up from the heading —
     `SL` nests the heading a couple of levels deep, so `closest("div").parentElement` picked a
     wrapper the rows are not inside and the probe measured nothing while looking healthy. The
     rows carry `data-kind`, which is the one selector that cannot be wrong about what they are. */
  const rows = [...document.querySelectorAll("[data-kind]")];
  if (!rows.length) return { rows: 0 };
  const over = [];
  for (const row of rows) {
    for (const el of [row, ...row.querySelectorAll("*")]) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > 390.5) over.push({ right: Math.round(r.right), tag: el.tagName, text: el.textContent.trim().slice(0, 60) });
    }
  }
  const widest = Math.max(...rows.map((r) => r.getBoundingClientRect().right));
  return { rows: rows.length, over: over.slice(0, 8), sectionRight: Math.round(widest), docWidth: document.documentElement.scrollWidth };
});
await browser.close();

if (bad.broken) { console.log("BROKEN PROBE: " + bad.broken); process.exit(1); }
if (!bad.rows) { console.log("BROKEN PROBE: no [data-kind] rows laid out — the measurement covered nothing"); process.exit(1); }
console.log(`ROUTE BREAKDOWN at 390px: ${bad.rows} row(s), section right edge ${bad.sectionRight}, document scrollWidth ${bad.docWidth}`);
if (!bad.over.length) { console.log("ok — nothing in the section runs past the right-hand edge."); process.exit(0); }
console.log(`${bad.over.length} element(s) past 390px:`);
for (const o of bad.over) console.log(`  right=${o.right}  <${o.tag}>  ${JSON.stringify(o.text)}`);
process.exit(1);
