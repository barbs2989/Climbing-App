// Apply migration 0251 to the LIVE database in pieces the SQL gateway can finish.
//
// Why: 0251 moves ~1,800 climbs, and three per-row triggers on routes (route counts, area disciplines,
// dominant discipline) make each move ~60 ms, so the one transaction outlasts `supabase db query`'s
// ~100-150 s gateway (524). The same statements run in self-contained transactions instead:
//   part 1  guards, merges, "Other Climbs" renames, re-parents      (APPLIED 2026-10-07)
// ALL OF 0251 APPLIED AND RECORDED 2026-10-07: this script is SPENT; re-running it fails the final guard harmlessly.
//   moves   the climb moves, 400 a call — idempotent (`where area_id = from_area`)
//   final   photos to keepers, area fill, deletes, renames, path fix, recount, verify, and RECORDS 0251
//           in supabase_migrations.schema_migrations so the merge to main does not replay it
// Each call is atomic; a failed one changes nothing and is safe to re-run. The final part refuses to
// run until every move has landed.
//
//   node scripts/oneoff/apply-0251-in-parts.mjs            # moves + final (part 1 is done)
//   node scripts/oneoff/apply-0251-in-parts.mjs --part1    # only on a database part 1 never ran on
//   node scripts/oneoff/apply-0251-in-parts.mjs --dry      # write the pieces to .scratch/0251/, run nothing
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const M = path.join(ROOT, "supabase/migrations/0251_fold_sort_label_duplicate_areas.sql");
const OUT = path.join(ROOT, ".scratch/0251");
const s = fs.readFileSync(M, "utf8");
const at = m => { const i = s.indexOf(m); if (i < 0) throw new Error("0251 no longer has the marker: " + m); return i; };
const setup = s.slice(at("begin;\n") + 7, at("-- every ancestor of every touched area"));
const recount = s.slice(at("-- every ancestor of every touched area"), at("do $$ declare n int; begin\n  -- An EMPTY database"));
const guard = s.slice(at("do $$ declare n int; begin\n  -- An EMPTY database"), at("-- 1. climbs stored on both sides"));
const step3 = s.slice(at("-- 3. move the rest"), at("-- 4. a climber"));
const reparent = step3.split("\n").find(l => l.startsWith("update areas a set parent_id"));
const pathLoop = s.slice(at("-- 7. path is set"), at("update areas set route_count"));
const tail = s.slice(at("-- 7. path is set"), s.lastIndexOf("commit;"));
const nMoves = (s.slice(at("create temp table m_move"), at("create temp table m_reparent")).match(/^\s+\('/gm) || []).length;
if (nMoves < 1000) throw new Error("could not count the planned moves: " + nMoves);

const part1 = `begin;\n${setup}${guard}${s.slice(at("-- 1. climbs stored on both sides"), at("-- 3. move the rest"))}${reparent}\ncommit;\n`;
const moves = [];
for (let i = 0; i < nMoves; i += 400) moves.push(`begin;\n${setup}set local catalog.allow_duplicate = 'on';
update routes r set area_id = m.to_area from m_move m
 where r.id = m.id and r.area_id = m.from_area and m.id in (select id from m_move order by id offset ${i} limit 400);
set local catalog.allow_duplicate = 'off';
commit;\n`);
const final = `begin;\n${setup}${pathLoop}${recount}do $$ declare n int; begin
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> ${nMoves} then raise exception '0251 final: only % of ${nMoves} climbs have moved — run the moves first', n; end if;
end $$;

${s.slice(at("-- 4. a climber"), at("-- 7. path is set"))}${tail}-- applied by hand in parts: record it, or the merge to main replays it
insert into supabase_migrations.schema_migrations (version, name)
values ('0251', 'fold_sort_label_duplicate_areas')
on conflict (version) do nothing;
commit;\n`;

const pieces = [...(process.argv.includes("--part1") ? [["part 1", part1]] : []), ...moves.map((p, i) => [`moves ${i + 1}/${moves.length}`, p]), ["final", final]];
fs.mkdirSync(OUT, { recursive: true });
pieces.forEach(([name, sql], i) => fs.writeFileSync(path.join(OUT, `${String(i + 1).padStart(2, "0")}-${name.replace(/\W+/g, "_")}.sql`), sql));
if (process.argv.includes("--dry")) { console.log(`wrote ${pieces.length} pieces to ${OUT}`); process.exit(0); }

for (const [i, [name]] of pieces.entries()) {
  const file = path.join(OUT, `${String(i + 1).padStart(2, "0")}-${name.replace(/\W+/g, "_")}.sql`);
  let out = "";
  for (let t = 0; t < 2 && !out.includes('"rows"'); t++) {
    try { out = execFileSync("npx", ["supabase", "db", "query", "--linked", "-f", file], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); console.log(`  ${name}: attempt ${t + 1} failed — ${out.replace(/\s+/g, " ").slice(0, 240)}`); }
  }
  if (!out.includes('"rows"')) {
    console.log(`STOPPED at ${name}. Nothing in it was committed unless the gateway timed out mid-commit (a 524):`);
    console.log("re-run this script; moves already made are skipped, and the final part checks every move first.");
    process.exit(1);
  }
  console.log(`${name}: ok`);
}
console.log("0251 applied and recorded. Next: npm run check:area-sort-labels && npm run check:counts");
