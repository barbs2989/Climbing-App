// Injection tests for check:clickable's classification assertion.
//
// CASE 2 IS THE WHOLE POINT. The baseline is a count, so a one-for-one SWAP — fix one
// control, add another in the same file — leaves the number unchanged and passes. CLAUDE.md
// records that blind spot as unavoidable, and it was, at 247 remaining. The sweep is
// finished now, so the remainder is small enough to classify, and a control that is neither
// a backdrop nor declared is a defect whatever the count says.
//
// Cases 3 and 4 keep it honest in the other direction: a new BACKDROP must NOT be flagged
// (they must never get a tab stop), and a declaration that matches nothing must fail as
// stale rather than rot into a description of code that is gone.
//
// Every case proves its edit LANDED by checksum before believing the verdict.
//
//   node scripts/oneoff/inject-clickable-swap-cases.mjs
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts", "check-clickable-divs.mjs");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const run = () => {
  try { return { code: 0, out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
};

const clean = run();
if (clean.code !== 0) {
  console.error("REFUSING TO RUN — check:clickable already fails before any injection:\n" + clean.out);
  process.exit(1);
}
console.log("baseline: green\n");

const HEADER = "the remainder is no longer fully accounted for";
// Two real controls in ClimbMatch.jsx: one already converted, one a DECLARED duplicate that
// is deliberately still mouse-only. Swapping their states leaves the count untouched.
const CONVERTED = '{...clickable(()=>setOnboardOpen(true))}';
const PLAIN_EQUIV = 'onClick={()=>setOnboardOpen(true)}';
const DECLARED_DUP = 'onClick={()=>{setSharedRoute(null);setProfileModal(c);}}';
const DUP_CONVERTED = '{...clickable(()=>{setSharedRoute(null);setProfileModal(c);})}';

const CASES = [
  {
    name: "1. a NEW mouse-only control is caught",
    file: "ClimbMatch.jsx",
    // Convert one control back. Well-formed: only the attribute changes, no JSX is spliced —
    // the first attempt spliced whole elements in and produced a PARSE ERROR, which the
    // harness then read as "pass" because it judges on the classification header.
    edit: (s) => s.replace(CONVERTED, PLAIN_EQUIV),
    expect: "fail",
    need: /NEW mouse-only control/,
    why: "unclassified: neither a backdrop nor declared",
  },
  {
    name: "2. a ONE-FOR-ONE SWAP is caught — the count is UNCHANGED",
    file: "ClimbMatch.jsx",
    // -1 mouse-only (convert a declared duplicate) and +1 (un-convert another). The count
    // baseline sees nothing; the classification sees an undeclared control AND a stale
    // declaration.
    edit: (s) => s.replace(DECLARED_DUP, DUP_CONVERTED).replace(CONVERTED, PLAIN_EQUIV),
    expect: "fail",
    need: /NEW mouse-only control/,
    why: "THE POINT: a count baseline cannot see this; the classification can",
  },
  {
    name: "3. a new BACKDROP must NOT be flagged",
    file: "ClimbMatch.jsx",
    // Same un-conversion, but given a backdrop's style, so it must be excused.
    edit: (s) => s.replace(CONVERTED, PLAIN_EQUIV + ' style={{position:"fixed",inset:0}}'),
    expect: "pass",
    why: "position:fixed + inset:0 — must never get a tab stop",
  },
  {
    name: "4. a STALE declaration fails",
    file: "scripts/check-clickable-divs.mjs",
    edit: (s) => s.replace('"()=>onViewProfile(c)"', '"()=>thisHandlerDoesNotExistAnywhere(q)"'),
    expect: "fail",
    need: /STALE declaration/,
    why: "a declaration that matches nothing must not rot silently",
  },
];

// A parse error is NOT a catch. The first run of this harness scored two cases on malformed
// JSX that never reached the guard's logic at all.
const PARSE_FAIL = "could not parse";

let passed = 0;
for (const c of CASES) {
  const abs = path.join(ROOT, c.file);
  const original = fs.readFileSync(abs, "utf8");
  const injected = c.edit(original);
  if (injected === original) { console.log(`${c.name}\n   SKIPPED — edit did not apply\n`); continue; }
  fs.writeFileSync(abs, injected);
  try {
    if (sum(fs.readFileSync(abs, "utf8")) === sum(original)) {
      console.log(`${c.name}\n   HARNESS BUG — edit did not land\n`); continue;
    }
    const r = run();
    if (r.out.includes(PARSE_FAIL)) {
      console.log(`${c.name}\n   HARNESS BUG — the edit produced invalid JSX; the guard never ran its logic.\n`);
      continue;
    }
    const fired = r.out.includes(HEADER);
    const got = fired ? "fail" : "pass";
    let ok = got === c.expect;
    if (ok && c.expect === "fail" && c.need && !c.need.test(r.out)) {
      ok = false;
      console.log(`   (fired, but the message did not match ${c.need} — wrong reason)`);
    }
    if (ok) passed++;
    console.log(`${c.name}`);
    console.log(`   edit landed: yes (${sum(original)} -> ${sum(injected)})`);
    console.log(`   expected ${c.expect}, guard ${got}  ${ok ? "OK" : "*** WRONG ***"}`);
    console.log(`   ${c.why}`);
    const line = r.out.split("\n").find((l) => /NEW mouse-only|STALE declaration/.test(l));
    if (line) console.log(`   guard said: ${line.trim()}`);
    console.log("");
  } finally { fs.writeFileSync(abs, original); }
}

const after = run();
console.log(after.code === 0
  ? `restored: green again\n\n${passed}/${CASES.length} case(s) behaved as expected.`
  : `\n*** NOT RESTORED:\n${after.out}`);
process.exit(after.code === 0 && passed === CASES.length ? 0 : 1);
