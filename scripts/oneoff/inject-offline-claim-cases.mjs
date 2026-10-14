#!/usr/bin/env node
/* Injection suite for check:offline-claims, rewritten when the trip pack became a real download.
 *
 * The old suite reproduced the twelve claims #1585 removed. Those cases are gone because the
 * world they describe is: packing a climb now writes its row to IndexedDB, so "saved on this
 * device" is TRUE and a case demanding the guard fire on it would be pinning a defect as the
 * contract. `honest-claim` is what replaces them, and it MUST STAY SILENT — the single case that
 * proves the reversal actually happened rather than the guard simply going quiet.
 *
 * The cases now take the chain apart one link at a time, because the guard must not be able to
 * pass on the strength of its neighbours. `read-gone` is the most important: it leaves the write,
 * the copy and the hydration all intact and removes only the fallback, which is the shape that
 * fails SILENTLY — the rows sit in IndexedDB, correctly written, and the pack still empties at
 * the trailhead with every copy assertion green.
 *
 * Each case names the text ITS OWN failure must carry. A case judged on the exit code alone is
 * satisfied by a run that died for an unrelated reason, and this repo has read one as the other
 * twice. Expectations are matched against FAIL lines only, never against the text an assertion
 * prints when it passes — a case written against the healthy wording reports MISSED while the
 * guard is firing correctly.
 *
 * Every case proves its edit landed by CHECKSUM and restores the file byte-identically.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const P = (f) => path.join(ROOT, f);
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(P(f))).digest("hex");

/* TWO RUNS OF THIS SUITE MUST NEVER OVERLAP, and one line of CLAUDE.md was not enough to stop it.
 * That file already warns not to COMMIT while an injection is in flight, because the harness edits
 * the app in place; a second HARNESS is the same hazard and strictly worse. Both snapshot, edit and
 * restore the same files, so run B's snapshot can capture run A's injected text and then "restore"
 * it permanently — which is what happened here: a rename case's edit was written back to
 * ClimbMatch.jsx as though it were the original, and the working tree ended up holding
 * `setTripPack`, `tripPack`, `dlPending` and a gutted saveAreaIds call.
 *
 * The results are worthless either way — cases reported HARNESS BUG and MISSED against a guard that
 * was fine — but a corrupt WORKING TREE is the part that outlives the run. An exclusive lock costs
 * nothing and makes the overlap impossible rather than merely discouraged. `wx` is atomic, so two
 * simultaneous starts cannot both win. */
const LOCK = P("scripts/oneoff/.inject-offline-claims.lock");
try {
  fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" });
} catch (e) {
  console.error("REFUSING TO RUN: another injection run holds " + path.relative(ROOT, LOCK) + "\n"
    + "  (pid " + (fs.existsSync(LOCK) ? fs.readFileSync(LOCK, "utf8") : "?") + "). Two runs edit the same\n"
    + "  files in place, so overlapping them corrupts BOTH results and can leave an injected edit in\n"
    + "  the working tree. Wait for it, or delete the lock if that process is gone.");
  process.exit(1);
}
/* Released on every exit path, including a throw or a Ctrl-C — a lock a crash leaves behind is a
 * lock the next person deletes without reading, which is the same as having none. */
const unlock = () => { try { fs.unlinkSync(LOCK); } catch (e) { /* already gone */ } };
process.on("exit", unlock);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { unlock(); process.exit(130); });

const CM = "ClimbMatch.jsx", DB = "lib/db.js", OFF = "lib/offline.js";

const CASES = [
  /* THE SILENT HALF. Write, copy and hydration all stay; only the fallback goes. Nothing renders
   * differently, no name moves, and the pack empties the moment there is no signal. */
  { name: "read-gone", file: DB, must: "fail", expect: "fallback is not offlineRoutesByIds",
    why: "§2 — the row is written and never read back; the defect no render assertion can see",
    find: "}, () => offlineRoutesByIds(ids)),", repl: "}, () => []),"  },

  { name: "reader-gone", file: OFF, must: "fail", expect: "no longer defines offlineRoutesByIds",
    why: "§2 — the reader itself is renamed out from under lib/db.js",
    find: "export async function offlineRoutesByIds(", repl: "export async function offlineRoutesById2(" },

  /* §8's silent half, and the reason that section is in the GUARD rather than only in
   * probe-offline-subtree-search: the reader stays correct, the probe stays green at 29/29, and
   * the in-area finder throws again the moment there is no signal. */
  { name: "search-fallback-gone", file: DB, must: "fail", expect: "is NOT wrapped in orOfflineExact",
    why: "§8 — the downloaded catalog can be browsed and no longer searched",
    find: "() => orOfflineExact(async () => {\n      const { data, error } = await supabase.rpc(\"routes_in_subtree\",",
    repl: "() => (async () => {\n      const { data, error } = await supabase.rpc(\"routes_in_subtree\"," },

  { name: "killreal", file: CM, must: "fail", expect: "is gone. A downloaded state IS on the device",
    why: "§6 — deleting the state download's TRUE claim to satisfy a rule about routes",
    find: "is saved on this device and keeps working with no signal", repl: "is downloaded" },

  { name: "bookmarks-gone", file: CM, must: "fail", expect: "nothing calls saveAreaIds",
    why: "§7 — saved areas go back to being lost on every reload",
    find: "saveAreaIds(uid,next)", repl: "Promise.resolve(next)" },
];

