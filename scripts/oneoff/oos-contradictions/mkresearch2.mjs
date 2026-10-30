// Phase 2: reader outputs (p2/read/g*.json) -> research files (p2/research/in/rNNN.json), ~10 contradictions each,
// each carrying the snapshot row. Prints coverage against the batches.
import fs from "node:fs";
const T = new URL("../../../audits/oos-contradictions/p2", import.meta.url).pathname;
const R = Object.fromEntries(JSON.parse(fs.readFileSync(`${T}/p2-routes.json`)).map(r => [r.id, r]));
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
const reads = fs.readdirSync(`${T}/read`).filter(f => /^g\d+\.json$/.test(f) && (!only || only.test(f)));
const seen = new Set(), items = [];
for (const f of reads) {
  const j = JSON.parse(fs.readFileSync(`${T}/read/${f}`));
  for (const id of j.ids_read || []) seen.add(id);
  for (const r of j.routes || []) {
    seen.add(r.id);
    const cs = (r.contradictions || []).filter(c => c.needs_research !== false || c.internal_resolution);
    if (cs.length && R[r.id]) items.push({ id: r.id, area: R[r.id].area_id, contradictions: cs });
  }
}
console.log(`reader files ${reads.length}; routes read ${seen.size}/${Object.keys(R).length}`);
items.sort((a, b) => a.area.localeCompare(b.area));
const files = []; let cur = [], n = 0;
for (const it of items) {
  if (cur.length && n + it.contradictions.length > 10) { files.push(cur); cur = []; n = 0; }
  cur.push({ ...it, route: Object.fromEntries(Object.entries(R[it.id]).filter(([, v]) => v != null)) });
  n += it.contradictions.length;
}
if (cur.length) files.push(cur);
fs.mkdirSync(`${T}/research/in`, { recursive: true }); fs.mkdirSync(`${T}/research/out`, { recursive: true });
const start = +(process.argv[3] || 1);
files.forEach((f, i) => fs.writeFileSync(`${T}/research/in/r${String(start + i).padStart(3, "0")}.json`, JSON.stringify(f, null, 1)));
console.log(`routes with contradictions ${items.length}; contradictions ${items.reduce((a, b) => a + b.contradictions.length, 0)} -> r${start}..r${start + files.length - 1}`);
