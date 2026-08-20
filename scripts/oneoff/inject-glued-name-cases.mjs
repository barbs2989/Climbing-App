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
//   arealatest revert AreaLatest's aria-label                      -> must PASS: a recorded
//              COVERAGE GAP (selArea is null, so the component never renders). Fails as stale
//              if that coverage ever arrives.
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
    // MUST PASS — and that is a recorded COVERAGE GAP, not an endorsement.
    //
    // `AreaLatest` carries the same glued-name defect as the route page's rows, and it was
    // fixed in the same commit. But the guard cannot SEE it: the component renders as
    // `selArea && …` on the Climbs tab and `selArea` starts null, so across a full 63-screen
    // walk it returns null every time. Reverting its aria-label therefore changes nothing the
    // guard can observe.
    //
    // RESOLVED 2026-08-20 — and the reason is NOT walk coverage. `AreaLatest` is gated on
    // `selArea`, which is written only on the SEED catalog path; production and this guard both
    // run with `VITE_USE_DB` set, so the Climbs tab renders `DbAreaBrowser`, which is never
    // handed `setSelArea`. **No real user sees this section either.** The guard is reporting
    // reality, so a pass here is correct and driving the browse navigation would not change it.
    //
    // Four attempts proved it the expensive way (a `?za=1` setSelArea opener; driven paths to a
    // peak, a canyon and a crag). The cheap tell was in the output: the selects that answered
    // were labelled "Select a country"/"Select a state" — DbAreaBrowser's — where the seed
    // `AreaBrowse` has one labelled "Jump to a state".
    //
    // Still kept as a case so the claim is TESTED: if these sections are ever revived against
    // the DB and this starts being caught, this case fails and whoever did it is told to delete
    // the note. See memory/three-climbs-tab-sections-dead-in-production.md.
    expect: "pass",
    want: null,
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

// Restoring on a SIGNAL is not enough, and this was learned by it failing. On a loaded box the
// runs were reaped with SIGKILL, which **no in-process handler can catch** — so the handler
// below is a convenience for the polite cases (Ctrl-C, SIGTERM) and cannot be the guarantee.
//
// The guarantee is this SENTINEL, which survives SIGKILL because it is on disk. Before the
// first write, the harness records which files it is about to modify; after restoring, it
// deletes the record. So a later run — or a human — can always tell an interrupted harness
// from a clean tree, and put the files back from git. Checked at STARTUP, because the leak is
// only dangerous while it is invisible: `git status` shows a plain "M" on files this work
// legitimately edits, and the worst leak (the `opener` case renaming `window.__routeOpen`)
// leaves a guard that is blind to the route screen while still printing prose about the flag.
const SENTINEL = "scripts/oneoff/.inject-glued-name-INPROGRESS";

if (fs.existsSync(SENTINEL)) {
  const stale = fs.readFileSync(SENTINEL, "utf8").split("\n").filter(Boolean);
  console.error("\n[harness] a previous run was interrupted and left these files injected:");
  for (const f of stale) console.error("    " + f);
  console.error("[harness] restoring them from git before starting.\n");
  try {
    execFileSync("git", ["checkout", "--", ...stale], { stdio: "inherit" });
  } catch {
    console.error("[harness] could not restore automatically — do it by hand, then re-run.");
    process.exit(1);
  }
  fs.unlinkSync(SENTINEL);
}

// Every file this harness touches, with its pristine contents, so a signal handler can put
// them all back on a catchable signal. Registered before any edit and cleared once reverted.
const PRISTINE = new Map();
let restoring = false;
function restoreAll(why) {
  if (restoring) return;
  restoring = true;
  let n = 0;
  for (const [f, txt] of PRISTINE) {
    try {
      if (fs.readFileSync(f, "utf8") !== txt) { fs.writeFileSync(f, txt); n++; }
    } catch {}
  }
  PRISTINE.clear();
  if (n) console.error(`\n[harness] restored ${n} file(s) after ${why} — the working tree is clean.`);
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { restoreAll(sig); process.exit(130); });
process.on("exit", () => restoreAll("exit"));
process.on("uncaughtException", (e) => { restoreAll("an exception"); console.error(e); process.exit(1); });

const pick = process.argv.slice(2).filter((a) => CASES[a]);
const names = pick.length ? pick : Object.keys(CASES);
const results = [];

for (const name of names) {
  const c = CASES[name];
  const originals = new Map();
  for (const [f] of c.edits) if (!originals.has(f)) originals.set(f, fs.readFileSync(f, "utf8"));
  // Hand the same snapshots to the signal handler BEFORE writing anything, and record the
  // file list on DISK so a SIGKILL cannot hide the injection.
  for (const [f, txt] of originals) if (!PRISTINE.has(f)) PRISTINE.set(f, txt);
  fs.writeFileSync(SENTINEL, [...originals.keys()].join("\n"));
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
  for (const f of originals.keys()) PRISTINE.delete(f);
  try { fs.unlinkSync(SENTINEL); } catch {}

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
