// Does the rewritten prose actually reach a climber, and did the removal land ON SCREEN?
//
// The applier verifies the COLUMN by re-reading it. That is not the same question: this repo's
// standing example is `descent_text`, populated on 1,021 routes and rendered on none. Two steps sit
// between the column and the screen and either could hide a change - `dbRouteToCamel`, and whichever
// sub-tab the section is gated to.
//
// Asserted in BOTH directions per route, because a removal-only check passes against a component
// that rendered nothing at all:
//   * the sourcing phrase is GONE, and
//   * the surviving fact and its hedge are still on screen, verbatim.
//
// No browser and no dev server: RouteDetail is rendered with react-dom/server over the LIVE row,
// through the real dbRouteToCamel.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// { id, tab, gone: [...], kept: [...] }  — one per rewritten value we can reach from a sub-tab.
const CASES = [
  {
    id: "wa_mount_adams_south_climb", tab: "planner",
    gone: ["Multiple sources confirm"],
    kept: ["Technical climbing gear is optional."],
  },
  {
    id: "wa_courtney_peak_scramble", tab: "planner",
    gone: ["in multiple sources"],
    kept: ["a simple, non-technical scramble"],
  },
  {
    id: "wa_dirty_sanchez", tab: "planner",
    gone: ["Sources describe using"],
    // the "though a single 60m rope ... is also viable" half is the HEDGE and must survive.
    kept: ["Two separate 60m ropes are commonly used", "is also viable"],
  },
  {
    id: "wa_flora_mountain_southwest_slope", tab: "safety",
    gone: ["described in multiple sources"],
    kept: ["a desolate pile of loose gneiss", "persistently loose footing"],
  },
  {
    id: "wa_cathedral_peak_last_rites", tab: "safety",
    gone: ["per multiple climbing sources"],
    // "reportedly" is the hedge on the fine, which is the part we are least sure of.
    kept: ["illegal and reportedly heavily fined"],
  },
  // --- batch 2: `road`, which renders in GETTING THERE. A different render path from every
  //     case above, so their passes say nothing about it.
  {
    id: "wa_mount_pugh_pika_slab", tab: "planner",
    gone: ["depending on the source"],
    // the RANGE is the surviving hedge, and the untouched "trip reports say" clause must not
    // have been collaterally eaten.
    kept: ["roughly 12.5-14 miles from Darrington", "trip reports say"],
  },
  {
    id: "wa_mount_persis_the_hexorcist", tab: "planner",
    gone: ["in any source found"],
    kept: ["is not documented anywhere on file"],
  },
];

const KEY = anonKey();
const ids = [...new Set(CASES.map((c) => c.id))];
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=*`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== ids.length) { console.error(`read returned ${rows.length} of ${ids.length} — refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

// esbuild traps this repo already records: bundle INSIDE the project (node resolves `react` from the
// nearest node_modules), --jsx=automatic (classic emits React.createElement and React is not in
// scope), and --define:import.meta.env={} because lib/supabase.js reads it at module scope.
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-cite-"));
const entry = path.join(tmp, "entry.jsx");
fs.writeFileSync(entry, `
export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
`);
const bundle = path.join(tmp, "b.mjs");
try {
  execFileSync(path.join(ROOT, "node_modules/.bin/esbuild"), [
    entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--loader:.jsx=jsx", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--outfile=" + bundle, "--log-level=error",
  ], { cwd: ROOT });
} catch (e) { console.error("esbuild failed:\n" + (e.stderr || e).toString()); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { RouteDetail, dbRouteToCamel } = await import(bundle);

const noop = () => {};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const strip = (h) => h.replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");

let pass = 0, fail = 0, thin = 0;
for (const c of CASES) {
  const route = dbRouteToCamel(byId.get(c.id));
  let text = "";
  try {
    text = strip(renderToStaticMarkup(
      React.createElement(QueryClientProvider, { client: qc },
        React.createElement(RouteDetail, {
          route, initialSubTab: c.tab, onBack: noop, onSubTab: noop,
          contribs: [], myReports: [], connections: [], comments: {},
          hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
          crewsForRoute: [], myStars: {}, presence: null,
        }))));
  } catch (e) { console.error(`${c.id}: render threw — ${e.message}`); fail++; continue; }

  // Fail closed: every "gone" assertion passes against a component that rendered nothing.
  if (text.length < 900) { console.error(`${c.id}: rendered only ${text.length} chars — too thin to assert on`); thin++; continue; }

  for (const g of c.gone) {
    if (text.includes(g)) { console.error(`FAIL ${c.id} [${c.tab}]: still on screen — ${JSON.stringify(g)}`); fail++; }
    else { console.log(`  ok  ${c.id} [${c.tab}] gone: ${JSON.stringify(g)}`); pass++; }
  }
  for (const k of c.kept) {
    if (text.includes(k)) { console.log(`  ok  ${c.id} [${c.tab}] kept: ${JSON.stringify(k)}`); pass++; }
    else { console.error(`FAIL ${c.id} [${c.tab}]: NOT on screen — ${JSON.stringify(k)}`); fail++; }
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass} assertion(s) passed, ${fail} failed, ${thin} render(s) too thin.`);
if (thin) console.error("A thin render proves nothing — every removal assertion passes against an empty screen.");
process.exit(fail || thin ? 1 : 0);
