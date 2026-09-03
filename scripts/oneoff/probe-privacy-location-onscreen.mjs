// Does the rewritten Privacy §4 REACH A SCREEN, and does the version a reader sees move with it?
//
// The extractor reads the `PRIVACY` constant out of the source, and this repo's standing lesson
// is that a populated constant is not a rendered one -- `descent_text` was populated on 1,021
// routes and rendered on none. So this renders the real LegalView and reads the markup.
//
// It also pins the two claims the old §4 made that the app does not back, because a rewrite
// that merely reworded them would still be false:
//   - a named location toggle ("Approximate location only"). All four privacy controls sit
//     behind PRIVACY_CONTROLS_LIVE=false and render as null.
//   - "if you opt in -- float plans and search-and-rescue". The only SAR content in the app is
//     SARS, a directory of phone numbers you dial yourself.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let failed = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { failed++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const out = path.join(ROOT, `.legal-probe-${process.pid}.mjs`);
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--loader:.jsx=jsx",
    `--define:import.meta.env=${JSON.stringify({ VITE_USE_DB: "false" })}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  fs.rmSync(out, { force: true });
  dead("esbuild could not bundle ClimbMatchCore.jsx");
}
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}
const core = await import(out + "?t=" + Date.now());
fs.rmSync(out, { force: true });
if (typeof core.LegalView !== "function") dead("LegalView is not exported from ClimbMatchCore.jsx — ANCHOR LOST");

const html = renderToStaticMarkup(React.createElement(core.LegalView, { kind: "privacy", onBack: () => {} }));
// Fail closed: every "must NOT contain" assertion below passes against a screen that rendered
// nothing at all, which is the false-pass direction.
if (html.length < 2000) dead(`the Privacy screen rendered ${html.length} chars — too thin to assert on`);
console.log(`rendered Privacy Policy: ${html.length} chars\n`);

// renderToStaticMarkup escapes, so match the ESCAPED form -- ssr-probes-must-match-escaped-html.
const text = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ");

// 1. the new sentence is on the screen, clause by clause -- a rewrite that lost half of itself
//    to a truncation would still satisfy a single substring test.
for (const [claim, why] of [
  ["home area you type in", "the profile field is described as typed text"],
  ["not a coordinate", "and explicitly not a coordinate"],
  ["We do not record where you are", "the storage claim -- profiles carries no lat/lng column"],
  ["read only when you tap a map’s find-me control", "device position is read on demand, not continuously"],
  ["corners of the map you are then looking at are sent to us", "the map-bounds disclosure -- useNearbyAreas queries `areas` by that box"],
  // climb_logs.gpx_track IS written and read back, so a flat "we store no location" would have
  // replaced one false claim with another. The exception has to be stated.
  ["A GPS track is stored only when you attach one to a climb you log", "the one place location IS stored: climb_logs.gpx_track"],
  ["Nothing runs in the background", "no background tracking"],
  ["directory you call yourself", "SAR is a phone list, not an integration"],
]) {
  if (text.includes(claim)) ok(why);
  else bad(`missing from the rendered policy: "${claim}"`);
}

// 2. the promises the app does not back must be GONE, not reworded.
console.log("");
for (const [gone, why] of [
  ["Approximate location only", "the quoted toggle label is gone"],
  ["You control location sharing", "the claim that you control it is gone"],
  ["search-and-rescue", "the search-and-rescue integration claim is gone"],
  ["if you opt in", "the opt-in claim is gone"],
  // The SAME defect sat in "What we collect", which promised the same absent enablement. Fixing
  // §4 alone would have left it standing on the screen directly above.
  ["location when you enable it", "\"What we collect\" no longer promises an enablement either"],
]) {
  if (text.includes(gone)) bad(`the rendered policy still says "${gone}"`);
  else ok(why);
}

// 3. the version a reader SEES must move with the text, or an acceptance recorded against
//    "2026-08-19" points at a document whose words have since changed.
console.log("");
const { POLICY_VERSION, policyVersionLabel } = await import(path.join(ROOT, "lib/policy.js"));
const label = policyVersionLabel(POLICY_VERSION);
if (POLICY_VERSION === "2026-08-19") bad("POLICY_VERSION was not bumped, so the acceptance record now points at changed text");
else ok(`POLICY_VERSION moved to ${POLICY_VERSION}`);
if (text.includes(label)) ok(`the screen shows "Last updated ${label}"`);
else bad(`the rendered policy does not show the version label "${label}"`);

console.log(`\n${failed ? "FAILED — " + failed + " assertion(s)" : "ok — the rewritten section reaches the screen and the version moved with it"}`);
process.exit(failed ? 1 : 0);
