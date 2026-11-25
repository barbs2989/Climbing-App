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
    file: "src/components/ConsensusPanel.tsx", // PR57 moved it from RouteDetail.jsx
    /* Repointed 2026-11-18. The card now prints the newest date ONCE (the summary line: "7 reports · latest 1w ago by
       Sam"), so there is no second print on the screen to disagree with and the "on one screen" comparison has nothing
       to compare; the static half is what catches a private ladder coming back. The old anchor was the "Updated ..."
       strap, which the summary line replaced. */
    find: '(n===1?"":"latest ")+ago(_latest)+',
    repl: '(n===1?"":"latest ")+(function(d){const g=Math.round((Date.now()-new Date(String(d).slice(0,10)+"T12:00:00").getTime())/86400000);'
        + 'return g<=0?"today":g<14?g+"d ago":g<60?Math.round(g/7)+"w ago":Math.round(g/30)+"mo ago";})(_latest)+',
    expect: /src\/components\/ConsensusPanel\.tsx @\d+: ".*mo ago" — a second age ladder/,
    section: "static",
  },
  /* badge-verified-routedetail went with its target: the What's changed card (BetaDiff.tsx) was folded
     into the Community Consensus freshness row on the Reports tab, so there is no "✓ N reports" badge
     there to mislabel. badge-verified-core below still covers the same rule. */
  {
    name: "badge-verified-core",
    why: "the climb-matches list doing the same thing on a screen the browser half never opens",
    file: "lib/PartnerSearch.jsx",
    // repN = condRep for seed rows, the DB report count for DB rows (real-data parity, batch 1)
    find: '{"✓ "+repN(r)+" report"+(repN(r)!==1?"s":"")}',
    repl: '{"✓ "+repN(r)+" verified report"+(repN(r)!==1?"s":"")}',
    expect: /lib\/PartnerSearch\.jsx @\d+: ".* verified report/,
    section: "static only — this is why the static half exists",
  },
  {
    name: "feed-ladder",
    why: "Home's friend feed, the third ladder — also off the Reports tab",
    file: "src/components/TodayTab.tsx", // PR61 lifted Home out of App; lint made the var a const
    find: "const when=ago(x.a.date);",
    repl: 'const dago=Math.round((new Date()-new Date(String(x.a.date)+"T12:00:00"))/86400000);'
        + 'const when=dago<=0?"today":dago===1?"yesterday":(dago<30?dago+"d ago":Math.round(dago/30)+"mo ago");',
    expect: /(?:ClimbMatch\.jsx|src\/components\/TodayTab\.tsx) @\d+: "mo ago" — a second age ladder/,
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
