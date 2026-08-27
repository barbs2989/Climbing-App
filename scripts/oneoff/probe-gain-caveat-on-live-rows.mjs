// Does the gain caveat fire on the REAL rows, through the REAL mapper?
//
// check:gain-floor-stated proves the caveat on a synthetic route shaped like Tahoma Glacier. That
// is not the same claim as "it fires on the catalog": between the column and the screen sit
// dbRouteToCamel (gain_ft -> gainM, in METRES) and normalizeWaypoints (which coerces elev and does
// NOT read elevM). Either could silence it while every fixture assertion still passed — the exact
// shape probe-track-coverage-fires-live.mjs exists for.
//
// So: render the real RouteDetail over real rows and COUNT. Predicted set comes from the same
// arithmetic the audit uses; the test is whether the SCREEN agrees.
//
//   node scripts/oneoff/probe-gain-caveat-on-live-rows.mjs [--limit 250]
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const LIMIT = +(argv[argv.indexOf("--limit") + 1] || 250);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel };
export function render(route) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-gainlive-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, dbRouteToCamel } = require_(out);

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=*,areas(path,name,area_type,region,lat,lng,elevation_ft)`
    + `&waypoints=not.is.null&gain_ft=not.is.null` + (after ? `&id=gt.${encodeURIComponent(after)}` : "")
    + `&order=id.asc&limit=500`;
  for (let a = 0; a < 4; a++) {
    const r = await fetch(url, { headers: headers(key) });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET -> ${r.status} ${t.slice(0, 160)}`);
    await new Promise((z) => setTimeout(z, 900 * (a + 1)));
  }
}

// The audit's arithmetic, on the RAW row — deliberately independent of the app helper, so the two
// can disagree. If they agreed by construction this probe would prove nothing.
const predict = (r) => {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : null;
  const g = +r.gain_ft;
  if (!wps || !wps.length || !(g > 0)) return false;
  const ef = (w) => { const v = w && w.elev; const n = v == null || v === "" ? NaN : Number(v); return Number.isFinite(n) ? n : null; };
  const ty = (w) => String((w && w.type) || "").toLowerCase();
  const th = wps.filter((w) => ty(w).includes("trailhead")).map(ef).filter((n) => n !== null);
  const su = wps.filter((w) => ty(w).includes("summit")).map(ef).filter((n) => n !== null);
  if (!th.length || !su.length) return false;
  const top = Math.max(...su), rise = top - Math.min(...th);
  if (!(rise > 0) || g >= rise - 300) return false;
  const implied = top - g;
  return !wps.map(ef).filter((n) => n !== null).some((n) => Math.abs(n - implied) <= 300);
};

const NEEDLE = /between this route’s own trailhead and summit pins/;
let rows = [], after = "";
for (;;) {
  const b = await page(after);
  if (!b.length) break;
  rows = rows.concat(b.filter((r) => String(r.id).startsWith("wa_")));
  after = b[b.length - 1].id;
  if (b.length < 500) break;
}
if (!rows.length) { console.error("REFUSING — empty read"); process.exit(1); }

const predicted = rows.filter(predict);
const clean = rows.filter((r) => !predict(r));
console.log(`WA rows with waypoints + gain : ${rows.length}`);
console.log(`predicted to show the caveat  : ${predicted.length}`);
console.log(`rendering ${Math.min(predicted.length, LIMIT)} predicted + ${Math.min(clean.length, LIMIT)} clean...\n`);

/* THE INVARIANT IS NOT "the data contradicts", IT IS "the SCREEN quotes an estimate built on the
   contradicted number". The first run of this probe asserted the former and reported 7 misses —
   all crag-family routes (trad/sport) whose Plan tab renders NO time estimate at all: no Est.
   summit, no Est. return. With no estimate there is no false claim, so the caveat is correctly
   absent and the app was right. Asserting the data-only form would have driven a "fix" to working
   code. Routes with no estimate are counted and reported, never scored. */
const ESTIMATE = /Est\. (?:summit|return)/;
let firedOnPredicted = 0, missedOnPredicted = [], firedOnClean = [], noEstimate = [];
for (const r of predicted.slice(0, LIMIT)) {
  let html = "";
  try { html = render(dbRouteToCamel(r)); } catch (e) { missedOnPredicted.push(`${r.id} THREW ${String(e.message).split("\n")[0]}`); continue; }
  if (!ESTIMATE.test(html)) { noEstimate.push(r.id); continue; }
  if (NEEDLE.test(html)) firedOnPredicted++; else missedOnPredicted.push(r.id);
}
for (const r of clean.slice(0, LIMIT)) {
  let html = "";
  try { html = render(dbRouteToCamel(r)); } catch { continue; }
  if (NEEDLE.test(html)) firedOnClean.push(r.id);
}

console.log(`predicted rows that show NO estimate (nothing to caveat) : ${noEstimate.length}`);
console.log(`fired on predicted WITH an estimate : ${firedOnPredicted} / ${Math.min(predicted.length, LIMIT) - noEstimate.length}`);
console.log(`MISSED             : ${missedOnPredicted.length}`);
for (const m of missedOnPredicted.slice(0, 10)) console.log(`   ${m}`);
console.log(`fired on CLEAN rows (false alarms) : ${firedOnClean.length}`);
for (const m of firedOnClean.slice(0, 10)) console.log(`   ${m}`);

// One worked example, read back verbatim, so this cannot pass on a count alone.
const tah = rows.find((r) => r.id === "wa_mount_rainier_tahoma_glacier");
if (tah) {
  const t = render(dbRouteToCamel(tah)).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");
  const m = t.match(/Lower bound[^.]*\.[^.]*\./);
  console.log(`\nwa_mount_rainier_tahoma_glacier on screen:\n  ${m ? m[0].trim() : "-- caveat NOT found --"}`);
}

const bad = missedOnPredicted.length || firedOnClean.length || !firedOnPredicted;
console.log(bad ? "\nPROBE FAILED" : "\nok — the screen agrees with the arithmetic on every row rendered.");
process.exit(bad ? 1 : 0);
