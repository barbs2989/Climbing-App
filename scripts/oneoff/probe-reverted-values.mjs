// Did a merge change a VALUE back?
//
// `audit:silent-reverts` tracks named DEFINITIONS and says so in its own output. #1253 widened it
// with an `xUnavailable` pattern -- still a name. A stale-base squash that keeps every identifier
// and changes two numbers back is invisible to all of it, and that is not hypothetical: measured
// on main 2026-08-26, `dfc91d0` (#1243) raised a timeout 120000 -> 180000, `a4e2a39` (#1249)
// merged from a branch based before it, and main went back to 120000 with the audit reporting
// "0 ABSENT".
//
// THE SHAPE THIS LOOKS FOR IS NARROW ON PURPOSE, because "a line was removed" is a haystack:
// lines are deleted deliberately all day. It reports only where a commit REPLACED old text with
// new, and at HEAD the OLD TEXT IS BACK and the new text is gone. That is not a deletion, it is a
// reversion -- the thing the change replaced returned.
//
// Precision measures, each of which cost a false positive in the first run:
//   - comment-only and short/structural lines (`}`, `});`, `return;`) are skipped
//   - whitespace is normalised, so a reindent is not a revert
//   - both sides must be non-trivial and DIFFERENT after normalising
//   - a pair whose old text still appears MANY times is skipped: it is boilerplate, not an identity
//   - the presence test is over the whole tree at HEAD, so a moved line is not a revert
//
// PRECISION, MEASURED BEFORE PROPOSING IT AS ANYTHING MORE THAN A PROBE -- which is the rule
// audit:area-parents records after its first draft shipped 12 real findings out of 41.
//
// Against 40 first-parent commits of main on 2026-08-26: **10 findings**. It CAUGHT the case it
// was written for -- #1243's `timeout: 120000 -> 180000` reverted by #1249's stale-base squash,
// correctly labelled SILENT. Most of the rest were #1253 LEGITIMATELY RESTORING #1239's outage
// flags, and that is the honest limit: **a good revert is structurally identical to a bad one.**
// Undoing a change and undoing an undoing look the same from a diff; only whether a later commit
// is ABOUT it separates them, and a subject line is weak evidence.
//
// So this is a READING LIST, not a defect count, and it must not become a gate on that basis.
// Re-run after the repair to see it move: with #1242 merged (restoring the timeout as a named
// PAGE_LOAD_MS) the same window reports **9**, and the timeout row is gone. That before/after is
// the strongest thing available for a detector whose healthy output is "nothing found".
//
// Report-only, git-only (no DB, no network, no browser). Run it after a batch of merges.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const REF = arg("--ref", "origin/main");
const N = Number(arg("--commits", 60));
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });

