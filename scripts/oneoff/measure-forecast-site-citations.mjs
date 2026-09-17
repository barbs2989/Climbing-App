// Measures the needle that `audit:prose-citations`' NAMED list uses for a commercial forecast site.
//
// WHY IT EXISTS: `climate` has been in that audit's PROSE_COLS for weeks, and
// `climate.forecastZone` renders verbatim on the route page as "Forecast zone - <value>". Yet 45 WA
// values credited mountain-forecast.com inside that field and NAMED matched none of them, because
// the list had no commercial forecast site in it. Same shape as the rack columns: the audit could
// not see a family, and only asking what it could not see found it.
//
// THE HYPHEN IS THE PRECISION RULE. A bare /mountain[- ]?forecast/i ALSO matches ordinary English
// meaning "a forecast for the mountain", and flagging that would tell an author to delete correct
// prose -- the guard-argues-with-correct-work failure this repo keeps recording. This script is the
// measurement behind that choice, and it is kept so the claim can be re-checked rather than quoted:
// re-run it before widening or narrowing the needle.
//
// Read-only. Anon key is enough; it takes the service key only because `climate` is a jsonb column
// and the anon role's 3s statement_timeout cannot complete the scan. It issues no write.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const STATE = (process.argv.find(a => a.startsWith("--state=")) || "--state=wa").split("=")[1];

// Every way the two words can appear.
const BROAD = /mountain[- ]?forecast/i;
// The BRAND. Hyphenated, or the domain. "mountain forecast" with a space is two ordinary words.
const BRAND = /\bmountain-forecast\b/i;
// Other commercial forecast sites, so the family is sized rather than assumed to be one site.
const OTHER = /\bwindy\.com|\bOpenSnow\b|\bmeteoblue\b|\bsnow-forecast\.com|\bWeatherSpark\b/i;

const rows = await selectAll("routes", "id,climate,areas!inner(name,path)",
  `areas.path=cd.usa.${STATE === "wa" ? "washington" : STATE}`, { pageSize: 500, key: requireServiceKey() });
if (rows.length < 1000) {
  console.error(`FAIL - ${rows.length} routes read. Refusing to report a needle's precision from a short read.`);
  process.exit(1);
}

const brand = [], prose = [], other = [];
let scanned = 0;
for (const r of rows) {
  const c = r.climate;
  if (!c || typeof c !== "object" || Array.isArray(c)) continue;
  for (const [k, v] of Object.entries(c)) {
    if (typeof v !== "string" || !v) continue;
    scanned++;
    if (OTHER.test(v)) other.push([r.id, k, v]);
    if (!BROAD.test(v)) continue;
    (BRAND.test(v) ? brand : prose).push([r.id, k, v]);
  }
}
if (!scanned) {
  console.error("FAIL - 0 climate string values scanned. Every count below would be vacuous.");
  process.exit(1);
}

console.log(`${rows.length} ${STATE} routes, ${scanned} climate string values\n`);
console.log(`broad /mountain[- ]?forecast/i   ${brand.length + prose.length}`);
console.log(`  the BRAND (hyphenated)         ${brand.length}   <- what NAMED matches`);
console.log(`  ordinary English               ${prose.length}   <- must NOT fire`);
console.log(`other commercial forecast sites  ${other.length}`);

console.log("\n#### ORDINARY ENGLISH - a broad needle would flag these, and every one is correct prose\n");
for (const [id, k, v] of prose) console.log(`  ${id}  climate.${k}\n     ${JSON.stringify(v)}\n`);

if (other.length) {
  console.log("\n#### OTHER COMMERCIAL SITES - NAMED does not cover these yet\n");
  for (const [id, k, v] of other) console.log(`  ${id}  climate.${k}\n     ${JSON.stringify(v)}\n`);
}

// The load-bearing assertion: the narrow needle must separate the two populations cleanly. If a
// future catalog puts the brand inside a sentence the narrow needle cannot reach, or makes the
// broad needle stop over-matching, the choice recorded in audit-prose-citations.mjs no longer has
// this measurement behind it and should be re-made rather than inherited.
if (!brand.length) {
  console.error("\nFAIL - the brand needle matches nothing. Either the class is closed (delete the "
    + "NAMED entry and this script) or the needle has stopped working. Check before assuming.");
  process.exit(1);
}
console.log(`\nok - the hyphen separates ${brand.length} citations from ${prose.length} ordinary uses.`);
