// Injection harness for check:area-surfaces. Every case proves its edit LANDED by checksum before
// the guard is believed — "the injection logged, the counter didn't move" is the shape this repo
// keeps recording, and a case that never modified the file reads as a guard that missed.
//
// The files are restored byte-identically afterwards and that is asserted, not hoped for.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const BROWSER = path.join(ROOT, "lib/DbAreaBrowser.jsx");
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);

const CASES = [
  { name: "fetch: drop areaCommentTargets from useComments", file: APP, expect: "fail",
    find: ".concat(areaCommentTargets)", repl: "",
    why: "the section would render an empty box for ever — with `comments` at 0 rows that is indistinguishable from a feature nobody has used" },
  { name: "render: ungate the comments section", file: APP, expect: "fail",
    find: "areaCommentTargets.length?<div style={{marginTop:4}}><Comments", repl: "false?<div style={{marginTop:4}}><Comments",
    why: "the section disappears while the fetch keeps running" },
  { name: "scope: let world/country/state be discussed", file: APP, expect: "fail",
    find: '!["world","country","state"].includes(dbAreaCtx.areaType)', repl: "true",
    why: "a continent is not a conversation" },
  { name: "directions: remove the link", file: BROWSER, expect: "fail",
    find: "https://www.google.com/maps/dir/?api=1&destination=", repl: "about:blank#",
    why: "a climber cannot navigate to a crag again" },
  { name: "directions: ungate area_type", file: BROWSER, expect: "fail",
    find: '["crag", "peak", "wall"].includes(area.area_type) && ', repl: "",
    why: "every area has a coordinate, so this offers directions to a state centroid" },
  { name: "caveat: stop mentioning the link", file: BROWSER, expect: "fail",
    find: ", any distance shown, and the Directions link are rough", repl: " and any distance shown are rough",
    why: "an approximate coordinate offered as a navigable destination with no warning" },
  // MUST PASS: reordering the concat is not a regression. A guard that demanded one spelling would
  // tell an author to rewrite working code, which is how a guard earns being ignored.
  { name: "reorder the concat (must PASS)", file: APP, expect: "pass",
    find: "commentTargets.concat(gpCommentTargets).concat(areaCommentTargets)",
    repl: "areaCommentTargets.concat(commentTargets).concat(gpCommentTargets)",
    why: "order does not change which ids are fetched" },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  if (!before.includes(c.find)) {
    console.log(`  BROKEN CASE  ${c.name} — its pattern is not in the file, so it proves nothing`);
    bad++; continue;
  }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  const landed = sum(c.file) !== beforeSum;
  let failed = false;
  try { execFileSync("node", [path.join(ROOT, "scripts/check-area-surfaces.mjs")], { cwd: ROOT, stdio: "pipe" }); }
  catch { failed = true; }
  fs.writeFileSync(c.file, before);
  const restored = sum(c.file) === beforeSum;

  const want = c.expect === "fail";
  const good = landed && restored && failed === want;
  if (!good) bad++;
  console.log(`  ${good ? "ok  " : "MISS"} ${c.name}`);
  console.log(`         edit landed: ${landed} | guard ${failed ? "FAILED" : "passed"} (wanted ${want ? "FAIL" : "pass"}) | restored: ${restored}`);
  if (!good) console.log(`         ${c.why}`);
}
console.log(bad ? `\n${bad} case(s) did not behave` : `\nall ${CASES.length} cases behaved`);
process.exit(bad ? 1 : 0);
