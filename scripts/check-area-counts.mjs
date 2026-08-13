// check:counts — does every areas.route_count still match the truth?
//
// `route_count` is a denormalised aggregate maintained by `routes_bump_counts`, a trigger
// on the ROUTES table (0001). It bumps every ancestor when a route is inserted, deleted or
// has its area_id changed. Nothing maintains it when an AREA moves, is merged, or is
// deleted -- each of those silently leaves every ancestor above it wrong, and the trigger
// has no way to notice. 0017, 0027 and 0098 each repaired a round of exactly this.
//
// It is not cosmetic. route_count is what the area browser prints beside an area name and
// what lib/db.js orders areas by, so a stale value both misstates the number and misplaces
// the area in the list. Before 0098, wa_liberty_bell_group cached 6 against a true 27 --
// one of the best-known formations at Washington Pass, advertising 22% of its climbs and
// sorting as though it were tiny. Nothing caught it; it took a hand audit.
//
// WHY THIS IS NOT A BUILD GATE. Drift is a property of the DATABASE, not the checkout. No
// code change can cause it and no code change can fix it, so failing `npm run build` would
// block every unrelated PR on a condition its author cannot affect -- and the person who
// broke it (by running a migration) would not be the person who sees red. Same reasoning
// as check:drift: the question has to be asked on a schedule, from outside. See
// .github/workflows/area-count-drift.yml.
//
// Read-only. Anon key only -- `areas` and `routes` are publicly readable, and a checker
// that could write is a checker that can corrupt what it is checking.
//
//   node scripts/check-area-counts.mjs            report drift, exit 1 if any
//   node scripts/check-area-counts.mjs --sql      also print the repair SQL
//
// Exit 0 = every area agrees with its true subtree count.

import { selectAll } from "./lib/supabase-env.mjs";

const WANT_SQL = process.argv.includes("--sql");
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- fetch
// Two full-table reads. `routes` is ~205k rows, so ask for the two columns actually
// needed rather than `*` -- selectAll pages by keyset on id, so id has to come along.
/* The FIRST request of a run pays connection setup — measured at 3.7s against 0.3-0.7s for the
   same query once warm — and this reads under the ANON key on purpose (a checker that could
   write is one that can corrupt what it is checking), which carries a 3s statement_timeout. So
   the opening read below intermittently died with `57014 canceling statement due to statement
   timeout` before it had fetched a single row.
   That is a cold start, NOT an expensive query, and the distinction matters because the obvious
   response is to shrink the page, which fixes nothing: measured, 1000 areas takes 725 ms warm
   and 400 still failed cold. See scripts/oneoff/probe-areas-page-cost.mjs.
   So pay the setup on a request whose result is thrown away, and leave the page size alone.
   This guard runs on a SCHEDULE (area-count-drift.yml), so a cold-start death is a day with no
   answer rather than a visible failure — the same shape as the empty-read false pass guarded
   against below, and the reason audit:waypoints already carries this exact warm-up. */
await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1 });

/* The warm-up REDUCES the opening cost but does not eliminate the failure, which is why this
   retry exists beside it rather than instead of it. Measured 2026-08-13 (see
   scripts/oneoff/probe-areas-cold-start.mjs), first page of `areas`:
       cold    9418ms / 4456ms / 7848ms
       warmed  2468ms / 1507ms / FAILED 57014 after 18270ms
   So warming helps materially and a warmed run can still die. Retrying only on 57014 keeps the
   distinction that matters: `57014` is the server answering "that took too long", which is
   worth another attempt, while a 522 or a socket timeout means the database is UNREACHABLE and
   retrying would just spend three times as long reporting the same outage. Those two look alike
   in a log and mean opposite things.
   It stays fail-closed: after 3 attempts the error is rethrown and the run dies loudly. A
   scheduled guard that quietly reports nothing is the failure this whole script guards against. */
async function readAll(table, cols) {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await selectAll(table, cols, "", { pageSize: 1000 });
    } catch (e) {
      last = e;
      if (!/57014|statement timeout/i.test(String(e.message))) throw e;
      log(`  ${table}: statement timeout on attempt ${attempt} of 3 — retrying`);
    }
  }
  throw last;
}

log("reading areas + routes (read-only, anon key)...");
const areas = await readAll("areas", "id,name,area_type,parent_id,route_count");
const routes = await readAll("routes", "id,area_id");
log(`  areas=${areas.length}  routes=${routes.length}`);

if (!areas.length || !routes.length) {
  console.error("\ncheck:counts FAILED — a table came back empty. That is a connection or RLS\n" +
    "problem, not a clean result: reporting 'no drift' off zero rows would be a false pass.");
  process.exit(1);
}

