// Does the copied road block actually reach a screen?
//
// A populated column is not a rendered one — this repo has `descent_text` populated on 1,021 routes
// and rendered on none, and the rack correction rendering on the right TAB and in the wrong BOX.
// So render the real RouteDetail over the real rows, through the real dbRouteToCamel, and look for
// the block's own text on the page.
//
// TWO STEPS THAT CAN EACH SILENTLY DROP IT, and only rendering exercises both: `dbRouteToCamel`
// has to carry `road` onto the camel object at all, and the GETTING THERE panel is on the PLANNER
// tab and gated on `route.road || route.driveMinSLC`. Grepping either one in isolation proves
// nothing about the other.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { createRequire } from "module";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const IDS = ["wa_colchuck_balanced_rock_col_east_lake_side_approch", "wa_northwest_face", "wa_south_face_2001_variation"];
const rows = await selectAll("routes", "*", `id=in.(${IDS.join(",")})`, { pageSize: 100 });
if (rows.length !== IDS.length) { console.error(`expected ${IDS.length} rows, got ${rows.length}`); process.exit(1); }

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export { React, renderToStaticMarkup, RouteDetail, dbRouteToCamel, QueryClient, QueryClientProvider };
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-road-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { React, renderToStaticMarkup, RouteDetail, dbRouteToCamel, QueryClient, QueryClientProvider } = require_(out);
/* RouteDetail mounts react-query hooks, so it must be wrapped exactly as check:bare wraps it. */
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
if (typeof dbRouteToCamel !== "function") { console.error("ANCHOR LOST: dbRouteToCamel not exported from lib/db.js"); process.exit(1); }

/* renderToStaticMarkup emits escaped entities, so compare against text with entities decoded —
   the trap CLAUDE.md records as ssr-probes-must-match-escaped-html. */
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

let bad = 0;
for (const raw of rows) {
  const cam = dbRouteToCamel(raw);
  console.log(`\n=== ${raw.id} ===`);
  if (!cam.road || !cam.road.name) { console.error(`  FAIL: dbRouteToCamel did not carry \`road\` onto the camel object`); bad++; continue; }
  console.log(`  dbRouteToCamel carries road.name: "${String(cam.road.name).slice(0, 80)}"`);

  let html;
  try { html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc }, React.createElement(RouteDetail, {
      route: cam, initialSubTab: "planner", onBack: () => {}, onSubTab: () => {},
      contribs: [], myReports: [], connections: [], comments: {},
      hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
      crewsForRoute: [], myStars: {}, presence: null,
    }))); }
  catch (e) { console.error(`  FAIL: render threw — ${e.message}`); bad++; continue; }
  const text = decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

  /* Assert the panel heading AND a distinctive slice of the copied value. The heading alone would
     pass on a panel rendering someone else's road; the value alone could match prose elsewhere. */
  const headingOk = text.includes("GETTING THERE");
  const needle = String(raw.road.name).slice(0, 34);
  const valueOk = text.includes(needle);
  console.log(`  GETTING THERE heading: ${headingOk ? "yes" : "NO"}`);
  console.log(`  road.name on screen:   ${valueOk ? "yes" : "NO"}  (looked for "${needle}")`);
  if (raw.road.status) {
    const s = String(raw.road.status).slice(0, 40);
    console.log(`  road.status on screen: ${text.includes(s) ? "yes" : "NO"}  (looked for "${s}")`);
    if (!text.includes(s)) bad++;
  }
  if (!headingOk || !valueOk) bad++;
}

console.log(`\n${bad ? `FAILED — ${bad} assertion(s)` : "ok — every copied road block reaches the Planner tab"}`);
process.exit(bad ? 1 : 0);
