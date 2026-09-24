#!/usr/bin/env node
// Injection suite for check:trust-breakdown SECTION 9, widened.
//
// The defect: FullProfile computed a real climber's trust as
//   climber._real ? (realTrust != null ? realTrust : 0) : vScore(climber)
// so until the server score landed — and FOREVER after a failed read, because
// fetchTrustScore resolves null by design rather than rejecting — the tier came from
// trustTier(0), which is the bottom of the ladder. That colour is the gradient ring
// painted around the avatar, so an established climber's profile opened red as "New".
//
// Section 9 exists for exactly this class ("a reporter's trust is measured or absent,
// never a constant") and could not see it: its shape test wanted vScore in the
// CONSEQUENT and a bare NumericLiteral in the ALTERNATE, and this site has vScore in
// the alternate with the constant one conditional deeper. Hence the widening, and
// hence case `old-guard-is-blind`, which is the A/B proving the widening is what
// catches it rather than something else in the run.
//
// Contract, as the rest of this directory: every edit is proven to have LANDED by
// checksum, every file is restored BYTE-IDENTICALLY, cases are judged on the guard's
// own FAIL lines (never on an exit code, which a fail-closed path also produces), and
// any expectation that already appears in the CLEAN run is refused before anything is
// injected.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const GUARD = path.join(ROOT, "scripts", "check-trust-breakdown.mjs");

const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

// The shipped expression, and the one that was live before the repair.
const FIXED = "const ts=climber._real?realTrust:vScore(climber),tcol=ts!=null?trustTier(ts).color:C.border;";
const HISTORICAL = "const ts=climber._real?(realTrust!=null?realTrust:0):vScore(climber),_tt=trustTier(ts),tcol=_tt.color,tlbl=_tt.label;";

// The badge under the climber's name, and the unconditional client-model score it replaced.
// Section 10 of the guard is what watches these.
const BADGE = "{ts!=null?<TrustBadge score={ts} compact/>:null}";
const BADGE_HISTORICAL = "<TrustBadge score={vScore(climber)} compact/>";

// The résumé badge, and the shared real-id test both trust surfaces now ask.
const RESUME_BADGE = "{rts!=null?<TrustBadge score={rts}/>:null}";
const REALID = "const _realId=realProfileId(climber.id);";
const REALID_INLINE = 'const _realId=(typeof climber.id==="string"&&/^[0-9a-f]{8}-/.test(climber.id))?climber.id:null;';

// The widened shape test, and the one-sided one-level test it replaced.
const WIDE_HEAD = 'if (n.type === "ConditionalExpression") {\n          const isV =';
const NARROW = `if (n.type === "ConditionalExpression" && n.consequent && n.consequent.type === "CallExpression"
            && n.consequent.callee && n.consequent.callee.name === "vScore"
            && n.alternate && n.alternate.type === "NumericLiteral") {
          found.push(\`\${name}: a ? vScore(a) : \${n.alternate.value}\`);
        }`;

const CASES = [
  {
    name: "historical",
    why: "the defect exactly as it shipped: the constant is nested and vScore is on the far branch",
    edits: [[CORE, FIXED, HISTORICAL]],
    expect: "falls back to the constant 0",
  },
  {
    name: "plain-one-sided",
    why: "the original spelling must still fire — a widening that lost the old catch is a regression",
    edits: [[CORE, FIXED, "const ts=climber._real?vScore(climber):50,tcol=trustTier(ts).color;"]],
    expect: "falls back to the constant 50",
  },
  {
    name: "SILENT-comment-quoting-the-defect",
    why: "section 9 reads the app through Babel, so its own documentation must be invisible to it",
    edits: [[CORE, FIXED, "/* was: climber._real?(realTrust!=null?realTrust:0):vScore(climber) */" + FIXED]],
    silent: true,
  },
  {
    name: "SILENT-vscore-against-a-real-value",
    why: "a vScore branch opposite another MEASURED value is correct code; firing on it would forbid the fix",
    edits: [[CORE, FIXED, "const ts=climber._real?realTrust:vScore(climber),tcol=ts!=null?trustTier(ts).color:C.border,_alt=climber._real?vScore(climber):realTrust;void _alt;"]],
    silent: true,
  },
  {
    name: "badge-back-to-the-client-model",
    why: "the real defect: an unconditional vScore(climber) badge, capped at 25 for every real climber while the ring beside it reaches 84",
    edits: [[CORE, BADGE, BADGE_HISTORICAL]],
    expect: "hands vScore(climber) to a TrustBadge again",
  },
  {
    name: "badge-ungated",
    why: "dropping the null gate prints a badge for a score that has not arrived, which is what the ring fix exists to avoid",
    edits: [[CORE, BADGE, "<TrustBadge score={ts} compact/>"]],
    expect: "no longer reads the gated",
  },
  {
    name: "SILENT-jsx-comment-quoting-the-badge-defect",
    why: "the fix explains itself in a JSX comment naming the forbidden expression; section 10 strips {/* */} so it cannot fail on its own documentation",
    edits: [[CORE, BADGE, "{/* never: <TrustBadge score={vScore(climber)} compact/> */}" + BADGE]],
    silent: true,
  },
  {
    name: "resume-badge-back-to-the-client-model",
    why: "the same cap on the one trust surface a climber can export and send to somebody",
    edits: [[CORE, RESUME_BADGE, "<TrustBadge score={vScore(climber)}/>"]],
    expect: "Resume hands vScore(climber) to a TrustBadge again",
  },
  {
    name: "resume-badge-ungated",
    why: "the résumé is reached before its fetch resolves, so an ungated badge prints a score that has not arrived",
    edits: [[CORE, RESUME_BADGE, "<TrustBadge score={rts}/>"]],
    expect: "no longer reads the gated",
  },
  {
    name: "realid-reinlined",
    why: "two surfaces asking who is real in two ways is how they came to disagree; this is the historical inline test put back",
    edits: [[CORE, REALID, REALID_INLINE]],
    expect: "re-inlined the real-id test",
  },
  {
    name: "old-guard-is-blind",
    why: "A/B: with the defect restored AND the scan narrowed back, the run must go GREEN — that is what shows the widening is load-bearing rather than decorative",
    edits: [[CORE, FIXED, HISTORICAL], [GUARD, WIDE_HEAD, "SPLICE_NARROW"]],
    silent: true,
  },
];