/* stdio MUST name stderr explicitly. execFileSync defaults to ["pipe","pipe","INHERIT"], so a
 * guard's fatal messages — every ANCHOR LOST and every fail-closed floor here writes with
 * console.error — went straight to this process's own stderr and never reached `e.stderr`. Three
 * cases reported "did not name its own defect" against a guard that had named it perfectly, in
 * text the harness structurally could not see. An expectation is only as good as the stream it
 * is matched against. */
function runGuard() {
  try {
    const out = execFileSync("node", [P("scripts/check-offline-claims.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out, err: "" };
  } catch (e) {
    return { ok: false, out: e.stdout || "", err: e.stderr || "" };
  }
}

/* Expectations are matched against the FAIL lines and the fatal message only. A case written
 * against the text an assertion prints when it PASSES reports MISSED while the guard is firing
 * correctly — a mistake worth making structural rather than remembering. */
const failText = (r) => r.out.split("\n").filter((l) => /^\s*FAIL/.test(l)).join("\n") + "\n" + r.err;

/* A DIRTY TREE MAKES EVERY CASE MEANINGLESS, and it fails in the confusing direction: cases report
 * HARNESS BUG or MISSED and the guard looks broken when the guard is fine. So the suite refuses to
 * start unless the guard is GREEN on the tree as it stands — which is also the only baseline a
 * "must stay silent" case can mean anything against. */
{
  const base = runGuard();
  if (!base.ok) {
    console.error("REFUSING TO RUN: check:offline-claims does not pass on the tree as it stands, so\n"
      + "  no case below could be attributed. Fix the tree first (or an earlier run left an edit in\n"
      + "  it — see the lock note above).\n" + (base.err || base.out).trim().split("\n").slice(0, 6).join("\n"));
    process.exit(1);
  }
}

/* Every file the suite may touch, checksummed BEFORE anything runs and re-checked at the end. A
 * per-case restore already runs, but a crash between write and restore leaves the tree edited and
 * nothing would say so — the failure this suite has already caused once. */
const TOUCHED = [...new Set(CASES.map((c) => c.file))];
const BASELINE = new Map(TOUCHED.map((f) => [f, sum(f)]));

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const orig = fs.readFileSync(P(c.file), "utf8");
  let next;
  if (c.move) {
    next = c.move(orig);
    if (!next || next === orig) { console.log("  " + c.name.padEnd(22) + "HARNESS BUG — the move did not apply"); fail++; continue; }
  } else if (c.rx) {
    next = c.rx.reduce((s, [re, r]) => s.replace(re, r), orig);
    if (next === orig) { console.log("  " + c.name.padEnd(22) + "HARNESS BUG — no regex matched"); fail++; continue; }
  } else {
    const n = orig.split(c.find).length - 1;
    if (n === 0 || (!c.all && n !== 1)) {
      console.log("  " + c.name.padEnd(22) + "HARNESS BUG — " + n + " matches for its find string");
      fail++; continue;
    }
    next = c.all ? orig.split(c.find).join(c.repl) : orig.replace(c.find, c.repl);
  }
  fs.writeFileSync(P(c.file), next);
  const landed = sum(c.file) !== before;

  const r = runGuard();
  fs.writeFileSync(P(c.file), orig);
  const restored = sum(c.file) === before;

  const wanted = c.must === "fail" ? !r.ok : r.ok;
  const named = c.must !== "fail" || !c.expect || failText(r).includes(c.expect);
  const good = landed && restored && wanted && named;
  console.log("  " + c.name.padEnd(22) + (good ? "OK   " : "BAD  ")
    + "(landed: " + landed + ", restored: " + restored + ", guard " + (r.ok ? "passed" : "failed")
    + ", wanted " + c.must + (c.expect ? ", named its own defect: " + named : "") + ")\n"
    + "        " + c.why);
  if (!good && r.out) console.log("      | " + (failText(r).trim() || r.out).trim().split("\n").slice(0, 4).join("\n      | "));
  good ? pass++ : fail++;
}

const drifted = TOUCHED.filter((f) => sum(f) !== BASELINE.get(f));
if (drifted.length) {
  console.error("\nTREE NOT RESTORED: " + drifted.join(", ") + " differ(s) from the pre-run checksum.\n"
    + "  An injected edit is still in the working tree. Do not commit — restore those files first.");
  process.exit(1);
}
console.log("\n" + pass + "/" + CASES.length + " cases behaved as specified (tree restored byte-identically)");
process.exit(fail ? 1 : 0);
