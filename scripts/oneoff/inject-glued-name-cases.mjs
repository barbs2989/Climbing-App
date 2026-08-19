// Injection harness for the check:a11y-badges widening (letter<->digit -> word<->word) and
// for its new route-detail walk.
//
// Every case proves its edit LANDED by checksum before it judges the guard. That is not
// ceremony: this repo has twice recorded an injection that reported "guard missed" when the
// edit had silently not applied (a pattern that no longer matched, an anchor occurring twice
// so the wrong copy was edited). "injection logged, counter didn't move" is the tell.
//
// Usage:  node scripts/oneoff/inject-glued-name-cases.mjs [caseName ...]
//
//   route     revert RouteDetail's "Recently climbed" aria-label   -> must FAIL naming it
//   arealatest revert AreaLatest's aria-label                      -> must FAIL naming it
//   narrow    restore the glue AND narrow the needle to digits     -> must PASS (proves the
//             widening is what catches it, not something else)
//   opener    break the ?zr=1 route walk                           -> must FAIL, not pass
//
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const GUARD = "scripts/check-a11y-badge-names.mjs";
const RD = "RouteDetail.jsx";
const CORE = "ClimbMatchCore.jsx";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 12);

// The aria-label expressions the fix added, as they appear in the two files.
const RD_LABEL = ' aria-label={aa.user+", "+String(_out||"report").replace("✓ ","")+", "+ago(aa.date)}';
const CORE_LABEL = ' aria-label={a.user+", "+String(_out||"report").replace("✓ ","")+", "+r.name+", "+ago(a.date)}';
const WIDE_NEEDLE = 'if (/\\w/.test(a) && /\\w/.test(b)) needle = (prev.match(/\\w+$/) || [""])[0] + (cur.match(/^\\w+/) || [""])[0];';
const NARROW_NEEDLE = 'if (/[A-Za-z]/.test(a) && /[0-9]/.test(b)) needle = (prev.match(/[A-Za-z]+$/) || [""])[0] + (cur.match(/^[0-9]+/) || [""])[0];';

const CASES = {
  route: {
    // MUST FAIL. The defect the widening was written for.
    expect: "fail",
    want: /Attempt/,
    edits: [[RD, RD_LABEL, ""]],
  },
  arealatest: {
    // MUST FAIL. The same defect one file over — the instance that was NOT reachable by the
    // guard until the row became a real control.
    expect: "fail",
    want: /Attempt|Summited/,
    edits: [[CORE, CORE_LABEL, ""]],
  },
  narrow: {
    // MUST PASS. Restores the glue and narrows the needle back to letter<->digit. A pass here
    // is the proof that the WIDENING is load-bearing: without it the defect is invisible.
    expect: "pass",
    want: null,
    edits: [[RD, RD_LABEL, ""], [GUARD, WIDE_NEEDLE, NARROW_NEEDLE]],
  },
  opener: {
    // MUST FAIL, and must not pass over an unmeasured screen.
    expect: "fail",
    want: /route detail|__routeOpen/,
    edits: [[GUARD, 'window.__routeOpen === true', 'window.__routeOpenXX === true']],
  },
};

const pick = process.argv.slice(2).filter((a) => CASES[a]);
const names = pick.length ? pick : Object.keys(CASES);
const results = [];

for (const name of names) {
  const c = CASES[name];
  const originals = new Map();
  for (const [f] of c.edits) if (!originals.has(f)) originals.set(f, fs.readFileSync(f, "utf8"));
  const before = new Map([...originals.keys()].map((f) => [f, sum(f)]));

  let landed = true;
  for (const [f, from, to] of c.edits) {
    const s = fs.readFileSync(f, "utf8");
    const n = s.split(from).length - 1;
    if (n !== 1) { console.error(`  ${name}: ANCHOR matched ${n}x in ${f} — cannot inject`); landed = false; break; }
    fs.writeFileSync(f, s.replace(from, to));
  }
  if (landed) for (const f of originals.keys()) if (sum(f) === before.get(f)) landed = false;

  let out = "", code = 0;
  if (landed) {
    try {
      out = execFileSync("node", [GUARD], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 900000 });
    } catch (e) { code = e.status == null ? -1 : e.status; out = (e.stdout || "") + (e.stderr || ""); }
  }
  for (const [f, s] of originals) fs.writeFileSync(f, s);

  const failed = code !== 0;
  const ok = !landed ? false
    : c.expect === "fail" ? failed && (!c.want || c.want.test(out))
    : !failed;
  results.push({ name, landed, code, ok, expect: c.expect });
  console.log(`${ok ? "CAUGHT " : "MISSED "} ${name.padEnd(11)} expect=${c.expect.padEnd(4)} exit=${code} editLanded=${landed}`);
  if (!ok) console.log(out.split("\n").filter((l) => /announce|Attempt|Summited|route detail|FAILED|ok —/.test(l)).slice(0, 8).map((l) => "      " + l).join("\n"));
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} cases behaved as specified.`);
process.exit(bad.length ? 1 : 0);
