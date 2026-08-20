#!/usr/bin/env node
// audit:silent-reverts — did a later commit DELETE something an earlier one added, without saying so?
//
// THE GAP IS STRUCTURAL AND `check:merge-survival` CANNOT REACH IT. That guard asks its question of
// a MERGE commit — "every identifier either parent introduced survives" — but PRs here land as
// SQUASH merges, so main's history contains no merge commit for them and the guard never runs on
// the thing that actually ships. The recorded incident is exactly that shape: #778 added a resolver
// plus three fixes, #776 was branched from PRE-#778 main, and its squash silently REVERTED all of
// it. Clean merge, no conflict, every check green, and main went back to shipping the bugs.
//
// So this asks from the other side: walk main's recent history, collect every DEFINITION a commit
// ADDED, and check whether it still exists at HEAD. Anything missing was added and later removed.
//
// A REMOVAL IS NOT A DEFECT — that distinction is the whole design. Code is deleted deliberately all
// the time, and an audit that reports every deletion is noise nobody reads. What separates the two
// is whether the commit that removed it was ABOUT it:
//   DELIBERATE — the removing commit's message or body names the thing, or the commit is small and
//                clearly about that area.
//   SILENT     — the thing vanished in a commit about something else entirely. That is the shape
//                worth reading, and the shape #776 had.
//
// Report-only. Read-only on git. Not a build gate: it is a property of HISTORY, not of the
// checkout, so no code change can cause or fix it — the same reasoning that keeps check:counts out.
//
// DO NOT "FIX" THE FALSE SILENTS WITH A RENAME TEST. Measured over 500 commits this reports 4 absent
// definitions, 3 of them SILENT and none a defect — all three are supersessions, which makes it
// tempting to excuse a removal whose commit ADDS a token sharing a significant word (listSlug ->
// routeInList share "list"; check-rappel-readers -> check-correction-readers share "readers").
// That rule would have EXCUSED #776, the incident this exists for: it removed crewMemberById and
// crewMemberUids while adding activeCrewMemberIds in the same commit, sharing "crew" and "member".
// Four items across 500 commits is a reading list, not noise. Leave it noisy and short.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const N = Number(arg("--commits", 80));
const REF = String(arg("--ref", "origin/main"));

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

/* Definitions worth tracking. Deliberately NARROW: each is a named, top-level thing whose silent
   loss is a real regression, and each is cheap to test for at HEAD. Widening this to every
   identifier would return a haystack — the mistake `audit:area-parents` records from its first
   draft, where 41 candidates held 12 real findings. */
