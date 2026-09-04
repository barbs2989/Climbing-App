// Does the NEW stored order reach the screen? A reordered column is not a reordered list:
// tidyWaypoints runs at the DB boundary and could re-sort, and WaypointList could impose its own.
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IDS = ["wa_del_campo_peak_standard", "wa_cathedral_rock_standard", "wa_burnt_boot_peak_north_ridge"];

const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=*`, { headers: headers(anonKey()) });
const rows = await r.json();
const byId = new Map(rows.map((x) => [x.id, x]));

const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-wp-"));
try {
  const entry = path.join(tmp, "e.jsx");
  fs.writeFileSync(entry, `
export { default as RouteDetail } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
`);
  const bundle = path.join(tmp, "b.mjs");
  execFileSync(path.join(ROOT, "node_modules/.bin/esbuild"), [
    entry, "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--loader:.jsx=jsx", "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--outfile=" + bundle, "--log-level=error",
  ], { cwd: ROOT });

  const React = (await import("react")).default;
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { RouteDetail, dbRouteToCamel } = await import(bundle);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const noop = () => {};
  const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

  let fail = 0;
  for (const id of IDS) {
    const raw = byId.get(id);
    const route = dbRouteToCamel(raw);
    const stored = (raw.waypoints || []).map((w) => (w.name || "").trim());
    const hydrated = (route.waypoints || []).map((w) => (w.name || "").trim());
    const text = strip(renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      }))));
    const hs = text.indexOf("WAYPOINTS");
    if (hs < 0) { console.log(`\n## ${id}\n   FAIL - no WAYPOINTS heading rendered; nothing to judge`); fail++; continue; }
    let he = text.length;
    for (const h of ["CAMPING", "ROUTE TRACK", "APPROACH", "KNOWN HAZARDS"]) {
      const j = text.indexOf(h, hs + 9);
      if (j > 0 && j < he) he = j;
    }
    const panel = text.slice(hs, he);
    const at = hydrated.map((n) => ({ n, i: panel.indexOf(n) }));
    const missing = at.filter((x) => x.i < 0).map((x) => x.n);
    const onscreen = at.filter((x) => x.i >= 0).sort((a, b) => a.i - b.i).map((x) => x.n);
    const ok = JSON.stringify(hydrated.filter((n) => at.find((x) => x.n === n).i >= 0)) === JSON.stringify(onscreen);
    console.log(`\n## ${id}`);
    console.log(`   stored:   ${stored.join(" -> ")}`);
    if (JSON.stringify(stored) !== JSON.stringify(hydrated)) console.log(`   hydrated: ${hydrated.join(" -> ")}   (tidyWaypoints CHANGED it)`);
    console.log(`   onscreen: ${onscreen.join(" -> ")}${missing.length ? "   [not found: " + missing.join(", ") + "]" : ""}`);
    console.log(`   ${ok ? "ok  — screen order matches the hydrated order" : "FAIL — screen order differs"}`);
    if (!ok) fail++;
    if (!onscreen.length) { console.log("   FAIL — no waypoint name rendered at all; this proves nothing"); fail++; }
  }
  process.exitCode = fail ? 1 : 0;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