// ---------------------------------------------------------------- injection
// A guard that has only ever run against clean data is a guard nobody has tested. This
// cannot be exercised the usual way -- the fault lives in the DATABASE and the checker is
// deliberately read-only -- so faults are injected into the fetched rows in memory
// instead. Nothing is written anywhere. See the injection tests at the bottom.
const inject = (process.argv.find((a) => a.startsWith("--inject=")) || "").split("=")[1];
if (inject) {
  log(`  !! --inject=${inject} — perturbing the in-memory snapshot to test the detector`);
  if (inject === "drift") {
    const a = areas.find((x) => x.id === "wa_liberty_bell_group") || areas.find((x) => x.route_count > 0);
    a.route_count += 7;
    log(`     bumped ${a.id}.route_count by 7`);
  } else if (inject === "orphan") {
    for (const r of routes.slice(0, 3)) r.area_id = "zz_area_that_does_not_exist";
    log("     repointed 3 routes at a non-existent area");
  } else if (inject === "unreachable") {
    const a = areas.find((x) => x.parent_id);
    a.parent_id = "zz_parent_that_does_not_exist";
    log(`     gave ${a.id} a dangling parent_id`);
  } else {
    console.error(`unknown --inject=${inject}`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------- walk
// Post-order DFS, O(n). The obvious alternative -- one `path <@` subtree count per area --
// is 47k aggregate queries over a 205k-row table, which is why this invariant went
// unchecked for so long. Iterative rather than recursive so tree depth cannot blow the
// stack.
const direct = new Map();
for (const r of routes) direct.set(r.area_id, (direct.get(r.area_id) || 0) + 1);

const byId = new Map(), kids = new Map();
for (const a of areas) {
  byId.set(a.id, a);
  if (a.parent_id) {
    if (!kids.has(a.parent_id)) kids.set(a.parent_id, []);
    kids.get(a.parent_id).push(a.id);
  }
}

const total = new Map();
const roots = areas.filter((a) => !a.parent_id).map((a) => a.id);
const stack = roots.map((id) => [id, false]);
while (stack.length) {
  const [id, done] = stack.pop();
  if (done) {
    let n = direct.get(id) || 0;
    for (const k of kids.get(id) || []) n += total.get(k) || 0;
    total.set(id, n);
  } else {
    stack.push([id, true]);
    for (const k of kids.get(id) || []) stack.push([k, false]);
  }
}

// ---------------------------------------------------------------- integrity
// Both of these would make the count comparison meaningless rather than merely wrong, so
// they are reported first and separately.
const orphanRoutes = [...direct.keys()].filter((aid) => !byId.has(aid));
const orphanRouteN = orphanRoutes.reduce((s, aid) => s + direct.get(aid), 0);
const unreachable = areas.filter((a) => !total.has(a.id));

let problems = 0;
if (orphanRoutes.length) {
  problems++;
  log(`\n  FAIL  ${orphanRouteN} route(s) point at ${orphanRoutes.length} area_id(s) that do not exist`);
  for (const aid of orphanRoutes.slice(0, 10)) log(`          ${aid} (${direct.get(aid)} routes)`);
}
if (unreachable.length) {
  problems++;
  log(`\n  FAIL  ${unreachable.length} area(s) unreachable from a root — dangling parent_id, or a cycle`);
  for (const a of unreachable.slice(0, 10)) log(`          ${a.id} parent=${a.parent_id}`);
}

// ---------------------------------------------------------------- compare
const drift = areas
  .filter((a) => total.has(a.id) && total.get(a.id) !== a.route_count)
  .map((a) => ({ ...a, truth: total.get(a.id), d: a.route_count - total.get(a.id) }))
  .sort((x, y) => Math.abs(y.d) - Math.abs(x.d));

if (drift.length) {
  problems++;
  log(`\n  FAIL  ${drift.length} area(s) whose cached route_count disagrees with the truth:`);
  log(`\n        delta  area                                cached ->    true  type`);
  for (const a of drift) {
    log(`        ${String(a.d > 0 ? "+" + a.d : a.d).padStart(5)}  ${a.id.padEnd(34)} ${String(a.route_count).padStart(6)} -> ${String(a.truth).padStart(7)}  ${a.area_type}`);
  }
  const worst = drift[0];
  log(`\n        Worst: ${worst.name} shows ${worst.route_count} of its ${worst.truth} climbs.`);
  log(`        Repair with a RECOUNT, never by writing these numbers as literals — they go`);
  log(`        stale the moment anything else changes. Run with --sql for the statement.`);
  if (WANT_SQL) {
    log(`\n-- repair (recomputed by subquery, so it cannot go stale and is safe to re-run)`);
    log(`update areas set route_count = (`);
    log(`  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path`);
    log(`) where id in (`);
    log(drift.map((a) => `  '${a.id}'`).join(",\n"));
    log(`);`);
  }
}

if (problems) {
  log(`\ncheck:counts — ${drift.length} drifted, ${orphanRouteN} orphaned route(s), ${unreachable.length} unreachable area(s).`);
  process.exit(1);
}
log(`\ncheck:counts: ok — all ${areas.length} areas agree with their true subtree count; no orphaned routes, no unreachable areas.`);

/* Injection tests — each must FAIL (exit 1) and name the right fault. Run all four:
 *
 *   node scripts/check-area-counts.mjs                       -> ok, exit 0   (control)
 *   node scripts/check-area-counts.mjs --inject=drift        -> 1 drifted area
 *   node scripts/check-area-counts.mjs --inject=orphan       -> 3 orphaned routes
 *   node scripts/check-area-counts.mjs --inject=unreachable  -> 1 unreachable area
 *
 * The control matters as much as the three faults: this guard's realistic failure mode is
 * a FALSE PASS, not a false alarm. An empty or partial read would make every area look
 * consistent with zero routes, which is why the empty-table check above exits 1 rather
 * than reporting a clean tree. Verified 2026-08-09 against the live DB (47,574 areas /
 * 205,492 routes): control passed, all three injections failed with the right message.
 */