const PATTERNS = [
  { kind: "guard-script", re: /^\+.*"(check:[a-z0-9:-]+)":\s*"node scripts\//gm, file: /package\.json$/ },
  { kind: "build-chain", re: /^\+.*node (scripts\/check-[a-z0-9-]+\.mjs)/gm, file: /package\.json$/ },
  { kind: "export-fn", re: /^\+\s*export function ([A-Za-z_$][\w$]*)\s*\(/gm, file: /\.(jsx?|mjs)$/ },
  { kind: "export-const", re: /^\+\s*export const ([A-Za-z_$][\w$]*)\s*=/gm, file: /\.(jsx?|mjs)$/ },
  { kind: "npm-script", re: /^\+\s*"(audit:[a-z0-9:-]+)":/gm, file: /package\.json$/ },
  /* THE EXPORTED-ONLY LIST COULD NOT HAVE CAUGHT THE INCIDENT THIS AUDIT EXISTS FOR, and only
     validating against real history showed it. #778's resolver was declared
     `const crewMemberById=useCallback(function(id){…})` INSIDE the App component — not exported,
     not top-level — so every pattern above walked straight past the one thing that was reverted.
     A component-scoped helper is exactly what a stale-base squash drops, because it is the kind of
     thing one PR adds and another's copy of the file never had. */
  { kind: "hook-const", re: /^\+\s*const ([A-Za-z_$][\w$]*)\s*=\s*use(?:Callback|Memo)\(/gm, file: /\.(jsx?|mjs)$/ },
  /* Capitalised only: a lowercase `function x(` is often a throwaway inner helper, while a
     capitalised one is a component or a named domain helper whose loss blanks a screen. */
  { kind: "fn-decl", re: /^\+\s*function ([A-Z][\w$]*)\s*\(/gm, file: /\.(jsx?|mjs)$/ },
];

const commits = git("rev-list", "--first-parent", `-n${N}`, REF).trim().split("\n").filter(Boolean);
if (!commits.length) { console.error(`FAIL — no commits from ${REF}; a broken walk, not a clean history.`); process.exit(1); }
const HEAD = commits[0];

/* HEAD's content, once. Testing presence by SEARCHING THE WHOLE TREE is both faster and more
   honest than re-deriving definitions: a thing that moved to another file has not been reverted.
   Read from disk in one pass rather than `git show` per file — that was ~1,500 subprocesses and
   took minutes. Requires the checkout to BE the ref, which is asserted below rather than assumed. */
/* Two presence backends, and the fast one is only correct when the checkout IS the ref.
   Reading from disk is one pass; `git show` per file was ~1,500 subprocesses and took minutes.
   When the ref is some other commit — which is how this gets VALIDATED against real history — fall
   back to `git grep` at that sha. Slower, and honest about which tree it asked. */
const headSha = git("rev-parse", "HEAD").trim();
const fastPath = headSha === HEAD;
let headBlob = "", present;
if (fastPath) {
  const headFiles = git("ls-files").trim().split("\n")
    .filter((f) => /\.(jsx?|mjs|json)$/.test(f) && !f.startsWith("node_modules"));
  for (const f of headFiles) { try { headBlob += readFileSync(join(ROOT, f), "utf8") + "\n"; } catch { /* gone */ } }
  if (headBlob.length < 100000) { console.error(`FAIL — read only ${headBlob.length} chars across ${headFiles.length} files; a broken read, not a small repo.`); process.exit(1); }
  present = (tok) => headBlob.includes(tok);
} else {
  console.log(`note: ${REF} (${HEAD.slice(0, 8)}) is not this checkout (${headSha.slice(0, 8)}) — asking git directly, which is slower.`);
  /* Fail closed: if git grep cannot find a token that certainly exists, the backend is broken and
     EVERY token would read as reverted. Probe with something the repo has always had. */
  const probe = (t) => { try { git("grep", "-q", "-F", t, HEAD, "--", "*.json", "*.jsx", "*.mjs", "*.js"); return true; } catch { return false; } };
  if (!probe("\"scripts\"")) { console.error(`FAIL — the git-grep backend found nothing at ${HEAD.slice(0, 8)}; nothing below was checked.`); process.exit(1); }
  const memo = new Map();
  present = (tok) => { if (!memo.has(tok)) memo.set(tok, probe(tok)); return memo.get(tok); };
}

const added = new Map(); // token -> {kind, sha, subject}
for (const sha of commits.slice().reverse()) {
  let diff = "";
  try { diff = git("show", "--unified=0", "--no-color", "--format=%s%n", sha); } catch { continue; }
  const subject = diff.split("\n")[0] || "";
  /* Split per-file so a pattern scoped to package.json cannot match a diff hunk from a .jsx. */
  const parts = diff.split(/^diff --git a\/(\S+) b\/\S+$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const path = parts[i], body = parts[i + 1] || "";
    for (const p of PATTERNS) {
      if (!p.file.test(path)) continue;
      p.re.lastIndex = 0;
      for (const m of body.matchAll(p.re)) added.set(m[1], { kind: p.kind, sha, subject });
    }
  }
}


const missing = [...added.entries()].filter(([tok]) => !present(tok));

console.log(`walked ${commits.length} first-parent commits of ${REF}`);
console.log(`${added.size} tracked definition(s) added in that window`);
console.log(`${missing.length} of them are ABSENT at HEAD\n`);

if (!missing.length) {
  console.log(`ok — nothing added in the last ${commits.length} commits has since vanished.`);
  console.log(`\nWhat this does NOT prove: that no BEHAVIOUR was reverted. It tracks named`);
  console.log(`definitions, not the bodies of functions — a merge that kept a name and dropped its`);
  console.log(`guard clause is invisible here. check:correction-readers exists for that shape.`);
  process.exit(0);
}

/* For each missing token, find the commit that removed it and judge whether that commit was ABOUT
   it. `git log -S` is expensive, so it runs only for the handful that are actually missing. */
let silent = 0;
for (const [tok, info] of missing) {
  let removedBy = "", removedSubject = "";
  try {
    const log = git("log", "--first-parent", "-S", tok, "--format=%H%x09%s", `${info.sha}..${HEAD}`).trim();
    const first = log.split("\n").filter(Boolean).pop();
    if (first) { const [h, ...rest] = first.split("\t"); removedBy = h; removedSubject = rest.join("\t"); }
  } catch { /* leave blank */ }

  /* Was the removing commit about this thing? The token itself appearing in its subject is the
     strongest signal; a bare name fragment is the weaker one. */
  const stem = tok.replace(/^(check|audit):/, "").replace(/^scripts\/|\.mjs$/g, "");
  const deliberate = removedSubject && (removedSubject.includes(tok) || removedSubject.toLowerCase().includes(stem.toLowerCase()));
  if (!deliberate) silent++;
  console.log(`${deliberate ? "  deliberate " : "  ** SILENT "}${info.kind.padEnd(13)} ${tok}`);
  console.log(`      added by  ${info.sha.slice(0, 8)}  ${info.subject.slice(0, 96)}`);
  console.log(`      removed   ${removedBy ? removedBy.slice(0, 8) : "(not found)"}  ${removedSubject.slice(0, 96)}`);
}

console.log(`\n${silent} of ${missing.length} vanished in a commit that does NOT name them — read those.`);
console.log(`A removal is not a defect. This separates "deleted on purpose" from "deleted by a merge`);
console.log(`that was about something else", which is the shape #776 had when it reverted #778.`);
