/* DOES TONIGHT'S REPAIR ACTUALLY REACH A CLIMBER?
 *
 * 21 pins were corrected across #1333, #1340 and #1348, and every verification so far was a
 * DATABASE re-read. That proves the column changed; it does not prove the value renders. This
 * repo's record is full of that gap: `descent_text` populated on 1,021 routes and rendered on
 * none; a rack correction that reached the right TAB and the wrong BOX. A populated column is not
 * a rendered one.
 *
 * Renders the real RouteDetail over the real repaired rows, through the real dbRouteToCamel.
 *
 * THE ENTRY IS ESM WITH ABSOLUTE IMPORTS, copied from check-bare-route rather than reinvented. A
 * CJS entry using require() resolves @tanstack/react-query to a DIFFERENT module instance from the
 * app's, and the symptom is "No QueryClient set" with a provider plainly in place.
 *
 *   node scripts/oneoff/probe-repaired-pins-reach-the-screen.mjs
 */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(row, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route: dbRouteToCamel(row), initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-render-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const CASES = [
  { route: "wa_boving_christensen", pin: "Stuart Lake Trailhead", want: "3,400", pr: "#1348 elevation" },
  { route: "wa_playing_not_spraying", pin: "SR-20 Wine Spires pullout", want: "4,300", pr: "#1348 elevation" },
  { route: "wa_gray_wolf_ridge_se_slopes", pin: "Baldy summit", want: "6,827", pr: "#1340 position" },
  { route: "wa_honeymoon_route", pin: "Royal Lake", want: "5,100", pr: "#1333 position" },
  /* `absent` is REQUIRED for this case, and the reason is worth keeping: a plain includes() of
     "Stuart Lake Trailhead" was ALSO true BEFORE the repair, because the quoted form CONTAINS the
     unquoted substring. The assertion that proves anything here is that the QUOTED form is gone —
     and the &quot; unescaping in the text normaliser below is what lets it see one. */
  { route: "wa_stanley_burgner", pin: "Stuart Lake Trailhead", want: "3,400", pr: "unwrapped name", absent: '"Stuart Lake Trailhead"' },
];

const key = requireServiceKey();
const rows = await selectAll("routes", "*", `id=in.(${CASES.map(c => c.route).join(",")})`, { pageSize: 50, key });
if (!rows.length) { console.error("read 0 routes — a broken scan, not a clean result"); process.exit(1); }

/* Waypoints render on the Planner tab for an alpine route and on Overview for a crag one, so try
   both rather than asserting a tab this probe does not control. */
const TABS = ["planner", "overview"];
let bad = 0;
for (const c of CASES) {
  const row = rows.find(r => r.id === c.route);
  if (!row) { console.log(`  MISSING ROW  ${c.route}`); bad++; continue; }
  let best = null;
  for (const tab of TABS) {
    let html;
    try { html = render(row, tab); }
    catch (e) { console.log(`  RENDER THREW  ${c.route} (${tab}): ${String(e.message).slice(0, 140)}`); bad++; best = "threw"; break; }
    /* Match the ESCAPED form the server emits, not the source string. */
    const text = html.replace(/<[^>]+>/g, " ")
      .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, " ");
    const named = text.includes(c.pin), valued = text.includes(c.want) && (!c.absent || !text.includes(c.absent));
    if (!best || (named && valued)) best = { tab, named, valued, len: html.length, text };
    if (named && valued) break;
  }
  if (best === "threw") continue;
  const ok = best.named && best.valued;
  if (!ok) bad++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${c.route}  (${c.pr}, tab=${best.tab})`);
  console.log(`         "${c.pin}" on screen: ${best.named};  corrected value "${c.want}" on screen: ${best.valued}${c.absent ? `;  ${JSON.stringify(c.absent)} absent: ${!best.text.includes(c.absent)}` : ""};  ${best.len} chars`);
  if (!ok) {
    const i = best.text.indexOf(c.pin.slice(0, 14));
    if (i >= 0) console.log(`         around it: ...${best.text.slice(Math.max(0, i - 50), i + 170)}...`);
  }
}
console.log(`\n${CASES.length - bad} of ${CASES.length} repaired values are on screen.`);
process.exit(bad ? 1 : 0);
