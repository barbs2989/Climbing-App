// RE-READ variant: reader outputs reread/rg_NN.json -> research/in/tNNN.json (same grouping as mkresearch.mjs).
// ~10 contradictions per file, each carrying the full current row. Also prints coverage.
import fs from "node:fs";
const T = new URL("../../../audits/wa-contradictions-pass2", import.meta.url).pathname;
const R = Object.fromEntries(JSON.parse(fs.readFileSync(`${T}/wa-routes.json`)).map(r => [r.id, r]));
const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
// --skip <ids.json>: routes whose contradictions a finished research file already handled
const si = process.argv.indexOf("--skip"), SKIP = new Set(si > 0 ? JSON.parse(fs.readFileSync(process.argv[si + 1])) : []);
const reads = fs.readdirSync(`${T}/reread`).filter(f => /^rg_\d+\.json$/.test(f) && (!only || only.test(f)));
const seen = new Set(), items = [];
let bad = 0;
for (const f of reads) {
  let j; try { j = JSON.parse(fs.readFileSync(`${T}/reread/${f}`)); } catch (e) { console.log("UNPARSEABLE", f); bad++; continue; }
  for (const r of j.routes || []) {
    seen.add(r.id);
    const cs = (r.contradictions || []).filter(c => c.needs_research !== false || c.internal_resolution);
    if (cs.length && R[r.id] && !SKIP.has(r.id)) items.push({ id: r.id, area: R[r.id].area_id, contradictions: cs });
  }
}
const exp = new Set();
for (const b of fs.readdirSync(`${T}/batches`)) {
  if (!/^b\d{3}\.json$/.test(b)) continue;
  const g = Math.floor((+b.slice(1, 4) - 301) / 7);
  if (+b.slice(1, 4) < 301 || (only && !only.test(`rg_${String(g).padStart(2, "0")}.json`))) continue;
  for (const blk of JSON.parse(fs.readFileSync(`${T}/batches/${b}`))) for (const x of blk.routes) exp.add(x.route.id);
}
const missing = [...exp].filter(i => !seen.has(i));
console.log(`reader files ${reads.length} (bad ${bad}); routes read ${seen.size}/${exp.size}; missing ${missing.length}`, missing.slice(0, 20));
items.sort((a, b) => a.area.localeCompare(b.area));
const files = []; let cur = [], n = 0;
for (const it of items) {
  if (cur.length && n + it.contradictions.length > 10 && cur[cur.length - 1].area !== it.area) { files.push(cur); cur = []; n = 0; }
  cur.push({ ...it, route: R[it.id] ? Object.fromEntries(Object.entries(R[it.id]).filter(([k, v]) => v != null && !["gpx", "elev_pts", "name_search", "data_quality"].includes(k))) : null });
  n += it.contradictions.length;
}
if (cur.length) files.push(cur);
fs.mkdirSync(`${T}/research/in`, { recursive: true }); fs.mkdirSync(`${T}/research/out`, { recursive: true });
const start = +(process.argv[3] || 1);
files.forEach((f, i) => fs.writeFileSync(`${T}/research/in/t${String(start + i).padStart(3, "0")}.json`, JSON.stringify(f, null, 1)));
const total = items.reduce((a, b) => a + b.contradictions.length, 0);
const sev = {}; for (const it of items) for (const c of it.contradictions) sev[c.severity] = (sev[c.severity] || 0) + 1;
console.log(`routes with contradictions ${items.length}; contradictions ${total}`, sev, `-> research files t${String(start).padStart(3, "0")}..t${String(start + files.length - 1).padStart(3, "0")}`);
