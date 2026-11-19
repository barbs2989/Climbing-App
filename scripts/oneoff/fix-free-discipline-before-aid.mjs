// A route with a free (YDS) grade and a free style is that style FIRST and aid SECOND
// (owner, 2026-11-18, on Stripe Rock's Valhalla: "a sport climb, the second option is aid").
//
// The Mountain Project import filed every route TYPED Aid under `discipline = 'aid'`, ahead of the
// trad / sport type the same row carries: Valhalla, a bolted 5.8 with one pulled move ("5.8 A0",
// typed Sport + Aid), drew the aid glyph in search and read "Aid · Sport" on its page.
//
// THE RULE, one row at a time:
//   discipline = 'aid', `grade` carries a YDS 5.x, grade_system = 'yds', and `disciplines` names a
//   free style  ->  that style becomes `discipline` (trad, then sport, then toprope, then alpine —
//   the importer's own order) and moves to the FRONT of `disciplines`; aid keeps its place behind it.
// Nothing else moves: `grade` already leads with the YDS grade, and grade_system / grade_num are
// already the free grade's.
//
// AN AID ROUTE WHOSE `disciplines` NAMES NO FREE STYLE (the list is empty or just ["aid"]) has
// nothing in the row to say trad or sport, and that is not something to guess. Its style is
// RESEARCHED instead: scripts/data/aid-route-free-style-research.json holds one verdict per route
// (trad / sport / toprope, or aid-only when the route has no free style), read from the route's
// own published type line. --styles applies those; a route with no verdict stays aid and is
// listed by --report.
//
//   node scripts/oneoff/fix-free-discipline-before-aid.mjs            dry run: counts + samples
//   node scripts/oneoff/fix-free-discipline-before-aid.mjs --apply    writes, paced, then re-reads
//   node scripts/oneoff/fix-free-discipline-before-aid.mjs --only id  one row (with or without --apply)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
import { gradeNumFor } from "../../lib/grade.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const ROLLBACK = path.join(HERE, "..", "data", "free-discipline-before-aid-rollback.json");

// --styles: also apply the researched verdicts (with or without --apply).
const STYLES = process.argv.includes("--styles") ? new Map(JSON.parse(fs.readFileSync(path.join(HERE, "..", "data", "aid-route-free-style-research.json"), "utf8")).map(x => [x.id, x.verdict])) : new Map();

const FREE = ["trad", "sport", "toprope", "alpine"];
const RESEARCHED = ["trad", "sport", "toprope"];
const YDS = /5\.\d/;

export function plan(r) {
  if (r.discipline !== "aid") return null;
  const list = Array.isArray(r.disciplines) ? r.disciplines : [];
  // The row's own list decides first; a researched style only fills a row that names none.
  const researched = STYLES.get(r.id);
  const primary = FREE.find(d => list.includes(d)) || (RESEARCHED.includes(researched) ? researched : null);
  if (!primary) return null;
  if (!YDS.test(String(r.grade || "")) || r.grade_system !== "yds") return null;
  const out = { discipline: primary, disciplines: [primary, ...(list.includes("aid") ? list : list.concat("aid")).filter(d => d !== primary)] };
  // grade_num was parsed under the aid scale while the row was aid ("5.9 A1" stored 1). Under its free
  // style the same string parses to the free grade; 21 of the 1,644 rows moved before this line existed
  // kept the aid number and were corrected by hand (2026-11-18).
  const num = gradeNumFor(r.grade, primary);
  if (num != null && num !== r.grade_num) out.grade_num = num;
  return out;
}

const key = requireServiceKey();
const SEL = "id,name,area_id,discipline,disciplines,grade,grade_system,grade_num,aid_grade";
const rows = await selectAll("routes", SEL, ONLY ? `id=eq.${encodeURIComponent(ONLY)}` : "discipline=eq.aid", { key, pageSize: 1000 });
const todo = [], left = [];
for (const r of rows) { const p = plan(r); if (p) todo.push({ r, p }); else left.push(r); }

const tally = {};
for (const { r, p } of todo) { const k = JSON.stringify(r.disciplines) + " -> " + JSON.stringify(p.disciplines); tally[k] = (tally[k] || 0) + 1; }
console.log(`${rows.length} routes with aid as the primary discipline`);
console.log(`${todo.length} have a free grade and a free style: that style goes first`);
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
const leftYds = left.filter(r => YDS.test(String(r.grade || "")));
console.log(`${left.length} left as aid: ${left.length - leftYds.length} with no free grade, ${leftYds.length} with a free grade but no free style on record`);
if (process.argv.includes("--report")) for (const r of leftYds) console.log(`  ${r.id}  [${r.grade}]  aid ${r.aid_grade || "-"}  ${JSON.stringify(r.disciplines)}`);

if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

// The rollback file is written BEFORE the first write, and appended to on a re-run, so it always
// holds every row's value from before this script touched it.
const prior = fs.existsSync(ROLLBACK) ? JSON.parse(fs.readFileSync(ROLLBACK, "utf8")) : [];
const had = new Set(prior.map(x => x.id));
fs.writeFileSync(ROLLBACK, JSON.stringify(prior.concat(todo.filter(t => !had.has(t.r.id)).map(({ r }) => ({ id: r.id, discipline: r.discipline, disciplines: r.disciplines, grade_num: r.grade_num }))), null, 0) + "\n");

let done = 0;
for (const { r, p } of todo) {
  // The filter repeats the precondition, so a row somebody changed since the read is not overwritten
  // (patchRow throws when it matched nothing).
  await patchRow("routes", r.id, p, { filter: "discipline=eq.aid" });
  if (++done % 50 === 0) console.log(`  ${done} / ${todo.length}`);
}

// A 200 is not evidence: read every row back and compare.
const ids = new Set(todo.map(t => t.r.id));
const after = (await selectAll("routes", SEL, ONLY ? `id=eq.${encodeURIComponent(ONLY)}` : `disciplines=cs.${encodeURIComponent('["aid"]')}`, { key, pageSize: 1000 })).filter(r => ids.has(r.id));
const byId = new Map(after.map(r => [r.id, r]));
let bad = 0;
for (const { r, p } of todo) { const a = byId.get(r.id); if (!a || a.discipline !== p.discipline || JSON.stringify(a.disciplines) !== JSON.stringify(p.disciplines) || (p.grade_num != null && a.grade_num !== p.grade_num)) { bad++; console.log(`  NOT AS WRITTEN: ${r.id} -> ${a ? a.discipline + " " + JSON.stringify(a.disciplines) : "missing"}`); } }
console.log(`${done} written, ${after.length} re-read, ${bad} not as written`);
process.exit(bad ? 1 : 0);
