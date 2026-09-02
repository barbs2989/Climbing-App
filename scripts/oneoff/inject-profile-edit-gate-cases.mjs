// Injection suite for check:profile-edit-gate.
//
// Every case proves its edit LANDED by checksum before the guard is believed -- a checksum that did
// not move means the pattern was wrong, which reads exactly like "the guard missed" and has sent
// three separate sessions in this repo hunting a checker that was fine. Each case restores the file
// byte-identically afterwards.
//
// Cases 1-4 are the real historical defect, taken apart one link at a time: the guard must fail on
// each link independently, or it is passing on the strength of its neighbours.
// CASE 5 MUST STAY SILENT -- a comment naming the flag is documentation, and a guard that flagged
// it would forbid explaining itself.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const AUTH = path.join(ROOT, "lib/auth.js");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "1. getProfile discards the error again (the original defect)",
    file: AUTH, expect: "fail", needs: /throws on a read error/,
    find: "  const { data, error } = await supabase.from(\"profiles\").select(\"*\").eq(\"id\", id).single();\n  if (error && error.code !== \"PGRST116\") throw error;\n  return data;",
    repl: "  return (await supabase.from(\"profiles\").select(\"*\").eq(\"id\", id).single()).data;",
  },
  {
    name: "2. the latch is set before awaiting and never released",
    file: APP, expect: "fail", needs: /latch is RELEASED on failure/,
    find: "catch(function(){profileHydratedRef.current=false;setProfileReadFailed(true);})",
    repl: "catch(function(){setProfileReadFailed(true);})",
  },
  {
    name: "3. the failure is swallowed again",
    file: APP, expect: "fail", needs: /recorded rather than swallowed/,
    find: "catch(function(){profileHydratedRef.current=false;setProfileReadFailed(true);})",
    repl: "catch(function(){profileHydratedRef.current=false;})",
  },
  {
    name: "4. the refusal is kept but moved AFTER the draft is built (ORDER)",
    file: APP, expect: "fail", needs: /BEFORE setEditDraft|returns rather than falling through/,
    find: "openEdit=()=>{if(profileUnavailable){showToast(",
    repl: "openEdit=()=>{if(false){showToast(",
    also: { find: "showRealName:showRealName});}", repl: "showRealName:showRealName});if(profileUnavailable)return;}" },
  },
  {
    name: "5. MUST PASS — a comment naming the flag is documentation, not a regression",
    file: APP, expect: "pass",
    find: "const profileUnavailable=!!(uid&&profileReadFailed);",
    repl: "/* profileUnavailable gates openEdit; see check:profile-edit-gate. */const profileUnavailable=!!(uid&&profileReadFailed);",
  },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  let next = before;
  const apply = (f, r) => {
    const n = next.split(f).length - 1;
    if (n !== 1) { console.log(`  SKIP — pattern matched ${n} times, not 1`); return false; }
    next = next.replace(f, r);
    return true;
  };
  if (!apply(c.find, c.repl)) { bad++; continue; }
  if (c.also && !apply(c.also.find, c.also.repl)) { bad++; continue; }
  fs.writeFileSync(c.file, next);
  const afterSum = sum(c.file);
  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts/check-profile-edit-gate.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(c.file, before);

  const landed = beforeSum !== afterSum;
  const restored = sum(c.file) === beforeSum;
  const failed = code !== 0;
  const named = !c.needs || c.needs.test(out);
  const want = c.expect === "fail";
  const good = landed && restored && failed === want && (!want || named);
  if (!good) bad++;
  console.log(`${good ? "  ok  " : "FAIL  "}${c.name}`);
  console.log(`        edit landed: ${landed}  restored: ${restored}  guard ${failed ? "FAILED" : "passed"} (wanted ${c.expect})`
    + (want ? `  named the defect: ${named}` : ""));
  if (!good && want && !named) console.log("        " + out.split("\n").filter((l) => /FAIL/.test(l)).join("\n        "));
}
console.log(bad ? `\n${bad} case(s) did not behave as required.` : `\nall ${CASES.length} cases behave as required.`);
process.exitCode = bad ? 1 : 0;
