// Settled rule: summitTimeHrs holding the car-to-car total is nulled ONLY when an approach or
// descent leg is also published (only then does the Planner count the walk twice). Strip any
// other summitTimeHrs -> null patch from a research output before it is applied.
import fs from "node:fs";
const T = new URL("../../../audits/wa-contradictions-pass2", import.meta.url).pathname;
const R = Object.fromEntries(JSON.parse(fs.readFileSync(`${T}/wa-routes.json`)).map(r => [r.id, r]));
for (const f of process.argv.slice(2)) {
  const p = `${T}/research/out/${f}.json`, j = JSON.parse(fs.readFileSync(p)); let n = 0;
  for (const r of j.results || []) {
    const t = R[r.id]?.timing || {};
    const leg = t.approachTimeHrs != null || t.descentTimeHrs != null;
    const keep = (r.patches || []).filter(q => !(!leg && q.column === "timing" && (q.path || []).join(".") === "summitTimeHrs" && q.value === null) && !(q.path || []).includes("_raw"));
    if (keep.length < (r.patches || []).length) { n += r.patches.length - keep.length; r.patches = keep; if (!keep.length) { r.verdict = "not_a_contradiction"; r.evidence = "[Held: no approach/descent leg published; settled convention.] " + r.evidence; } }
  }
  if (n) { fs.writeFileSync(p, JSON.stringify(j, null, 1)); console.log(f, "held summitTimeHrs nulls:", n); }
}