const TRIVIAL = /^[\s{}()\[\];,]*$/;
const COMMENTY = /^\s*(\/\/|\/\*|\*|#)/;
const norm = (s) => s.replace(/\s+/g, " ").trim();
const usable = (s) => { const t = norm(s); return t.length >= 12 && !TRIVIAL.test(t) && !COMMENTY.test(s); };

const commits = git("log", "--first-parent", "--format=%H\t%s", `-${N}`, REF).trim().split("\n")
  .map((l) => { const [h, ...r] = l.split("\t"); return { sha: h, subject: r.join("\t") }; });
if (commits.length < 5) { console.error("probe-reverted-values: fewer than 5 commits walked — broken scan"); process.exit(1); }

// The tree AT --ref, never the working tree. Reading from disk measures whatever branch happens
// to be checked out: the first run of this probe read my own branch, which already carried the
// restore, so `wholeTree.includes(n)` matched and the #1243 revert it was written to find was
// silently skipped. Same trap as check:field-renders' hardcoded ROOT — a probe that measures a
// different tree than the one it names.
const files = git("ls-tree", "-r", "--name-only", REF).trim().split("\n");
const content = new Map();
const read = (f) => {
  if (!content.has(f)) { try { content.set(f, git("show", `${REF}:${f}`)); } catch { content.set(f, null); } }
  return content.get(f);
};
const wholeTree = files.filter((f) => /\.(jsx?|mjs|ts|tsx|json|sql|ya?ml|md)$/.test(f))
  .map((f) => read(f) || "").join("\n");

const findings = [];
for (const c of commits) {
  let diff;
  try { diff = git("show", "--first-parent", "--unified=0", "--no-color", c.sha); } catch { continue; }
  let file = null;
  const hunks = [];
  let minus = [], plus = [];
  // PAIR BY LONGEST COMMON PREFIX, not positionally. The first version required equal - and +
  // counts, which is exactly wrong for the case this probe exists to find: #1243 changed one
  // number AND added six comment lines explaining it, so the hunk was 1 minus / 7 plus and the
  // pair was never recorded. A commit that explains itself was invisible to a detector looking
  // for careless changes.
  const prefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const flush = () => {
    if (file && minus.length && plus.length) {
      for (const p of plus) {
        let best = null, bestLen = 0;
        for (const m of minus) { const l = prefix(m, p); if (l > bestLen) { bestLen = l; best = m; } }
        // 20 chars of shared prefix is a REPLACEMENT; less is two unrelated lines that happen to
        // sit in one hunk, and pairing those manufactures findings.
        if (best && bestLen >= 20) hunks.push({ file, old: best, neu: p });
      }
    }
    minus = []; plus = [];
  };
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) { flush(); file = line.slice(6); continue; }
    if (line.startsWith("@@")) { flush(); continue; }
    if (line.startsWith("-") && !line.startsWith("---")) { minus.push(line.slice(1)); continue; }
    if (line.startsWith("+") && !line.startsWith("+++")) { plus.push(line.slice(1)); continue; }
    flush();
  }
  flush();

  for (const h of hunks) {
    if (!usable(h.old) || !usable(h.neu)) continue;
    const o = norm(h.old), n = norm(h.neu);
    if (o === n) continue;
    const body = read(h.file);
    if (body == null) continue;                       // file gone: not this probe's question
    const flat = norm(body);
    if (flat.includes(n)) continue;                   // the new text is still there
    if (!flat.includes(o)) continue;                  // the old text is not back either
    if (wholeTree.includes(n)) continue;              // moved elsewhere, not reverted
    // Boilerplate guard: an "old" line that appears many times is not an identity.
    const occ = flat.split(o).length - 1;
    if (occ > 3) continue;
    findings.push({ ...h, sha: c.sha.slice(0, 7), subject: c.subject, occ });
  }
}

console.log(`walked ${commits.length} first-parent commits of ${REF}`);
console.log(`${findings.length} value(s) changed and then changed BACK\n`);
for (const f of findings) {
  // Deliberate vs silent, the same question audit:silent-reverts asks of a removal.
  const tok = norm(f.neu).split(/[^A-Za-z0-9_]+/).filter((w) => w.length > 4).slice(0, 4);
  const later = commits.slice(0, commits.findIndex((c) => c.sha.startsWith(f.sha)))
    .filter((c) => tok.some((t) => c.subject.toLowerCase().includes(t.toLowerCase())));
  console.log(`  ${f.file}`);
  console.log(`    ${f.sha} "${f.subject.slice(0, 70)}"`);
  console.log(`      set: ${norm(f.neu).slice(0, 100)}`);
  console.log(`      now: ${norm(f.old).slice(0, 100)}`);
  console.log(`      ${later.length ? "DELIBERATE? a later commit names it: " + later[0].subject.slice(0, 50) : "SILENT — no later commit subject mentions it"}\n`);
}
if (!findings.length) console.log("ok — nothing set in that window has since been set back.\n");
console.log(`What this does NOT prove: that no value was changed to a THIRD value. It reports only`);
console.log(`a change that was undone — old text back, new text gone — which is the shape a`);
console.log(`stale-base squash produces. A deliberate revert looks identical and is separated only`);
console.log(`by whether a later commit subject is about it.`);
