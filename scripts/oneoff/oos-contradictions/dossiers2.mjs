// Phase 2 batches: p2-routes.json grouped by area path into ~90k-char reader batches (nulls dropped).
import fs from "node:fs";
const T = new URL("../../../audits/oos-contradictions/p2", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(`${T}/p2-routes.json`)).map(r => Object.fromEntries(Object.entries(r).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length))));
R.sort((a, b) => (a.area_path || "").localeCompare(b.area_path || "") || a.id.localeCompare(b.id));
const batches = []; let cur = [], size = 0;
for (const r of R) { const s = JSON.stringify(r).length; if (cur.length && size + s > 90000) { batches.push(cur); cur = []; size = 0; } cur.push(r); size += s; }
if (cur.length) batches.push(cur);
fs.rmSync(`${T}/batches`, { recursive: true, force: true }); fs.mkdirSync(`${T}/batches`, { recursive: true });
batches.forEach((b, i) => fs.writeFileSync(`${T}/batches/b${String(i + 1).padStart(3, "0")}.json`, JSON.stringify(b, null, 1)));
console.log("routes", R.length, "batches", batches.length);
