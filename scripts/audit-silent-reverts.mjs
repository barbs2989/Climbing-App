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
//
// IT ALSO TRACKS WHOLE FILES, and until 2026-08-26 it did not — which is how it missed the biggest
// instance of the very thing it exists for. #1248 merged from a stale base and DELETED four files
// belonging to three merged PRs (#1244, #1239, #1240) plus reverted #1239's live app fix; this
// audit printed `0 of them are ABSENT at HEAD`. Every pattern above matches a NAMED DEFINITION, and
// a deleted file only leaves one behind if it happened to export something. Neither deleted
// waypoint-repair script does — one is top-level statements, the other's helpers are lowercase and
// unexported. The blindness scaled with how ORDINARY the file was, which is the worst possible
// direction: a script that exports nothing is the kind this repo writes most of.
//
// VALIDATED AGAINST THE REAL INCIDENT, not a synthetic one — the strongest proof available for a
// detector whose healthy output is "nothing found". `--ref 68bb307 --commits 12` reports all four
// deleted files, each attributed to #1248 and each named with the merged PR that added it.
//
// AND THE FILE RULE NEEDED A DISCRIMINATOR, because on subject matching alone its precision is 0%.
// Over 500 commits it reports 7 files and ALL SEVEN ARE PROMOTIONS — a one-off probe becoming a
// named guard (measure-horizontal-overflow -> check:overflow, probe-trailhead-vs-logistics ->
// audit:trailhead-agreement, probe-signed-in-db-failure -> check:outage, and four more). A detector
// whose every hit is correct work is one people learn to ignore.
//   The discriminator is STRUCTURAL, and deliberately NOT a similarity test — see the paragraph
//   above for why that would have excused #776. A PROMOTION removes ONE file, the one it
//   supersedes, added by ONE earlier commit. A STALE-BASE SQUASH removes SEVERAL, added by SEVERAL
//   DIFFERENT PRs, because it is carrying a whole old tree forward. Measured in both directions:
//   each of the 7 promotions is one file from one commit and none trips it; #1248 trips it with 4
//   files from 3 commits.
//   It is EMPHASIS, never suppression. Single-file removals are still printed in full.
//
// A RENAME IS NOT A DELETION. Additions are detected by git's `new file mode` marker, which a
// rename does not carry, so a moved file is never recorded as added and can never be reported as
// gone; and the removal lookup passes -M --name-status so an R shows as a rename rather than a D.
// This repo renames guards (check-rappel-readers.mjs -> check-correction-readers.mjs, #926).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };

/* --fail-on <kind>[,<kind>] — exit 1 when a SILENT finding is of one of these kinds.
   OFF BY DEFAULT, and that default is not timidity: this audit is report-only because a removal
   is not a defect, and over 500 commits every hit of the FILE rule has been a promotion while
   every generic-token finding was a supersession or a rename. Going red on those would make it
   argue with correct work — the failure its own header spends a paragraph on.

   The outage-flag kind is the one with a different MEASURED precision, which is why this is a
   named flag rather than a blanket --strict. It is a high-collision class: 15 flags across ~8
   PRs all editing the same two dense lines of ClimbMatch.jsx, and every silent removal of one so
   far has been a genuine stale-base revert — #1248 took two, #1267 took four, three of those
   twice within a day. Against a healthy tree it is quiet: 0 absent across 300 first-parent
   commits. */
