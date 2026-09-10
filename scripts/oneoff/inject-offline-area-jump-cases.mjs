#!/usr/bin/env node
/* DOES probe-offline-area-jump ACTUALLY CATCH THE DEAD TAP?
 *
 * Its healthy output is "12 assertions, all ok", which is also what a probe asserting nothing
 * prints. Each case below reverts one link of the tap to what shipped in #1673 and requires
 * the probe to fail with a message NAMING that link — an exit code alone is satisfied by a run
 * that died for an unrelated reason.
 *
 * TWO TARGETS, which is the point of the first two cases: the sequence runs across `lib/db.js`
 * and `lib/offline.js`, and either half can be correct while the tap still dead-ends. A suite
 * that only reverted one would report the other as unnecessary.
 *
 * Safeguards are the three the overlapping run of 2026-09-09 paid for: an exclusive lockfile,
 * a refusal to start unless the probe is already GREEN, and a per-file checksum before and
 * after so a run that damages the tree says TREE NOT RESTORED rather than exiting 0 over it.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DB = path.join(ROOT, "lib/db.js");
const OFF = path.join(ROOT, "lib/offline.js");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-offline-area-jump.mjs");
const LOCK = path.join(ROOT, ".inject-offline-area-jump.lock");

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

function runProbe() {
  try {
    const out = execFileSync("node", [PROBE], { stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, text: String(out || "") };
  } catch (e) {
    // stdio[2] defaults to 'inherit', so a fatal console.error would go to OUR stderr and
    // never reach e.stderr — an expectation could then never match. Both pipes explicit.
    return { code: e.status == null ? -1 : e.status, text: String(e.stdout || "") + String(e.stderr || "") };
  }
}

const CASES = [
  {
    name: "fetchArea-unwrapped",
    file: DB,
    why: "the hit is never hydrated, so the breadcrumb has no path to walk and the tap dead-ends",
    find: `  return orOffline(async () => {
    const { data, error } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data || null;
  }, () => offlineArea(id));`,
    repl: `  const { data, error } = await supabase.from("areas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data || null;`,
    expect: "the hit cannot be hydrated",
  },
  {
    name: "breadcrumb-unwrapped",
    file: DB,
    why: "the ancestors come back empty, so jumpToArea returns AFTER switching screens",
    /* The fallback is GUTTED rather than the wrapper removed. Deleting `orOffline(` leaves
     * its second argument dangling, so the file does not parse and the probe dies on the
     * BUNDLE — a different failure, which this repo has twice read as a catch. */
    find: `    const rows = await offlineAreasByIds(ids);`,
    repl: `    const rows = [];`,
    expect: "the breadcrumb is wrong",
  },
  {
    name: "completeness-gate-gone",
    file: OFF,
    why: "a half-downloaded state is served, so a truncated catalog reads as the whole one",
    find: `    if (row && ok.has(row._state)) out.push(row);`,
    repl: `    if (row) out.push(row);`,
    expect: "half-downloaded state was served",
  },
  {
    name: "empty-map-instead-of-undefined",
    file: OFF,
    why: "an empty map is truthy, so a failed read is swallowed and every name degrades to its\n"
      + "       placeholder as though it had been looked up",
    find: `  if (!rows.length) return undefined;`,
    repl: `  if (!rows.length) return {};`,
    expect: "complete miss returned a map",
  },
  /* ── must stay SILENT ────────────────────────────────────────────────────────────────── */
  {
    name: "comment-naming-the-shape",
    file: DB,
    why: "a comment quoting the unwrapped call is documentation, and a probe flagging it would\n"
      + "       forbid explaining the fix",
    find: `export async function fetchArea(id) {`,
    repl: `// NOT the shape to use: `+"`"+`const {data}=await supabase.from("areas").select("*").eq("id",id)`+"`"+`\nexport async function fetchArea(id) {`,
    silent: true,
  },
  {
    name: "extra-id-filtered-out",
    file: OFF,
    why: "skipping a falsy id is the same rule written longhand, and a probe pinned to one\n"
      + "       phrasing would forbid tidying it",
    find: `  const want = (ids || []).filter(Boolean);`,
    repl: `  const want = (ids || []).filter((x) => !!x);`,
    silent: true,
  },
];

