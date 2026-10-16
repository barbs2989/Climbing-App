// Renders the real SuggestFix form and asserts all three object-typed fields still draw one
// labelled input per sub-key.
//
// WHY THIS EXISTS. Adding `timing` replaced a `f.type==="road"?ROAD_KEYS:ACCESS_KEYS` ternary
// with an OBJ_KEYS/OBJ_STATE lookup in four separate places. Miss one and the field renders an
// empty box, or road/access quietly stop drawing their inputs — and NO guard would catch it:
// SuggestFix is opened by clicking Contribute on a route detail, and check:overflow records
// route detail as NOT REACHED, so no browser guard opens this form at all.
//
// SuggestFix is not exported, so this bundles a temporary copy of RouteDetail.jsx with an
// export appended. The copy lives in the repo root so its relative imports resolve identically,
// and is removed in a finally block.
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = path.join(ROOT, "RouteDetail.jsx");
const PROBE = path.join(ROOT, "RouteDetail.__probe.jsx");

let fails = 0;
const ck = (label, cond) => { console.log("  " + (cond ? "ok  " : "FAIL") + "  " + label); if (!cond) fails++; };

try {
  const src = fs.readFileSync(SRC, "utf8");
  if (!/^function SuggestFix/m.test(src)) {
    console.error("ANCHOR LOST — `function SuggestFix` not found; nothing below was checked.");
    process.exit(1);
  }
  fs.writeFileSync(PROBE, src + "\nexport { SuggestFix };\n");

  const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuggestFix } from ${JSON.stringify(PROBE)};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, section) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(SuggestFix, {
        route, onClose: noop, onSubmit: noop, onLog: noop,
        scrollTo: section, pending: [], peakCoord: null, prefill: null,
      })));
}
`;
  // SuggestFix mounts through createPortal(…, document.body), which react-dom/server cannot
  // render and which needs a DOM this repo has no jsdom for. Shimming createPortal to render
  // its child inline is the point rather than a workaround: the assertions below are about
  // what the form DRAWS, and the portal only decides where it is attached.
  const realReactDom = (await import("node:module")).createRequire(path.join(ROOT, "package.json")).resolve("react-dom");
  const portalShim = {
    name: "portal-shim",
    setup(b) {
      b.onResolve({ filter: /^react-dom$/ }, () => ({ path: "shim", namespace: "portal-shim" }));
      b.onLoad({ filter: /.*/, namespace: "portal-shim" }, () => ({
        contents:
          `import * as R from ${JSON.stringify(realReactDom)};\n` +
          `export * from ${JSON.stringify(realReactDom)};\n` +
          `export const createPortal = (node) => node;\n` +
          `export default R;\n`,
        resolveDir: ROOT, loader: "js",
      }));
    },
  };
  globalThis.document = globalThis.document || { body: {}, getElementById: () => null };

  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-objfields-")), "b.cjs");
  await build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
    bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
    outfile: out, logLevel: "error", plugins: [portalShim],
  });
  const { render } = await import(out);

  const ROUTE = {
    id: "objfields", name: "Guard Route", grade: "5.8", pitches: 4,
    mountainId: "a", discipline: "alpine",
    road: { name: "Cascade River Road", status: "Open" },
    access: { land_manager: "Mt. Baker-Snoqualmie NF", permit: "None required" },
    timing: { totalHrs: 11.5, recommendedStart: "4:00 AM from the trailhead",
      sectionBreakdown: [{ hrs: 11.5, note: "n", fromTo: "f", section: "Climb" }] },
  };

  const html = render(ROUTE);
  if (!html || html.length < 500) {
    console.error(`\nthe form rendered ${html ? html.length : 0} chars — nothing below was checked.`);
    process.exit(1);
  }
  console.log(`  form rendered ${html.length} chars (collapsed)\n`);

  // A field's inputs only render when it is OPEN, and `scrollTo===f.k` is what opens one —
  // fields collapse by default since #809. Rendering the whole form and looking for every
  // label at once reports a clean-looking absence that means nothing, so each field is
  // rendered with itself expanded.
  const groups = {
    road: ["Road / access point", "Drive notes", "Road status", "Seasonal gate"],
    // "Permit" is deliberately not asserted: it is a substring of the separate `permit`
    // field's own label "Permits", so it passes whether or not the sub-key input rendered.
    access: ["Land manager", "Parking / entrance", "Fees", "Seasonal closures", "Group size limit", "How to apply"],
    timing: ["Car-to-car total (hrs)", "Approach (hrs)", "To the summit (hrs)", "Descent (hrs)", "Recommended start"],
  };
  for (const [field, labels] of Object.entries(groups)) {
    const open = render(ROUTE, field);
    const missing = labels.filter((l) => !open.includes(l));
    ck(`${field}: all ${labels.length} sub-key inputs render when expanded`, missing.length === 0);
    if (missing.length) console.log("        missing: " + missing.join(" | "));
    // Collapsed-vs-open must actually differ, or the assertion above proves nothing about
    // the expansion path — it would pass on a form that renders every input always.
    ck(`${field}: expanding it changes the form`, open.length !== html.length);
  }

  // The field's own row label, and the current-value summary built by objStr.
  ck("the Published times row is present", html.includes("Published times"));
  ck("timing's current value is summarised on the row", html.includes("Car-to-car total (hrs): 11.5"));
  ck("road's current value still summarised", html.includes("Road / access point: Cascade River Road"));
  ck("sectionBreakdown is never offered as an input", !render(ROUTE, "timing").includes("sectionBreakdown"));
} finally {
  fs.rmSync(PROBE, { force: true });
}

console.log(fails ? `\nFAILED (${fails})` : "\nall ok");
process.exit(fails ? 1 : 0);
