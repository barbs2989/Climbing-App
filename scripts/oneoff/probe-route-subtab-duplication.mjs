// What does the route page say on MORE THAN ONE sub-tab?
//
// #1493 found GETTING THERE rendered on both Overview and Plan for a crag route -- the drive note
// twice, the approach prose twice, two drive buttons -- and the same complaint had already been
// raised and fixed once on the Plan tab (#1437). That is twice now, found by hand both times. This
// asks the question of all six sub-tabs at once, for both route families.
//
// It compares RENDERED text, not source, because the gates are what decide this and reading them
// got the crag answer wrong: `showPlan` and `!cragOnly` interact, so which sections a route
// actually gets is not apparent from either gate alone.
//
// Report-only. A repeated SECTION HEADING is a finding to read; repeated words are not -- a route
// name or a grade legitimately appears on several tabs, which is why this keys on headings and on
// long distinctive sentences rather than on any shared text.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.subtab-dup-${process.pid}.mjs`);
const entry = path.join(ROOT, `.subtab-dup-entry-${process.pid}.mjs`);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };

fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
    "--jsx=automatic", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { clean(); console.error("FAIL — esbuild could not bundle RouteDetail.jsx"); process.exit(1); }

if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };
const { RouteDetail } = await import(out + "?t=" + Date.now());

const base = {
  mountainId: "probe_area", grade: "5.10a", pitches: 4,
  road: { name: "Probe Canyon Road", driveNote: "Drive twelve miles up the canyon and park at the signed pullout.", status: "Open" },
  approach: "Walk thirty minutes up the climbers trail to the base of the wall.",
  descentText: "Rappel the route with two ropes from the bolted anchors.",
  waypoints: [{ name: "Parking", type: "Trailhead", lat: 40.5, lng: -111.6, elev: 6000 }],
  hazards: ["Rockfall in the gully after rain."],
  whatToBring: ["Helmet", "60m rope"],
  gpxPts: [],
};
const ROUTES = [
  ["crag  (sport)", { ...base, id: "probe_crag", name: "Probe Crag Route", discipline: "sport" }],
  ["alpine", { ...base, id: "probe_alp", name: "Probe Alpine Route", discipline: "alpine" }],
];
const TABS = ["overview", "conditions", "planner", "safety", "partners", "photos"];

const props = {
  myReports: [], connections: [], diffRatings: {}, setDiffRatings: () => {},
  logged: [], hzVotes: {}, myStars: {}, setMyStars: () => {}, comments: [],
  onBack: () => {}, onSubTab: () => {},
};

/* A section heading, as <SL> renders it: short, upper-case, its own element. */
const HEADING = /<div[^>]*>([A-Z][A-Z0-9 &’'\/-]{3,28})<\/div>/g;
/* A distinctive sentence: long enough that sharing one is a duplication rather than a coincidence. */
const SENTENCE = /([A-Z][^<>{}]{45,140}?[.!])/g;

let findings = 0;
for (const [label, route] of ROUTES) {
  const perTab = {};
  for (const tab of TABS) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let html = "";
    try {
      html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
        React.createElement(RouteDetail, { ...props, route, initialSubTab: tab })));
    } catch (e) {
      console.error(`FAIL — ${label} ${tab} threw: ${e && e.message}`);
      clean(); process.exit(1);
    }
    perTab[tab] = html;
  }
  if (Object.values(perTab).every((h) => h.length < 900)) {
    console.error(`FAIL — every ${label} tab rendered thin; nothing was checked.`);
    clean(); process.exit(1);
  }

  const seen = {};
  for (const tab of TABS) {
    const html = perTab[tab];
    for (const m of html.matchAll(HEADING)) {
      const h = m[1].trim();
      (seen[h] = seen[h] || new Set()).add(tab);
    }
  }
  const dupHeads = Object.entries(seen).filter(([, tabs]) => tabs.size > 1 && tabs.size < TABS.length);

  const sen = {};
  for (const tab of TABS) {
    /* TEXT NODES ONLY. Matching the raw markup put SVG path data and aria-labels in the results
       -- page chrome that is on every tab by design -- because a sentence pattern happily matches
       inside an attribute. Strip tags first and read what a climber reads. */
    const text = perTab[tab].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    for (const m of text.matchAll(SENTENCE)) {
      const t = m[1].trim();
      (sen[t] = sen[t] || new Set()).add(tab);
    }
  }
  /* A string on EVERY tab is page chrome -- the sticky header carries the route name, grade,
     Back/Share/Save/Download on all six by design. Duplication is a thing on SOME tabs and not
     others, so chrome is excluded rather than reported as 6 findings. */
  const dupSen = Object.entries(sen).filter(([, tabs]) => tabs.size > 1 && tabs.size < TABS.length);

  console.log(`\n=== ${label} — ${TABS.map((t) => `${t} ${perTab[t].length}ch`).join(", ")}`);
  console.log(`  section headings on >1 tab : ${dupHeads.length}`);
  for (const [h, tabs] of dupHeads) console.log(`      ${h.padEnd(24)} ${[...tabs].join(", ")}`);
  console.log(`  sentences on >1 tab        : ${dupSen.length}`);
  for (const [t, tabs] of dupSen.slice(0, 8)) console.log(`      ${JSON.stringify(t.slice(0, 70))} — ${[...tabs].join(", ")}`);
  findings += dupHeads.length + dupSen.length;
}

clean();
console.log(`\n${findings} duplication(s) across both route families.`);
console.log("Report-only: a heading on two tabs is a finding to READ, not automatically a defect —");
console.log("some content legitimately belongs in two places. #1493 is the case where it did not.");
console.log("");
console.log("THE ONE STANDING HIT IS A NON-FINDING, read 2026-09-03 so it is not re-derived:");
console.log("PARTY SIZE is TWO different controls that share a name — the Planner's time Calculator");
console.log("(aria-label \"Party size\") and the Safety float-plan form (\"Party Size\", from its own");
console.log("field array). Different purposes, both legitimate. The labels differ only in letter");
console.log("case, which a screen reader pronounces identically, so it is not an a11y defect either.");
