// Did widening fmtSlingVal's quantity vocabulary change anything it should not have?
//
// The change teaches ONE branch that length/quantity/purpose are the same fact as size/count/note,
// and lets it fire when a value carries a quantity with no size. Everything else about the
// function is untouched — but `fmtSlingVal` is the app's generic leaf flattener: `rackLines`
// renders every RACK bullet through it AND the contribute form's CURRENT-VALUE line
// (`objStr`) flattens arbitrary jsonb through it, so a careless widening reaches columns this
// change was never aimed at.
//
// So the bar is the one this repo sets for any shared display helper: diff the OUTPUT over every
// real row, prove nothing is LOST, and load the old version FROM GIT rather than retyping it —
// a retyped reference agrees with itself whatever the app does, which is the entire question.
//
//   node scripts/oneoff/verify-sling-rack-synonym-widening.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nVERIFY FAILED — ${w}. Nothing below was proven.\n`); process.exit(1); };

function lift(src, name, where) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) dead(`ANCHOR LOST: ${name} in ${where}`);
  let depth = 0, k = src.indexOf("{", i);
  for (; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}") { depth--; if (!depth) break; } }
  return src.slice(i, k + 1);
}
function build(src, where) {
  return new Function(
    lift(src, "fmtSlingVal", where) + "\n" + lift(src, "fmtSlingRack", where) + "\n" +
    lift(src, "rackLines", where) + "\nreturn {rackLines:rackLines,fmtSlingVal:fmtSlingVal};"
  )();
}

