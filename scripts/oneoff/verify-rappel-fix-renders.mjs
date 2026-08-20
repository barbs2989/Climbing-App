// Does #1043's rappel repair actually reach the screen?
//
// The data change nulled four unsupported lengths on wa_west_face_2 (the row said 50/50/50/20
// while its own descent_text said "~30 m each" and its gear list specifies a 60 m rope, which
// reaches 30 m doubled) and corrected the gear list on wa_chimney_rock_west_face. A 200 from
// PostgREST proved the columns changed; it proves nothing about what a climber sees.
//
// I tried to confirm this in the live app and could not: page-content reads through the Chrome
// extension time out at load 612 on 4 cores. This asks the same question without a browser, and
// more strictly -- it renders the REAL RouteDetail against the REAL row, mapped through
// dbRouteToCamel, which is the shape the reader actually gets (contributed lat/lng arrive as
// strings, waypoint types get rewritten, and so on). Checking the raw column would skip all of
// that.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel };
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-rapver-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, dbRouteToCamel } = require_(out);
const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&mdash;|&#8212;/g, "—").replace(/\s+/g, " ");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

async function row(id) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=*`, { headers: H });
  if (!r.ok) throw new Error(`read ${id} -> ${r.status}`);
  const [x] = await r.json();
  if (!x) throw new Error(`no row ${id}`);
  return x;
}
function findTab(route, needle) {
  for (const t of ["planner", "overview", "safety", "conditions", "photos", "partners"]) {
    try { if (text(render(route, t)).includes(needle)) return t; } catch {}
  }
  return null;
}

// ── wa_west_face_2: the four lengths are gone; nothing shows 50 m as a rappel length.
const w = dbRouteToCamel(await row("wa_west_face_2"));
const wTab = findTab(w, "RAPPEL");
if (!wTab) fail("ANCHOR LOST: no sub-tab renders a RAPPEL section for wa_west_face_2");
else {
  ok(`wa_west_face_2 renders a RAPPELS section on "${wTab}"`);
  const html = render(w, wTab);
  const i = html.indexOf("RAPPEL");
  // FIXED WINDOW, and it bit once: while rappel_count_note carried a 300-word maintainer note
  // the table itself fell OUTSIDE 1800 chars and the em-dash assertion failed on correct markup.
  // That is the trap CLAUDE.md records -- a window encodes a guess about the size of the thing
  // you are looking at. Bounded at the next section heading where one exists.
  const rest = html.slice(i + 6);
  const nextHeading = rest.search(/>[A-Z][A-Z &]{4,}</);
  const around = text(html.slice(i, i + 6 + (nextHeading > 0 ? nextHeading : 4000)));
  console.log(`        section text: ${JSON.stringify(around.slice(0, 220))}`);
  if (/\b50\s*m\b/.test(around)) fail("the superseded 50 m length is STILL on screen");
  else ok("no 50 m rappel length on screen");
  if (/—|—/.test(around)) ok("the table prints an em dash for the unknown lengths");
  else fail("no em dash — RappelTable may not be showing the nulled stations as unknown");
  if (/per-station lengths unconfirmed/i.test(text(html))) ok("the corrected `rappels` summary reaches the screen");
  else fail("the corrected `rappels` summary does not render");
}

// ── wa_chimney_rock_west_face: the gear list no longer says a single 50 m rope suffices.
const c = dbRouteToCamel(await row("wa_chimney_rock_west_face"));
const cAll = ["planner", "overview", "safety", "conditions"].map((t) => { try { return text(render(c, t)); } catch { return ""; } }).join(" ");
if (/single 50m sufficient/i.test(cAll)) fail("chimney rock still advertises 'single 50m sufficient'");
else ok("chimney rock no longer advertises a single 50 m rope as sufficient");
if (/second rope or tag line is required/i.test(cAll)) ok("the second-rope requirement reaches the screen");
else fail("the second-rope requirement does not render anywhere");

console.log("");
console.log(failures ? `${failures} finding(s)` : "no findings — the repair reaches the screen");
process.exit(failures ? 1 : 0);
