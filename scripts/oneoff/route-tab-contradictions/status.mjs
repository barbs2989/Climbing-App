// Pipeline status: reader groups done, research in/out, applied files.
import fs from "node:fs";
const T = new URL("../../../audits/route-tab-contradictions", import.meta.url).pathname;
const ls = d => (fs.existsSync(d) ? fs.readdirSync(d) : []);
const reads = ls(`${T}/read`).filter(f => /^g\d+\.json$/.test(f)).map(f => +f.slice(1, 4)).sort((a, b) => a - b);
const rin = ls(`${T}/research/in`).map(f => +f.slice(1, 4)).sort((a, b) => a - b);
const rout = ls(`${T}/research/out`).map(f => +f.slice(1, 4)).sort((a, b) => a - b);
const appliedLog = fs.existsSync(`${T}/applied.log`) ? fs.readFileSync(`${T}/applied.log`, "utf8").trim().split("\n").filter(Boolean) : [];
const applied = new Set(appliedLog.map(l => l.split(" ")[0]));
const researchedGroups = fs.existsSync(`${T}/researched-groups.txt`) ? fs.readFileSync(`${T}/researched-groups.txt`, "utf8").trim().split(/\s+/).map(Number) : [];
const range = a => { const out = []; let s = null, p = null; for (const x of a) { if (s == null) s = p = x; else if (x === p + 1) p = x; else { out.push(s === p ? `${s}` : `${s}-${p}`); s = p = x; } } if (s != null) out.push(s === p ? `${s}` : `${s}-${p}`); return out.join(","); };
console.log(`readers done ${reads.length}/95: ${range(reads)}`);
console.log(`reader groups already turned into research: ${range(researchedGroups.sort((a, b) => a - b))}`);
console.log(`research in ${rin.length}: ${range(rin)} | out ${rout.length}: ${range(rout)}`);
console.log(`applied ${applied.size}: ${range([...applied].map(x => +x.slice(1)).sort((a, b) => a - b))}`);
console.log(`research out not yet applied: ${rout.filter(n => !applied.has("r" + String(n).padStart(3, "0"))).map(n => "r" + String(n).padStart(3, "0")).join(" ")}`);
let fixes = 0; for (const l of appliedLog) fixes += +(l.split(" ")[1] || 0);
console.log(`patches applied total ${fixes}`);