const FAIL_ON = new Set(String(arg("--fail-on", "")).split(",").map((x) => x.trim()).filter(Boolean));
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
  /* OUTAGE FLAGS, AND THIS ONE WAS ADDED BECAUSE THE AUDIT MISSED A REAL REVERT. On 2026-08-26
     #1239 shipped `filedReportsUnavailable` and `catchesUnavailable`; #1248 merged 57 minutes
     later from a branch based before it and removed BOTH, along with `CatchLedger`'s matching
     prop and #1239's own probe file. Its subject and body are entirely about milepost clustering
     in `audit:trailhead-road` and never mention the app. This audit reported `0 of them are
     ABSENT at HEAD` for that window.
     Why every pattern above walked past it: an `xUnavailable` flag is neither exported nor
     top-level nor a useCallback/useMemo -- it is declared MID-DECLARATOR on a dense line, as
     `const myFiledQ=useMyFiledReports(!!uid),filedReportsUnavailable=!!(uid&&myFiledQ&&myFiledQ.isError),...`.
     So the match cannot be anchored to the start of a line.
     It is worth its own pattern rather than a general widening, for the reason the header above
     gives: these are the single most collision-prone declarations in the repo right now -- 11 of
     them, added across ~6 PRs by parallel sessions all editing the SAME two dense lines in
     `ClimbMatch.jsx`. And their loss is invisible by construction. The revert was internally
     CONSISTENT (component prop removed as well as the call-site argument), so `check:dead-props`
     stayed green, the screen still rendered, and the only symptom is a sentence that is false
     exactly when nobody is looking.
     Measured for noise before shipping: against #1239's own diff it finds precisely the two
     reverted names and nothing else. The convention is established (`<noun>Unavailable`), so this
     is a named class rather than "every identifier" -- the haystack the header warns about. */
  /* PRESENCE FOR THIS KIND IS THE ASSIGNMENT, NOT THE NAME — and the bare-name test let #1267
     through while this very comment was one of the reasons it did.

     #1267 dropped catchesUnavailable, filedReportsUnavailable, searchesUnavailable and
     photosUnavailable from ClimbMatch.jsx. This audit reported 0 absent even with a window
     reaching the adding commits, because presence searches the whole tree for the bare token and
     all four names still appeared at that commit in `scripts/audit-silent-reverts.mjs` — in the
     paragraph above, which names the two flags #1239 shipped — and in a probe's prose. The guard
     built for this class was kept green by its own documentation of the class. Exactly the trap
     CLAUDE.md records for check:ci-cancel and check:correction-readers, from the other side.

     A flag is DEFINED by being assigned, so `name[ ]*=` is the honest presence test rather than a
     workaround, and it keeps the property the bare token was chosen for: a flag that moved to
     another file still matches. The shape is written so one string is valid both as a JS RegExp
     source and as a POSIX ERE for `git grep -E`, since the two backends must agree. */
  /* ONE MATCH PER LINE WAS THE THIRD REASON #1267 READ AS CLEAN, and the comment above had
     already named the constraint it then failed to satisfy: "the match cannot be anchored to the
     start of a line". The regex was `^\+.*?\b(…)Unavailable\s*=` — anchored anyway, and `^` plus a
     lazy prefix can only ever match ONCE per line, because after the first match `^` has no
     further line start to bind to. This repo declares these flags many-to-a-line by design, so
     every flag after the first on a changed line was invisible. Measured on #1238's own diff: the
     added line carries several, and `searchesUnavailable` was never collected at any window size.
     Fixed by scanning the ADDED LINES ONLY (`scan: "added"`) with an unanchored regex, so being
     on an added line is a property of the corpus rather than of the match. The other patterns keep
     their `^\+` anchoring and their existing behaviour — one identifier per line is the shape they
     look for. */
  { kind: "outage-flag", re: /\b([A-Za-z_$][\w$]*Unavailable)\s*=/g, file: /\.(jsx?|mjs)$/,
    scan: "added", presence: (name) => name + "[ ]*=" },
];

/* THIS FILE MUST NOT BE EVIDENCE ABOUT THE APP, and leaving it in the corpus is what let #1267's
   removal of `filedReportsUnavailable` read as clean. Presence searches the whole tree, this file
   is a `.mjs` in it, and the comment above the outage-flag pattern quotes the real declarator —
   `…,filedReportsUnavailable=!!(…),…` — including the assignment. So at 2bd9a5d that token existed
   in exactly ONE tracked file: this one. The guard cited its own documentation of the defect as
   proof the defect had not happened.

   Same trap CLAUDE.md records for check:ci-cancel (a comment naming the forbidden concurrency
   group) and check:correction-readers (two readers explaining the rule in prose that names
   `_rapEdited`), and it is worse here because the citation is self-referential: the better this
   file explains a class, the blinder it gets to it. Excluding one path is narrow, but it is the
   only path whose content is guaranteed to name every class this audit tracks. */
