// Did this merge silently DELETE something one of its parents added?
//
// Git mis-merges this codebase's dense single-line files without ever reporting a conflict.
// #482 is the case on record: a conflict resolution took the pre-#477 side of ClimbMatch's
// save/hydration line and deleted keptUrls photo preservation, the condition-metric writes,
// partners/crew_id, and #478's tick_type — all inside ONE physical line, all valid JS after
// the merge. Every gate stayed green, because the AST checks cannot see a semantic revert.
// #776 did it again to #778's three crew-member fixes. Both were found by hand, afterwards.
//
// The question this asks is narrow and mechanical: for each parent of a merge, which
// identifiers did that parent INTRODUCE since the merge base, and are they all still present
// in the merge result? A token the merge dropped is either a deliberate deletion (declare it)
// or exactly the defect above.
//
// It deliberately matches IDENTIFIER TOKENS, not declarations. A declaration-only scan would
// have missed #482 entirely — keptUrls and tick_type are object properties on a dense line,
// never `const` declarations. Property names are the payload here.
//
//   node scripts/check-merge-survival.mjs                 # HEAD, if HEAD is a merge
//   node scripts/check-merge-survival.mjs --commit <sha>  # a specific merge commit
//   node scripts/check-merge-survival.mjs --range base..head   # a PR's merge, pre-merge
//
// Not a build gate: it needs a merge commit and git history, so it belongs on the PR run and
// in the hands of whoever is resolving a merge. Run it BEFORE you push a resolution.

import { execFileSync } from "node:child_process";

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

// Files where a silent revert is both likely and expensive: dense, single-line-per-declaration,
// and merged by git without conflicting. Scoped rather than tree-wide so the token noise stays
// low enough that a finding means something.
const WATCH = /\.(jsx|js|mjs)$/;
const SKIP = /^(node_modules|dist|\.claude)\//;

// A token one parent added that the merge legitimately drops. Each entry MUST say why, and a
// stale entry (the token is present, or was never added) FAILS — bookkeeping cannot rot into a
// description of a merge that no longer exists.
const ALLOW_DROPPED = [
  // { token: "someName", commit: "abc1234", why: "renamed to otherName in the same merge" },
];

const arg = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : null; };

let merge = arg("--commit");
const range = arg("--range");
let parents;

if (range) {
  const [base, head] = range.split("..");
  if (!base || !head) { console.error("FAIL: --range wants base..head"); process.exit(1); }
  // pre-merge form: treat it as "what would merging head into base drop?"
  parents = [base, head];
  merge = null;
} else {
  merge = merge || "HEAD";
  const line = git("rev-list", "--parents", "-n", "1", merge).trim().split(/\s+/);
  parents = line.slice(1);
  if (parents.length < 2) {
    // Loud, not silent: a non-merge is not a pass, it is nothing to check.
    console.log(`check:merge-survival: SKIPPED — ${merge.slice(0, 7)} is not a merge commit (${parents.length} parent).`);
    console.log("  Nothing was verified. Point it at a merge with --commit, or a PR with --range base..head.");
    process.exit(0);
  }
}

const base = git("merge-base", parents[0], parents[1]).trim();
if (!base) { console.error("FAIL: no merge base between the parents"); process.exit(1); }