/* ── the three safeguards ───────────────────────────────────────────────────────────────── */
let lockFd;
try { lockFd = fs.openSync(LOCK, "wx"); }
catch (e) {
  console.error("REFUSING TO START: " + LOCK + " exists, so another run of this suite is live.\n"
    + "Two runs editing one file means one run's 'restore' writes the other's injected text back\n"
    + "PERMANENTLY. Wait for it, or delete the lock if you are sure nothing is running.");
  process.exit(1);
}
const release = () => { try { fs.closeSync(lockFd); } catch (e) {} try { fs.unlinkSync(LOCK); } catch (e) {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(130); });

const ORIGINAL = new Map([[DB, fs.readFileSync(DB, "utf8")], [OFF, fs.readFileSync(OFF, "utf8")]]);
const BEFORE = new Map([...ORIGINAL].map(([f, s]) => [f, sha(s)]));

const green = runProbe();
if (green.code !== 0) {
  console.error("REFUSING TO START: the probe is already failing on this tree, so no case below\n"
    + "would be attributable. Fix the tree first.\n"
    + green.text.split("\n").filter((l) => /FAIL/.test(l)).join("\n"));
  process.exit(1);
}
/* An expectation matched against the HEALTHY run cannot mean anything — it is usually the text
 * an assertion prints when it PASSES, which reads as a guard defect against a correctly-firing
 * probe. This repo has made that mistake twice; it is structural here. */
for (const c of CASES) {
  if (!c.silent && green.text.includes(c.expect)) {
    console.error("HARNESS BUG: case " + c.name + " expects “" + c.expect + "”, which the HEALTHY run\n"
      + "already prints. It could never fail.");
    process.exit(1);
  }
}
console.log("precondition: the probe is GREEN on this tree\n");

let caught = 0, missed = 0;
for (const c of CASES) {
  const src = ORIGINAL.get(c.file);
  const hits = src.split(c.find).length - 1;
  if (hits !== 1) {
    console.log("HARNESS BUG  " + c.name + " — its find string matches " + hits + " time(s), not 1.");
    missed++;
    continue;
  }
  const mutated = src.replace(c.find, c.repl);
  fs.writeFileSync(c.file, mutated);
  // Checksum movement proves an edit HAPPENED, never that it was the RIGHT one — which this
  // repo has recorded four times — so every case is judged on the probe's own failure text.
  const landed = sha(mutated) !== BEFORE.get(c.file);
  const r = runProbe();
  fs.writeFileSync(c.file, src);

  if (!landed) { console.log("HARNESS BUG  " + c.name + " — the edit did not change the file."); missed++; continue; }

  const fails = r.text.split("\n").filter((l) => /FAIL/.test(l)).join("\n");
  if (c.silent) {
    if (r.code === 0) { console.log("SILENT       " + c.name + " — correctly not flagged"); caught++; }
    else { console.log("OVER-REACH   " + c.name + " — the probe FAILED on correct work:\n" + fails); missed++; }
    continue;
  }
  if (r.code === 0) { console.log("MISSED       " + c.name + " — the probe passed. " + c.why); missed++; }
  else if (fails.includes(c.expect)) { console.log("CAUGHT       " + c.name); caught++; }
  else { console.log("WRONG FAILURE " + c.name + " — it failed, but not on “" + c.expect + "”:\n" + fails); missed++; }
}

let dirty = false;
for (const [f, want] of BEFORE) {
  const now = sha(fs.readFileSync(f, "utf8"));
  if (now !== want) { console.error("\nTREE NOT RESTORED: " + path.basename(f) + " is " + now + ", was " + want); dirty = true; }
}
if (dirty) { console.error("Do not commit. `git checkout lib/` before doing anything else."); process.exit(1); }

console.log("\n" + caught + "/" + CASES.length + " cases behaved; both files restored byte-identically");
process.exit(missed ? 1 : 0);