const SELF = "scripts/audit-silent-reverts.mjs";

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
    .filter((f) => /\.(jsx?|mjs|json)$/.test(f) && !f.startsWith("node_modules") && f !== SELF);
  for (const f of headFiles) { try { headBlob += readFileSync(join(ROOT, f), "utf8") + "\n"; } catch { /* gone */ } }
  if (headBlob.length < 100000) { console.error(`FAIL — read only ${headBlob.length} chars across ${headFiles.length} files; a broken read, not a small repo.`); process.exit(1); }
  present = (tok, ere) => (ere ? new RegExp(ere).test(headBlob) : headBlob.includes(tok));
} else {
  console.log(`note: ${REF} (${HEAD.slice(0, 8)}) is not this checkout (${headSha.slice(0, 8)}) — asking git directly, which is slower.`);
  /* Fail closed: if git grep cannot find a token that certainly exists, the backend is broken and
     EVERY token would read as reverted. Probe with something the repo has always had. */
  const probe = (t, ere) => { try { git("grep", "-q", ere ? "-E" : "-F", ere || t, HEAD, "--", "*.json", "*.jsx", "*.mjs", "*.js", `:!${SELF}`); return true; } catch { return false; } };
  if (!probe("\"scripts\"")) { console.error(`FAIL — the git-grep backend found nothing at ${HEAD.slice(0, 8)}; nothing below was checked.`); process.exit(1); }
  const memo = new Map();
  present = (tok, ere) => { const k = ere || tok; if (!memo.has(k)) memo.set(k, probe(tok, ere)); return memo.get(k); };
}

/* A WHOLE FILE IS A DEFINITION TOO, and until 2026-08-26 nothing here could see one vanish.
   #1248 merged from a stale base and DELETED five files belonging to three merged PRs —
   solve-selfcontradicting.mjs (176 lines), probe-gnis-refusals-are-real.mjs (71),
   probe-catch-ledger-outage-copy.mjs (72), probe-live-sw-prune.mjs (111) and a README section.
   This audit reported `0 of them are ABSENT at HEAD` for that window.

   Why every pattern above walked past it: they all match a NAMED DEFINITION, and a deleted file
   only leaves one behind if it happened to export something. Neither waypoint-repair script does —
   one is top-level statements, the other's helpers are lowercase and unexported. So the guard whose
   whole subject is stale-base squashes was blind to the largest one in this repo's history, and its
   blindness scaled with how ordinary the file was: a script that exports nothing is exactly the
   kind this repo writes most of.

   Tracked by PATH, not by content, because there is no token to search for. Free of extra
   subprocesses: the per-commit diff is already split per file above, and git marks an addition with
   `new file mode`. */
const FILE_OF_INTEREST = /\.(jsx?|mjs|json|sql)$/;
const addedFiles = new Map(); // path -> {sha, subject}

const added = new Map(); // token -> {kind, sha, subject}
for (const sha of commits.slice().reverse()) {
  let diff = "";
  try { diff = git("show", "--unified=0", "--no-color", "--format=%s%n", sha); } catch { continue; }
  const subject = diff.split("\n")[0] || "";
  /* Split per-file so a pattern scoped to package.json cannot match a diff hunk from a .jsx. */
  const parts = diff.split(/^diff --git a\/(\S+) b\/\S+$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const path = parts[i], body = parts[i + 1] || "";
    /* `new file mode` marks an addition. A RENAME does not carry it — git's rename detection emits
       `rename from`/`rename to` instead — so a file that merely moved is never recorded as added
       here, and cannot later be reported as deleted. That matters: this repo renames guards
       (check-rappel-readers.mjs -> check-correction-readers.mjs) and a rename is not a revert. */
    if (FILE_OF_INTEREST.test(path) && /^new file mode /m.test(body) && !path.startsWith("node_modules/")) {
      addedFiles.set(path, { sha, subject });
    }
    /* `+++ b/path` also starts with '+' and is not code; including it would let a path fragment
       match a pattern. */
    let addedBody = null;
    /* SELF is excluded from COLLECTION and ATTRIBUTION too, not only from the presence test.
       Excluding it from presence alone was still self-citation, just displaced: the comments below
       quote real declarators, so scanning this file's own diff ADDED `filedReportsUnavailable` to
       the tracked set (credited to the commit that wrote the comment), and `git log -S` then named
       that same commit as the REMOVER of all four flags — a commit which touches no app file at
       all. Measured on 306df79a. The rule is one line longer than it looks: a guard must not treat
       its own text as evidence, in ANY of the three places it reads the repo. */
    if (path === SELF) continue;
    for (const p of PATTERNS) {
      if (!p.file.test(path)) continue;
      let corpus = body;
      if (p.scan === "added") {
        if (addedBody === null) {
          addedBody = body.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
        }
        corpus = addedBody;
      }
      p.re.lastIndex = 0;
      for (const m of corpus.matchAll(p.re)) added.set(m[1], { kind: p.kind, sha, subject });
    }
  }
}

