// Do the six columns 0135 now writes actually REACH A SCREEN?
//
// check:field-renders is the guard for this question, but it pulls a REAL value per column
// from the live DB — and these six have 0 populated rows, so it has nothing to pull and they
// are invisible to it by construction. Nothing has ever rendered them.
//
// Method: render the same bare route WITH and WITHOUT each field and diff the visible text.
// A field that changes nothing on screen reaches no screen. This avoids guessing the display
// string, which is where a probe like this usually goes wrong.
//
// The one trap deliberately handled: `dbRouteToCamel` emits BOTH `rock` and `rockType` from
// the single `rock` column, so setting only one of them would report a healthy column as dead.
// Mimic the mapper exactly, never the column.
//
// RESULT (2026-08-12, after 0135): all six reach the Overview tab, in the TECH STATS tiles.
// Five show their value. `pads` reports "changes the page but the VALUE is not shown" and that
// is an SSR ARTIFACT, NOT A DEFECT: the tiles render through `<CountUp value={…}/>`, which is
// `useState(0)` and only reaches its target inside a `useEffect`. Effects do not run under
// renderToStaticMarkup, so a NUMERIC tile renders 0 while a non-numeric string ("ZZPROTZZ")
// fails CountUp's numeric test and is printed as-is. Never assert on an animated number here —
// the same warning check:bare carries. Verified by reading CountUp, not assumed.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Derived, never hardcoded. `oneoff/measure-which-tab-renders-each-field.mjs` pinned ROOT to a
// worktree path and so silently measured a DIFFERENT branch than the one you ran it in — see
// the check:field-renders notes in CLAUDE.md.
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-six-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const bare = (discipline) => ({
  id: "probe", name: "Probe", grade: discipline === "bouldering" ? "V4" : "5.9",
  gradeSystem: "yds", discipline, pitches: discipline === "bouldering" ? 1 : 6,
  mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Colorado" },
});
const TABS = ["overview", "conditions", "photos", "partners", "planner", "safety"];
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// what dbRouteToCamel produces for each COLUMN (not the column name)
const CASES = [
  { col: "prot_rating", disc: "trad",       patch: { protRating: "ZZPROTZZ" } },
  { col: "start_type",  disc: "bouldering", patch: { startType: "ZZSTARTZZ" } },
  { col: "landing",     disc: "bouldering", patch: { landing: "ZZLANDZZ" } },
  { col: "pads",        disc: "bouldering", patch: { pads: 7 } },
  { col: "rock",        disc: "trad",       patch: { rock: "ZZROCKZZ", rockType: "ZZROCKZZ" } },
  { col: "crux",        disc: "trad",       patch: { crux: "ZZCRUXZZ" } },
];

console.log("does each column reach a screen?\n");
let dead = 0;
for (const c of CASES) {
  const hits = [];
  for (const tab of TABS) {
    let a, b;
    try {
      a = text(render(bare(c.disc), tab));
      b = text(render({ ...bare(c.disc), ...c.patch }, tab));
    } catch (e) { console.log(`  ${c.col} ${tab} THREW ${e.message.slice(0, 80)}`); continue; }
    if (a !== b) hits.push(tab);
  }
  // also confirm the value itself is visible, not merely that something changed
  let visible = false;
  const sentinel = Object.values(c.patch).find((v) => String(v).startsWith("ZZ")) ?? String(c.patch.pads);
  for (const tab of TABS) {
    try {
      if (text(render({ ...bare(c.disc), ...c.patch }, tab)).includes(String(sentinel))) { visible = true; break; }
    } catch {}
  }
  const verdict = hits.length === 0 ? "!! RENDERS NOWHERE" : (visible ? "ok" : "?? changes the page but the VALUE is not shown");
  if (hits.length === 0) dead++;
  console.log(`  ${c.col.padEnd(12)} ${c.disc.padEnd(11)} ${verdict.padEnd(46)} tabs: ${hits.join(", ") || "(none)"}`);
}
console.log(`\n${dead === 0 ? "all six reach a screen" : dead + " column(s) render NOWHERE"}`);
