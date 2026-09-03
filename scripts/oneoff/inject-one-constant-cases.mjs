#!/usr/bin/env node
// Injection suite for probe-one-constant-per-conversion.mjs.
//
// The probe's healthy output is "everything agrees", which is what a broken probe also
// prints. Each case reverts one of the five real edits, proves its edit LANDED by checksum,
// restores the file byte-identically, and asserts the failure names that file and constant.
//
// CASE 6 MUST PASS: the probe's own header names 3.281 and 0.621 while explaining why they
// are wrong, so a text-based scan would fail on its own documentation. Reading NumericLiteral
// nodes has no such failure mode, and case 6 is what pins that.
//
// CASE 7 MUST PASS TOO, and it is the subtler one: 0.621371 CONTAINS the digits "0.621", so a
// regex over source text flags the canonical constant as the low-precision one. Matching on
// the parsed VALUE cannot. That was a real defect in the first version of this scan.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

const CASES = [
  { name: "form-dist", file: "RouteDetail.jsx",
    why: "the contribute form's Distance current value (9 of 790 WA routes disagreed with the page)",
    find: '(route.distKm*0.621371).toFixed(1)+" mi"', repl: '(route.distKm*0.621).toFixed(1)+" mi"',
    expect: /RouteDetail\.jsx @\d+: 0\.621 —/ },
  { name: "form-gain", file: "RouteDetail.jsx",
    why: 'the contribute form\'s Elev. gain current value ("14001 ft" against the page\'s "14,000 ft")',
    find: 'uElev(route.gainFt||route.gainM*3.28084)', repl: 'uElev(route.gainFt||route.gainM*3.281)',
    expect: /RouteDetail\.jsx @\d+: 3\.281 —/ },
  { name: "form-loss", file: "RouteDetail.jsx",
    why: "the contribute form's Elev. loss current value (18 of 639)",
    find: 'uElev(route.lossFt||route.lossM*3.28084)', repl: 'uElev(route.lossFt||route.lossM*3.281)',
    expect: /RouteDetail\.jsx @\d+: 3\.281 —/ },
  { name: "card-gain-chip", file: "ClimbMatchCore.jsx",
    why: "the route-card gain chip, the same conversion a fourth way",
    find: 'Math.round(r.gainM*3.28084).toLocaleString()+" ft"', repl: 'Math.round(r.gainM*3.281).toLocaleString()+" ft"',
    expect: /ClimbMatchCore\.jsx @\d+: 3\.281 —/ },
  { name: "ascent-gain-tile", file: "ClimbMatchCore.jsx",
    why: "the ascent card's Gain tile, whose neighbouring Distance tile already used the shared uDist()",
    find: '["Gain",uElev(Math.round(r.gainM*3.28084))]', repl: '["Gain",uElev(Math.round(r.gainM*3.28))]',
    expect: /ClimbMatchCore\.jsx @\d+: 3\.28 —/ },

  { name: "comment-naming-the-constants", file: "ClimbMatchCore.jsx", mustPass: true,
    why: "a COMMENT naming 3.281 and 0.621 is documentation; flagging it would forbid the probe's own explanation",
    find: "function ago(d){",
    repl: "/* Why one constant: 3.281 and 0.621 are truncations of 3.28084 and 0.621371, and they\n"
        + "   round apart often enough to show a climber a different number. */\nfunction ago(d){" },
  { name: "canonical-contains-the-bad-digits", file: "ClimbMatchCore.jsx", mustPass: true,
    why: '0.621371 CONTAINS "0.621" — a text regex flags the canonical constant, a parsed value cannot',
    find: 'const uDist=km=>', repl: 'const _uDistPrecision=0.621371;const uDist=km=>' },
];

let pass = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const p = path.join(ROOT, c.file);
  const src = fs.readFileSync(p, "utf8");
  const n = src.split(c.find).length - 1;
  if (n !== 1) { console.log(`  ${c.name}: PATTERN matched ${n} times — the case is wrong, not the probe`); continue; }
  fs.writeFileSync(p, src.replace(c.find, c.repl));
  if (sum(c.file) === before) { console.log(`  ${c.name}: EDIT NEVER LANDED (checksum unmoved)`); continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", ["scripts/oneoff/probe-one-constant-per-conversion.mjs"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }

  fs.writeFileSync(p, src);
  if (sum(c.file) !== before) { console.error(`  ${c.name}: FAILED TO RESTORE ${c.file} — stop and check git status`); process.exit(1); }

  if (c.mustPass) {
    if (code === 0) { console.log(`  ${c.name}: PASS (silent, as required) — ${c.why}`); pass++; }
    else console.log(`  ${c.name}: WRONGLY FLAGGED — ${c.why}\n${out.split("\n").filter((l) => l.startsWith("  - ")).join("\n")}`);
    continue;
  }
  if (code !== 0 && c.expect.test(out)) { console.log(`  ${c.name}: CAUGHT — ${c.why}`); pass++; }
  else if (code !== 0) console.log(`  ${c.name}: failed, but NOT with the expected message — not a catch\n${out.split("\n").filter((l) => l.startsWith("  - ")).join("\n")}`);
  else console.log(`  ${c.name}: MISSED — the probe passed with the defect in place`);
}
console.log(`\n${pass}/${CASES.length} cases behaved as required`);
process.exit(pass === CASES.length ? 0 : 1);