/* Existence at HEAD, by the same two backends the token test uses and for the same reason. */
let fileExists;
if (fastPath) {
  const tracked = new Set(git("ls-files").trim().split("\n"));
  fileExists = (p) => tracked.has(p);
} else {
  fileExists = (p) => { try { git("cat-file", "-e", `${HEAD}:${p}`); return true; } catch { return false; } };
}
const goneFiles = [...addedFiles.entries()].filter(([p]) => !fileExists(p));


const PRESENCE_OF = new Map(PATTERNS.filter((p) => p.presence).map((p) => [p.kind, p.presence]));
const presenceEre = (rec) => { const f = PRESENCE_OF.get(rec.kind); return f ? f(rec.tok) : null; };
const missing = [...added.entries()]
  .filter(([tok, rec]) => !present(tok, presenceEre({ ...rec, tok })));

console.log(`walked ${commits.length} first-parent commits of ${REF}`);
console.log(`${added.size} tracked definition(s) added in that window`);
console.log(`${missing.length} of them are ABSENT at HEAD`);
console.log(`${addedFiles.size} file(s) added in that window, ${goneFiles.length} since deleted\n`);

/* Fail closed. An 80-commit window of this repo always adds files, so zero is a broken scan and
   not a quiet history — the same reasoning the empty-commit-list and short-blob checks above use. */
if (!addedFiles.size) {
  console.error(`FAIL — no added files found across ${commits.length} commits; a broken scan, not a clean history.`);
  process.exit(1);
}

/* Deleted files are reported BEFORE the token verdict and can fail the run on their own. Ordering
   is load-bearing here for the reason check:clickable records: whichever block exits first is the
   only one anyone reads, and the old code returned `ok` and exit 0 the moment `missing` was empty —
   which is exactly the state #1248 left, with five files gone. */
let fileSilent = 0;
/* Full commit message (subject + body) for the deliberate/silent classification, cached because
   this is called once per removed file and the same commit usually removes several. */
const _bodyCache = new Map();
const bodyOf = (sha) => {
  if (!_bodyCache.has(sha)) {
    let t = "";
    try { t = git("show", "-s", "--format=%B", sha); } catch { t = ""; }
    _bodyCache.set(sha, t);
  }
  return _bodyCache.get(sha);
};
const fileRemover = new Map(); // path -> {sha, subject, renamedTo} — kept so the grouping below
                               // needs no second `git log` per file.
