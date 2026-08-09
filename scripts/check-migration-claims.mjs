// Two OPEN pull requests must never claim the same migration number.
//
// check:migration-numbers already refuses two files sharing a number IN THE CHECKOUT, and it
// runs inside `npm run build`, so it gates every PR. It cannot see the failure that actually
// happens, because at the moment either PR is written there is no duplicate to find: each
// branch holds exactly one 0103, and the collision only comes into existence when the second
// one merges. By then the damage is done on main.
//
// That is not hypothetical. On 2026-08-09, #728 (0103_profile_discoverable) and
// #727 (0103_merge_mount_index_duplicates) merged THREE SECONDS APART. Both were green.
// check:migration-numbers is inside `npm run build`, so the tip of main stopped building and
// EVERY DEPLOY WAS BLOCKED until the file was renumbered in #737. Production sat behind for
// ~25 minutes. Later the same day #752 and #753 both claimed 0108 AND 0109; that one was
// survived only because somebody happened to look and renumbered by hand.
//
// The recorded lesson at the time was "checking open PRs before numbering is not sufficient,
// because the other PR may not be open yet" — true, and it is an argument for checking at
// MERGE time rather than at authoring time. That is what this does: it re-asks the question
// on every PR run, against whatever is open right now.
//
//   node scripts/check-migration-claims.mjs
//   node scripts/check-migration-claims.mjs --inject=fixture.json     (see the bottom)
//
// Not in `npm run build`: it needs the network and a token, and a local build must not
// depend on either. Wired into build-check.yml as its own job so a failure reads as
// "Migration numbers are unclaimed" rather than hiding inside a build log.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const injectPath = (argv.find((a) => a.startsWith("--inject=")) || "").split("=")[1];

const die = (msg) => { console.error(msg); process.exit(1); };
const numOf = (p) => { const m = path.basename(p).match(/^(\d{4})_/); return m ? m[1] : null; };

// ---- what is already on main -------------------------------------------------------
const DIR = path.join(process.cwd(), "supabase", "migrations");
if (!fs.existsSync(DIR)) { console.log("check:migration-claims: no supabase/migrations directory — nothing to check"); process.exit(0); }
// Compare against the MERGE BASE, not the working tree: on a PR the checkout already
// contains this branch's own new migration, and counting that as "already on main" would
// make every PR collide with itself.
let mainFiles = [];
try {
  const base = process.env.GITHUB_BASE_REF || "main";
  const ref = execFileSync("git", ["rev-parse", "--verify", `origin/${base}`], { encoding: "utf8" }).trim();
  mainFiles = execFileSync("git", ["ls-tree", "--name-only", `${ref}:supabase/migrations`], { encoding: "utf8" })
    .split("\n").map((s) => s.trim()).filter((s) => s.endsWith(".sql"));
} catch {
  // Fall back to the working tree rather than skipping. A cross-PR duplicate is still
  // detectable without knowing main; only the "already merged" half is lost, and that half
  // is what check:migration-numbers covers anyway.
  mainFiles = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql"));
}
const onMain = new Map();
for (const f of mainFiles) { const n = numOf(f); if (n) onMain.set(n, f); }

