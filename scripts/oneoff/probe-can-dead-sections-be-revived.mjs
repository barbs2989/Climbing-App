// Do the three dead Climbs-tab sections have DATA to show if they were revived?
//
// `AreaLatest`, `ClassicClimbs` and `GettingThere` are gated on the seed-only `selArea` AND
// read the seed ROUTES array, so they never render in production
// (memory/three-climbs-tab-sections-dead-in-production.md). Reviving them means re-sourcing
// each from the DB — which is only worth doing if the DB actually holds what they display.
//
// This is the cheap observation before the expensive work: if `climb_logs` is near-empty, then
// "Latest from this area" would render blank for every real user and reviving it is pointless.
//
// Read-only. Fails closed on an unreachable database: "nothing was measured" must never read as
// "there is no data".
// SERVICE key, not anon, and that is the whole point. `climb_logs` is RLS-scoped to auth.uid(),
// so an anon count returns 0 with a 200 whatever the table holds — measured: 0 to anon, 2 to the
// service key. This probe's numbers DECIDE whether reviving a section is worth doing, and a
// decision made on an anon count is a decision made on nothing. See
// scripts/oneoff/probe-latent-claims-anon-vs-service.mjs for the side-by-side.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
if (!SUPABASE_URL || !key) {
  console.error("no Supabase env — nothing measured, which is NOT the same as no data.");
  process.exit(1);
}

let hardFail = false;
async function count(table, filter = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id${filter ? "&" + filter : ""}`;
  const r = await fetch(url, { headers: headers(key, { Prefer: "count=exact", Range: "0-0" }) })
    .catch((e) => ({ ok: false, status: 0, _err: String(e && e.message || e) }));
  if (!r.ok) {
    console.log(`  ${table}${filter ? " [" + filter + "]" : ""}  QUERY FAILED (${r.status}${r._err ? " " + r._err : ""})`);
    hardFail = true;
    return null;
  }
  const cr = r.headers.get("content-range") || "";
  const total = cr.includes("/") ? cr.split("/")[1] : "?";
  return total === "*" ? null : Number(total);
}

console.log("=== what the three sections would need ===\n");

console.log("AreaLatest — recent trip reports for an area subtree, from climb_logs:");
const logs = await count("climb_logs");
console.log(`  climb_logs rows: ${logs === null ? "unknown" : logs}`);
if (logs) {
  // Rows that could actually anchor to an area: they must name a route.
  const withRoute = await count("climb_logs", "route_id=not.is.null");
  console.log(`  ...with a route_id: ${withRoute === null ? "unknown" : withRoute}`);
}

console.log("\nClassicClimbs — 'classic' routes within a subtree:");
// NOT-NULL IS THE WRONG QUESTION FOR A BOOLEAN, and asking it here nearly produced the wrong
// answer: `classic` is non-null on all 205,543 routes (it has a default) while being TRUE on
// 56. "Populated on 205543 rows" reads as abundant data and means nothing — the
// flat-column-coverage false signal this repo already records. So a boolean is counted by
// TRUTHINESS and everything else by presence.
for (const [col, filter] of [["classic", "classic=is.true"], ["stars", "stars=not.is.null"], ["grade_num", "grade_num=not.is.null"]]) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${col}&limit=1`, { headers: headers(key) })
    .catch((e) => ({ ok: false, status: 0, _err: String(e && e.message || e) }));
  if (r.ok) {
    const n = await count("routes", filter);
    console.log(`  routes.${col.padEnd(10)} EXISTS, ${filter} on ${n === null ? "unknown" : n} row(s)`);
  } else {
    console.log(`  routes.${col.padEnd(10)} no such column (${r.status})`);
  }
}

console.log("\nGettingThere — approach/access/trailhead for a representative route:");
for (const col of ["approach", "access", "waypoints"]) {
  const n = await count("routes", `${col}=not.is.null`);
  console.log(`  routes.${col.padEnd(10)} populated on ${n === null ? "unknown" : n} row(s)`);
}

const routes = await count("routes");
console.log(`\nroutes total: ${routes === null ? "unknown" : routes}`);

if (hardFail) {
  console.error("\nAt least one query failed. Treat this run as INCONCLUSIVE rather than as evidence");
  console.error("that the data is absent — the whole point of this probe is deciding on evidence.");
  process.exit(1);
}
console.log("\nok — measured.");