if (goneFiles.length) {
  console.log(`--- FILES ADDED AND THEN DELETED ---`);
  for (const [path, info] of goneFiles) {
    let removedBy = "", removedSubject = "", renamedTo = "";
    try {
      /* -M so a RENAME reports as R, never as a deletion. --name-status gives the letter, which is
         the only thing separating "this moved" from "this was reverted". */
      const log = git("log", "--first-parent", "-M", "--name-status", "--format=%H%x09%s", `${info.sha}..${HEAD}`, "--", path);
      const lines = log.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const st = lines[i].match(/^R\d*\t(\S+)\t(\S+)/) || lines[i].match(/^D\t(\S+)/);
        if (!st) continue;
        for (let j = i - 1; j >= 0; j--) {
          const h = lines[j].match(/^([0-9a-f]{40})\t(.*)$/);
          if (h) { removedBy = h[1]; removedSubject = h[2]; break; }
        }
        if (lines[i].startsWith("R")) renamedTo = st[2];
        break;
      }
    } catch { /* leave blank */ }
    fileRemover.set(path, { sha: removedBy, subject: removedSubject, renamedTo });
    if (renamedTo) { console.log(`  renamed     ${path}\n      -> ${renamedTo}  (a move is not a revert)`); continue; }
    const base = path.split("/").pop().replace(/\.(jsx?|mjs|json|sql)$/, "");
    /* THE HEADER SAYS "message OR BODY" AND THIS READ ONLY THE SUBJECT, which made the deliberate
       branch nearly unreachable: a subject is ~72 characters and a path like
       `scripts/oneoff/probe-inbox-outage-copy.mjs` does not fit beside a sentence explaining why
       it went. Measured on the commit that found this -- a consolidation naming BOTH retired
       probes in its body -- the audit reported both SILENT and then flagged itself as "the
       stale-base shape". A detector that cannot be satisfied by doing the right thing teaches
       people to ignore it, which is the failure this audit's own header warns about twice.
       The body is fetched once per removing commit and cached: `git show -s --format=%B`. */
    const removedText = removedBy ? bodyOf(removedBy) : removedSubject;
    const deliberate = removedText && (removedText.includes(path) || removedText.toLowerCase().includes(base.toLowerCase()));
    if (!deliberate) fileSilent++;
    console.log(`${deliberate ? "  deliberate  " : "  ** SILENT   "}${path}`);
    console.log(`      added by  ${info.sha.slice(0, 8)}  ${info.subject.slice(0, 96)}`);
    console.log(`      removed   ${removedBy ? removedBy.slice(0, 8) : "(not found)"}  ${removedSubject.slice(0, 96)}`);
  }
  console.log(`\n  ${fileSilent} file(s) vanished in a commit that does NOT name them.`);

  /* WHICH OF THOSE IS WORTH READING FIRST, measured rather than guessed. Over 500 commits this
     rule reports 7 files and ALL SEVEN ARE PROMOTIONS — a one-off probe becoming a named guard:
     measure-horizontal-overflow -> check:overflow (#827), probe-trailhead-vs-logistics ->
     audit:trailhead-agreement (#905), probe-signed-in-db-failure -> check:outage (#1177),
     check-rappel-readers -> check-correction-readers (#926), and three more. Precision on subject
     matching alone is therefore 0%, and a detector whose every hit is correct work is one people
     learn to ignore.

     The discriminator is STRUCTURAL, not a similarity test — the header above is explicit that a
     rename/supersession test would have excused #776, which removed two resolvers and added a
     same-stem third in one commit. A PROMOTION removes ONE file, the one it supersedes, added by
     ONE earlier commit. A STALE-BASE SQUASH removes SEVERAL, added by SEVERAL DIFFERENT PRs,
     because it is carrying a whole old tree forward. Measured: each of the 7 promotions is one
     file from one PR; #1248 was 4 files from 3 PRs.

     Reported as EMPHASIS, never as suppression. A single-file removal is still printed — the
     multi-PR one just says so, because that is the shape that has actually cost this repo work. */
  const byRemover = new Map();
  for (const [path, info] of goneFiles) {
    const r = fileRemover.get(path);
    if (!r || !r.sha || r.renamedTo) continue;
    if (!byRemover.has(r.sha)) byRemover.set(r.sha, { subject: r.subject, namedText: bodyOf(r.sha), paths: [], adders: new Set() });
    const e = byRemover.get(r.sha);
    e.paths.push(path); e.adders.add(info.sha);
  }
  /* ...and a commit that NAMES every file it removed is not this shape whatever the counts say.
     A CONSOLIDATION -- two probes merged into one guard -- removes several files added by several
     PRs and is indistinguishable from a stale-base squash on the structural test alone. What
     separates them is the thing the deliberate/silent classification already computed: a squash
     about milepost clustering does not mention the probe files it drops, and a consolidation
     names them because that is what its commit message is FOR. Without this, the audit told the
     author of a correct consolidation to "read this one FIRST", which is the same
     flagging-correct-work failure the paragraph above warns about. */
  const multi = [...byRemover.entries()]
    .filter(([, e]) => e.adders.size > 1)
    .filter(([, e]) => !e.paths.every((path) => e.namedText
      && (e.namedText.includes(path)
        || e.namedText.toLowerCase().includes(
          path.split("/").pop().replace(/\.(jsx?|mjs|json|sql)$/, "").toLowerCase()))));
  if (multi.length) {
    console.log(`\n  ** ONE COMMIT REMOVED FILES ADDED BY SEVERAL DIFFERENT ONES — the stale-base shape:`);
    for (const [sha, e] of multi) {
      console.log(`     ${sha.slice(0, 8)}  ${e.subject.slice(0, 88)}`);
      console.log(`       removed ${e.paths.length} file(s) added by ${e.adders.size} different commits — read this one FIRST`);
    }
  } else {
    console.log(`  No commit removed files added by more than one other, so none has the stale-base`);
    console.log(`  fingerprint. Over 500 commits every hit of this rule has been a PROMOTION.`);
  }
  console.log(`\n  A file deleted on purpose is fine; one deleted by a merge about something else is`);
  console.log(`  the #1248 shape — four files across three merged PRs, and nothing reported it.\n`);
}

