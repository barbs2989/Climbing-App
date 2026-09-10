// Injection suite for `probe-a-notification-that-goes-somewhere-says-so.mjs`.
//
// Case 1 is the real shipped defect, restored verbatim: the hand-written affordance list that
// omitted `recap` and `goto`. Case 2 is the one that matters structurally -- it keeps the helper
// and re-derives `tappable` beside it, which is how this class comes back.
//
// Every case proves its edit landed BY CHECKSUM, restores the file byte-identically, and is judged
// on the probe's OWN failure text. It also REFUSES any expectation that already appears in the
// clean run, because that is the text an assertion prints when it PASSES and would report MISSED
// against a probe firing correctly -- a mistake I made four times in one session before making it
// structural. The probe's wiring failures carry a "[wiring]" marker so the two texts differ and
// that refusal can be exact rather than something whole sections are exempt from.
//
// Two cases must stay SILENT: a comment quoting the old list is documentation, and adding a NEW
// destination kind is ordinary work that must not fire an affordance guard.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-a-notification-that-goes-somewhere-says-so.mjs");
const FILES = {
  core: path.join(ROOT, "ClimbMatchCore.jsx"),
  app: path.join(ROOT, "ClimbMatch.jsx"),
};
const LOCK = path.join(ROOT, ".inject-notif-target.lock");

const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
const run = () => {
  try { return execFileSync("node", [PROBE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};

let fd;
try { fd = fs.openSync(LOCK, "wx"); } catch { console.error("another run of this suite holds the lock"); process.exit(2); }
const release = () => { try { fs.closeSync(fd); fs.unlinkSync(LOCK); } catch {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(130); });

const before = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, sum(p)]));
const CLEAN = run();
if (!/ok — a notification that goes somewhere says so/.test(CLEAN)) {
  console.error("the probe is not green on this tree; every case would be unattributable.");
  process.exit(2);
}

const CASES = [
  // THE REAL DEFECT, restored verbatim.
  { name: "affordance-list-omits-recap-and-goto", file: "core", expect: "[wiring] ...and the OLD hand-written list is gone",
    find: "const _t=notifTarget(n);const tappable=!!_t;",
    repl: "const _t=notifTarget(n);const tappable=n.climberId!=null||!!n.tab||!!n.route||!!n.group;" },

  // recap loses its target entirely -- the row goes back to rendering as inert.
  { name: "helper-drops-recap", file: "core", expect: "`recap` notification resolved to",
    find: 'if(n.recap)return {kind:"go",to:{recap:n.recap}};', repl: "" },

  { name: "helper-drops-goto", file: "core", expect: "`goto` notification resolved to",
    find: 'if(n.goto)return {kind:"go",to:{tab:"crew",view:n.goto}};', repl: "" },

  // A row with no destination announced as a control -- the inert-control class held at zero.
  { name: "spread-becomes-unconditional", file: "core", expect: "[wiring] the spread is CONDITIONAL",
    find: "{...(_t?clickable(", repl: "{...(true?clickable(" },

  // The helper claiming a target for everything: every row becomes a button, some doing nothing.
  { name: "helper-never-returns-null", file: "core", expect: "claims a target",
    find: "  if(n.tab)return {kind:\"go\",to:{tab:n.tab,lbtab:n.lbtab}};\n  return null;",
    repl: "  return {kind:\"go\",to:{tab:n.tab||\"today\",lbtab:n.lbtab}};" },

  // Home's fallback is what makes ITS unconditional clickable honest.
  { name: "home-loses-its-fallback", file: "app", expect: "Home's fallback is gone",
    find: "if(n.lbtab)setLogbookTab(n.lbtab);return;}setNotifOpen(true);}", repl: "if(n.lbtab)setLogbookTab(n.lbtab);return;}" },

  // SILENT: documentation naming the old list is not the old list.
  { name: "SILENT-comment-quotes-the-old-list", file: "core", silent: true,
    find: "function notifTarget(n){",
    repl: "/* was: tappable = n.climberId!=null||!!n.tab||!!n.route||!!n.group */function notifTarget(n){" },

  // SILENT: a NEW destination kind is ordinary work.
  { name: "SILENT-a-new-destination-kind", file: "core", silent: true,
    find: 'if(n.route)return {kind:"go",to:{route:n.route}};',
    repl: 'if(n.area)return {kind:"go",to:{area:n.area}};if(n.route)return {kind:"go",to:{route:n.route}};' },
];

// An expectation that already appears in the GREEN run is the text an assertion prints when it
// PASSES, so it would report MISSED against a probe firing correctly. Refuse it up front rather
// than debugging a phantom miss -- I made exactly this mistake three times in one session.
for (const c of CASES) {
  if (!c.silent && CLEAN.includes(c.expect)) {
    console.error(`HARNESS BUG: "${c.name}" expects text that is already in the clean run — that is `
      + `the PASSING text, not the failure. Point it at the FAIL line.`);
    process.exit(2);
  }
}

let pass = 0;
for (const c of CASES) {
  const p = FILES[c.file];
  const original = fs.readFileSync(p, "utf8");
  const n = original.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name} — find string matched ${n} times`); continue; }
  const s0 = sum(p);
  fs.writeFileSync(p, original.replace(c.find, c.repl));
  const s1 = sum(p);
  let verdict;
  if (s1 === s0) verdict = "EDIT NEVER LANDED";
  else {
    const out = run();
    const fails = out.split("\n").filter((l) => /^\s*FAIL /.test(l) || /BROKEN PROBE/.test(l));
    if (c.silent) verdict = fails.length === 0 ? "ok (silent)" : "WRONGLY FIRED:\n      " + fails.join("\n      ");
    else if (!fails.length) verdict = "MISSED";
    else if (fails.some((l) => l.includes(c.expect))) verdict = "ok (caught)";
    else verdict = "WRONG FAILURE:\n      " + fails.join("\n      ");
  }
  fs.writeFileSync(p, original);
  if (sum(p) !== s0) { console.error(`TREE NOT RESTORED for ${c.name}`); process.exit(2); }
  const good = verdict.startsWith("ok");
  if (good) pass++;
  console.log(`  ${good ? "ok  " : "FAIL"}  ${c.name} — ${verdict}`);
}

for (const [k, p] of Object.entries(FILES)) {
  if (sum(p) !== before[k]) { console.error(`TREE NOT RESTORED: ${k}`); process.exit(2); }
}
console.log(`\n${pass}/${CASES.length}`);
process.exit(pass === CASES.length ? 0 : 1);