// Tokens are taken ONLY in code position — `.foo`, `foo:`, `foo(`, `foo =`. A bare word match
// is unusable here: these files carry more explanatory prose than code, and the first draft
// reported `the$` and `ers` out of comment text on a merge that was provably clean. Code
// position is also exactly where the payload lives — #482's losses were `keptUrls:` and
// `tick_type:`, object properties, which a declaration-only scan would equally have missed.
const IDENT = /(?:\.([A-Za-z_$][A-Za-z0-9_$]{2,})\b)|(?:\b([A-Za-z_$][A-Za-z0-9_$]{2,})\s*[:(=])/g;
// Tokens that appear everywhere and carry no signal; matching them would drown a real finding.
const NOISE = new Set(("const let var function return if else for while this null true false undefined "
  + "import export from default new typeof void delete class extends async await yield try catch finally "
  + "throw switch case break continue do in of instanceof style div span className onClick children props "
  + "string number boolean object length push map filter slice concat join split test match replace "
  + "React useState useEffect useMemo useRef useCallback").split(/\s+/));

// identifiers added by `rev` relative to `base`, per file
function addedTokens(rev) {
  const out = new Map();
  let files;
  try { files = git("diff", "--name-only", base, rev).trim().split("\n").filter(Boolean); }
  catch { return out; }
  for (const f of files) {
    if (!WATCH.test(f) || SKIP.test(f)) continue;
    let d;
    try { d = git("diff", "-U0", base, rev, "--", f); } catch { continue; }
    const added = new Set(), removed = new Set();
    for (const line of d.split("\n")) {
      if (line.startsWith("+++") || line.startsWith("---")) continue;
      const bag = line.startsWith("+") ? added : line.startsWith("-") ? removed : null;
      if (!bag) continue;
      for (const m of line.matchAll(IDENT)) { const t = m[1] || m[2]; if (t && !NOISE.has(t)) bag.add(t); }
    }
    // a token that also appears on a removed line is a rewrite, not an introduction
    for (const t of removed) added.delete(t);
    if (added.size) out.set(f, added);
  }
  return out;
}

function contentOf(rev, f) { try { return git("show", `${rev}:${f}`); } catch { return null; } }

const result = merge || parents[0]; // for --range, the "result" is base (i.e. would head's work land?)
const findings = [];
let scanned = 0, tokensChecked = 0;

for (const parent of parents) {
  const other = parents.find((p) => p !== parent);
  const added = addedTokens(parent);
  for (const [f, tokens] of added) {
    const inMerge = merge ? contentOf(merge, f) : contentOf(other, f);
    if (inMerge == null) continue;           // file deleted by the merge — a different question
    scanned++;
    for (const t of tokens) {
      tokensChecked++;
      const re = new RegExp(`\\b${t.replace(/\$/g, "\\$")}\\b`);
      if (!re.test(inMerge)) {
        const ex = ALLOW_DROPPED.find((a) => a.token === t);
        if (!ex) findings.push({ file: f, token: t, parent: parent.slice(0, 7) });
      }
    }
  }
}

// fail closed: a scan that read nothing is a broken scan, never a clean merge
if (tokensChecked === 0) {
  console.error("FAIL: no identifiers were compared at all — the diff walk or the file filter is broken.");
  console.error(`  base=${base.slice(0, 7)} parents=${parents.map((p) => p.slice(0, 7)).join(",")}`);
  process.exit(1);
}

// a stale exemption describes a merge that no longer exists
const stale = ALLOW_DROPPED.filter((a) => !findings.some((f) => f.token === a.token)
  && !(merge && new RegExp(`\\b${a.token}\\b`).test(contentOf(merge, a.file || "") || "")));
if (ALLOW_DROPPED.length && stale.length === ALLOW_DROPPED.length && findings.length === 0) {
  console.error(`FAIL: ${stale.length} ALLOW_DROPPED entr(ies) match nothing — stale bookkeeping.`);
  for (const s of stale) console.error(`  ${s.token} (${s.why})`);
  process.exit(1);
}

const label = merge ? `merge ${merge.slice(0, 7)}` : `${parents[0].slice(0, 7)}..${parents[1].slice(0, 7)}`;
if (!findings.length) {
  console.log(`check:merge-survival: ok — ${label}: every identifier either parent introduced survives.`);
  console.log(`  ${tokensChecked} token(s) across ${scanned} file(s), base ${base.slice(0, 7)}`);
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) { if (!byFile.has(f.file)) byFile.set(f.file, []); byFile.get(f.file).push(f); }
console.error(`check:merge-survival: FAIL — ${label} dropped ${findings.length} identifier(s) a parent had added.\n`);
for (const [f, list] of byFile) {
  console.error(`  ${f}`);
  for (const x of list.slice(0, 12)) console.error(`     ${x.token}   (added by ${x.parent}, absent after the merge)`);
  if (list.length > 12) console.error(`     … and ${list.length - 12} more`);
}
console.error(`\n  Each is either a silent revert — the #482/#776 shape, valid code that quietly`);
console.error(`  un-ships a merged change — or a deliberate deletion, which belongs in ALLOW_DROPPED`);
console.error(`  with a reason. Do not "fix" this by widening NOISE.`);
process.exit(1);

// Injection tests (run by hand after any change to the diff walk or the token filter):
//   1. A real merge with nothing dropped              -> ok
//   2. Point --commit at a non-merge                  -> SKIPPED, and says nothing was verified
//   3. Break WATCH to match nothing                   -> FAIL "no identifiers were compared at all"
//   4. A merge that reverts a parent's added function -> FAIL naming the token and the parent
