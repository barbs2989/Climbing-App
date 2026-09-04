#!/usr/bin/env node
/* Injection suite for check:visibility-switches-persist.
 *
 * Cases 1-5 are the REAL pre-0177 defects, reproduced by putting back exactly what was removed.
 * Case 6 is the rule-2 half — a select forgetting an outward column, which is how the defect
 * COMES BACK even with the switch wired.
 *
 * Cases 8 and 9 MUST STAY SILENT. A gated switch promises nothing, and a `derived` switch that is
 * genuinely derived is correct work — the guard's own first draft reported four such controls and
 * would have driven someone to "fix" them.
 *
 * Every case proves its edit landed by CHECKSUM before the guard is believed.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const P = (f) => path.join(ROOT, f);
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(P(f))).digest("hex");
const CM = "ClimbMatch.jsx", DB = "lib/db.js", G = "scripts/check-visibility-switches-persist.mjs";

const CASES = [
  { name: "resume-write", file: CM, must: "fail", why: "the real pre-0177 toggle: no write at all",
    find: 'setResumePublic(function(v){var next=!v;if(uid)saveProfile(uid,{resume_public:next}).then(function(r){if(r&&r.error){setResumePublic(v);showToast("Couldn’t save that — your résumé visibility is unchanged.");}});return next;})',
    repl: 'setResumePublic(v=>!v)' },

  { name: "ranks-write", file: CM, must: "fail", why: "the real pre-0177 leaderboard toggle",
    find: 'setShowOnRanks(function(v){var next=!v;if(uid)saveProfile(uid,{show_on_ranks:next}).then(function(r){if(r&&r.error){setShowOnRanks(v);showToast("Couldn’t save that — your leaderboard setting is unchanged.");}});return next;})',
    repl: 'setShowOnRanks(v=>!v)' },

  { name: "resume-hydrate", file: CM, must: "fail", why: "written but never read back — resets on reload",
    find: "setResumePublic(p.resume_public!==false);", repl: "" },

  { name: "ranks-hydrate", file: CM, must: "fail", why: "same, for the leaderboard switch",
    find: "setShowOnRanks(p.show_on_ranks!==false);", repl: "" },

  { name: "name-hydrate", file: CM, must: "fail", why: "0175's own read-back, removed",
    find: "setShowRealName(!!p.show_name);", repl: "" },

  { name: "partner-cols", file: DB, must: "fail", why: "rule 2 — partner search stops carrying resume_public",
    find: "boulder_grade,show_name,resume_public", repl: "boulder_grade,show_name" },

  { name: "conn-select", file: DB, must: "fail", why: "rule 2 — the connections select forgets it",
    find: '"id, name, username, avatar, location, show_name, resume_public"',
    repl: '"id, name, username, avatar, location, show_name"' },

  /* Rule 3 — the second way into a résumé. The stat tile really did call onResume()
   * unconditionally, so gating the profile BUTTON alone left a private résumé reachable by
   * tapping a climb count. */
  { name: "stat-tile", file: "ClimbMatchCore.jsx", must: "fail",
    why: "the real ungated stat-tile route into another climber's résumé",
    find: 'const act=st[2]==="climbs"?(c.resumePublic!==false?()=>onResume&&onResume(c):null)',
    repl: 'const act=st[2]==="climbs"?()=>onResume&&onResume(c)' },

  { name: "resume-button", file: "ClimbMatchCore.jsx", must: "fail",
    why: "rule 3 — the profile button stops consulting the flag",
    find: "{climber.resumePublic!==false?<button onClick={()=>onResume&&onResume(climber)}",
    repl: "{true?<button onClick={()=>onResume&&onResume(climber)}" },

  /* Rule for the DRAFT kind. The profile editor has a SECOND control for `show_name`, in a file
   * this guard did not read until now. It is honest today — openEdit seeds it and saveEdit pushes
   * it back — and these two cases are what keep it that way. */
  { name: "draft-seed", file: CM, must: "fail",
    why: "openEdit stops seeding the draft — the editor would reset the preference on save",
    find: "skills:[...(ME.skills||[])],showRealName:showRealName}",
    repl: "skills:[...(ME.skills||[])],showRealName:false}" },

  { name: "draft-pushback", file: CM, must: "fail",
    why: "saveEdit stops pushing it back — Settings and the editor would disagree until reload",
    find: "setShowRealName(!!d.showRealName);", repl: "" },

  { name: "core-undeclared", file: "ClimbMatchCore.jsx", must: "fail",
    why: "a NEW editor switch in Core must be declared, not silently unchecked",
    find: 'aria-checked={draft.showRealName}',
    repl: 'aria-checked={draft.brandNewEditorFlag}' },

  /* MUST STAY SILENT — both are correct work the first draft flagged. */
  { name: "derived-ok", file: CM, must: "pass", why: "SILENT: `discoverable` is derived, not hydrated — correct",
    find: "const toggleDiscoverable=function(){", repl: "const toggleDiscoverable=function(){/* unchanged */" },

  /* An UNDECLARED flag inside a gated block. A gated control renders as `null`, so it promises
   * nothing and must not be required to persist — otherwise the guard would demand a column for
   * every control the app has deliberately withheld. */
  { name: "gated-new", file: CM, must: "pass", why: "SILENT: an undeclared flag inside a gated block promises nothing",
    find: "aria-checked={locPrecise}", repl: "aria-checked={brandNewGatedFlag}" },
];

function runGuard() {
  try {
    execFileSync("node", [P(G)], { cwd: ROOT, encoding: "utf8" });
    return { ok: true, out: "" };
  } catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || "") }; }
}

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const orig = fs.readFileSync(P(c.file), "utf8");
  const n = orig.split(c.find).length - 1;
  if (n !== 1) {
    console.log("  " + c.name.padEnd(17) + "HARNESS BUG — " + n + " matches for its find string");
    fail++; continue;
  }
  fs.writeFileSync(P(c.file), orig.replace(c.find, c.repl));
  const landed = sum(c.file) !== before;
  const r = runGuard();
  fs.writeFileSync(P(c.file), orig);
  const restored = sum(c.file) === before;

  const want = c.must === "fail" ? !r.ok : r.ok;
  const good = landed && restored && want;
  console.log("  " + c.name.padEnd(17) + (good ? "OK   " : "BAD  ")
    + "(landed " + landed + ", restored " + restored + ", guard "
    + (r.ok ? "passed" : "failed") + ", wanted " + c.must + ") — " + c.why);
  if (!good && r.out) console.log("      " + r.out.trim().split("\n").slice(0, 3).join("\n      "));
  good ? pass++ : fail++;
}
console.log("\n" + pass + "/" + CASES.length + " cases behaved as specified");
process.exit(fail ? 1 : 0);
