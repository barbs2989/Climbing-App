// Injection suite for check:impossible-leg. The guard's healthy output is "everything ok", which
// is exactly what a broken guard prints, so each case reproduces a specific defect and requires
// the guard to fail — and two cases require it to stay SILENT, because a guard that flags correct
// work is one people learn to ignore.
//
// Every case proves its edit LANDED by checksum before believing what the guard says about it,
// and restores the file byte-identically afterwards. Checksum movement proves an edit happened,
// not that it was the right one — case 3 is the one that needs that distinction.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const sum = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

const CASES = [
  { name: "the real defect: legMi returns the raw subtraction",
    find: "  return seg<chord*0.98?null:seg;", repl: "  return seg;",
    want: "fail", note: "what the page did before — 473 impossible legs printed" },
  { name: "suppressing EVERYTHING is not the fix either",
    find: "  return seg<chord*0.98?null:seg;", repl: "  return null;",
    want: "fail", note: "a guard that only ever asserts absence is satisfied by deleting the feature" },
  { name: "dropping the wpPlaced gate suppresses distances on unplaced pins",
    find: "  if(!wpPlaced(prev)||!wpPlaced(wp))return seg;", repl: "  if(false)return seg;",
    want: "fail", note: "an unplaced pin cannot contradict anything; suppressing there removes a distance from every route with no coordinates" },
  { name: "the one-sidedness: flagging a leg LONGER than the chord",
    find: "  return seg<chord*0.98?null:seg;", repl: "  return (seg<chord*0.98||seg>chord*3)?null:seg;",
    want: "fail", note: "every real trail is longer than its chord; this would suppress almost every distance on the site" },
  { name: "cumMi returning the raw stored distance",
    find: "  if(!th)return mi;", repl: "  return mi;",
    want: "fail", note: "197 of 2,567 cumulative distances the waypoint row prints, and 35 of 412 in CAMPING & BIVY, are impossible from the route's own trailhead" },
  { name: "a comment naming the forbidden shape must stay SILENT",
    find: "export function legMi(prev,wp){", repl: "/* seg<chord is impossible; return seg would be the old behaviour */\nexport function legMi(prev,wp){",
    want: "pass", note: "documentation is not a regression" },
  { name: "widening the tolerance to 50% must stay SILENT on the fixture",
    find: "  return seg<chord*0.98?null:seg;", repl: "  return seg<chord*0.5?null:seg;",
    want: "pass", note: "0.5 mi against a 4.32 mi chord is still under half, so the fixture's impossible leg is still caught — this pins that the cases test BEHAVIOUR and not the constant" },
];

const original = readFileSync(CORE, "utf8");
const base = sum(original);
let bad = 0;
for (const c of CASES) {
  if (original.split(c.find).length - 1 !== 1) {
    console.log(`  BROKEN CASE  ${c.name}\n     the find text does not appear exactly once`);
    bad++; continue;
  }
  writeFileSync(CORE, original.split(c.find).join(c.repl));
  const after = sum(readFileSync(CORE, "utf8"));
  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts/check-impossible-leg.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status ?? 1; out = (e.stdout || "") + (e.stderr || ""); }
  writeFileSync(CORE, original);
  const restored = sum(readFileSync(CORE, "utf8"));
  const landed = after !== base;
  const fired = code !== 0;
  const ok = landed && restored === base && (c.want === "fail" ? fired : !fired);
  if (!ok) bad++;
  const fails = (out.match(/^ *FAIL /gm) || []).length;
  console.log(`  ${ok ? "ok  " : "MISS"} [${c.want}] ${c.name}`);
  console.log(`         edit landed: ${landed}   restored: ${restored === base}   guard ${fired ? `FAILED (${fails} assertion(s))` : "passed"}`);
  if (!ok) console.log(`         why it matters: ${c.note}`);
}
console.log(bad ? `\n${bad} of ${CASES.length} case(s) did not behave as declared.` : `\nall ${CASES.length} cases behaved as declared; ClimbMatchCore.jsx restored byte-identically.`);
process.exit(bad ? 1 : 0);
