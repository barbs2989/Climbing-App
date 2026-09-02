// Did splitting the rack into one bullet per gear type actually improve what is on screen?
//
// The claim is threefold and each half is measurable over the real catalog: the "Slings" label
// stops appearing on non-sling gear, no bullet is a paragraph any more, and NOTHING IS LOST — the
// text a climber could read before must still be readable after.
//
// The old formatter is read from a git ref and the new one from the working tree, both lifted with
// ANCHOR LOST. A hand-copied "before" would agree with whatever I believed it did.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REF = process.argv[2] || "origin/main";
const dead = (w) => { console.error(`\nverification FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

function lift(src, name, label) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) dead(`ANCHOR LOST: ${name} in the ${label} source`);
  let depth = 0, k = src.indexOf("{", i);
  for (; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}") { depth--; if (!depth) break; } }
  if (depth !== 0) dead(`could not balance braces for ${name} (${label})`);
  return src.slice(i, k + 1);
}

const newSrc = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const oldSrc = execFileSync("git", ["show", `${REF}:RouteDetail.jsx`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString();

// BEFORE: one string, pushed as a single "Slings — …" bullet.
const oldFmt = new Function(lift(oldSrc, "fmtSlingVal", "old") + "\n" + lift(oldSrc, "fmtSlingRack", "old") + "\nreturn fmtSlingRack;")();
// AFTER: a list of {label,text}.
const newLines = new Function(lift(newSrc, "fmtSlingVal", "new") + "\n" + lift(newSrc, "fmtSlingRack", "new") + "\n" + lift(newSrc, "rackLines", "new") + "\nreturn rackLines;")();
if (oldFmt([{ qty: 2, sizeCm: 60 }]) !== "2× 60cm") dead("the OLD formatter does not format a known shape — the lift is wrong");
const probe = newLines([{ qty: 2, sizeCm: 60 }]);
if (!(probe.length === 1 && probe[0].label === "Slings" && probe[0].text === "2× 60cm")) dead("the NEW rackLines mishandles the array shape — an array is genuinely a sling list");

const NOT_SLINGS = /^(cams?|nuts?|pickets?|pitons?|ice screws?|tricams?|hexes?|cordelette|second tool|crevasse rescue kit|rock gear|light rack|rack|other|notes?)$/i;

const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("empty read");

let mislabelledBefore = 0, mislabelledAfter = 0, lost = 0, machineBefore = 0, machineAfter = 0;
const beforeLens = [], afterLens = [];
const worstAfter = [];
for (const r of rows) {
  const before = oldFmt(r.sling_rack);
  const after = newLines(r.sling_rack);
  if (before) {
    beforeLens.push(before.length);
    if (/\b(size|count|qty)\s*:/.test(before)) machineBefore++;
    const ks = (r.sling_rack && !Array.isArray(r.sling_rack) && typeof r.sling_rack === "object") ? Object.keys(r.sling_rack) : [];
    if (ks.some((k) => NOT_SLINGS.test(k.replace(/_/g, " ")))) mislabelledBefore++;
  }
  for (const l of after) {
    afterLens.push((l.label + " — " + l.text).length);
    if (/\b(size|count|qty)\s*:/.test(l.text)) machineAfter++;
    // A "Slings" label is CORRECT here — after the split every label IS its own key, and 53 of
    // the stored objects have a `slings` key. The first version of this test flagged all 54 of
    // those as mislabelled, i.e. it reported the fix as the defect. What is actually worth
    // asserting is that no label is invented: every one must correspond to a key of the value.
    if (!Array.isArray(r.sling_rack) && r.sling_rack && typeof r.sling_rack === "object") {
      const keys = Object.keys(r.sling_rack).map((k) => k.replace(/_/g, " ").toLowerCase());
      if (!keys.includes(l.label.toLowerCase())) mislabelledAfter++;
    }
    worstAfter.push({ id: r.id, n: (l.label + " — " + l.text).length, s: l.label + " — " + l.text });
  }
  // NOTHING LOST: every non-space character the old bullet showed must still be reachable.
  if (before) {
    // LABEL + TEXT. Joining only the text reported 218 values as losing content, because every
    // key name ("cams", "nuts") moved OUT of the string and INTO the label — the fix looked like
    // mass data loss. A comparison has to span everything the reader now sees.
    const flat = after.map((l) => l.label + " " + l.text).join(" ");
    // LOWERCASE, and this was the third false failure in this verifier alone. `rackLines`
    // capitalises the label ("cams" -> "Cams"), and a case-SENSITIVE `includes` therefore
    // reported every key name as content the reader had lost — 216 phantom losses, while the
    // app change was correct throughout. Compare what the reader sees, case-folded.
    const strip = (x) => x.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const b = strip(before.replace(/\b(size|count|qty)\s*:/g, "")), a = strip(flat);
    // STRUCTURAL WORDS ARE NOT CONTENT. "size:", "count:", "note:" were labels in the old
    // string and are now either a quantity prefix or a bracket, so their CONTENT survives while
    // the word does not. Leaving "note" out of this list reported the 8 values the widened
    // quantity branch had just improved as the only ones losing text.
    let miss = 0;
    for (const tok of before.split(/[\s,;]+/)) {
      const t = strip(tok);
      // THE SKIP LIST HAS TO TEST THE STRIPPED TOKEN. Splitting the old string yields "size:"
      // and "count:" WITH the colon attached, so `/^size$/` never matched them, they were
      // checked against the new text, and every {size,count} value reported as losing content.
      // 218 phantom losses from one missing strip.
      if (t.length > 3 && !/^(size|count|qty|note|notes)$/i.test(t) && !a.includes(t)) miss++;
    }
    if (miss) { lost++; if (lost <= 3) console.log(`  LOST on ${r.id}: ${miss} token(s) not reachable after`); }
    void b;
  }
}
const pc = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
worstAfter.sort((a, b) => b.n - a.n);

console.log(`\nrows with a rack: ${beforeLens.length}   bullets after: ${afterLens.length}\n`);
console.log(`                       before    after`);
console.log(`bullet length  p50    ${String(pc(beforeLens, 0.5)).padEnd(9)} ${pc(afterLens, 0.5)}`);
console.log(`               p90    ${String(pc(beforeLens, 0.9)).padEnd(9)} ${pc(afterLens, 0.9)}`);
console.log(`               max    ${String(Math.max(...beforeLens)).padEnd(9)} ${Math.max(...afterLens)}`);
console.log(`over 120 chars        ${String(beforeLens.filter((n) => n > 120).length).padEnd(9)} ${afterLens.filter((n) => n > 120).length}`);
console.log(`\n"Slings" on non-slings ${String(mislabelledBefore).padEnd(9)} ${mislabelledAfter}`);
console.log(`raw size:/count: pairs ${String(machineBefore).padEnd(9)} ${machineAfter}`);
console.log(`\nvalues losing text:    ${lost}`);
console.log(`\nthe three longest bullets that remain:`);
for (const w of worstAfter.slice(0, 3)) console.log(`  ${w.id} [${w.n}ch]\n    ${w.s.slice(0, 240)}${w.s.length > 240 ? "…" : ""}`);

let bad = 0;
if (mislabelledAfter) { console.error(`\nFAIL — ${mislabelledAfter} bullet(s) carry a label that is not a key of their own value.`); bad++; }
if (machineAfter) { console.error(`FAIL — ${machineAfter} bullet(s) still print a raw size:/count: pair.`); bad++; }
if (lost) { console.error(`FAIL — ${lost} value(s) lost text a climber could read before.`); bad++; }
if (afterLens.length <= beforeLens.length) { console.error(`FAIL — splitting produced ${afterLens.length} bullets from ${beforeLens.length} values; it should produce more.`); bad++; }
console.log(bad ? `\n${bad} check(s) failed.` : `\nok — labels correct, nothing lost, and the longest bullet is down from ${Math.max(...beforeLens)} to ${Math.max(...afterLens)} characters.`);
process.exit(bad ? 1 : 0);
