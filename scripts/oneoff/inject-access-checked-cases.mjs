// Injection harness for check:access-checked-line.
//
// The guard's healthy output is "everything ok", which is also what a guard that measures nothing
// prints. These cases each reproduce a way the feature could break, prove the edit LANDED by
// checksum before believing the verdict, and restore the file byte-identically.
//
// Case 3 must PASS: a comment mentioning the render site is documentation, not a regression.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RD = path.join(ROOT, "RouteDetail.jsx");
const ROAD = path.join(ROOT, "lib/road.js");
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

const CASES = [
  { name: "render site removed", file: RD, expect: "fail",
    why: "the column would be populated and reach no screen — the descent_text defect",
    edit: (s) => s.replace(
      `{accessCheckedLine(route)?<div style={{marginTop:2,fontSize:11.5,color:C.textMuted,lineHeight:1.5}}>{accessCheckedLine(route)}</div>:null}`, "") },

  { name: "line returned even with no date", file: ROAD, expect: "fail",
    why: "an undated row would claim it had been checked — a fabricated verification on ~1,000 routes",
    edit: (s) => s.replace(
      "return when ? `Road and access last checked against a published source on ${when}.` : null;",
      "return `Road and access last checked against a published source on ${when || \"an unknown date\"}.`;") },

  { name: "locale formatting", file: ROAD, expect: "fail",
    why: "the rendered date would differ per machine — green locally, red in CI",
    edit: (s) => s.replace(
      "return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;",
      "return d.toLocaleDateString();") },

  { name: "a comment naming the render site", file: ROAD, expect: "pass",
    why: "documentation is not a regression; a guard that flags it would forbid explaining itself",
    edit: (s) => s.replace("const MONTHS =", "// accessCheckedLine(route) renders under the road rows in GETTING THERE.\nconst MONTHS =") },

  { name: "export renamed", file: ROAD, expect: "fail",
    why: "must report ANCHOR LOST rather than passing over a function it could not find",
    edit: (s) => s.replace("export function accessCheckedLine(", "export function accessCheckedLineX(") },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const after = c.edit(before);
  if (after === before) { console.log(`EDIT NEVER LANDED  ${c.name} — the pattern did not match; the case proves nothing`); bad++; continue; }
  fs.writeFileSync(c.file, after);
  if (sum(c.file) === beforeSum) { console.log(`EDIT NEVER LANDED  ${c.name} — checksum unchanged`); fs.writeFileSync(c.file, before); bad++; continue; }

  let code = 0;
  try { execFileSync("node", [path.join(ROOT, "scripts/check-access-checked-line.mjs")], { cwd: ROOT, stdio: "pipe" }); }
  catch (e) { code = e.status || 1; }

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`RESTORE FAILED     ${c.name}`); bad++; continue; }

  const caught = code !== 0;
  const want = c.expect === "fail";
  const verdict = caught === want ? "ok    " : (want ? "MISSED" : "FALSE+");
  if (caught !== want) bad++;
  console.log(`${verdict}  ${c.name}  (expected ${c.expect}, guard ${caught ? "failed" : "passed"})`);
  console.log(`        ${c.why}`);
}

console.log(bad ? `\n${bad} case(s) wrong` : `\nall ${CASES.length} cases behaved as documented`);
process.exit(bad ? 1 : 0);
