// Injection suite for check:read-failures section 2 (one queryKey, one implementation).
// Each case proves its edit landed BY CHECKSUM before the guard is believed, and restores the file
// byte-identically.
//
// Case 1 is the real historical defect: useMyHomeStatePath declaring its own body on useStates'
// key, discarding both errors and skipping orOffline.
// CASE 2 MUST STAY SILENT — two call sites on one key with the SAME body are not a fork, and
// flagging them would tell an author to break a legitimate shared query.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DB = path.join(ROOT, "lib/db.js");
const GUARD = path.join(ROOT, "scripts/check-read-failures.mjs");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(DB)).digest("hex").slice(0, 12);

const ANCHOR = "  const { data: states } = useStates();";
const FORKED = `  const { data: states } = useQuery({
    queryKey: ["area-children", "roots"], enabled: !!supabase && !!loc, staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data: roots } = await supabase.from("areas").select("id").is("parent_id", null);
      const rootIds = (roots || []).map((r) => r.id);
      if (!rootIds.length) return [];
      const { data } = await supabase.from("areas").select("*").in("parent_id", rootIds).order("name");
      return data || [];
    },
  });`;
/* Case 2 keeps the real line and adds TWO twins on a key of their own. Self-contained on purpose:
   a first attempt lifted useStates' body out of the file and balanced parens from `queryFn:`,
   which stops at the arrow's own `()` and yields `queryFn: ()` — malformed. The guard then failed
   on a PARSE error and the case read as a guard miss. An injection that produces a different
   failure is not a catch; fix the case before doubting the check. */
const TWIN = 'useQuery({ queryKey: ["injected-twin"], queryFn: async () => { const { data, error } = '
  + 'await supabase.from("areas").select("id"); if (error) throw error; return data; } });';
const SAME = `${ANCHOR}\n  ${TWIN}\n  ${TWIN}`;

const CASES = [
  { name: "1. the second body is back (the real defect)", find: ANCHOR, repl: FORKED, expect: "fail",
    needs: /carry more than one implementation|area-children/ },
  { name: "2. MUST STAY SILENT — two call sites, identical body, is not a fork",
    find: ANCHOR, repl: SAME, expect: "pass" },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(DB, "utf8"), b = sum();
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`FAIL  ${c.name} — anchor matched ${n} times, not 1`); bad++; continue; }
  fs.writeFileSync(DB, before.replace(c.find, c.repl));
  const landed = sum() !== b;
  let out = "", code = 0;
  try { out = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(DB, before);
  const restored = sum() === b;
  const failed = code !== 0;
  const want = c.expect === "fail";
  const named = !c.needs || c.needs.test(out);
  const good = landed && restored && failed === want && (!want || named);
  if (!good) bad++;
  console.log(`${good ? "  ok  " : "FAIL  "}${c.name}`);
  console.log(`        landed: ${landed}  restored: ${restored}  guard ${failed ? "FAILED" : "passed"} (wanted ${c.expect})`
    + (want ? `  named it: ${named}` : ""));
  if (!good) console.log("        " + out.split("\n").slice(-6).join("\n        "));
}
console.log(bad ? `\n${bad} case(s) wrong.` : `\nall ${CASES.length} cases behave as required.`);
process.exitCode = bad ? 1 : 0;
