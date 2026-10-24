// Injection cases for check:no-module-scope-core-reads: prove it goes RED on the defect that took
// the live site down on 2026-10-23 (#2678 → #2679), and GREEN on the four shapes that look like it
// and are safe. Each edit is proven landed by checksum, and every file is restored byte-identically
// even if a case throws.
//   node scripts/oneoff/inject-module-scope-core-read-cases.mjs
import fs from "fs"; import { spawnSync } from "child_process"; import crypto from "crypto";
const W = new URL("../../", import.meta.url).pathname;
const sha = s => crypto.createHash("sha1").update(s).digest("hex");
// VouchCard: core imports it back (FullProfile renders it) — the cycle the outage ran on.
// TopContributors: imports core, but only ClimbMatch.jsx imports IT, so core has finished evaluating
// before its body runs — the same read is safe there, and the guard must know the difference.
const FILES = { vouch: W + "src/components/VouchCard.tsx", top: W + "src/components/TopContributors.tsx" };
const orig = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
const SIG = "export default function VouchCard({v}: VouchCardProps){";
const TOP_SIG = "export default function TopContributors(";
const cases = [
  // [name, file key, find, replace, want exit (1 = must FAIL), text the failure must name]
  ["the outage: a core CONST read above the component must FAIL", "vouch", SIG, "const HOIST = SKILLS;\n" + SIG, 1, "VouchCard.tsx"],
  ["…and the failure names the binding", "vouch", SIG, "const HOIST = SKILLS;\n" + SIG, 1, "`SKILLS`"],
  ["a core const read via `export default` must FAIL", "vouch", SIG, "export const HOIST = VOUCH_RATING_LABEL;\n" + SIG, 1, "VOUCH_RATING_LABEL"],
  ["a hoisted FUNCTION export read at module scope must PASS", "vouch", SIG, "const HOIST = shortDate;\n" + SIG, 0, null],
  ["a core read in a DEFAULT PARAMETER must PASS", "vouch", SIG, "export default function VouchCard({v}: VouchCardProps, _d = SKILLS){", 0, null],
  ["the same read in a component core does NOT import back must PASS", "top", TOP_SIG, "const HOIST = C;\n" + TOP_SIG, 0, null],
  ["untouched, must PASS", null, null, null, 0, null],
];
let bad = 0;
try {
  for (const [name, key, find, repl, want, mustName] of cases) {
    for (const [k, f] of Object.entries(FILES)) fs.writeFileSync(f, orig[k]);
    if (key) {
      const src = orig[key];
      if (src.split(find).length !== 2) throw new Error("HARNESS BUG: anchor missing or ambiguous for " + name);
      const txt = src.replace(find, repl); fs.writeFileSync(FILES[key], txt);
      if (sha(fs.readFileSync(FILES[key], "utf8")) !== sha(txt)) throw new Error("edit did not land: " + name);
    }
    const r = spawnSync("node", ["scripts/check-module-scope-core-reads.mjs"], { cwd: W });
    const out = String(r.stdout) + String(r.stderr);
    const got = r.status === 0 ? 0 : 1;
    const named = mustName ? out.includes(mustName) : true;
    const okc = got === want && named;
    console.log(okc ? "CAUGHT " : "MISSED ", name, "(exit " + r.status + (mustName ? (named ? ", names " : ", DOES NOT name ") + mustName : "") + ")");
    if (!okc) { bad++; console.log(out.split("\n").filter(l => /FAIL|reads|ok/.test(l)).slice(0, 6).join("\n")); }
  }
} finally { for (const [k, f] of Object.entries(FILES)) fs.writeFileSync(f, orig[k]); }
console.log("restored:", Object.entries(FILES).every(([k, f]) => sha(fs.readFileSync(f, "utf8")) === sha(orig[k])));
// KNOWN MISS (recorded, not a case): `const X = (() => SKILLS)();` at module scope — the read sits
// inside a function, so the guard defers it, but the call runs at module scope. Not followed on
// purpose: following calls means evaluating the program.
process.exit(bad ? 1 : 0);
