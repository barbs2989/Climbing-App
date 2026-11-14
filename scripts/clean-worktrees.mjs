// Remove the worktrees and local branches that finished work leaves behind.
//
// WHY: every session works in its own worktree under .claude/worktrees/, each with its own
// node_modules (~200-400 MB). Nothing removed them when their PR merged; on 2026-11-04 there were
// 85, holding 29 GB, 63 of them for PRs merged days or weeks earlier.
//
// WHAT IT REMOVES — a worktree only when EVERY one of these holds:
//   - its branch's PR is MERGED on GitHub (or the branch has no commits beyond origin/main);
//   - nothing is modified and nothing is untracked (a rollback record or research output is
//     exactly the kind of file that lives untracked, and may be the only copy);
//   - its index has not changed for 24 hours (a parallel session may be working in it now);
//   - it holds no git-IGNORED files beyond node_modules, dist, env files and .DS_Store
//     (catalog/_mp, a 3.7 GB crawl cache, is ignored — and is not rebuildable cheaply).
// ...then the local branches whose PR is merged and that no worktree still has checked out.
//
// Dry run by default; prints what it WOULD remove. `npm run clean:worktrees -- --apply` removes.
// Needs `gh` signed in. Deleted branches stay recoverable from the reflog and from GitHub.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const MIN_IDLE_HOURS = 24;
const DISPOSABLE = /^(node_modules|dist|\.env(\.local)?|supabase\/\.temp|(.*\/)?\.DS_Store)\/?$/;

const git = (args, cwd = ROOT) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

// The MAIN checkout's .git directory: run from inside a worktree, ROOT is that worktree.
const common = path.resolve(ROOT, git(["rev-parse", "--git-common-dir"]));
const mainRoot = path.dirname(common);
const wtDir = path.join(mainRoot, ".claude", "worktrees");

git(["fetch", "-q", "--prune", "origin"], mainRoot);
const prs = JSON.parse(execFileSync("gh", ["pr", "list", "--state", "all", "--limit", "2000", "--json", "headRefName,state"], { cwd: mainRoot, encoding: "utf8" }));
const merged = new Set(prs.filter((p) => p.state === "MERGED").map((p) => p.headRefName));
const hasPr = new Set(prs.map((p) => p.headRefName));

const worktrees = [];
let cur = null;
for (const line of git(["worktree", "list", "--porcelain"], mainRoot).split("\n")) {
  if (line.startsWith("worktree ")) worktrees.push((cur = { path: line.slice(9), branch: null }));
  else if (line.startsWith("branch ")) cur.branch = line.slice(7).replace("refs/heads/", "");
}

const removed = [], kept = [];
for (const w of worktrees) {
  if (!w.path.startsWith(wtDir + path.sep)) continue; // never the main checkout
  if (path.resolve(w.path) === ROOT) { kept.push([w.path, "this is the worktree running the script"]); continue; }
  const why = (() => {
    if (!fs.existsSync(w.path)) return null; // already gone; prune handles it
    const ahead = Number(git(["rev-list", "--count", "origin/main..HEAD"], w.path));
    if (!(w.branch && merged.has(w.branch)) && !(ahead === 0 && !(w.branch && hasPr.has(w.branch)))) return "PR not merged";
    const status = git(["status", "--porcelain", "--ignored"], w.path).split("\n").filter(Boolean);
    if (status.some((l) => !l.startsWith("!!"))) return "has modified or untracked files";
    const precious = status.map((l) => l.slice(3)).filter((f) => !DISPOSABLE.test(f));
    if (precious.length) return `holds ignored files: ${precious.slice(0, 3).join(", ")}`;
    const index = path.join(git(["rev-parse", "--absolute-git-dir"], w.path), "index");
    const idleH = (Date.now() - fs.statSync(index).mtimeMs) / 36e5;
    if (idleH < MIN_IDLE_HOURS) return `touched ${idleH.toFixed(0)}h ago`;
    return "";
  })();
  if (why === null) continue;
  if (why) { kept.push([w.path, why]); continue; }
  removed.push(w.path);
  if (APPLY) git(["worktree", "remove", "--force", w.path], mainRoot);
}
if (APPLY) git(["worktree", "prune"], mainRoot);

const inUse = new Set(worktrees.map((w) => w.branch).filter(Boolean));
const branches = git(["branch", "--format=%(refname:short)"], mainRoot).split("\n")
  .filter((b) => b && b !== "main" && merged.has(b) && !inUse.has(b));
if (APPLY && branches.length) git(["branch", "-D", ...branches], mainRoot);

const verb = APPLY ? "removed" : "would remove";
console.log(`clean:worktrees — ${verb} ${removed.length} worktree(s) and ${branches.length} merged local branch(es).`);
for (const p of removed) console.log(`  - ${path.basename(p)}`);
if (kept.length) console.log(`kept ${kept.length}:`);
for (const [p, why] of kept) console.log(`  = ${path.basename(p)} — ${why}`);
if (!APPLY && (removed.length || branches.length)) console.log("Run with --apply to remove them.");
