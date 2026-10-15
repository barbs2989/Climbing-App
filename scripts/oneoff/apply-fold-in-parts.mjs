// Apply a generated catalog-fold migration (0294's shape) to the LIVE database in pieces the SQL gateway can finish.
//
// Why: `supabase db query` gives up after ~100 s (HTTP 524), and three per-row triggers on routes (route counts,
// area disciplines, dominant discipline) make each climb move ~60 ms, so 0294's 4,174 moves cannot run as one
// transaction there. 0251 met the same wall (scripts/oneoff/apply-0251-in-parts.mjs); this is that script made
// generic for the planner's migrations. Each piece is ONE transaction — a failed one changes nothing:
//   part 1   the guards (the tree is still the one the plan read), the merges, new areas / lifts / re-parents
//   moves    400 a call, idempotent (`where area_id = from_area`): a repeated or failed call is safe
//   final    refuses unless EVERY move has landed; then photos to keepers, area fill, deletes, renames, pins,
//            paths, recount, the migration's own end checks, and the RECORD — a plain insert, so a version
//            someone else took fails it (an `on conflict do nothing` once hid exactly that, 2026-10-14)
//
//   node scripts/oneoff/apply-fold-in-parts.mjs supabase/migrations/0294_….sql            # all pieces
//   node scripts/oneoff/apply-fold-in-parts.mjs supabase/migrations/0294_….sql --from=7   # resume at piece 7
//   node scripts/oneoff/apply-fold-in-parts.mjs supabase/migrations/0294_….sql --dry      # write .scratch/<ver>/ only
//
// Credentials: the linked project (`supabase/.temp`, symlinked from the main checkout into a worktree). It WRITES
// production: run it only for a migration whose single-transaction dry run, or a subset of it, was clean.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const M = path.resolve(ROOT, process.argv[2] || ""); if (!fs.existsSync(M)) { console.error("usage: apply-fold-in-parts.mjs <migration.sql> [--dry] [--from=N]"); process.exit(2); }
const s = fs.readFileSync(M, "utf8");
const ver = path.basename(M).slice(0, 4), name = path.basename(M, ".sql").slice(5);
const at = m => { const i = s.indexOf(m); if (i < 0) throw new Error(`${ver} has no marker: ${m}`); return i; };
const setup = s.slice(at("begin;\n") + 7, at("do $$ declare n int; begin\n  -- An EMPTY database"));
const guard = s.slice(at("do $$ declare n int; begin\n  -- An EMPTY database"), at("-- 1. one climb stored twice"));
const merges = s.slice(at("-- 1. one climb stored twice"), at("-- 2. a crag that lists"));
const step2 = s.slice(at("-- 2. a crag that lists"), at("-- 3. a climber's photo"));
const moveLine = step2.split("\n").find(l => l.startsWith("update routes r set area_id = m.to_area from m_move m"));
if (!moveLine) throw new Error(`${ver}: no move statement`);
const tail = s.slice(at("-- 3. a climber's photo"), s.lastIndexOf("commit;"));
const nMoves = (s.slice(at("create temp table m_move"), at("create temp table m_reparent")).match(/^\s+\('/gm) || []).length;
const BATCH = 400;
const part1 = `begin;\n${setup}${guard}${merges}${step2.replace(moveLine + "\n", "")}commit;\n`;
const moves = [];
for (let i = 0; i < nMoves; i += BATCH) moves.push(`begin;\n${setup}set local catalog.allow_duplicate = 'on';
update routes r set area_id = m.to_area from m_move m
 where r.id = m.id and r.area_id = m.from_area and m.id in (select id from m_move order by id offset ${i} limit ${BATCH});
set local catalog.allow_duplicate = 'off';
commit;\n`);
const final = `begin;\n${setup}do $$ declare n int; begin
  select count(*) into n from m_move m join routes r on r.id = m.id and r.area_id = m.to_area;
  if n <> ${nMoves} then raise exception '${ver} final: only % of ${nMoves} climbs have moved — run the moves first', n; end if;
end $$;
${tail}-- applied by hand in parts: recorded in the final transaction (a plain insert: a taken number fails it)
insert into supabase_migrations.schema_migrations (version, name) values ('${ver}', '${name}');
commit;\n`;
const OUT = path.join(ROOT, ".scratch", ver);
const pieces = [["part1", part1], ...moves.map((p, i) => [`moves${String(i + 1).padStart(2, "0")}`, p]), ["final", final]];
fs.mkdirSync(OUT, { recursive: true });
const fileOf = i => path.join(OUT, `${String(i + 1).padStart(2, "0")}-${pieces[i][0]}.sql`);
pieces.forEach(([, sql], i) => fs.writeFileSync(fileOf(i), sql));
if (process.argv.includes("--dry")) { console.log(`${ver}: ${nMoves} moves; wrote ${pieces.length} pieces to ${OUT}`); process.exit(0); }
const from = +(process.argv.find(a => a.startsWith("--from=")) || "--from=1").slice(7);
for (let i = from - 1; i < pieces.length; i++) {
  const t0 = Date.now();
  const r = spawnSync("npx", ["supabase", "db", "query", "--linked", "-f", fileOf(i)], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0 && /"rows": \[\]/.test(out);
  console.log(`${String(i + 1).padStart(2, "0")}/${pieces.length} ${pieces[i][0]}: ${((Date.now() - t0) / 1000).toFixed(0)} s ${ok ? "ok" : "FAILED"}`);
  if (!ok) { console.log(out.replace(/\s+/g, " ").slice(0, 600)); console.log(`stopped: nothing in piece ${i + 1} landed. Re-run with --from=${i + 1}`); process.exit(1); }
}
console.log(`${ver}: all ${pieces.length} pieces applied and recorded`);
