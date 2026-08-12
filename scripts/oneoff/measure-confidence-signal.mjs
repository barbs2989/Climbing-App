// What would actually drive a per-section confidence read?
//
// The route page used to carry TWO page-level graders (ProvenancePanel's DATA CONFIDENCE and
// EnrichmentPanels' DATA QUALITY). Both were removed because they graded every route whether
// or not they had anything to say. check:field-renders' KNOWN map records the condition for
// bringing the read back: "If the confidence/freshness read earns a home again, it belongs
// next to the data it grades, not above it."
//
// So the design question is not "can we render a chip" but "how often would a chip have
// something specific to say?" — because a chip that says MEDIUM on every route is the exact
// noise that got the boxes deleted. This measures that, read-only, anon key.
//
// Scope is ALPINE, deliberately: catalog-wide percentages are meaningless for this product.
import { SUPABASE_URL, anonKey, requireServiceKey, headers, selectAll } from "../lib/supabase-env.mjs";

const KEY = anonKey();

// 1. Which of the claimed "foundations" are even columns? Ask PostgREST's OpenAPI rather
//    than inferring from a SELECT, which cannot distinguish "absent" from "all null".
//    The root endpoint requires the SECRET key — with the anon key it returns 401 with a
//    JSON body, and `spec.definitions?.routes` on that body is undefined, i.e. every column
//    reads as "NO SUCH COLUMN". That is a fail-OPEN answer dressed as a finding, so assert
//    the response before believing it.
const specRes = await fetch(SUPABASE_URL + "/rest/v1/", { headers: headers(requireServiceKey()) });
if (!specRes.ok) { console.error(`OpenAPI read failed ${specRes.status}: ${(await specRes.text()).slice(0, 200)}`); process.exit(1); }
const spec = await specRes.json();
const cols = Object.keys(spec.definitions?.routes?.properties || {});
if (!cols.length) { console.error("OpenAPI returned no columns for `routes` — refusing to report every column as missing"); process.exit(1); }
const claimed = ["data_quality", "gear_confidence", "auto_generated", "verif", "corrections", "last_verified"];
console.log("=== claimed foundations, against the live schema ===");
for (const c of claimed) console.log(`  ${c.padEnd(18)} ${cols.includes(c) ? "EXISTS" : "NO SUCH COLUMN"}`);

const present = claimed.filter(c => cols.includes(c));
if (!present.length) { console.error("none of the claimed columns exist — nothing to measure"); process.exit(1); }

// 2. Washington scope, not catalog-wide — a percentage over 205k rows says nothing about
//    this product. `areas.path` is an ltree, so `like` is a 42883 type error; `cd` is the
//    <@ descendant operator. Scope via an embedded !inner join rather than a 5,000-id
//    `in.()` list, which would blow the URL length.
const sel = ["id", "area_id", "name", ...present].join(",") + ",areas!inner(path)";
//    Read with the SERVICE key: the anon role carries a 3s statement_timeout and this join
//    over 205k routes returns 57014 against it every time (same trap as the nationwide
//    route search). Read-only either way — nothing here writes.
const rows = await selectAll("routes", sel, "areas.path=cd.usa.washington", { pageSize: 1000, key: requireServiceKey() });
// Fail closed: an empty read makes every distribution look clean.
if (!rows.length) { console.error("read 0 routes — refusing to report a distribution about nothing"); process.exit(1); }
console.log(`sampled routes: ${rows.length}\n`);

const pct = (n) => ((n / rows.length) * 100).toFixed(1) + "%";

for (const c of present) {
  const populated = rows.filter(r => r[c] != null && r[c] !== "");
  console.log(`=== ${c} — populated on ${populated.length}/${rows.length} (${pct(populated.length)}) ===`);
  if (!populated.length) { console.log("  (nothing to distribute)\n"); continue; }
  const v0 = populated[0][c];
  if (typeof v0 === "object" && !Array.isArray(v0)) {
    const keyCount = {};
    const confDist = {};
    let withGaps = 0;
    for (const r of populated) {
      for (const k of Object.keys(r[c] || {})) keyCount[k] = (keyCount[k] || 0) + 1;
      const conf = r[c].confidence ?? r[c].level ?? null;
      if (conf != null) confDist[String(conf).toUpperCase()] = (confDist[String(conf).toUpperCase()] || 0) + 1;
      const g = r[c].gaps;
      if (Array.isArray(g) ? g.length : g) withGaps++;
    }
    console.log("  sub-keys:", Object.entries(keyCount).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(" "));
    if (Object.keys(confDist).length) console.log("  confidence distribution:", JSON.stringify(confDist));
    console.log(`  rows whose gaps list is non-empty: ${withGaps} (${pct(withGaps)})`);
    // THE decision number: a value that is identical on every row cannot inform a reader.
    const vals = Object.values(confDist);
    if (vals.length === 1) console.log("  >>> SINGLE-VALUED across the sample — a chip fed by this says the same thing on every route.");
    else if (vals.length) {
      const top = Math.max(...vals);
      console.log(`  >>> most common value covers ${((top / populated.length) * 100).toFixed(1)}% of populated rows`);
    }
  } else {
    const dist = {};
    for (const r of populated) dist[String(r[c])] = (dist[String(r[c])] || 0) + 1;
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 6);
    console.log("  values:", top.map(([k, n]) => `${k.slice(0, 40)}=${n}`).join(" "));
    if (top.length === 1) console.log("  >>> SINGLE-VALUED across the sample.");
  }
  console.log("");
}
