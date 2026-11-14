#!/usr/bin/env node
// Turn season research files (audits/season/research-*.json, BRIEF.md shape) into an
// area-page-apply batch, keeping only what the brief calls confirmed: confidence high or medium,
// months present, and at least two source URLs. Every id researched (written or not) is added to
// audits/season/attempted.json so season-next-batch never hands it out again.
//   node scripts/oneoff/season-research-to-batch.mjs --out audits/season/apply-01.json audits/season/research-01a.json ...
// No DB; the applier asserts each id against _expect (name, region) before it writes.
import fs from "fs";

const args = process.argv.slice(2);
const oi = args.indexOf("--out"), out = args[oi + 1];
const files = args.filter((a, i) => i !== oi && i !== oi + 1);
const att = "audits/season/attempted.json";
const done = new Set(fs.existsSync(att) ? JSON.parse(fs.readFileSync(att, "utf8")) : []);
// The id's name and region come from the PICK (read off the database), never from the agent's echo.
const pick = new Map(fs.readdirSync("audits/season").filter(f => /^pick-\d+\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync("audits/season/" + f, "utf8"))).map(e => [e.id, e]));
const batch = {}, held = [];
for (const f of files) {
  for (const [id, r] of Object.entries(JSON.parse(fs.readFileSync(f, "utf8")))) {
    done.add(id);
    const m = Array.isArray(r.season_months) ? [...new Set(r.season_months.map(Number))].filter(x => Number.isInteger(x) && x >= 1 && x <= 12) : [];
    const srcs = (r.sources || []).filter(s => /^https?:\/\//.test(s));
    if (!m.length || !["high", "medium"].includes(r.confidence) || srcs.length < 2) { held.push(`${id} (${r.confidence}, ${srcs.length} src): ${r.note || ""}`); continue; }
    const p = pick.get(id);
    if (!p) { held.push(`${id}: not in any pick file`); continue; }
    batch[id] = { _expect: { name: p.name, region: p.region }, season_months: m.sort((a, b) => a - b) };
  }
}
fs.writeFileSync(out, JSON.stringify(batch, null, 1));
fs.writeFileSync(att, JSON.stringify([...done].sort(), null, 1));
console.log(`${Object.keys(batch).length} confirmed -> ${out}; ${held.length} held (not written):`);
for (const h of held) console.log("  · " + h.slice(0, 220));
