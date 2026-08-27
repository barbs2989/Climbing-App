#!/usr/bin/env node
// Injection cases for check:outage-flag-reach.
//
// Every case proves its edit LANDED by checksum before the guard is believed, and restores the file
// byte-identically afterwards. This repo has had a case report "guard missed" when the edit never
// applied, and has shipped a mid-injection state to main (#1190) — so nothing here is trusted on
// the strength of an exit code alone.
//
// TWO CASES MUST STAY QUIET, and they are the ones that make the guard worth having:
//   * case 2 — a flag removed ENTIRELY is `audit:silent-reverts`' subject, not this guard's.
//     Failing on it would make two guards argue over one commit.
//   * (case 5 is a fail-CLOSED case: a broken scan must never print a clean sweep.)
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RD = path.join(ROOT, "RouteDetail.jsx");
const GUARD = path.join(ROOT, "scripts", "check-outage-flag-reach.mjs");

const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

const DECL = "const toposUnavailable=!!(USE_DB&&dbTopos&&dbTopos.isError);";
const READ = '{toposUnavailable?"Couldn’t load the topos":"No topo yet"}';
const READ_GONE = '{"No topo yet"}';

function runGuard() {
  try {
    const out = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

const CASES = [
  {
    name: "1 read dropped, declaration kept (the stale-base squash shape)",
    expect: "fail",
    want: /toposUnavailable is declared at .* and READ NOWHERE/,
    edit: (s) => s.replace(READ, READ_GONE),
  },
  {
    name: "2 flag removed ENTIRELY — must PASS (that is audit:silent-reverts' subject)",
    expect: "pass",
    want: /every outage flag reaches at least one consumer/,
    edit: (s) => s.replace(READ, READ_GONE).replace(DECL, ""),
  },
  {
    name: "3 read dropped + a COMMENT naming the flag — a comment is not a consumer",
    expect: "fail",
    want: /toposUnavailable is declared at .* and READ NOWHERE/,
    edit: (s) => s.replace(READ, READ_GONE).replace(DECL, DECL + "// toposUnavailable stays wired\n"),
  },
  {
    name: "4 read dropped + a STRING holding the flag name — a string is not a consumer",
    expect: "fail",
    want: /toposUnavailable is declared at .* and READ NOWHERE/,
    edit: (s) => s.replace(READ, READ_GONE).replace(DECL, DECL + 'const _note="toposUnavailable";'),
  },
  {
    name: "5 convention renamed off — must report a BROKEN SCAN, never a clean sweep",
    expect: "fail",
    want: /found only \d+ flag\(s\)/,
    edit: (s) => s.replace(/Unavailable\b/g, "Unavail"),
    files: ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"],
  },
  {
    // Section 2. ONE flag renamed off-convention, consistently, so the app still works and section
    // 1 simply stops seeing it — the false-pass hole that makes a name-keyed guard print ok.
    name: "6 one flag named off-convention — section 1 goes blind, section 2 must catch it",
    expect: "fail",
    want: /`toposBroken` derives from isError but is not named \*Unavailable/,
    edit: (s) => s.replace(/toposUnavailable\b/g, "toposBroken"),
  },
];

const baseline = {};
for (const f of ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]) {
  baseline[f] = fs.readFileSync(path.join(ROOT, f), "utf8");
}

// A clean tree must be green, or every "caught" verdict below is meaningless.
const clean = runGuard();
if (clean.code !== 0) {
  console.error("ABORT — the guard is not green on a clean tree; nothing below would mean anything.");
  console.error(clean.out.split("\n").slice(-8).join("\n"));
  process.exit(1);
}
console.log("clean tree: guard passes\n");

let bad = 0;
for (const c of CASES) {
  const targets = c.files || ["RouteDetail.jsx"];
  const before = {};
  let landed = true;
  for (const f of targets) {
    const p = path.join(ROOT, f);
    before[f] = fs.readFileSync(p, "utf8");
    const after = c.edit(before[f]);
    if (sum(after) === sum(before[f])) landed = false;
    fs.writeFileSync(p, after);
  }

  let verdict;
  if (!landed) {
    verdict = "EDIT NEVER LANDED — the case is wrong, not the guard";
    bad++;
  } else {
    const r = runGuard();
    const wantFail = c.expect === "fail";
    const gotFail = r.code !== 0;
    const matched = c.want.test(r.out);
    if (gotFail === wantFail && matched) verdict = wantFail ? "CAUGHT" : "correctly quiet";
    else if (gotFail !== wantFail) { verdict = `WRONG DIRECTION (expected ${c.expect}, exit ${r.code})`; bad++; }
    else { verdict = "fired, but not with the expected message"; bad++; }
  }

  for (const f of targets) fs.writeFileSync(path.join(ROOT, f), before[f]);
  for (const f of targets) {
    if (sum(fs.readFileSync(path.join(ROOT, f), "utf8")) !== sum(baseline[f])) {
      console.error(`ABORT — ${f} was not restored byte-identically. Do NOT commit.`);
      process.exit(1);
    }
  }
  console.log(`  ${verdict.padEnd(46)} ${c.name}`);
}

console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as specified.`);
process.exit(bad ? 1 : 0);
