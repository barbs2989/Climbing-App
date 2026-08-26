#!/usr/bin/env node
// `pitches` says how many pitches a route has. `pitch_detail` lists them. Two records of one fact,
// written by different passes — does anything compare them?
//
// check:pitch-split proves a pitch_detail ENTRY reaches the section that describes it; nothing
// asks whether the COUNT agrees. A route whose header says "5p" above a table of eight rows is
// stating two different things on one screen, which is the shape #1203 had when the Profile and
// the Logbook counted one list differently.
//
// CLAUDE.md records that pitch_detail holds STAGES on walk-ups, so a mismatch there is expected
// and is not the question — this looks at roped routes.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,pitches,pitch_detail,discipline,grade",
  "pitch_detail.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

const entries = (d) => (Array.isArray(d) ? d : (d && Array.isArray(d.pitches) ? d.pitches : []));
// Walk-ups store STAGES rather than pitches; the disciplines below are the roped ones where the
// two records genuinely describe the same thing.
const ROPED = new Set(["trad", "sport", "aid", "ice", "mixed", "alpine"]);

let compared = 0, agree = 0;
const off = [];
for (const r of rows) {
  const e = entries(r.pitch_detail);
  if (!e.length) continue;
  const p = Number(r.pitches);
  if (!Number.isFinite(p) || p <= 0) continue;
  if (!ROPED.has(String(r.discipline || "").toLowerCase())) continue;
  compared++;
  if (p === e.length) { agree++; continue; }
  off.push({ id: r.id, name: r.name, disc: r.discipline, says: p, lists: e.length, d: Math.abs(p - e.length) });
}

console.log(`${rows.length} routes carry pitch_detail; ${compared} are roped AND state a pitch count.`);
console.log(`${agree} agree; ${off.length} disagree (${((off.length / Math.max(1, compared)) * 100).toFixed(1)}%).\n`);
const bucket = new Map();
for (const x of off) bucket.set(x.d, (bucket.get(x.d) || 0) + 1);
/* THE DIRECTION IS THE WHOLE QUESTION, and mirrors audit:gain's one-sided test. A table that
   lists FEWER entries than the route has pitches is the ordinary case: a 26-pitch alpine route
   describing its five notable pitches is selective, not wrong, and CLAUDE.md already records that
   pitch_detail holds STAGES rather than pitches on walk-ups. A table listing MORE entries than the
   route claims to have is impossible — you cannot describe eight pitches on a five-pitch route. */
const fewer = off.filter((x) => x.lists < x.says);
const more = off.filter((x) => x.lists > x.says);
console.log(`  lists FEWER than stated (selective description — the ordinary case): ${fewer.length}`);
console.log(`  lists MORE than stated  (IMPOSSIBLE — the table describes pitches the route says it does not have): ${more.length}\n`);
if (more.length) {
  console.log("the impossible ones:");
  for (const x of more.sort((a, b) => b.d - a.d)) console.log(`   says ${String(x.says).padStart(3)}p, lists ${String(x.lists).padStart(3)}   ${x.id.padEnd(46)} ${x.disc}  ${x.name}`);
  console.log("");
}
console.log("by size of the gap:");
for (const [d, n] of [...bucket.entries()].sort((a, b) => a[0] - b[0])) console.log(`   off by ${String(d).padStart(3)} : ${n}`);
console.log("\nthe largest gaps:");
for (const x of off.sort((a, b) => b.d - a.d).slice(0, 20)) {
  console.log(`   says ${String(x.says).padStart(3)}p, lists ${String(x.lists).padStart(3)}   ${x.id.padEnd(46)} ${x.disc}`);
}
