#!/usr/bin/env node
// ROUTE BREAKDOWN's rows are DISCLOSURES, so they must announce `aria-expanded` — and the name
// must not spell the state out as well, or a screen reader hears "collapsed" twice.
//
// This is a regression check as much as a rule. The stage row's old ▸ carried `aria-expanded`;
// when the whole row became the control (one ordered ROUTE BREAKDOWN, #1450) the attribute went
// with the span. The pitch row never had it — it wrote ", collapsed" into its own aria-label,
// which announces the state to a screen reader and to nothing else: no automation, and no user
// agent that offers "expand" as an action.
//
// check:selected-state cannot see this. It reaches the route page with `?zr=1`, which opens
// ROUTES[0] — `kings_hf`, a scramble whose pitchDetail is null — so these rows render in no
// screen it walks. Same blind spot as check:overflow and check:a11y-badges on this section.
//
// No browser and no DB: renderToStaticMarkup emits the attributes, which is all this asks about.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };
const dead = (m) => { console.log("  BROKEN PROBE  " + m); process.exit(1); };

const dir = fs.mkdtempSync(path.join(ROOT, ".cm-ax-"));
process.on("exit", () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } });
const entry = path.join(dir, "e.js"), out = path.join(dir, "b.mjs");
fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};\n`);
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}", "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle RouteDetail.jsx"); }
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
const { RouteDetail } = await import(out);

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
  React.createElement(RouteDetail, {
    route: {
      id: "probe_ax", name: "Probe", grade: "5.8", discipline: "alpine", pitches: 4,
      mountainId: "probe_area", areaType: "peak",
      pitchDetail: [
        { pitch: "Approach gully", grade: "Class 3", notes: "Loose scree.", lengthM: 300 },
        { pitch: "1", grade: "5.7", notes: "Corner.", lengthM: 45, anchor: "2 bolts" },
        { pitch: "Chimney pitch", grade: "5.9", notes: "Wide.", crux: true, lengthM: 50 },
      ],
    },
    initialSubTab: "planner", onBack: noop, onSubTab: noop,
    contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
    gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null,
  })));

if (!html.includes("ROUTE BREAKDOWN")) dead("ROUTE BREAKDOWN did not render — ANCHOR LOST");
const rows = [...html.matchAll(/<div data-kind="(pitch|stage)"[\s\S]*?(?=<div data-kind=|$)/g)].map((m) => m[0]);
if (rows.length !== 3) dead(`expected 3 rows, laid out ${rows.length} — nothing below would mean anything`);
ok(`3 rows rendered (${rows.filter((r) => r.includes('data-kind="pitch"')).length} pitch, ${rows.filter((r) => r.includes('data-kind="stage"')).length} stage)`);

for (const r of rows) {
  const kind = /data-kind="(\w+)"/.exec(r)[1];
  const label = /data-label="([^"]*)"/.exec(r)[1];
  if (/aria-expanded="(true|false)"/.test(r)) ok(`${kind} "${label}" announces aria-expanded`);
  else fail(`${kind} "${label}" is a disclosure that does NOT announce aria-expanded`);
  // Collapsed is the initial state under SSR, so every row must say false — a row saying true
  // here would mean the open-state wiring is inverted.
  if (/aria-expanded="false"/.test(r)) ok(`${kind} "${label}" starts collapsed`);
  else fail(`${kind} "${label}" claims to be expanded before anyone tapped it`);
  const name = /aria-label="([^"]*)"/.exec(r);
  if (!name) { fail(`${kind} "${label}" has no accessible name`); continue; }
  if (/\b(expanded|collapsed)\b/i.test(name[1])) fail(`${kind} name repeats the state that aria-expanded already carries: ${JSON.stringify(name[1])}`);
  else ok(`${kind} name says what it is, not what state it is in: ${JSON.stringify(name[1])}`);
}

console.log("");
if (bad) { console.log(`${bad} failure(s) — the breakdown rows do not announce their disclosure state correctly.`); process.exit(1); }
console.log("ok — every ROUTE BREAKDOWN row announces aria-expanded, and no name repeats it.");
