#!/usr/bin/env node
/* Injection suite for check:offline-claims.
 *
 * Cases 1-4 are the REAL historical defects, reproduced by putting back exactly what was removed --
 * the standard `check:rls` case 1 is held to. Case 4 is the one the GUARD found and the manual
 * sweep missed, which is the argument for the guard existing at all.
 *
 * Cases 6 and 7 MUST STAY SILENT. A negated sentence and a sentence naming the real feature are
 * both correct copy, and a guard that fired on them would tell an author to delete the honest
 * wording it exists to protect. A suite proving only that a detector FIRES is satisfied by one
 * that flags everything.
 *
 * Every case proves its edit landed by CHECKSUM before the guard is believed -- an injection that
 * silently fails to apply reports as "the guard missed", which this repo has misread before.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const P = (f) => path.join(ROOT, f);
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(P(f))).digest("hex");

const CM = "ClimbMatch.jsx", RD = "RouteDetail.jsx";

const CASES = [
  { name: "toast", file: CM, must: "fail", why: "the real toast, restored verbatim",
    find: 'showToast(on?"Removed from your trip pack":"Added to your trip pack");',
    repl: 'showToast(on?"Removed from offline":"Saved for offline — works with no signal");' },

  { name: "sidebar", file: RD, must: "fail", why: "the real Overview sidebar copy",
    find: '}}>Flagged for your trip — not cached</div>',
    repl: '}}>Work without cell service</div>' },

  { name: "bundled", file: CM, must: "fail", why: "the real Profile line naming four bundled things",
    find: '" flagged for a trip — nothing is cached on this device. Download the state under Manage areas to use the catalog with no signal."',
    repl: '" bundled — descriptions, topos & tracks ready with no signal."' },

  { name: "logbook", file: CM, must: "fail", why: "the counter the GUARD found and the sweep missed",
    find: '" · "+offline.length+" in pack"',
    repl: '" · "+offline.length+" offline"' },

  { name: "killreal", file: CM, must: "fail", why: "section 2 — deleting the TRUE state-download claim",
    find: "is saved on this device and keeps working with no signal",
    repl: "is downloaded" },

  { name: "negated", file: RD, must: "pass", why: "a negated sentence is correct copy, not a claim",
    find: '}}>Flagged for your trip — not cached</div>',
    repl: '}}>Flagged for your trip. Nothing is cached on this device.</div>' },

  { name: "pointer", file: CM, must: "pass", why: "a sentence naming Manage areas is about the REAL feature",
    find: '" · "+offline.length+" in pack"',
    repl: '" · "+offline.length+" in pack — download the state under Manage areas to use the catalog with no signal"' },

  /* BOTH files get a rename case. A single one is passed by a GLOBAL floor, because the other
   * file's regions carry the run -- which is how the first version of this guard reported a clean
   * sweep with RouteDetail.jsx entirely blind. Per-file floors are what these two pin. */
  { name: "renamed-rd", file: RD, must: "fail", why: "fail closed — RouteDetail's trigger renamed",
    find: "offlineSaved", repl: "tripPacked", all: true },

  /* ClimbMatch carries TWO triggers, so renaming one is correctly NOT a miss -- the first version
   * of this case renamed only `setOffline`, the guard rightly passed, and that read as a guard
   * defect when it was a harness one. Blinding the file needs the state itself renamed too. */
  { name: "renamed-cm", file: CM, must: "fail", why: "fail closed — ClimbMatch's trigger renamed",
    rx: [[/(?<![A-Za-z0-9_$])setOffline(?![A-Za-z0-9_$])/g, "setTripPack"],
         [/(?<![A-Za-z0-9_$])offline(?![A-Za-z0-9_$])/g, "tripPack"]] },
];

function runGuard() {
  try {
    execFileSync("node", [P("scripts/check-offline-claims.mjs")], { cwd: ROOT, encoding: "utf8" });
    return { ok: true, out: "" };
  } catch (e) {
    return { ok: false, out: (e.stdout || "") + (e.stderr || "") };
  }
}

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const orig = fs.readFileSync(P(c.file), "utf8");
  let next;
  if (c.rx) {
    next = c.rx.reduce((s, [re, r]) => s.replace(re, r), orig);
    if (next === orig) {
      console.log("  " + c.name.padEnd(10) + "HARNESS BUG — no regex matched");
      fail++; continue;
    }
  } else {
    const n = orig.split(c.find).length - 1;
    if (n === 0 || (!c.all && n !== 1)) {
      console.log("  " + c.name.padEnd(10) + "HARNESS BUG — " + n + " matches for its find string");
      fail++; continue;
    }
    next = c.all ? orig.split(c.find).join(c.repl) : orig.replace(c.find, c.repl);
  }
  fs.writeFileSync(P(c.file), next);
  const landed = sum(c.file) !== before;

  const r = runGuard();
  fs.writeFileSync(P(c.file), orig);
  const restored = sum(c.file) === before;

  const want = c.must === "fail" ? !r.ok : r.ok;
  const good = landed && restored && want;
  console.log("  " + c.name.padEnd(10) + (good ? "OK   " : "BAD  ")
    + "(edit landed: " + landed + ", restored: " + restored
    + ", guard " + (r.ok ? "passed" : "failed") + ", wanted " + c.must + ") — " + c.why);
  if (!good && r.out) console.log("      " + r.out.trim().split("\n").slice(0, 3).join("\n      "));
  good ? pass++ : fail++;
}

console.log("\n" + pass + "/" + CASES.length + " cases behaved as specified");
process.exit(fail ? 1 : 0);
