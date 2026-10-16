// research/out/<f>.json -> research/patches-<f>.json, keeping only fixes with enough sources.
import fs from "node:fs";
const T = new URL("../../../audits/wa-contradictions-pass2", import.meta.url).pathname;
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(fs.readFileSync(`${T}/research/out/${f}.json`));
  const ok = r => (r.verdict === "fixed" && (r.sources || []).length >= 2) || (r.verdict === "fixed_internal_plus_one" && (r.sources || []).length >= 1);
  const ps = j.results.filter(ok).flatMap(r => (r.patches || []).map(p => ({ ...p, id: p.id || r.id, fact: r.fact, sources: r.sources })));
  const bad = j.results.filter(r => /^fixed/.test(r.verdict) && !ok(r));
  fs.writeFileSync(`${T}/research/patches-${f}.json`, JSON.stringify({ patches: ps }));
  const v = {}; for (const r of j.results) v[r.verdict] = (v[r.verdict] || 0) + 1;
  console.log(f, "results", j.results.length, JSON.stringify(v), "patches", ps.length, "under-sourced fixes dropped", bad.length);
}