function runGuard() {
  try {
    return execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
}
const failLines = (out) => out.split("\n").filter((l) => l.includes("FAIL"));

// Narrowing the guard means putting the old block back in place of the new one. The new
// block runs from its `if` head to the line that closes it; splice by locating both ends
// rather than restating the whole thing, so this case cannot rot into a stale copy.
function narrowGuard(src) {
  const i = src.indexOf(WIDE_HEAD);
  if (i < 0) return null;
  const end = src.indexOf("\n        }", src.indexOf("found.push(", i));
  if (end < 0) return null;
  return src.slice(0, i) + NARROW.replace(/^\s+/, "") + src.slice(end + "\n        }".length);
}

const before = { [CORE]: sum(CORE), [GUARD]: sum(GUARD) };

console.log("Capturing the clean run first — an expectation that already matches it proves nothing.\n");
const clean = runGuard();
const cleanFails = failLines(clean);
if (cleanFails.length) {
  console.error("REFUSED: the tree is not green, so no case can be attributed.\n" + cleanFails.join("\n"));
  process.exit(1);
}
for (const c of CASES) {
  if (c.expect && clean.includes(c.expect)) {
    console.error(`REFUSED: case ${c.name} expects text already present in the CLEAN run — it would pass against a guard that never fired.`);
    process.exit(1);
  }
}

let pass = 0;
for (const c of CASES) {
  const snap = new Map();
  for (const [f] of c.edits) if (!snap.has(f)) snap.set(f, fs.readFileSync(f, "utf8"));

  let landed = true;
  for (const [f, find, repl] of c.edits) {
    const src = fs.readFileSync(f, "utf8");
    let next;
    if (repl === "SPLICE_NARROW") next = narrowGuard(src);
    else {
      if (src.split(find).length - 1 !== 1) { landed = false; break; }
      next = src.replace(find, repl);
    }
    if (next === null || next === src) { landed = false; break; }
    fs.writeFileSync(f, next);
  }

  let verdict;
  if (!landed) verdict = "HARNESS BUG — the edit did not land";
  else {
    const out = runGuard();
    const fails = failLines(out);
    if (c.silent) {
      verdict = fails.length === 0 ? "ok (silent, as required)" : "FIRED ON CORRECT WORK:\n      " + fails.join("\n      ");
    } else {
      const hit = fails.some((l) => l.includes(c.expect));
      verdict = hit ? "ok (caught, naming its own defect)"
        : fails.length ? "WRONG FAILURE — fired, but not on this rule:\n      " + fails.join("\n      ")
        : "MISSED — the guard stayed green";
    }
  }

  for (const [f, src] of snap) fs.writeFileSync(f, src);

  const good = verdict.startsWith("ok");
  if (good) pass++;
  console.log(`${good ? "ok  " : "FAIL"}  ${c.name} — ${c.why}\n      ${verdict}\n`);
}

for (const [f, h] of Object.entries(before)) {
  if (sum(f) !== h) { console.error(`TREE NOT RESTORED: ${path.relative(ROOT, f)}`); process.exit(1); }
}
console.log(`tree restored byte-identically.\n${pass}/${CASES.length} behaved as declared.`);
process.exit(pass === CASES.length ? 0 : 1);
