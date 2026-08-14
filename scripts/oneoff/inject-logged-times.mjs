// Injection-test the re-anchored check:logged-times. The anchor moved from the words
// "Scarf's Rule" (removed from the UI) to the estimator's FITNESS control, and an anchor
// swap is exactly where a guard quietly goes vacuous — so prove each assertion can still
// fail, and prove the edit LANDED before believing what the guard says about it.
import fs from "fs";
import { execSync } from "child_process";

const F = "RouteDetail.jsx";
const orig = fs.readFileSync(F, "utf8");

const CASES = [
  {
    name: "1. model ABOVE evidence (ordering assertion)",
    expect: "evidence sits ABOVE the model",
    edit: s => {
      // Move the whole logged-times evidence block to AFTER the fitness grid by deleting
      // its guard so it renders nothing where it is, and printing the heading later.
      const marker = '{"WHAT PARTIES ACTUALLY TOOK"}';
      if (!s.includes(marker)) throw new Error("marker gone");
      // Render the heading again, but after FITNESS, and suppress the original.
      return s.replace(marker, '{""}')
              .replace('>FITNESS</div>', '>FITNESS</div><div>{"WHAT PARTIES ACTUALLY TOOK"}</div>');
    },
  },
  {
    name: "2. estimator removed entirely (renders-without-logs assertion)",
    expect: "the estimate still renders without any logs",
    edit: s => s.replace('>FITNESS</div>', '>REMOVED</div>'),
  },
];

let pass = 0;
for (const c of CASES) {
  const next = c.edit(orig);
  if (next === orig) { console.log("SKIP (edit did not land):", c.name); continue; }
  fs.writeFileSync(F, next);
  let out = "";
  try { out = execSync("node scripts/check-logged-times.mjs 2>&1", { encoding: "utf8" }); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(F, orig);
  const line = out.split("\n").find(l => l.includes(c.expect)) || "(assertion line not printed)";
  const caught = /FAIL/.test(line);
  console.log((caught ? "CAUGHT  " : "MISSED  ") + c.name + "\n        " + line.trim());
  if (caught) pass++;
}
console.log("\n" + pass + "/" + CASES.length + " injections caught");
fs.writeFileSync(F, orig);
process.exit(pass === CASES.length ? 0 : 1);