// ---- what the open PRs claim --------------------------------------------------------
async function openPrMigrations() {
  if (injectPath) {
    // The fault lives on GitHub, not in the checkout, so the injection cases feed a fixture
    // instead of trying to open real pull requests. Same shape as check:counts --inject.
    return JSON.parse(fs.readFileSync(injectPath, "utf8"));
  }
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || (() => {
    try { return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim(); } catch { return ""; }
  })();
  // FAIL CLOSED. A checker that shrugs when it cannot read is a checker that reports
  // "no collisions" for a repository it never looked at — the exact false pass this guard
  // exists to prevent, and the reason check:counts refuses an empty read.
  if (!token) die("check:migration-claims FAILED — no GitHub token (GH_TOKEN/GITHUB_TOKEN or `gh auth login`).\nNothing was checked, so this is a failure rather than a pass.");

  let slug = process.env.GITHUB_REPOSITORY;
  if (!slug) {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (!m) die(`check:migration-claims FAILED — could not work out the repo from origin (${url}).`);
    slug = m[1];
  }
  const api = async (p) => {
    const r = await fetch(`https://api.github.com${p}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "check-migration-claims" },
    });
    if (!r.ok) die(`check:migration-claims FAILED — GitHub API ${r.status} for ${p}. Nothing was checked.`);
    return r.json();
  };
  const prs = await api(`/repos/${slug}/pulls?state=open&per_page=100`);
  const out = [];
  for (const pr of prs) {
    if (pr.draft) continue;
    const files = await api(`/repos/${slug}/pulls/${pr.number}/files?per_page=300`);
    const migs = files.map((f) => f.filename).filter((f) => /^supabase\/migrations\/\d{4}_.*\.sql$/.test(f));
    if (migs.length) out.push({ number: pr.number, title: pr.title, files: migs });
  }
  return out;
}

const prs = await openPrMigrations();
if (!prs.length) { console.log("check:migration-claims: ok — no open PR adds a migration."); process.exit(0); }

// ---- who claims what ------------------------------------------------------------------
const claims = new Map(); // number -> [{pr, file}]
for (const pr of prs) {
  for (const f of pr.files) {
    const n = numOf(f);
    if (!n) continue;
    if (!claims.has(n)) claims.set(n, []);
    claims.get(n).push({ pr, file: f });
  }
}

const problems = [];
for (const [n, who] of [...claims.entries()].sort()) {
  // Two open PRs on the same number: whichever merges second breaks main's build.
  const distinctPrs = [...new Set(who.map((w) => w.pr.number))];
  if (distinctPrs.length > 1) {
    problems.push(`  ${n} is claimed by ${distinctPrs.length} open PRs — whichever merges SECOND will break the build on main:\n` +
      who.map((w) => `      #${w.pr.number}  ${w.file}\n              ${w.pr.title}`).join("\n"));
    continue;
  }
  // A number already merged: this PR collides the moment it lands.
  // Skip when the merged file IS this PR's file (a PR that only edits an existing migration).
  const merged = onMain.get(n);
  if (merged && !who.some((w) => path.basename(w.file) === merged)) {
    problems.push(`  ${n} is already on ${process.env.GITHUB_BASE_REF || "main"} as ${merged}, but #${who[0].pr.number} adds ${path.basename(who[0].file)}`);
  }
}

if (problems.length) {
  console.error(`check:migration-claims FAILED — ${problems.length} migration number(s) claimed twice.\n`);
  problems.forEach((p) => console.error(p + "\n"));
  console.error("Renumber one of them to the next free number and push. Both PRs stay red until");
  console.error("that happens, which is the point: they cannot both merge as they are.\n");
  console.error("This is the check that was missing on 2026-08-09, when two PRs merged three");
  console.error("seconds apart on 0103 and blocked every deploy until one was renumbered.");
  process.exit(1);
}

const claimed = [...claims.keys()].sort().join(", ");
console.log(`check:migration-claims: ok — ${prs.length} open PR(s) add migrations (${claimed}), no number claimed twice.`);

// ---- injection cases (the fault lives on GitHub, so they are driven by --inject) -------
// 1) two PRs, same number -> FAILS naming both PR numbers:
//      [{"number":1,"title":"A","files":["supabase/migrations/0999_a.sql"]},
//       {"number":2,"title":"B","files":["supabase/migrations/0999_b.sql"]}]
// 2) one PR claiming a number already on main -> FAILS naming the merged file:
//      [{"number":1,"title":"A","files":["supabase/migrations/0001_x.sql"]}]
// 3) two PRs, different numbers -> passes:
//      [{"number":1,"title":"A","files":["supabase/migrations/0998_a.sql"]},
//       {"number":2,"title":"B","files":["supabase/migrations/0999_b.sql"]}]
// 4) no token and no --inject -> FAILS ("nothing was checked"), never a silent pass.
