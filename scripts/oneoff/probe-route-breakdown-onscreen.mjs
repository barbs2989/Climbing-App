#!/usr/bin/env node
// Eyeball the Plan tab's ROUTE BREAKDOWN for the three shapes pitch_detail actually takes:
// pitches only, stages only, and both interleaved. check:pitch-split asserts the classification
// and the order; this prints what a climber reads, which is the half an assertion cannot show.
//
// No browser, no DB. `node scripts/oneoff/probe-route-breakdown-onscreen.mjs [pitches|stages|mixed]`
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(ROOT, ".cm-bd-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });
const entry = path.join(dir, "e.js"), out = path.join(dir, "b.mjs");
fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };
const { RouteDetail } = await import(out);

const PD = {
  mixed: [
    { pitch: "Approach gully", grade: "Class 3", notes: "Loose scree to the notch.", lengthM: 300 },
    { pitch: "1", grade: "5.7", notes: "Corner to a ledge.", lengthM: 45, anchor: "2 bolts", bolts: 2 },
    { pitch: "2", grade: "5.8", notes: "Crux hands.", lengthM: 50, crux: true, anchor: "gear" },
    { pitch: "Notch traverse", grade: "Class 4", notes: "Exposed step-across." },
    { pitch: "3", grade: "5.6", notes: "Runout slab to the top.", lengthM: 40 },
    { pitch: "Summit snowfield", grade: "Snow to 35°", notes: "Final walk to the summit." },
  ],
  pitches: [
    { pitch: "P1", grade: "5.10-ish", notes: "Face and cracks.", anchor: "2 bolts", lengthM: 30 },
    { pitch: "P2", grade: "5.11c (crux)", notes: "Thin headwall.", bolts: 6, crux: true, lengthM: 35 },
    { pitch: "Chimney pitch", grade: "5.9", notes: "Wide and awkward.", lengthM: 28 },
  ],
  stages: [
    { pitch: "Trailhead to Fourth of July Pass", grade: "Maintained trail, Class 1", notes: "Switchbacks through forest." },
    { pitch: "Pass to the promontory", grade: "Class 2, faint bootpath", notes: "Follow the bootpath north." },
    { pitch: "Summit block", grade: "Class 2-3 scramble", notes: "Blocky scrambling to the top." },
  ],
};

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const which = process.argv[2] && PD[process.argv[2]] ? [process.argv[2]] : Object.keys(PD);
for (const k of which) {
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, {
      route: { id: "probe_" + k, name: "Probe " + k, grade: "5.8", discipline: k === "stages" ? "scrambling" : "alpine",
        pitches: k === "pitches" ? 4 : null, mountainId: "probe_area", areaType: "peak", pitchDetail: PD[k] },
      initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null,
    })));
  const i = html.indexOf("ROUTE BREAKDOWN");
  if (i < 0) { console.log(`\n### ${k}: ROUTE BREAKDOWN did not render — ANCHOR LOST`); process.exitCode = 1; continue; }
  const kinds = [...html.matchAll(/data-kind="(pitch|stage)"[^>]*?data-label="([^"]*)"/g)].map((m) => `${m[1] === "pitch" ? "P" : "·"} ${m[2]}`);
  // Strip tags FIRST and slice the TEXT: a character window over raw markup lands mid-attribute
  // and prints a style object, which is the fixed-window trap this repo records everywhere else.
  const all = html.replace(/<[^>]*>/g, "\n").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&#xB7;/g, "·")
    .split("\n").map((l) => l.trim()).filter(Boolean);
  const txt = all.slice(all.indexOf("ROUTE BREAKDOWN"));
  console.log(`\n### ${k} — rows in render order:`);
  kinds.forEach((r, n) => console.log(`   ${String(n + 1).padStart(2)}. ${r}`));
  console.log("   --- as read:");
  console.log(txt.slice(0, 40).map((l) => "     " + l).join("\n"));
}
