// Print the recased text for one route id: node preview.mjs <id>
import fs from "fs";
const dir = new URL("./", import.meta.url);
const id = process.argv[2];
const uniq = JSON.parse(fs.readFileSync(new URL("uniq.json", dir)));
const idx = new Map(uniq.map((s, i) => [s, i]));
const targets = JSON.parse(fs.readFileSync(new URL("targets.json", dir))).filter(t => t.id === id);
const runs = [];
for (const f of fs.readdirSync(new URL("chunks/", dir)).filter(f => /^in-\d+\.json$/.test(f))) {
  const n = f.match(/\d+/)[0];
  const out = new Map(JSON.parse(fs.readFileSync(new URL(`chunks/out-${n}.json`, dir))).map(o => [o.k, o.run]));
  for (const r of JSON.parse(fs.readFileSync(new URL(`chunks/${f}`, dir)))) runs.push([r.k, r.run, out.get(r.k)]);
}
for (const t of targets) {
  const si = idx.get(t.s);
  let s = t.s;
  for (const [k, old, o] of runs.filter(r => +r[0].split(":")[0] === si)) { const i = +k.split(":")[1]; s = s.slice(0, i) + o + s.slice(i + old.length); }
  s = s.replace(/([a-z])([À-ÖØ-Þ]+)(?=[a-z])/g, (m, a, b) => a + b.toLowerCase());
  console.log(`── ${t.where}\n${s}\n`);
}
