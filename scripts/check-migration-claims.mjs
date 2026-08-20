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

// WHICH PR IS THIS RUN FOR? Without this the guard fails EVERY open PR whenever any two
// collide, which is not what its own docs claim ("it fails both PRs, deliberately") and not
// what anyone wants: an author with no migration at all gets a red they did not cause and has
// to read a log to find that out. Observed on #1023, an accessibility fix adding no migration,
// red because #1016 and #1022 both claimed 0153.
//
// That is precisely the objection CLAUDE.md uses to keep check:counts OUT of the build —
// "whoever caused it is not who sees red" — so the same reasoning applies here.
//
// A collision between two OTHER PRs is still PRINTED, just not fatal for this run: the two
// PRs that actually collide each go red on their own runs, which is the documented behaviour.
// Losing the signal would be worse than the false red.
const selfPr = (() => {
  const explicit = (argv.find((a) => a.startsWith("--self=")) || "").split("=")[1];
  if (explicit) return Number(explicit);
  // pull_request runs check out refs/pull/N/merge.
  const m = /^refs\/pull\/(\d+)\//.exec(process.env.GITHUB_REF || "");
  if (m) return Number(m[1]);
  // Belt and braces: the event payload carries it too, and a future trigger might not set REF.
  try {
    const p = process.env.GITHUB_EVENT_PATH;
    if (p && fs.existsSync(p)) {
      const n = JSON.parse(fs.readFileSync(p, "utf8"))?.pull_request?.number;
      if (n) return Number(n);
    }
  } catch {}
  return null;
})();
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
let examined = 0; // how many open PRs were actually read — reported, never assumed
async function openPrMigrations() {
  if (injectPath) {
    // The fault lives on GitHub, not in the checkout, so the injection cases feed a fixture
    // instead of trying to open real pull requests. Same shape as check:counts --inject.
    const injected = JSON.parse(fs.readFileSync(injectPath, "utf8"));
    examined = injected.length;
    return injected;
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
  examined = prs.length;
  const out = [];
  // DRAFTS COUNT. They used to be skipped, and that made this guard blind exactly when it is
  // useful: a numbering collision is always still a draft at the moment it is worth catching,
  // and drafts merge routinely here. On 2026-08-09 #788 (draft) carried a 0120 that was already
  // on main and this printed "no open PR adds a migration" — a false statement about a set it
  // declined to look at. A person renumbering it is what fixed that, not this check.
  for (const pr of prs) {
    const files = await api(`/repos/${slug}/pulls/${pr.number}/files?per_page=300`);
    const migs = files.map((f) => f.filename).filter((f) => /^supabase\/migrations\/\d{4}_.*\.sql$/.test(f));
    if (migs.length) out.push({ number: pr.number, title: pr.title, files: migs });
  }
  return out;
}

const prs = await openPrMigrations();
if (!prs.length) { console.log(`check:migration-claims: ok — examined ${examined} open PR(s), including drafts; none adds a migration.`); process.exit(0); }

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

// A collision is FATAL for this run when this PR is one of the parties, and INFORMATIONAL
// otherwise. With no PR context at all (a local run, or a push) every collision is fatal —
// that is the right default for a hand audit, and it keeps the behaviour anyone has relied on.
const problems = [];   // fail the run
const others = [];     // print, do not fail
const mine = (prNumbers) => selfPr == null || prNumbers.includes(selfPr);
for (const [n, who] of [...claims.entries()].sort()) {
  // Two open PRs on the same number: whichever merges second breaks main's build.
  const distinctPrs = [...new Set(who.map((w) => w.pr.number))];
  if (distinctPrs.length > 1) {
    const msg = `  ${n} is claimed by ${distinctPrs.length} open PRs — whichever merges SECOND will break the build on main:\n` +
      who.map((w) => `      #${w.pr.number}  ${w.file}\n              ${w.pr.title}`).join("\n");
    (mine(distinctPrs) ? problems : others).push(msg);
    continue;
  }
  // A number already merged: this PR collides the moment it lands.
  // Skip when the merged file IS this PR's file (a PR that only edits an existing migration).
  const merged = onMain.get(n);
  if (merged && !who.some((w) => path.basename(w.file) === merged)) {
    const msg = `  ${n} is already on ${process.env.GITHUB_BASE_REF || "main"} as ${merged}, but #${who[0].pr.number} adds ${path.basename(who[0].file)}`;
    (mine(distinctPrs) ? problems : others).push(msg);
  }
}

// Print the other PRs' collisions whatever the verdict. Scoping the FAILURE must not become
// hiding the finding — that would turn a noisy guard into a blind one.
if (others.length) {
  console.log(`check:migration-claims: ${others.length} collision(s) between OTHER open PRs — not this run's problem, and each of those PRs is red on its own run:\n`);
  others.forEach((p) => console.log(p + "\n"));
}

if (problems.length) {
  console.error(`check:migration-claims FAILED — ${problems.length} migration number(s) claimed twice.\n`);
  problems.forEach((p) => console.error(p + "\n"));
  console.error("Renumber one of them to the next free number and push. Both PRs stay red until");
  console.error("that happens, which is the point: they cannot both merge as they are.\n");
  if (selfPr != null) console.error(`Scoped to #${selfPr}: only collisions this PR is party to fail its run.\n`);
  console.error("This is the check that was missing on 2026-08-09, when two PRs merged three");
  console.error("seconds apart on 0103 and blocked every deploy until one was renumbered.");
  process.exit(1);
}

const claimed = [...claims.keys()].sort().join(", ");
const verdict = selfPr == null
  ? "no number claimed twice (hand audit — every open PR in scope)"
  : `no collision involving #${selfPr}${others.length ? `, though ${others.length} other collision(s) are printed above` : ""}`;
console.log(`check:migration-claims: ok — examined ${examined} open PR(s) including drafts; ${prs.length} add migrations (${claimed}); ${verdict}.`);

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
// 6) SCOPING. `--self=N` stands in for the PR context CI supplies via GITHUB_REF, so the
//    scoping is testable without opening pull requests:
//      a) collision between #1 and #2, run as --self=3  -> PASSES, and PRINTS the collision.
//         This is the #1023 case: an unrelated PR must not go red for someone else's clash.
//      b) the same fixture run as --self=1               -> FAILS. A party to the collision
//         must still be told, or scoping would have turned a real guard off.
//      c) the same fixture with NO --self                -> FAILS, the hand-audit default.
//    (a) and (c) are the pair that matters: either alone is satisfied by a broken
//    implementation — always-pass satisfies (a), always-fail satisfies (b) and (c).
// 5) DRAFT PRs are in scope, and --inject cannot test it (injection bypasses the API path
//    where the draft filter lived). Measured against the live repo instead, on the same day:
//      before: "ok — no open PR adds a migration."          <- #788 is a draft adding 0122
//      after : "examined 4 open PR(s) including drafts; 1 add migrations (0122)"
//    If that distinction ever needs re-proving, run the old copy from git and diff the line.
