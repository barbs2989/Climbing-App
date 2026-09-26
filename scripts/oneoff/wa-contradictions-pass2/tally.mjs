// Totals across every research result and every applied patch, for the audit README.
import fs from "node:fs";
const T = new URL("../../../audits/wa-contradictions-pass2", import.meta.url).pathname;
const v = {}, routesFixed = new Set(), unresolved = [];
let results = 0, discovered = 0;
for (const f of fs.readdirSync(`${T}/research/out`)) {
  for (const r of JSON.parse(fs.readFileSync(`${T}/research/out/${f}`)).results) {
    results++; v[r.verdict] = (v[r.verdict] || 0) + 1; if (r.discovered) discovered++;
    if (r.verdict === "unresolved") unresolved.push(`${r.id}: ${r.fact}`);
  }
}
let patches = 0;
for (const f of fs.readdirSync(`${T}/applied`)) {
  if (f.includes("-dry")) continue;
  const j = JSON.parse(fs.readFileSync(`${T}/applied/${f}`));
  patches += j.applied.length; for (const a of j.applied) routesFixed.add(a.id);
}
let readRoutes = 0, found = 0;
for (const f of fs.readdirSync(`${T}/read`)) { const j = JSON.parse(fs.readFileSync(`${T}/read/${f}`)); for (const r of j.routes) { readRoutes++; found += (r.contradictions || []).length; } }
console.log(JSON.stringify({ readRoutes, contradictionsFound: found, researchResults: results, discovered, verdicts: v, patchesApplied: patches, routesFixed: routesFixed.size }, null, 1));
fs.writeFileSync(`${T}/unresolved.txt`, unresolved.join("\n") + "\n");
console.log("unresolved written:", unresolved.length);
