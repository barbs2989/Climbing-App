// How much data actually sits behind the sub-keys check:field-renders reports as reaching no
// screen? A "partial — 1/5 leaves shown" verdict says a leaf is unread; it does NOT say the
// leaf is common. Building a UI section for a sub-key 8 routes have is worse than leaving it.
//
// Counts, per sub-key path, how many routes have a non-empty value. Read-only, anon key.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

// The exact paths reported unread by check:field-renders, plus their siblings for contrast —
// a count is only meaningful next to what the RENDERED leaves of the same column carry.
const TARGETS = {
  seasonal_hazards: ["weather.typical", "weather.probability", "exposure", "crevasses", "avalanche.byMonth"],
  seasonal_guidance: ["monthBreakdown.*.reason", "monthBreakdown.*.rating", "summary", "bestWindow"],
  road: ["name", "status", "gate", "surface"],
  access: ["land_manager", "permit", "fee", "notes"],
  itinerary: ["sourceNote", "days"],
};
const UNREAD = new Set(["seasonal_hazards.weather.typical", "seasonal_hazards.weather.probability",
  "seasonal_hazards.exposure", "seasonal_hazards.crevasses",
  "seasonal_guidance.monthBreakdown.*.reason", "road.name", "access.land_manager", "itinerary.sourceNote"]);

const nonEmpty = (v) => v != null && v !== "" && !(Array.isArray(v) && !v.length) &&
  !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

// "a.*.b" means: for any key at that level, does a `b` exist underneath?
function getPath(obj, path) {
  const parts = path.split(".");
  let cur = [obj];
  for (const p of parts) {
    const next = [];
    for (const c of cur) {
      if (c == null || typeof c !== "object") continue;
      if (p === "*") { for (const v of Object.values(c)) next.push(v); }
      else next.push(c[p]);
    }
    cur = next;
    if (!cur.length) return undefined;
  }
  return cur.find(nonEmpty);
}

async function pageFor(col, cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [500, 300, 150, 80]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${col}&${col}=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return { rows: JSON.parse(await r.text()), limit };
    const b = (await r.text()).slice(0, 70);
    console.log(`    limit=${limit} -> ${r.status} ${b.includes("57014") ? "(timeout, smaller)" : b}`);
  }
  throw new Error("no page size worked for " + col);
}

let total = 0;
for (const [col, paths] of Object.entries(TARGETS)) {
  const rows = []; let cursor = null, lim = 0;
  for (;;) { const p = await pageFor(col, cursor); lim = p.limit; if (!p.rows.length) break; rows.push(...p.rows); cursor = p.rows[p.rows.length - 1].id; if (p.rows.length < lim) break; }
  if (!rows.length) { console.log(`\n${col}: 0 rows populated`); continue; }
  total += rows.length;
  console.log(`\n${col} — ${rows.length} routes have the column`);
  for (const path of paths) {
    let n = 0;
    for (const r of rows) if (nonEmpty(getPath(r[col], path))) n++;
    const key = col + "." + path;
    const mark = UNREAD.has(key) ? "  <-- reaches no screen" : "";
    console.log(`  ${path.padEnd(26)} ${String(n).padStart(5)}  (${((n / rows.length) * 100).toFixed(0)}% of populated)${mark}`);
  }
}
if (!total) { console.error("\nread zero rows overall — failing closed rather than calling this a clean sweep"); process.exit(1); }
console.log(`
Only the "<-- reaches no screen" lines are candidates for new UI. A high count there means
enrichment already paid for is invisible; a low one means the right answer is to leave it and
not grow the route screen for a handful of routes.`);
