// Which contribute sub-keys hold a SMALL SET of repeated values, and are therefore a picker
// rather than a text box?
//
// This matters for the consensus loop, not for tidiness. The merge gate is `win.n>=3||wasEmpty`,
// so correcting a field that already has a value needs three contributors in ONE cluster. A
// picker clusters by construction — three people choosing the same option are byte-identical. Free
// prose does not: even with the case/whitespace tolerance check:consensus-clustering adds, three
// people never write the same sentence, so a prose field can FILL A BLANK and can never CORRECT
// anything.
//
// So the rule this measures against: offer a picker wherever the data already behaves like an
// enumeration, and keep text only where the fact is genuinely open-ended (a road description, a
// hospital name, an approach narrative).
//
// READ THE DATA BEFORE INVENTING OPTIONS. A hand-written option list that disagrees with the
// thousands of rows already stored would show a climber a set of choices none of which matches
// what is on screen — and the form would then be offering to replace correct data with an
// approximation of itself. Distinct-value counts and the top values are the evidence.

import { selectAll } from "../lib/supabase-env.mjs";

const COLS = {
  crowds: ["estimatePerSeason", "peakTraffic", "solitudeRating"],
  partner_requirements: ["experienceLevel", "fitnessSpec", "requiredSkills", "approachTime"],
  seasonal_guidance: ["optimalWindow"],
  emergency: ["sheriffDispatch", "rangerStation", "nearestHospital", "county", "notes"],
  approach_logistics: ["trailhead", "trailheadDirection"],
};

const rows = await selectAll("routes", "id," + Object.keys(COLS).join(","), "", { pageSize: 1000 });
if (!rows || !rows.length) {
  console.error("empty read — a zero-row result makes every column look unenumerable.");
  process.exit(1);
}
console.log(`${rows.length} routes read\n`);

for (const [col, keys] of Object.entries(COLS)) {
  const populated = rows.filter((r) => r[col] && typeof r[col] === "object");
  console.log(`=== ${col}  (${populated.length} routes populated)`);
  if (!populated.length) { console.log("   nothing stored\n"); continue; }
  for (const k of keys) {
    const vals = populated.map((r) => r[col][k]).filter((v) => v != null && String(v).trim() !== "");
    if (!vals.length) { console.log(`   ${k.padEnd(20)} 0 values`); continue; }
    const norm = vals.map((v) => String(v).trim().toLowerCase().replace(/\s+/g, " "));
    const counts = {};
    for (const v of norm) counts[v] = (counts[v] || 0) + 1;
    const distinct = Object.keys(counts).length;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    // The ratio is the signal: few distinct values over many rows is an enumeration wearing a
    // text box. Many distinct values over the same rows is genuinely open-ended prose.
    const ratio = (distinct / vals.length);
    const verdict = distinct <= 12 ? "PICKER" : ratio > 0.7 ? "prose" : "look";
    console.log(`   ${k.padEnd(20)} ${String(vals.length).padStart(5)} values, ${String(distinct).padStart(5)} distinct (${(ratio * 100).toFixed(0)}% unique)  ${verdict}`);
    for (const [v, n] of top) console.log(`        ${String(n).padStart(4)}x  ${v.slice(0, 96)}`);
  }
  console.log();
}
