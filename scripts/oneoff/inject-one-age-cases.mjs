#!/usr/bin/env node
// Injection suite for probe-one-age-for-one-date.mjs.
//
// The probe's healthy output is "everything agrees", which is also exactly what a broken
// probe prints -- so the only evidence it works is that it FAILS on the defects it names.
// Each case reproduces one of the four real edits by reverting it, proves its edit LANDED by
// checksum (a checksum that did not move means the pattern was wrong, not that the probe
// missed), restores the file byte-identically, and asserts the failure text names that
// specific defect. An injection that produces a different failure is not a catch.
//
// CASE 5 MUST PASS. The probe's own comments name the strings it forbids, so a text-based
// scan would fail on its own documentation; case 5 adds a fresh comment containing both
// forbidden shapes and requires silence.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

const CASES = [
  {
    name: "fresh-ladder",
    why: "RouteDetail's private age ladder, restored exactly as it stood: rounds where ago() floors",
    file: "RouteDetail.jsx",
    find: 'const _fresh=_latest?"Updated "+ago(_latest):"";',
    repl: 'const _dago=_latest?Math.round((new Date()-new Date(String(_latest).slice(0,10)+"T12:00:00"))/86400000):null;'
        + 'const _fresh=_dago==null?"":(_dago<=0?"Updated today":_dago===1?"Updated yesterday":'
        + '(_dago<14?"Updated "+_dago+"d ago":(_dago<60?"Updated "+Math.round(_dago/7)+"w ago":'
        + '"Updated "+Math.round(_dago/30)+"mo ago")));',
    expect: /is reported as ".+" and as ".+" on one screen/,
    section: "screen",
  },
  {
    name: "badge-verified-routedetail",
    why: "the What's changed badge calling a plain report count verified",
    file: "RouteDetail.jsx",
    find: '{"✓ "+acts.length+" report"+(acts.length!==1?"s":"")}',
    repl: '{"✓ "+acts.length+" verified report"+(acts.length!==1?"s":"")}',
    expect: /RouteDetail\.jsx @\d+: ".* verified report/,
    section: "static+screen",
  },
  {
    name: "badge-verified-core",
    why: "the climb-matches list doing the same thing on a screen the browser half never opens",
    file: "ClimbMatchCore.jsx",
    find: '{"✓ "+condRep(p[0])+" report"+(condRep(p[0])!==1?"s":"")}',
    repl: '{"✓ "+condRep(p[0])+" verified report"+(condRep(p[0])!==1?"s":"")}',
    expect: /ClimbMatchCore\.jsx @\d+: ".* verified report/,
    section: "static only — this is why the static half exists",
  },
  {
    name: "feed-ladder",
    why: "Home's friend feed, the third ladder — also off the Reports tab",
    file: "ClimbMatch.jsx",
    find: "var when=ago(x.a.date);",
    repl: 'var dago=Math.round((new Date()-new Date(String(x.a.date)+"T12:00:00"))/86400000);'
        + 'var when=dago<=0?"today":dago===1?"yesterday":(dago<30?dago+"d ago":Math.round(dago/30)+"mo ago");',
    expect: /ClimbMatch\.jsx @\d+: "mo ago" — a second age ladder/,
    section: "static only — this is why the static half exists",
  },
  {
    name: "comment-naming-both",
    why: "a COMMENT naming the forbidden strings is documentation, and a probe that flagged it would forbid its own explanation",
    file: "ClimbMatchCore.jsx",
    find: "function ago(d){",
    repl: '/* Explaining the rule: a second ladder must not print "44mo ago", and a report count '
        + 'must never be labelled " verified report". */\nfunction ago(d){',
    mustPass: true,
    section: "static",
  },
];

let pass = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const p = path.join(ROOT, c.file);
  const src = fs.readFileSync(p, "utf8");
  const n = src.split(c.find).length - 1;
  if (n !== 1) { console.log(`  ${c.name}: PATTERN matched ${n} times — the case is wrong, not the probe`); continue; }
  fs.writeFileSync(p, src.replace(c.find, c.repl));
  const after = sum(c.file);
  if (after === before) { console.log(`  ${c.name}: EDIT NEVER LANDED (checksum unmoved)`); continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", ["scripts/oneoff/probe-one-age-for-one-date.mjs"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }

  fs.writeFileSync(p, src);
  if (sum(c.file) !== before) { console.error(`  ${c.name}: FAILED TO RESTORE ${c.file} — stop and check git status`); process.exit(1); }

  if (c.mustPass) {
    if (code === 0) { console.log(`  ${c.name}: PASS (silent, as required) — ${c.why}`); pass++; }
    else console.log(`  ${c.name}: WRONGLY FLAGGED — the probe forbids its own documentation\n${out.split("\n").filter((l) => l.startsWith("  - ")).join("\n")}`);
    continue;
  }
  const named = c.expect.test(out);
  if (code !== 0 && named) { console.log(`  ${c.name}: CAUGHT [${c.section}] — ${c.why}`); pass++; }
  else if (code !== 0) console.log(`  ${c.name}: failed, but NOT with the expected message — that is not a catch\n${out.split("\n").filter((l) => l.startsWith("  - ")).join("\n")}`);
  else console.log(`  ${c.name}: MISSED — the probe passed with the defect in place`);
}
console.log(`\n${pass}/${CASES.length} cases behaved as required`);
process.exit(pass === CASES.length ? 0 : 1);
