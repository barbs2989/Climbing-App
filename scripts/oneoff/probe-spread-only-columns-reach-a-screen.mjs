// Do the SPREAD-ONLY route columns reach a screen?
//
// `dbRouteToCamel` opens `return { ...r, ... }`, so every snake_case column arrives on the route
// object whether or not the mapper names it. That means patching `route.<col>` and rendering is a
// FAITHFUL test of what the app sees — which is what makes this probe valid where the earlier
// difficulty probe was not: that one compared a component against itself and never touched the
// mapper it was accusing.
//
// check:field-renders walks 55 columns. These five are populated and are not among them, so
// nothing has ever asked whether they render.
//
// ANSWER (2026-08-20): ALL FIVE REACH A SCREEN. No findings. Recorded so nobody re-derives it.
//
//   fa 201,756 / rappels 734 / commitment 738   ECHOED inside RouteDetail
//   aspect 1,002 / disciplines 463              render OUTSIDE RouteDetail — see below
//
// THE TWO "NO EFFECT" VERDICTS WERE THIS PROBE'S SCOPE, NOT DEAD COLUMNS, and that is worth
// reading before trusting a NO EFFECT here. It renders `<RouteDetail/>` alone, and:
//   * `aspect` is consumed by `AspectSunPanel` (ClimbMatchCore ~1268), which is mounted by
//     ClimbMatch.jsx and NOT by RouteDetail — 0 references there.
//   * `disciplines` is consumed by `rDiscs()` (ClimbMatchCore), used 8x in core and 4x in
//     ClimbMatch, 0x in RouteDetail.
// This is trap #3 in CLAUDE.md's list of ways this kind of probe reports a healthy column as
// dead: rendering RouteDetail alone when ClimbMatch mounts sibling panels that own whole
// columns. A NO EFFECT here means "not rendered BY ROUTEDETAIL" and nothing more.
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-spread-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const TABS = ["overview", "conditions", "photos", "partners", "planner", "safety"];
const BASES = {
  trad:   { discipline: "trad",   grade: "5.9" },
  alpine: { discipline: "alpine", grade: "5.6" },
};
const base = (d) => Object.assign({
  id: "probe_" + d, name: "Probe", gradeSystem: "yds", pitches: 6, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
}, BASES[d]);

// A sentinel proves the value is ECHOED. A realistic value only proves the page CHANGED, which is
// weaker — a column can drive the screen without being printed (the RACK box prints a summary, not
// the raw prose). Both verdicts are reported so neither is mistaken for the other.
const CASES = [
  { col: "fa",          rows: 201756, patch: { fa: "ZZFAZZ" },                needle: "ZZFAZZ" },
  { col: "rappels",     rows: 734,    patch: { rappels: "ZZRAPZZ" },          needle: "ZZRAPZZ" },
  { col: "commitment",  rows: 738,    patch: { commitment: "ZZCOMMITZZ" },    needle: "ZZCOMMITZZ" },
  // aspect is a compass value the app INTERPRETS (sun/shade), so a garbage string may be
  // discarded by design. Give it a real one and judge on change.
  { col: "aspect",      rows: 1002,   patch: { aspect: "NE" },                needle: null },
  { col: "disciplines", rows: 463,    patch: { disciplines: ["trad", "sport"] }, needle: null },
];

const txt = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

console.log(`probing ${CASES.length} spread-only columns across ${TABS.length} sub-tabs x ${Object.keys(BASES).length} disciplines\n`);
const verdicts = [];
for (const c of CASES) {
  const echoed = [], changed = [];
  for (const d of Object.keys(BASES)) {
    for (const tab of TABS) {
      let w = "", o = "";
      try { w = txt(render(Object.assign({}, base(d), c.patch), tab)); } catch { }
      try { o = txt(render(base(d), tab)); } catch { }
      if (!w) continue;
      if (c.needle && w.includes(c.needle)) echoed.push(`${d}:${tab}`);
      if (w !== o) changed.push(`${d}:${tab}`);
    }
  }
  const verdict = echoed.length ? "ECHOED" : changed.length ? "changed (used, not echoed)" : "NO EFFECT";
  verdicts.push({ ...c, verdict, where: (echoed.length ? echoed : changed).slice(0, 3).join(", ") });
  console.log(`  ${c.col.padEnd(14)} ${String(c.rows).padStart(7)} rows   ${verdict.padEnd(28)} ${verdicts[verdicts.length-1].where}`);
}

const dead = verdicts.filter(v => v.verdict === "NO EFFECT");
if (dead.length) {
  console.log(`\n${dead.length} column(s) changed nothing IN ROUTEDETAIL: ${dead.map(d => `${d.col} (${d.rows} rows)`).join(", ")}`);
  console.log(`   That is NOT a finding on its own. Check whether ClimbMatch.jsx or a core panel`);
  console.log(`   consumes it before concluding anything — aspect and disciplines both do, and`);
  console.log(`   both looked dead here. See the header.`);
} else {
  console.log(`\nevery probed column is echoed by RouteDetail itself`);
}
