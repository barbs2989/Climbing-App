#!/usr/bin/env node
// SYSTEM mode (audits/season/BRIEF-SYSTEM.md): the next crag systems to research, from
// audits/season/systems.json (season-systems.mjs), each with its still-open units. Systems already
// handed out are listed in audits/season/systems-attempted.json. No DB.
//   node scripts/oneoff/season-next-systems.mjs --n 10 --round NN --cache <areas.json> [--skip id,id]
// writes audits/season/sys-NN.json and sys-NNa.txt / sys-NNb.txt (one block per system).
import fs from "fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const n = Number(opt("--n", 10)), round = opt("--round");
const skip = new Set((opt("--skip", "") || "").split(",").filter(Boolean));
const byId = new Map(JSON.parse(fs.readFileSync(opt("--cache"), "utf8")).map(a => [a.id, a]));
const done = new Set(fs.existsSync("audits/season/attempted.json") ? JSON.parse(fs.readFileSync("audits/season/attempted.json", "utf8")) : []);
const sdone = new Set(fs.existsSync("audits/season/systems-attempted.json") ? JSON.parse(fs.readFileSync("audits/season/systems-attempted.json", "utf8")) : []);
const units = JSON.parse(fs.readFileSync("audits/season/parents.json", "utf8"));
const pick = JSON.parse(fs.readFileSync("audits/season/systems.json", "utf8")).filter(s => !sdone.has(s.id) && !skip.has(s.id)).slice(0, n);
const out = pick.map(s => {
  const sa = byId.get(s.id) || {};
  const gp = sa.parent_id ? byId.get(sa.parent_id) : null;
  const subs = units.filter(u => { const a = byId.get(u.id); return a && a.parent_id === s.id && !["state", "country"].includes(u.type); })
    .map(u => ({ id: u.id, name: u.name, routes: u.uncovered, open: !done.has(u.id), lat: u.lat, lng: u.lng }));
  return { id: s.id, name: s.name, region: s.region, inside: gp ? gp.name : "", lat: sa.lat, lng: sa.lng, units: subs };
});
fs.writeFileSync(`audits/season/sys-${round}.json`, JSON.stringify(out, null, 1));
const block = s => [`SYSTEM ${s.id} | ${s.name} | ${s.region} | inside: ${s.inside} | ${s.lat == null ? "?" : s.lat.toFixed(3)},${s.lng == null ? "?" : s.lng.toFixed(3)}`,
  ...s.units.map(u => `  sub-area ${u.id} | ${u.name} | ${u.lat == null ? "?" : u.lat.toFixed(3)},${u.lng == null ? "?" : u.lng.toFixed(3)}`)].join("\n");
const half = Math.ceil(out.length / 2);
fs.writeFileSync(`audits/season/sys-${round}a.txt`, out.slice(0, half).map(block).join("\n\n") + "\n");
fs.writeFileSync(`audits/season/sys-${round}b.txt`, out.slice(half).map(block).join("\n\n") + "\n");
fs.writeFileSync("audits/season/systems-attempted.json", JSON.stringify([...sdone, ...out.map(s => s.id)].sort(), null, 1));
console.log(`systems round ${round}: ${out.length} systems, ${out.reduce((t, s) => t + s.units.filter(u => u.open).length, 0)} open units, ${out.reduce((t, s) => t + s.units.filter(u => u.open).reduce((x, u) => x + u.routes, 0), 0)} routes`);
for (const s of out) console.log("  " + s.id + " (" + s.units.length + " sub-areas)");
