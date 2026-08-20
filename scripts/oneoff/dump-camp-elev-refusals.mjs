// What is actually LEFT after solve-camp-elevations.mjs? Read the refusals before deciding they
// need research: the 86 "no OSM feature near the peak" may be unmapped places, or may be names
// the search was asking wrongly.
import fs from "fs";
const F = "camp-elevation-proposals.json";
if (!fs.existsSync(F)) { console.log(`FAIL: ${F} not found — run solve-camp-elevations.mjs first`); process.exit(1); }
const { solved, refused } = JSON.parse(fs.readFileSync(F, "utf8"));
if (!Array.isArray(refused) || !refused.length) { console.log("FAIL: no refusals recorded"); process.exit(1); }

const want = process.argv[2] || "no feature";
const hits = refused.filter((r) => r.why.includes(want)).sort((a, b) => b.rows - a.rows);
console.log(`solved ${solved.length} name(s); refused ${refused.length}\n`);
console.log(`refusals matching "${want}": ${hits.length}, covering ${hits.reduce((a, x) => a + x.rows, 0)} rows\n`);
hits.slice(0, 60).forEach((r) => console.log(`   ${String(r.rows).padStart(3)}  ${r.name.slice(0, 92)}`));
