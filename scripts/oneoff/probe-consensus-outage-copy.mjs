#!/usr/bin/env node
// Does ConsensusPanel actually SAY the read failed, rather than "No reports yet"?
//
// `check:outage` cannot answer this: it spawns plain vite with no overlay scaffold, so `?zr=1` is
// not available to it and its walk never reaches a route detail at all. This renders the real
// component both ways instead — the one surface here that takes the flag as a PROP, so it can be
// driven without a query.
//
// Deliberately NOT a "did the page change" diff: that method returns a false negative on a tile
// rendered through <CountUp/> (see probe-length-fallback-ssr-cannot-see-it.mjs). These are plain
// text nodes, so the string itself is assertable — and both strings are asserted, because a probe
// that only checks the new copy appears would pass on a component that renders both.
import { build } from "esbuild";
import path from "path"; import os from "os"; import fs from "fs";
import { createRequire } from "module";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsensusPanel } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export function render(props) { return renderToStaticMarkup(React.createElement(ConsensusPanel, props)); }`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-cons-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { render } = require_(out);

const route = { id: "probe", name: "Probe", discipline: "alpine", activity: [] };
const strip = h => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const HEALTHY = "No reports yet — be the first to log this climb.";
const BROKEN = "Couldn’t load this route's reports";

let bad = 0;
const check = (label, props, want, notWant) => {
  const t = strip(render({ route, activity: [], hzVotes: {}, onVote: () => {}, ...props }));
  const ok = t.includes(want) && !t.includes(notWant);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) { bad++; console.log(`       wanted: ${want}\n       not:    ${notWant}\n       got:    ${t.slice(0, 220)}`); }
};
console.log("ConsensusPanel with no reports:");
check("healthy read says nothing has been logged", { reportsUnavailable: false }, HEALTHY, BROKEN);
check("failed read says the read failed", { reportsUnavailable: true }, BROKEN, HEALTHY);
console.log(bad ? `\n${bad} failure(s).` : "\nok — the panel distinguishes an empty route from an unreadable one.");
process.exitCode = bad ? 1 : 0;
