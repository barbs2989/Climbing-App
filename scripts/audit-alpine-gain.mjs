// Audit alpine/mountaineering routes for an elevation gain that disagrees with the
// summit elevation the same row claims.
//
// Read-only. Prints a report and writes nothing.
//
// This script did not work, in two independent ways, and the second is the instructive one:
//
//   1. It called `createClient` from @supabase/supabase-js, whose realtime client cannot
//      find a WebSocket constructor under Node 20, so it died on import before running a
//      single query. It also hardcoded the project URL and key inline, which CLAUDE.md
//      forbids -- credentials live in scripts/lib/supabase-env.mjs precisely so a script
//      cannot drift from the real ones.
//   2. It selected `areas(id,name,state)` and kept rows where `areas.state === "Washington"`.
//      **There is no `state` column on `areas`** (the state lives in the `path` ltree). So
//      had the import ever been fixed, the filter would have matched nothing and the script
//      would have printed "No obvious elevation gain issues found" -- a clean bill earned by
//      examining zero routes. Same failure as audit-a11y scoring a login screen: a pass that
//      is indistinguishable from having nothing to check.
//
// Hence the guard at the bottom: reporting "clean" is only allowed after something was
// actually measured.

import { selectAll, SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1];
  return fallback;
}
const stateArg = String(flagValue("state", "wa")).toLowerCase();
const verbose = args.includes("--verbose");

const ALPINE = new Set(["alpine", "mountaineering"]);

// `path` is an ltree, so PostgREST cannot LIKE it -- fetch and filter here. The id-prefix
// fallback catches legacy ids (`stuart_west_ridge`) that predate state scoping.
const allAreas = await selectAll("areas", "id,name,path,area_type", null, { pageSize: 1000 });
const areas = allAreas.filter(a =>
  String(a.path || "").split(".").includes(stateArg) || String(a.id || "").startsWith(stateArg + "_"));
if (!areas.length) {
  console.error(`No areas found for state "${stateArg}".`);
  process.exit(1);
}
const areaById = new Map(areas.map(a => [a.id, a]));

const routes = [];
const ids = areas.map(a => a.id);
for (let i = 0; i < ids.length; i += 80) {
  const chunk = ids.slice(i, i + 80).map(x => `"${x}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,gain_ft,high_point_ft&area_id=in.(${encodeURIComponent(chunk)})&limit=2000`;
  const res = await fetch(url, { headers: headers(anonKey()) });
  if (!res.ok) throw new Error(`GET routes chunk ${i} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  routes.push(...await res.json());
}

const alpine = routes.filter(r => ALPINE.has(String(r.discipline || "").toLowerCase()));
const withBoth = alpine.filter(r => Number(r.gain_ft) > 0 && Number(r.high_point_ft) > 0);
const peakOf = r => areaById.get(r.area_id)?.name || r.area_id;

console.log(`${stateArg.toUpperCase()}: ${areas.length} areas, ${routes.length} routes, ` +
  `${alpine.length} alpine/mountaineering, ${withBoth.length} with both gain and high point\n`);

// A gain larger than the summit elevation is not automatically wrong -- a traverse with
// re-ascents genuinely accumulates more than the high point -- so this is a ratio report to
// read, not a defect list. Under 0.1 usually means a high trailhead, which is also normal.
const HIGH = 1.5, LOW = 0.1;
const flagged = withBoth
  .map(r => ({ ...r, ratio: Number(r.gain_ft) / Number(r.high_point_ft) }))
  .filter(r => r.ratio > HIGH || r.ratio < LOW)
  .sort((a, b) => b.ratio - a.ratio);

console.log(`=== ${flagged.length} routes whose gain sits outside ${LOW}-${HIGH}x their high point ===`);
console.log("  Context, not a verdict: a traverse can out-gain its summit, and a high trailhead can under-gain it.");
for (const r of (verbose ? flagged : flagged.slice(0, 25))) {
  console.log(`  ratio ${r.ratio.toFixed(2).padStart(6)}  gain ${String(r.gain_ft).padStart(6)} ft  ` +
    `high point ${String(r.high_point_ft).padStart(6)} ft  ${peakOf(r)} / ${r.name}  [${r.id}]`);
}
if (!verbose && flagged.length > 25) console.log(`  … ${flagged.length - 25} more (--verbose to list all)`);

// Refuse to report a pass that was not earned. Zero flagged rows out of zero examined rows
// means the query matched nothing, which is the bug this script shipped with for its whole
// life -- not evidence that the data is clean.
if (!withBoth.length) {
  console.error(`\nFAILED: examined 0 routes (${routes.length} fetched, ${alpine.length} alpine).`);
  console.error(`"No issues" here would mean nothing was measured, not that nothing is wrong.`);
  console.error(`Check the --state value and that discipline still uses ${[...ALPINE].join("/")}.`);
  process.exit(1);
}
console.log(`\nNothing was written. ${flagged.length} of ${withBoth.length} examined routes warrant a look.`);
