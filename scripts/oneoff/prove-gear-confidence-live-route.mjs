// End-to-end: a REAL inferred route, through the real select + dbRouteToCamel + RouteDetail.
//
// The fixture proof (prove-gear-confidence-caption.mjs) hand-builds a route object, so it
// proves the RENDER but not the PIPELINE — it would still pass if `gear_confidence` were
// never selected or never mapped. This one starts from the live row, which is the failure
// this codebase keeps hitting: "grep the consumer, not the transform".
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

// The same shape lib/db.js asks for, so the row reaching dbRouteToCamel is the app's row.
const SEL = "*, areas(name,area_type,region,lat,lng,elevation_ft,prominence_ft,avy_zone,blurb,parent:parent_id(name))";
const pick = async (filter) => {
  // order=id.asc or PostgREST returns an arbitrary row each run — the sample changed between
  // two runs of this script and turned a passing assertion into a failing one.
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${encodeURIComponent(SEL)}&${filter}&order=id.asc&limit=1`;
  const r = await fetch(url, { headers: headers(requireServiceKey()) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 200));
  const rows = await r.json();
  return rows[0] || null;
};

// Require real rack CONTENT, not just a non-null column: RouteRackBox early-returns when it
// has no lines to print, so a row like wa_spraying_mantis (inferred, detailed_rack set, rack
// []) mounts no box and there is nothing for the caveat to attach to.
const inferred = await pick("gear_confidence=eq.inferred&detailed_rack=not.is.null&rack=not.is.null&id=like.wa_*");
const verified = await pick("gear_confidence=eq.verified&detailed_rack=not.is.null&id=like.wa_*");
if (!inferred || !verified) { console.error("could not fetch one of each — refusing to report a result about nothing"); process.exit(1); }
console.log(`inferred sample: ${inferred.name} (${inferred.id})`);
console.log(`verified sample: ${verified.name} (${verified.id})\n`);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function renderRow(row, tab) {
  const route = dbRouteToCamel(row);
  return { markup: renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      }))), mapped: route.gearConfidence };
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-gc-live-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { renderRow } = require_(out);

const CAVEAT = "inferred from this route";   // stop before the apostrophe — markup escapes it
const ANCHOR = "Protection and technical gear";
let failed = 0;
const check = (label, cond, detail) => { console.log(`  ${cond ? "ok  " : "FAIL"}  ${label}${cond ? "" : " — " + detail}`); if (!cond) failed++; };

// The RACK box is not on every sub-tab for every discipline — check:field-renders records
// detailed_rack as "alpine:planner, crag:overview, crag:planner", and both live samples here
// are alpine, so Overview legitimately has no box. So a tab where it does not mount is not a
// failure; proving it on NO tab is. Track that explicitly rather than per-tab.
let proved = 0;
for (const tab of ["planner", "overview"]) {
  const i = renderRow(inferred, tab), v = renderRow(verified, tab);
  console.log(`[${tab}]`);
  check("dbRouteToCamel mapped the column", i.mapped === "inferred" && v.mapped === "verified", `got ${JSON.stringify(i.mapped)}/${JSON.stringify(v.mapped)} — the column is selected but not mapped`);
  // Mount is per-ROUTE, not per-tab: RouteRackBox early-returns when a route has no rack
  // lines at all, so asserting the inferred route's caveat off the VERIFIED route's mount
  // compares two different screens. That is what failed here first.
  if (!i.markup.includes(ANCHOR)) { console.log("  --    inferred route's RACK box not on this sub-tab (alpine renders it on Plan only)"); continue; }
  check("real inferred route SAYS so", i.markup.includes(CAVEAT), "the caveat did not reach the screen for a live inferred row");
  if (v.markup.includes(ANCHOR)) check("real verified route stays SILENT", !v.markup.includes(CAVEAT), "a live verified rack was captioned as inferred");
  proved++;
}
check("the caveat was proven on at least one sub-tab", proved > 0, "the RACK box mounted nowhere — this run verified nothing");
console.log(failed ? `\n${failed} assertion(s) failed` : "\nall assertions passed");
process.exit(failed ? 1 : 0);
