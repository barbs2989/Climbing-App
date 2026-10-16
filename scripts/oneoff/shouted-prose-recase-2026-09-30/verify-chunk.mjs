// node verify-chunk.mjs N — checks out-N.json against in-N.json: same keys, and ONLY letter case changed.
import fs from "fs";
const n = process.argv[2];
const dir = new URL("./chunks/", import.meta.url);
const inp = JSON.parse(fs.readFileSync(new URL(`in-${n}.json`, dir)));
let out;
try { out = JSON.parse(fs.readFileSync(new URL(`out-${n}.json`, dir))); } catch (e) { console.log(`chunk ${n}: out file missing or not JSON — ${e.message}`); process.exit(1); }
const m = new Map(out.map(o => [o.k, o.run]));
const bad = [];
let changed = 0;
for (const r of inp) {
  const o = m.get(r.k);
  if (o == null) { bad.push(`missing ${r.k}`); continue; }
  if (o.toLowerCase() !== r.run.toLowerCase() || o.length !== r.run.length) { bad.push(`non-case edit ${r.k}: ${JSON.stringify(r.run.slice(0, 60))} -> ${JSON.stringify(o.slice(0, 60))}`); continue; }
  if (o !== r.run) changed++;
}
const extra = out.filter(o => !inp.some(r => r.k === o.k)).length;
console.log(`chunk ${n}: ${inp.length} runs, ${changed} recased, ${bad.length} problems, ${extra} extra keys`);
for (const b of bad.slice(0, 20)) console.log("  " + b);
process.exit(bad.length || extra ? 1 : 0);
