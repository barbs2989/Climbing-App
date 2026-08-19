// Injection tests for check:clickable's zero-tolerance "announced but inert" check.
//
// The expected result of that check is "nothing found", which is exactly what a broken
// check prints. So it is worth nothing until something proves it fires — and equally,
// until something proves it does NOT fire on the correct markup it sits next to. There are
// ~54 role="dialog" containers across these files; a check that flagged those would be
// telling authors to break working code, which is the failure this repo keeps recording.
//
// Every case proves its edit LANDED by checksum before believing the verdict. A .replace()
// that matched nothing reports "the guard missed it" when the truth is "the file was never
// modified" — the trap CLAUDE.md records for check:log.
//
//   node scripts/oneoff/inject-inert-control-cases.mjs
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts", "check-clickable-divs.mjs");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);

const runGuard = () => {
  try {
    return { code: 0, out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
};

const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSING TO RUN — check:clickable is already failing before any injection:\n" + clean.out);
  process.exit(1);
}
console.log("baseline: check:clickable is green (0 inert controls)");
console.log("judging on whether the INERT section fires, not on exit code -- these edits");
console.log("also perturb the mouse-only count, which is a different check.\n");

const REACTION = '{...clickable(()=>setReactFor(c.id))}';

const CASES = [
  {
    name: "1. the real defect: role + tabIndex, NO key handler (announced, reachable, inert)",
    file: "ClimbMatchCore.jsx",
    find: REACTION,
    repl: 'role="button" tabIndex={0} onClick={()=>setReactFor(c.id)}',
    expect: "fail",
    need: /role="button"/,
    why: "this is exactly what shipped — a screen reader names it and Enter does nothing",
  },
  {
    name: "2. an interactive role with NO tab stop (announced, unreachable)",
    file: "ClimbMatchCore.jsx",
    find: REACTION,
    repl: 'role="button" onClick={()=>setReactFor(c.id)}',
    expect: "fail",
    need: /no tab stop/,
    why: "announced as a button a keyboard can never reach",
  },
  {
    name: "3. role=\"dialog\" without a tab stop must NOT be flagged",
    file: "ClimbMatchCore.jsx",
    find: REACTION,
    repl: 'role="dialog" onClick={()=>setReactFor(c.id)}',
    expect: "pass",
    why: "a modal container needs neither a tab stop nor a key handler; flagging it would break correct markup",
  },
  {
    name: "4. the helper spread stays clean",
    file: "ClimbMatchCore.jsx",
    find: REACTION,
    repl: '{...clickable(()=>setReactFor(c.id), { role: "checkbox" })} aria-checked={false}',
    expect: "pass",
    why: "clickable() supplies all three, whatever role it is given",
  },
];

let passed = 0;
for (const c of CASES) {
  const abs = path.join(ROOT, c.file);
  const original = fs.readFileSync(abs, "utf8");
  if (!original.includes(c.find)) {
    console.log(`${c.name}\n   SKIPPED — anchor not found: ${c.find}\n`);
    continue;
  }
  fs.writeFileSync(abs, original.replace(c.find, c.repl));
  try {
    const after = fs.readFileSync(abs, "utf8");
    if (sum(original) === sum(after)) {
      console.log(`${c.name}\n   HARNESS BUG — edit did not land; nothing was tested.\n`);
      continue;
    }
    const r = runGuard();
    const INERT_HEADER = "ANNOUNCE themselves and do not work";
    const firedInert = r.out.includes(INERT_HEADER);
    const got = firedInert ? "fail" : "pass";
    let ok = got === c.expect;
    // A failure for the WRONG reason is not a catch: the message must name the actual
    // defect, not merely be non-zero.
    if (ok && c.expect === "fail" && c.need && !c.need.test(r.out)) {
      ok = false;
      console.log(`   (inert check fired, but the message did not match ${c.need} — wrong reason)`);
    }
    if (ok) passed++;
    console.log(`${c.name}`);
    console.log(`   edit landed: yes (${sum(original)} -> ${sum(after)})`);
    console.log(`   expected ${c.expect}, guard ${got}  ${ok ? "OK" : "*** WRONG ***"}`);
    console.log(`   ${c.why}`);
    const line = r.out.split("\n").find((l) => /role="[a-z]+">/.test(l));
    if (line) console.log(`   guard said: ${line.trim()}`);
    console.log("");
  } finally {
    fs.writeFileSync(abs, original);
  }
}

const after = runGuard();
console.log(after.code === 0
  ? `restored: check:clickable is green again\n\n${passed}/${CASES.length} case(s) behaved as expected.`
  : `\n*** NOT RESTORED — failing after teardown:\n${after.out}`);
process.exit(after.code === 0 && passed === CASES.length ? 0 : 1);