if (!missing.length) {
  if (!goneFiles.length) console.log(`ok — nothing added in the last ${commits.length} commits has since vanished.`);
  console.log(`\nWhat this does NOT prove: that no BEHAVIOUR was reverted. It tracks named`);
  console.log(`definitions and whole files, not the bodies of functions — a merge that kept a name`);
  console.log(`and dropped its guard clause is invisible here. check:correction-readers exists for`);
  console.log(`that shape.`);
  /* Exit 0 even with file findings. This audit is REPORT-ONLY and never exits non-zero for a
     finding — only for a broken scan — because a removal is not a defect and the first real run of
     the file rule proves why: its single hit is #1229 PROMOTING a one-off probe into a guard
     (check-area-name-embed.mjs), which is a supersession, not a revert. Going red on that would
     make the audit argue with correct work, the failure its own header spends a paragraph on. */
  process.exit(0);
}

/* For each missing token, find the commit that removed it and judge whether that commit was ABOUT
   it. `git log -S` is expensive, so it runs only for the handful that are actually missing. */
let silent = 0;
const silentKinds = new Set();
for (const [tok, info] of missing) {
  let removedBy = "", removedSubject = "";
  try {
    const log = git("log", "--first-parent", "-S", tok, "--format=%H%x09%s", `${info.sha}..${HEAD}`, "--", ".", `:!${SELF}`).trim();
    /* THE NEWEST COUNT-CHANGE IS THE REMOVAL, and `.pop()` — the oldest — named the wrong PR the
       first time this ran on a real multi-commit history. `-S` reports every commit where the
       number of occurrences CHANGED, additions included, so between the adding commit and HEAD
       there can be several. The token is absent at HEAD, so the last change before HEAD is the one
       that left it absent; anything older is a commit that touched the count and did not end it.
       Measured on #1267: `-S catchesUnavailable` reports 2bd9a5d (#1267, which really did delete
       the four assignments) and b211d89 (#1266, which merely ADDED a prose mention naming the flag
       in a probe). `.pop()` blamed #1266 — a PR about fixture crews that never touched the app. */
    const first = log.split("\n").filter(Boolean)[0];
    if (first) { const [h, ...rest] = first.split("\t"); removedBy = h; removedSubject = rest.join("\t"); }
  } catch { /* leave blank */ }

  /* Was the removing commit about this thing? The token itself appearing in its subject is the
     strongest signal; a bare name fragment is the weaker one. */
  const stem = tok.replace(/^(check|audit):/, "").replace(/^scripts\/|\.mjs$/g, "");
  // Same subject-only bug as the file classifier above; see the comment there.
  const removedText2 = removedBy ? bodyOf(removedBy) : removedSubject;
  const deliberate = removedText2 && (removedText2.includes(tok) || removedText2.toLowerCase().includes(stem.toLowerCase()));
  if (!deliberate) { silent++; silentKinds.add(info.kind); }
  console.log(`${deliberate ? "  deliberate " : "  ** SILENT "}${info.kind.padEnd(13)} ${tok}`);
  console.log(`      added by  ${info.sha.slice(0, 8)}  ${info.subject.slice(0, 96)}`);
  console.log(`      removed   ${removedBy ? removedBy.slice(0, 8) : "(not found)"}  ${removedSubject.slice(0, 96)}`);
}

console.log(`\n${silent} of ${missing.length} vanished in a commit that does NOT name them — read those.`);
console.log(`A removal is not a defect. This separates "deleted on purpose" from "deleted by a merge`);
console.log(`that was about something else", which is the shape #776 had when it reverted #778.`);

const fatal = [...silentKinds].filter((k) => FAIL_ON.has(k));
if (fatal.length) {
  console.error(`\nFAIL — a SILENT removal of kind ${fatal.join(", ")}, which --fail-on treats as a defect.`);
  console.error(`Restore it, or say in the commit subject that you are removing it on purpose.`);
  process.exit(1);
}
