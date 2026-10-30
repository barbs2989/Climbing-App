#!/usr/bin/env node
// SYSTEM-mode research (BRIEF-SYSTEM.md) -> an area-page-apply batch. A system's window is written
// to the system area itself and to each sub-area the researcher listed in applies_to; a sub-area's
// own_windows entry is written when it carries 2+ sources. Same bar as season-research-to-batch:
// high/medium, months present, 2+ source URLs. Every area written is added to attempted.json;
// the rest stay open for unit mode (season-next-batch).
// Names and regions for _expect come from the census cache (read off the database), never the agent.
//   node scripts/oneoff/season-systems-to-batch.mjs --cache <areas.json> --out audits/season/apply-sNN.json research-sNNa.json ...
import fs from "fs";

const args = process.argv.slice(2);
const val = k => args[args.indexOf(k) + 1];
const out = val("--out"), cache = val("--cache");
const files = args.filter((a, i) => !["--out", "--cache"].includes(a) && !["--out", "--cache"].includes(args[i - 1]));
const byId = new Map(JSON.parse(fs.readFileSync(cache, "utf8")).map(a => [a.id, a]));
const att = "audits/season/attempted.json";
const done = new Set(fs.existsSync(att) ? JSON.parse(fs.readFileSync(att, "utf8")) : []);
const months = m => Array.isArray(m) ? [...new Set(m.map(Number))].filter(x => Number.isInteger(x) && x >= 1 && x <= 12).sort((a, b) => a - b) : [];
const urls = s => (s || []).filter(u => /^https?:\/\//.test(u));
const batch = {}, held = [];
const put = (id, m, why) => {
  const a = byId.get(id);
  if (!a) { held.push(`${id}: not in the census cache (${why})`); return; }
  batch[id] = { _expect: { name: a.name, region: a.region }, season_months: m };
};
for (const f of files) for (const [sid, r] of Object.entries(JSON.parse(fs.readFileSync(f, "utf8")))) {
  const m = months(r.season_months);
  const ok = m.length && ["high", "medium"].includes(r.confidence) && urls(r.sources).length >= 2;
  const kids = [...byId.values()].filter(a => a.parent_id === sid).map(a => a.id);
  if (!ok) { held.push(`SYSTEM ${sid} (${r.confidence}): ${r.note || ""}`); }
  else {
    put(sid, m, "system");
    for (const id of r.applies_to || []) { if (kids.includes(id)) put(id, m, "applies_to"); else held.push(`${id}: listed under ${sid} but is not its child`); }
  }
  for (const [id, w] of Object.entries(r.own_windows || {})) {
    const om = months(w.season_months);
    if (kids.includes(id) && om.length && urls(w.sources).length >= 2) put(id, om, "own window");
    else held.push(`${id}: own window under ${sid} not confirmed`);
  }
  for (const [id, why] of Object.entries(r.excluded || {})) if (!batch[id]) held.push(`${id} excluded from ${sid}: ${why}`);
}
// Only what is written is marked done: an excluded or unconfirmed sub-area stays open for unit mode.
for (const id of Object.keys(batch)) done.add(id);
fs.writeFileSync(out, JSON.stringify(batch, null, 1));
fs.writeFileSync(att, JSON.stringify([...done].sort(), null, 1));
console.log(`${Object.keys(batch).length} areas -> ${out}; ${held.length} held:`);
for (const h of held) console.log("  · " + h.slice(0, 220));