const nowSrc = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
let baseSrc;
try {
  baseSrc = execFileSync("git", ["show", "origin/main:RouteDetail.jsx"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
} catch (e) { dead("could not read RouteDetail.jsx from origin/main: " + (e && e.message)); }
if (baseSrc === nowSrc) dead("the working tree is byte-identical to origin/main — there is nothing to verify");
/* ...AND THE WHOLE FILE BEING DIFFERENT IS NOT THE SAME AS THIS FUNCTION BEING DIFFERENT. Once
   the widening merged, any unrelated edit to RouteDetail.jsx got past the check above and the run
   ended on "the widening changed nothing it was aimed at" — a SPENT one-shot reported as a
   VERIFY FAILED. Those want opposite reactions: one says go and look at the renderer, the other
   says there is nothing left to compare. Compare the three lifted functions, not the file. */
const SPENT = ["fmtSlingVal", "fmtSlingRack", "rackLines"]
  .every((n) => lift(baseSrc, n, "origin/main") === lift(nowSrc, n, "working tree"));
if (SPENT) {
  console.log("SPENT — fmtSlingVal, fmtSlingRack and rackLines are identical to origin/main.");
  console.log("The widening this verifies is already merged, so the before/after has nothing to");
  console.log("compare. Re-run it against a base that PREDATES the next change to those three.");
  process.exit(0);
}

const NOW = build(nowSrc, "working tree");
const OLD = build(baseSrc, "origin/main");

// Self-test the two LIFTS against a shape neither version changes, so a broken lift cannot read
// as a clean diff. The array branch is untouched by this change.
for (const [tag, m] of [["old", OLD], ["new", NOW]]) {
  const p = m.rackLines([{ qty: 2, sizeCm: 60 }]);
  if (!Array.isArray(p) || p.length !== 1 || p[0].text !== "2× 60cm") dead(`the ${tag} lift is wrong — got ${JSON.stringify(p)}`);
}

// Includes note/notes — the sibling measurement's pattern omitted them, which is the same
// deny-list-short-by-one-spelling this change fixes in the renderer. Kept in step with it.
const MACHINEISH = /\b(size|count|qty|quantity|purpose|length|notes?)\s*:/i;
const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("empty read — every comparison below would pass vacuously");

let bulletsOld = 0, bulletsNew = 0, changed = 0, lost = 0, machOld = 0, machNew = 0, valsChanged = 0;
const shown = [], LOST = [];
for (const r of rows) {
  const a = OLD.rackLines(r.sling_rack), b = NOW.rackLines(r.sling_rack);
  bulletsOld += a.length; bulletsNew += b.length;
  for (const x of a) if (MACHINEISH.test(x.text)) machOld++;
  for (const x of b) if (MACHINEISH.test(x.text)) machNew++;

  // LOSS is the direction that matters: a bullet that used to render and no longer does, or a
  // label that lost its text. A shorter, clearer bullet is the point; a missing one is a defect.
  if (b.length < a.length) { lost++; LOST.push(`${r.id}: ${a.length} bullets -> ${b.length}`); }
  const am = new Map(a.map((x) => [x.label, x.text]));
  for (const x of b) if (am.has(x.label) && !x.text) LOST.push(`${r.id}: ${x.label} lost its text`);

  let any = false;
  for (const x of b) {
    const was = am.get(x.label);
    if (was === undefined || was === x.text) continue;
    any = true; changed++;
    if (shown.length < 40) shown.push(`${r.id}\n    was: ${x.label} — ${was}\n    now: ${x.label} — ${x.text}`);
  }
  if (any) valsChanged++;
}

console.log(`values read: ${rows.length}`);
console.log(`bullets   old ${bulletsOld}   new ${bulletsNew}   (must be equal — this change reformats, it never drops a line)`);
console.log(`machine-shaped bullets   old ${machOld}   new ${machNew}`);
console.log(`bullets whose text changed: ${changed}   across ${valsChanged} value(s)\n`);
for (const s of shown) console.log("  " + s);
if (changed > shown.length) console.log(`  … and ${changed - shown.length} more`);

// SECTION 2 — the columns this change was NOT aimed at.
//
// fmtSlingVal is generic, so the widened branch fires for ANY object whose keys are all synonyms,
// wherever the contribute form's current-value line flattens one. Assuming that reaches nothing
// else would be exactly the "grep the app, not just the layer you changed" miss this repo keeps
// recording, so it is measured: three columns carry such a value.
//
// The assertion is CONTENT PRESERVATION rather than an eyeball — every string the old rendering
// showed must still be present in the new one. That is what separates "dropped a meaningless
// `notes:` prefix" from "dropped the notes".
const SYN = new Set(["size", "length", "count", "quantity", "note", "notes", "purpose"]);
const OTHER = ["access", "partner_requirements", "emergency"];
let reach = 0, reachChanged = 0;
const strings = (v, acc) => {
  if (v == null) return acc;
  if (typeof v === "object") { for (const k of Object.keys(v)) strings(v[k], acc); }
  else if (String(v).trim()) acc.push(String(v));
  return acc;
};
function scan(v, id, col, at) {
  if (v == null || typeof v !== "object") return;
  if (Array.isArray(v)) { v.forEach((x, i) => scan(x, id, col, at + "[" + i + "]")); return; }
  const ks = Object.keys(v);
  if (ks.length && ks.every((k) => SYN.has(k))) {
    reach++;
    const wasT = OLD.fmtSlingVal(v), nowT = NOW.fmtSlingVal(v);
    if (wasT !== nowT) {
      reachChanged++;
      console.log(`  ${col} ${id} ${at}\n    was: ${String(wasT).slice(0, 130)}\n    now: ${String(nowT).slice(0, 130)}`);
    }
    for (const piece of strings(v, [])) {
      if (!String(nowT || "").includes(piece)) LOST.push(`${col} ${id} ${at}: dropped ${JSON.stringify(piece.slice(0, 60))}`);
    }
    return;
  }
  ks.forEach((k) => scan(v[k], id, col, at + "." + k));
}
console.log(`\nSECTION 2 — objects OUTSIDE sling_rack the widened branch can reach:`);
for (const col of OTHER) {
  const rs = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 })
    .catch((e) => dead(`read ${col} failed: ` + (e && e.message)));
  for (const r of rs) scan(r[col], r.id, col, col);
}
console.log(`  reachable objects: ${reach}   changed: ${reachChanged}`);
if (!reach) dead("section 2 found no reachable object at all — it can no longer see the class it exists to bound");

if (LOST.length) { console.error("\nLOST CONTENT:"); for (const l of LOST) console.error("  " + l); dead(`${LOST.length} bullet(s) lost content`); }
if (bulletsNew !== bulletsOld) dead(`bullet count moved ${bulletsOld} -> ${bulletsNew}`);
if (machNew >= machOld) dead(`the widening changed nothing it was aimed at (machine-shaped ${machOld} -> ${machNew})`);
console.log(`\nok — nothing lost, ${machOld - machNew} machine-shaped bullet(s) now read as prose.`);
