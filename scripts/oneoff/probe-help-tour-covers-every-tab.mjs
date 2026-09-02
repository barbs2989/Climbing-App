#!/usr/bin/env node
// Does the Help modal's tour actually RENDER an entry for every tab?
//
// check:boot's section 2 proves the `feats` ARRAY covers NAV. That is not the same
// question: this repo's standing lesson is that a populated array is not a rendered
// one (descent_text was populated on 1,021 routes and rendered on none). The tour
// entries are collapsed accordions, so only the TITLE renders until somebody taps —
// which is exactly the half a reader sees, and exactly the half worth asserting.
//
// Three traps this encodes rather than rediscovers:
//   * `--jsx=automatic` is REQUIRED. esbuild defaults to the classic runtime, which
//     emits React.createElement and needs `React` in the bundle's module scope. It
//     is not there, so the render dies with "React is not defined" — and on a loaded
//     box it exhausts the heap first and dies with a misleading OOM instead.
//   * Render INSIDE the bundle. Importing react-dom/server separately gives a second
//     React instance whose dispatcher is null, so any hook throws
//     "Cannot read properties of null (reading 'useState')" — also presenting as OOM.
//   * renderToStaticMarkup ESCAPES apostrophes as &#x27;, so decode before matching.
//   * --format=cjs, NOT esm. react-dom/server's CJS build does require("stream"),
//     which esbuild's ESM output cannot do: "Dynamic require of stream is not
//     supported". check:bare already uses format:"cjs" for exactly this reason.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "node_modules", ".cache-help-tour");
fs.mkdirSync(OUT, { recursive: true });
const MARKUP = path.join(OUT, "markup.txt");

// the vocabulary is READ from the app, never restated here
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const navDecl = app.match(/const NAV=\[(.*?)\];/s);
if (!navDecl) { console.error("ANCHOR LOST — `const NAV=[...]` not found in ClimbMatch.jsx."); process.exit(1); }
const LABELS = [...navDecl[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]);
if (LABELS.length < 5) { console.error(`ANCHOR LOST — NAV parsed only ${LABELS.length} labels.`); process.exit(1); }

const entry = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Help } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
import fs from "node:fs";
const html = renderToStaticMarkup(React.createElement(Help, { onClose: () => {}, onReplay: () => {} }));
fs.writeFileSync(${JSON.stringify(MARKUP)}, html);
process.exit(0);
`;

// the bundle MUST live inside the project: node resolves `react` from the nearest
// node_modules, and a bundle in the OS temp dir throws ERR_MODULE_NOT_FOUND.
const bundle = path.join(OUT, "entry.cjs");
execFileSync("npx", ["esbuild", "--bundle", "--format=cjs", "--platform=node",
  "--jsx=automatic", "--loader:.jsx=jsx", "--define:import.meta.env={}",
  "--outfile=" + bundle], { input: entry, cwd: ROOT, stdio: ["pipe", "pipe", "inherit"] });
execFileSync("node", [bundle], { cwd: ROOT, stdio: "inherit" });

const raw = fs.readFileSync(MARKUP, "utf8");
const html = raw.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const fails = [];
// fail CLOSED: every "must not contain" assertion below passes against a blank render
if (html.length < 3000) fails.push(`the Help modal rendered only ${html.length} chars — too thin to assert on.`);

for (const l of LABELS) {
  // the title renders inside the accordion's button
  if (!html.includes(">" + l + "<")) fails.push(`no tour entry renders for the "${l}" tab.`);
}
if (html.includes("My Crew")) fails.push(`the tour still says "My Crew"; the tab is labelled "Crew".`);
if (/quick tour of each tab/i.test(html)) fails.push(`the heading still claims "each tab" while non-tab sections are listed.`);
if (/Tap a tab to expand/i.test(html)) fails.push(`the sub-copy still calls every entry a tab.`);

console.log(`\nrendered ${html.length} chars; NAV = ${LABELS.join(", ")}`);
if (fails.length) { console.error("\nFAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log(`ok — every one of the ${LABELS.length} tabs has a tour entry on screen.`);
