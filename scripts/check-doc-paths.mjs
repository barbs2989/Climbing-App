#!/usr/bin/env node
// EVERY FILE PATH CLAUDE.md NAMES MUST EXIST.
//
// This file cites ~133 paths under the tracked code roots, and they are not decoration: they are
// the EVIDENCE for its claims — "proven by scripts/oneoff/probe-x.mjs", "the measurement is
// scripts/oneoff/measure-y.mjs". A path that has gone is a claim a reader cannot check.
//
// AND THE WORST OUTCOME IS NOT CONFUSION, IT IS REBUILDING SOMETHING THAT EXISTS. The dominant
// cause is PROMOTION, which is this repo's standard move: a probe proves a class, gets promoted to
// a `check:` and RENAMED in the same commit, and the citation keeps the dead path. Measured when
// this guard was written: 5 of 108 `scripts/` paths were stale, and FOUR were promotions —
// probe-overlays-that-assert-absence → check-overlay-absence (#1319), probe-inbox-outage-copy and
// probe-friends-outage-copy → check-outage-copy (#1293), probe-verification-survives-its-own-read
// → check-verification-fallback (#1289). A reader chasing any of them finds nothing and may write
// it again — which this file records happening to `DbAreaTree`.
//
// `check:guard-wiring` asserts the reverse direction (every guard on disk is NAMED in the command
// block) and cannot see this: these are ordinary script paths in prose, not `npm run` names.
//
// WHY THE ROOTS ARE LIMITED. `catalog/` is gitignored (~52MB of regenerable JSON, `cc1461f3`) and
// `research-data/` holds triage dumps, so a path there is legitimately absent from a fresh
// checkout. Scoped to what git always carries, so an absence is always a defect.
//
// A LESSON THIS GUARD'S OWN MEASUREMENT PAID FOR THREE TIMES: order an extension alternation
// LONGEST FIRST. `(?:mjs|js|json)` matches `.js` inside `.json` and reported `schema-snapshot.js`
// as missing; `(?:...|js|jsx)` did the same to every `.jsx`. Both produced a confident wrong count
// — the tokeniser trap this file records for `audit:approach-scope`, arriving in a doc scan.
//
// Static — no browser, no DB, milliseconds — so it sits in `npm run build`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC = path.join(ROOT, "CLAUDE.md");

// Deliberately named though gone. A STALE entry fails, so this cannot rot into a description of
// files that are back.
const GONE = {
  "scripts/oneoff/measure-horizontal-overflow.mjs":
    "named BY its own replacement notice — \"It replaces … (#818)\" — so the sentence is about the " +
    "file being gone. Removing the citation would delete the record of why check:overflow exists.",
};

// Longest extension first. See the note above; this ordering is the guard, not a detail.
const RE = /(?:scripts|lib|\.github\/workflows|supabase\/migrations)\/[A-Za-z0-9_./-]+\.(?:mjs|jsx|json|yml|sql|js)/g;

const src = fs.readFileSync(DOC, "utf8");
const cited = [...new Set(src.match(RE) || [])].sort();

// Fail closed: a regex that stopped matching would report a clean document having read nothing,
// which is the false-pass direction and the whole reason this is a guard rather than a grep.
if (cited.length < 80) {
  console.error(`FAIL: parsed only ${cited.length} path(s) from CLAUDE.md — the pattern broke.`);
  console.error("A doc scan that matches nothing prints the same clean result as a correct one.");
  process.exit(1);
}

// Suggest the likely replacement rather than only reporting the absence. The likeliest cause is a
// promotion, and a promotion keeps most of the basename — so a message naming the probable
// successor is the difference between a fix and a rewrite. The advice IS part of the guard:
// check:column-drift fired correctly for months while telling readers to do the wrong thing.
const stem = (p) => path.basename(p).replace(/\.[^.]+$/, "").replace(/^(?:probe|measure|check|audit|fix|verify)-/, "");
const onDisk = [];
for (const dir of ["scripts", "scripts/oneoff", "scripts/lib", "lib"]) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) if (fs.statSync(path.join(d, f)).isFile()) onDisk.push(dir + "/" + f);
}
const suggest = (p) => {
  const want = stem(p);
  const hit = onDisk.filter((f) => f !== p && (stem(f) === want || path.basename(f) === path.basename(p)));
  return hit.length ? hit : null;
};

let bad = 0;
for (const p of cited) {
  const exists = fs.existsSync(path.join(ROOT, p));
  if (exists) {
    if (GONE[p]) {
      console.error(`FAIL  ${p} is declared GONE and exists — stale bookkeeping, remove the entry.`);
      bad++;
    }
    continue;
  }
  if (GONE[p]) { console.log(`  gone  ${p} — ${GONE[p]}`); continue; }
  bad++;
  const s = suggest(p);
  console.error(`FAIL  CLAUDE.md names ${p}, which does not exist.`);
  if (s) {
    console.error(`      Likeliest cause: it was PROMOTED and renamed. Candidate(s) on disk:`);
    for (const c of s) console.error(`        ${c}`);
    console.error(`      Repoint the citation at the guard rather than deleting it — the sentence`);
    console.error(`      is usually the evidence for a claim, and the claim still stands.`);
  } else {
    console.error(`      No similarly-named file on disk. Three causes:`);
    console.error(`        1. AN ILLUSTRATIVE path in new prose — this guard cannot tell an example`);
    console.error(`           from a citation, and caught its own entry that way. Name a REAL file;`);
    console.error(`           there is always one, and it is more use to a reader than a placeholder.`);
    console.error(`        2. The path is simply WRONG — check the directory, scripts/lib/ and lib/`);
    console.error(`           are different and that is the miss this guard first found.`);
    console.error(`        3. Genuinely gone — declare it in GONE with the reason, and expect the`);
    console.error(`           entry to fail later if the file comes back.`);
  }
}

for (const p of Object.keys(GONE)) {
  if (!cited.includes(p)) { console.error(`FAIL  GONE declares ${p}, which CLAUDE.md no longer names — remove the entry.`); bad++; }
}

console.log(`\ncheck:doc-paths — ${cited.length} path(s) cited under the tracked code roots, ${Object.keys(GONE).length} declared gone.`);
if (bad) { console.error(`check:doc-paths FAILED — ${bad} finding(s).`); process.exit(1); }
console.log("ok — every file CLAUDE.md names is on disk.");
