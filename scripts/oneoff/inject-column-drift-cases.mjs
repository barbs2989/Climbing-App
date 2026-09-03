#!/usr/bin/env node
// Injection cases for check:column-drift.
//
// The fault this guard reports lives in the DATABASE, and the guard cannot run DDL — so cases
// drive `--fixture`, which makes the live schema come from a file. The base fixture is the
// committed snapshot, so the whole harness runs OFFLINE and needs no credentials.
//
// Judged PER SECTION, never on the exit code: a mutation that adds a column also makes the
// fixture disagree with the snapshot, so section C fires too and every case would look alike
// from an exit status. Three cases must stay SILENT in the section they target.
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const snap = JSON.parse(fs.readFileSync("scripts/schema-snapshot.json", "utf8")).tables;
const base = () => JSON.parse(JSON.stringify(snap));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coldrift-"));

/* Copies the real migrations into a temp dir MINUS whatever main has that this tree does not
   already lack — i.e. it manufactures the stale tree rather than waiting to be run on one. On a
   checkout that is genuinely behind, nothing needs holding back and the note fires anyway. */
function heldBackMigrations() {
  const src = path.join("supabase", "migrations");
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "coldrift-mig-"));
  const all = fs.readdirSync(src).filter((f) => /^\d+.*\.sql$/.test(f)).sort();
  if (all.length < 20) { console.log("HARNESS BROKEN: fewer than 20 migrations to copy from"); process.exit(1); }
  const hold = new Set(all.slice(-2));           // the two newest — the shape a stale worktree has
  for (const f of all) if (!hold.has(f)) fs.copyFileSync(path.join(src, f), path.join(out, f));
  return out;
}

const CASES = [
  { name: "untracked-column", section: "A", expect: /crews\.zz_untracked/,
    why: "THE REAL DEFECT: a column applied to the live database that no migration describes",
    mutate: (s) => { s.crews.push("zz_untracked"); } },

  { name: "untracked-table", section: "A", expect: /zz_ghost_table/,
    why: "a whole table nothing in git creates — the same class one level up",
    mutate: (s) => { s.zz_ghost_table = ["id", "name"]; } },

  { name: "absent-column", section: "B", expect: /routes\.grade_num/,
    why: "a migration describes it and the live database does not have it — merged, never applied",
    mutate: (s) => { s.routes = s.routes.filter((c) => c !== "grade_num"); } },

  // KNOWN is EMPTY on a healthy tree — the one entry it ever held came out when #1347 landed the
  // missing migration and this guard went red by itself. So the declaration is supplied on the
  // command line: an assertion that can only run while the tree is unhealthy is not an assertion.
  { name: "stale-known", section: "KNOWN", expect: /KNOWN names "routes\.zz_declared"/,
    why: "a declared column that stops being live is a stale claim, and the list must not rot",
    args: ["--known", "routes.zz_declared=a column declared for this test"],
    mutate: () => {} },

  /* A STALE CHECKOUT IS A FACT THE GUARD CAN CHECK, and until 2026-09-03 it did not. A worktree
     stopped at 0174 while main carried 0175 reported `profiles.show_name` as described by
     nothing; cause 1 ("an open PR carries its migration") came back EMPTY because that PR had
     merged, which routes the reader to cause 2 — "write the migration" — for a migration that
     exists, under a number check:migrations would then reject. The note is ADVISORY and must not
     suppress the finding: a stale tree and a genuinely undescribed column can both be true. */
  { name: "stale-checkout", section: "A", expect: /THIS CHECKOUT IS BEHIND origin\/main/,
    why: "THE REAL EVENT: migrations exist on main and not in this tree, so a live column they create reads as described by nothing",
    args: () => ["--migrations", heldBackMigrations()],
    mutate: () => {} },

  // --- must stay SILENT ------------------------------------------------------------------
  /* `absent` rather than `expect: null`, because the plain silent test asks whether the section
     says FAIL — and this note carries no FAIL, so a spuriously-firing note would slip straight
     past it. The case has to name the thing that must not appear. */
  { name: "stale-note-on-a-current-tree", section: "A", absent: /THIS CHECKOUT IS BEHIND/,
    why: "the note must NOT fire when the checkout is level with main, or it is noise on every clean run",
    mutate: () => {} },

  { name: "view-is-not-a-table", section: "A", expect: null,
    why: "route_duplicate_names is a MATERIALIZED VIEW, created by `create view` — flagging it would tell an author to write a migration that already exists",
    mutate: () => {} },

  { name: "dropped-then-recreated", section: "A", expect: null,
    why: "0036 drops `crews` and re-creates it IN THE SAME FILE. Applying every CREATE and then every DROP wiped the table the file had just built and reported all ten of its columns as undescribed — check:rls records the identical defect from the policy side. Statement-order replay is what this pins.",
    mutate: () => {} },
];

let pass = 0; const fails = [];
for (const c of CASES) {
  const s = base(); c.mutate(s);
  const f = path.join(dir, `${c.name}.json`);
  fs.writeFileSync(f, JSON.stringify(s));
  let out = "";
  const extra = typeof c.args === "function" ? c.args() : (c.args || []);
  try { out = execFileSync("node", ["scripts/check-column-drift.mjs", "--fixture", f, ...extra], { encoding: "utf8" }); }
  catch (e) { out = String((e.stdout || "") + (e.stderr || "")); }

  // slice the section this case is about, so a finding in a NEIGHBOURING section cannot be
  // mistaken for the one under test
  const cut = (from, to) => {
    const i = out.indexOf(from); if (i < 0) return "";
    const j = to ? out.indexOf(to, i) : -1;
    return out.slice(i, j < 0 ? undefined : j);
  };
  const block = c.section === "A" ? cut("A. live schema", "\nB. ")
              : c.section === "B" ? cut("B. migration schema", "\nC. ")
              : c.section === "C" ? cut("C. the committed snapshot", "\ncheck:column-drift")
              : cut("KNOWN names", null) || out;
  if (!block && c.section !== "KNOWN") { fails.push(`${c.name}: section ${c.section} not found in output`); continue; }
  const fired = c.absent ? c.absent.test(block) : c.expect ? c.expect.test(block) : /\bFAIL\b/.test(block);
  const ok = c.absent ? !fired : c.expect ? fired : !fired;
  ok ? pass++ : fails.push(`${c.name}: section ${c.section} expected ${c.absent ? "NOT to name " + c.absent : c.expect ? "to name " + c.expect : "SILENCE"}, got:\n` +
        block.split("\n").filter((l) => l.trim()).slice(0, 6).map((l) => "        | " + l).join("\n"));
  console.log(`${ok ? "ok  " : "FAIL"}  ${c.name.padEnd(22)} [${c.section}]`);
  console.log(`        ${c.why}`);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass}/${CASES.length} cases behaved as specified.`);
if (fails.length) { console.log("\n" + fails.join("\n")); process.exit(1); }
