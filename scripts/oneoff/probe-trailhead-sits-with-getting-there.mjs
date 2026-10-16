// Does the trailhead now render beside GETTING THERE, and did anything leave the screen?
//
// RENDERED, never read off the source: the request is about POSITION and about what survives,
// and a source diff answers neither. Two fixtures, because the halves fail differently — a route
// WITH approach prose (did the card move, did the prose stay?) and one with a trailhead and NO
// prose (is the trailhead still shown, and did the APPROACH heading stop rendering over nothing?).
//
// Harness lifted from check:access-checked-line: bundle inside the project (node resolves react
// from the nearest node_modules), react-query EXTERNAL (a bundled copy is a different module
// instance and the provider then throws "No QueryClient set"), and a WebSocket stub for node 20.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(ROOT, `.thpos-${process.pid}.mjs`);
const entry = path.join(ROOT, `.thpos-entry-${process.pid}.mjs`);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };

let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { fails++; console.log("  FAIL  " + m); };
const dead = (what) => {
  console.error(`\nPROBE BROKEN — ${what}. Nothing below was checked; every "still shows" assertion`);
  console.error("passes against a component that rendered nothing.\n");
  clean(); process.exit(1);
};

fs.writeFileSync(entry, `export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`);
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
    "--jsx=automatic", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle RouteDetail.jsx"); }

if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };

const { RouteDetail } = await import(out + "?t=" + Date.now());
if (typeof RouteDetail !== "function") dead("RouteDetail.jsx has no default export — ANCHOR LOST");

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
const noop = () => {};
const render = (route) => renderToStaticMarkup(
  React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, {
      route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {},
      hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
      crewsForRoute: [], myStars: {}, presence: null,
    })));
const txt = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

const BASE = {
  id: "probe_route", name: "Probe Route", grade: "5.8", discipline: "alpine", pitches: 4,
  mountainId: "probe_area", areaType: "peak",
  road: { name: "Probe River Road (FR 99)", driveNote: "From the highway, 11 miles.", status: "Gravel to the trailhead", seasonalGate: "Gated Nov-May" },
  approachLogistics: { trailhead: "Probe Lake Trailhead (Trail #1599)", peakLat: 47.47, peakLng: -120.90 },
  waypoints: [{ type: "Trailhead", name: "Probe Lake Trailhead", lat: 47.5527, lng: -120.9271, elev: 3400 }],
  distKm: 6.4,
};

for (const [label, route] of [
  ["WITH approach prose", { ...BASE, approach: "Walk the lake trail 2.5 miles to the basin, then break left up talus." }],
  ["NO approach prose", { ...BASE }],
]) {
  console.log("\n--- " + label + " ---");
  let html;
  try { html = render(route); } catch (e) { dead("RouteDetail threw: " + String(e && e.message).slice(0, 200)); }
  if (html.length < 900) dead(`thin render (${html.length} chars)`);
  const t = txt(html);

  const iGT = t.indexOf("GETTING THERE"), iTH = t.indexOf("TRAILHEAD"), iAP = t.indexOf("APPROACH");
  if (iGT < 0) dead("GETTING THERE did not render — ANCHOR LOST");
  iTH >= 0 ? ok("the TRAILHEAD block renders") : bad("the TRAILHEAD block is MISSING");

  // POSITION — the actual request. Order, and then how near: a card 3,000 chars down is
  // "after GETTING THERE" and is not "near GETTING THERE at the top".
  iTH > iGT ? ok("TRAILHEAD comes after GETTING THERE") : bad("TRAILHEAD is not below GETTING THERE");
  (iAP < 0 || iTH < iAP) ? ok("TRAILHEAD comes BEFORE the approach section") : bad("TRAILHEAD still sits inside/after APPROACH");
  if (iTH > iGT) console.log("        gap GETTING THERE -> TRAILHEAD: " + (iTH - iGT) + " chars of rendered text");

  // Nothing left the card.
  for (const s of ["Probe Lake Trailhead", "Drive here", "47.55270, -120.92710", "Approach (one way)", "Elevation"])
    t.includes(s) ? ok(`card still shows "${s}"`) : bad(`card LOST "${s}"`);

  // Nothing left the road block — including the seasonal gate, which GETTING THERE used to
  // print only alongside a status.
  for (const s of ["Probe River Road (FR 99)", "From the highway, 11 miles.", "Gravel to the trailhead", "Gated Nov-May"])
    t.includes(s) ? ok(`road field survives: "${s}"`) : bad(`road field LOST: "${s}"`);

  // ...and it is not now printed twice, the two being adjacent.
  const roadHits = t.split("Probe River Road (FR 99)").length - 1;
  roadHits === 1 ? ok("the road name appears once, not duplicated") : bad(`the road name appears ${roadHits} times`);
  const driveHits = (html.match(/maps\/dir\/\?api=1/g) || []).length;
  driveHits === 1 ? ok("one Google Maps directions link, not two") : bad(`${driveHits} directions links`);

  if (route.approach) {
    iAP >= 0 ? ok("APPROACH heading renders") : bad("APPROACH heading MISSING on a route with prose");
    t.includes("break left up talus") ? ok("the approach prose still renders") : bad("the approach prose is GONE");
  } else {
    iAP < 0 ? ok("no APPROACH heading on a route with no prose") : bad("APPROACH heading renders over nothing — dangling label");
    /not written down yet/.test(t) ? ok("a gap note explains the missing approach") : bad("no gap note for the missing approach");
  }
}

// The seasonal gate with NO status — the 16 live routes the widening was for.
console.log("\n--- gate with no road status (16 live routes) ---");
const gateOnly = txt(render({ ...BASE, road: { name: "Probe River Road (FR 99)", seasonalGate: "Gated Nov-May" } }));
gateOnly.includes("Gated Nov-May") ? ok("the gate renders without a status beside it") : bad("the gate is LOST when status is empty");

clean();
console.log(fails ? `\n${fails} failure(s)` : "\nok — the trailhead sits with GETTING THERE and nothing left the screen.");
process.exit(fails ? 1 : 0);
