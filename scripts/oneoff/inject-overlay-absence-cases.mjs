// Two injections for check:overlay-absence. Each proves its edit landed by checksum and restores
// the file byte-identically.
//   1. Revert gating to the wide window -- the real defect: logPickOpen is accused STALE against a
//      flag belonging to the `resumeFor` overlay next door, and the run must now FAIL rather than
//      print advice and exit 0.
//   2. Remove a CHECKED entry that is genuinely needed -- it must resurface as NOT YET READ.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";

import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const G = path.join(ROOT, "scripts/check-overlay-absence.mjs");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(G)).digest("hex").slice(0, 12);

const CASES = [
  { name: "1. gating back on the wide window (the real defect)",
    find: "gated: FLAGS.filter((f) => own.text.includes(f))",
    repl: "gated: FLAGS.filter((f) => wide.text.includes(f))",
    needs: /STALE: logPickOpen/ },
  { name: "2. a genuinely needed CHECKED entry removed",
    find: "  calOpen: 'Calendar",
    repl: "  _calOpenRemoved: 'Calendar",
    needs: /NOT YET READ[\s\S]*calOpen|calOpen[\s\S]*no flag and no recorded reason/ },
];

/* Case 3 lives in lib/, not in the guard, so it is applied to a different file. It pins the
   widening: dashOpen is gated ONLY because DbGuideDashboard branches on its own read error, and
   nothing hand-written says so any more. Strip that branch and the overlay must resurface as
   unexamined -- which is what makes removing its CHECKED entry safe rather than a quiet loss. */
const LIBCASE = {
  name: "3. a lib component stops branching on its own read error",
  file: path.join(ROOT, "lib/DbGuideDashboard.jsx"),
  // Rename EVERY error-ish token, not just `isError`: the destructured names (inqError, revError,
  // profileError) are themselves the branch, so stripping one alternative leaves the others and the
  // component still reads as gated. The first version did exactly that and reported a guard miss.
  find: "Error", repl: "Errr",
  // And the needle must demand a FAILURE, not merely the overlay's name -- the first version matched
  // the GATED summary line, so it read "named it: true" on a run that exited 0.
  needs: /NOT YET READ[\s\S]*dashOpen/,
};

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(G, "utf8"), b = sum();
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`FAIL  ${c.name} — pattern matched ${n} times`); bad++; continue; }
  fs.writeFileSync(G, before.replace(c.find, c.repl));
  const landed = sum() !== b;
  let out = "", code = 0;
  try { out = execFileSync("node", [G], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(G, before);
  const restored = sum() === b;
  const good = landed && restored && code !== 0 && c.needs.test(out);
  if (!good) bad++;
  console.log(`${good ? "  ok  " : "FAIL  "}${c.name}`);
  console.log(`        landed: ${landed}  restored: ${restored}  exit ${code}  named it: ${c.needs.test(out)}`);
}
// Case 3: same protocol, different file.
{
  const c = LIBCASE;
  const before = fs.readFileSync(c.file, "utf8");
  const bsum = crypto.createHash("sha1").update(before).digest("hex").slice(0, 12);
  const n = before.split(c.find).length - 1;
  if (n < 1) { console.log(`FAIL  ${c.name} — anchor not found`); bad++; }
  else {
    fs.writeFileSync(c.file, before.split(c.find).join(c.repl));
    const landed = crypto.createHash("sha1").update(fs.readFileSync(c.file)).digest("hex").slice(0, 12) !== bsum;
    let out = "", code = 0;
    try { out = execFileSync("node", [G], { cwd: ROOT, encoding: "utf8" }); }
    catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
    fs.writeFileSync(c.file, before);
    const restored = crypto.createHash("sha1").update(fs.readFileSync(c.file)).digest("hex").slice(0, 12) === bsum;
    const good = landed && restored && code !== 0 && c.needs.test(out);
    if (!good) bad++;
    console.log(`${good ? "  ok  " : "FAIL  "}${c.name}`);
    console.log(`        landed: ${landed}  restored: ${restored}  exit ${code}  named it: ${c.needs.test(out)}`);
  }
}

console.log(bad ? `\n${bad} case(s) wrong.` : "\nall cases behave as required.");
process.exitCode = bad ? 1 : 0;
