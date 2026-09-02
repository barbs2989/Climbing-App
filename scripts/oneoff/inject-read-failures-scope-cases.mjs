// Injection suite for check:read-failures' WIDENED scope.
//
// The point of these cases is not that the guard fires — it already did that inside lib/db.js.
// It is that the guard can now SEE the other files, and sees them the way it needs to:
//   1. section 1 reaches lib/auth.js, where #1404's getProfile lived and the old scope did not;
//   2. section 2 compares queryKeys ACROSS files, which is the only way a fork between two files
//      is visible — a per-file comparison reports clean on exactly that.
// CASE 3 MUST STAY SILENT: a key holding a variable is per-call, so two such sites are different
// queries and flagging them would report correct code.
//
// Each case proves its edit landed BY CHECKSUM and restores the file byte-identically.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts/check-read-failures.mjs");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, f))).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "1. an error-swallowing read in lib/auth.js (the file the old scope could not reach)",
    file: "lib/auth.js", expect: "fail", needs: /lib\/auth\.js:\d+\s+_injectedRead/,
    append: '\nexport async function _injectedRead(id) {\n'
      + '  const { data, error } = await supabase.from("profiles").select("id").eq("id", id);\n'
      + '  if (error) return [];\n  return data;\n}\n',
  },
  {
    name: "2. a queryKey fork ACROSS files — lib/fire.js re-declaring one of lib/db.js's keys",
    file: "lib/fire.js", expect: "fail", needs: /"my-uid"[\s\S]*lib\/fire\.js|lib\/fire\.js[\s\S]*"my-uid"/,
    append: '\nexport function _injectedFork() {\n'
      + '  return useQuery({ queryKey: ["my-uid"], queryFn: async () => null });\n}\n',
  },
  {
    name: "3. MUST STAY SILENT — a key holding a variable is per-call, not a fork",
    file: "lib/fire.js", expect: "pass",
    append: '\nexport function _injectedDynamic(k) {\n'
      + '  useQuery({ queryKey: ["injected", k], queryFn: async () => null });\n'
      + '  return useQuery({ queryKey: ["injected", k], queryFn: async () => 1 });\n}\n',
  },
  {
    // Section 3 is what makes the useMyFiledReports repair GUARDED rather than merely made. The
    // revert is invisible to sections 1 and 2: no `error` is bound, so there is nothing to test,
    // and the query key is untouched.
    name: "4. the filed-reports session read discards its error again (the real defect)",
    file: "lib/db.js", expect: "fail", needs: /discard the supabase `error` inside a queryFn/,
    find: '      const { data: sess, error: sessErr } = await supabase.auth.getSession();\n'
      + '      if (sessErr) throw sessErr;\n',
    repl: '      const { data: sess } = await supabase.auth.getSession();\n',
  },
  {
    // Discarding the error before a WRITE is correct: a null uid meets RLS and the write's own
    // error surfaces. Section 3 is scoped to queryFns precisely so this stays silent — flagging it
    // would report 15 correct sites in this file.
    name: "5. MUST STAY SILENT — a discarded session error before a WRITE is not this rule's subject",
    file: "lib/db.js", expect: "pass",
    append: '\nexport async function _injectedWrite(row) {\n'
      + '  const { data: sess } = await supabase.auth.getSession();\n'
      + '  const uid = sess && sess.session && sess.session.user && sess.session.user.id;\n'
      + '  return supabase.from("user_reports").insert({ ...row, reporter: uid });\n}\n',
  },
];

let bad = 0;
for (const c of CASES) {
  const abs = path.join(ROOT, c.file);
  const before = fs.readFileSync(abs, "utf8");
  const b = sum(c.file);
  if (c.find) {
    const n = before.split(c.find).length - 1;
    if (n !== 1) { console.log(`FAIL  ${c.name} — anchor matched ${n} times, not 1`); bad++; continue; }
    fs.writeFileSync(abs, before.replace(c.find, c.repl));
  } else {
    fs.writeFileSync(abs, before + c.append);
  }
  const landed = sum(c.file) !== b;

  let out = "", code = 0;
  try { out = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(abs, before);
  const restored = sum(c.file) === b;

  const failed = code !== 0;
  const want = c.expect === "fail";
  const named = !c.needs || c.needs.test(out);
  const good = landed && restored && failed === want && (!want || named);
  if (!good) bad++;
  console.log(`${good ? "  ok  " : "FAIL  "}${c.name}`);
  console.log(`        landed: ${landed}  restored: ${restored}  guard ${failed ? "FAILED" : "passed"} (wanted ${c.expect})`
    + (want ? `  named it: ${named}` : ""));
  if (!good) console.log("        " + out.split("\n").slice(-8).join("\n        "));
}
console.log(bad ? `\n${bad} case(s) wrong.` : `\nall ${CASES.length} cases behave as required.`);
process.exitCode = bad ? 1 : 0;
