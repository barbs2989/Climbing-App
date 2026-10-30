#!/usr/bin/env node
// Systems where 2+ sub-areas were researched INDEPENDENTLY and came back with the SAME window, and
// that still have sub-areas with no season. Those are candidates to extend the window to (a reviewer
// reads each list; a fingerprint alone authorises nothing). Only rounds' research files count as
// independent: a propagated write (apply-p*.json) is not evidence. No DB.
//   node scripts/oneoff/season-agreeing-systems.mjs --cache <areas.json>
import fs from "fs";

const rows = JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf("--cache") + 1], "utf8"));
const byId = new Map(rows.map(a => [a.id, a]));
const researched = new Map(), written = new Set(rows.filter(a => Array.isArray(a.season_months) && a.season_months.length).map(a => a.id));
for (const f of fs.readdirSync("audits/season").filter(f => /^apply-.*\.json$/.test(f))) for (const [id, e] of Object.entries(JSON.parse(fs.readFileSync("audits/season/" + f, "utf8")))) {
  written.add(id);
  if (!/^apply-p/.test(f)) researched.set(id, JSON.stringify(e.season_months));
}
for (const id of (fs.existsSync("audits/season/cleared.json") ? JSON.parse(fs.readFileSync("audits/season/cleared.json", "utf8")) : [])) written.delete(id); // cleared since (season-clear-system.mjs)
const units = new Set(JSON.parse(fs.readFileSync("audits/season/parents.json", "utf8")).map(e => e.id));
const sys = new Map();
for (const [id, w] of researched) { const p = byId.get(id)?.parent_id; if (!p) continue; const e = sys.get(p) || []; e.push([id, w]); sys.set(p, e); }
for (const [sid, list] of sys) {
  const s = byId.get(sid); if (!s || ["state", "country"].includes(s.area_type)) continue;
  const wins = new Set(list.map(x => x[1]));
  if (list.length < 2 || wins.size !== 1) continue;
  const open = rows.filter(a => a.parent_id === sid && !written.has(a.id) && units.has(a.id));
  if (!open.length && written.has(sid)) continue;
  console.log(`\n${sid} | ${s.name} (${s.region}) — ${list.length} agree on ${[...wins][0]}: ${list.map(x => byId.get(x[0]).name).join("; ")}${written.has(sid) ? "" : "  [system itself open]"}`);
  for (const a of open) console.log(`  open: ${a.id} | ${a.name}`);
}
