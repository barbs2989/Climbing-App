// What does the RACK box ACTUALLY render for sling_rack?
//
// THIS SCRIPT WAS MEASURING A FUNCTION THE APP NO LONGER CALLS FOR THE 84% MAJORITY, and reported
// a defect that had been fixed. It lifted `fmtSlingRack` and called it on every stored value —
// but `rackLines()` is the renderer, and it calls fmtSlingRack ONLY for the ARRAY shape, sending
// the OBJECT shape down a label-per-key branch instead. So it kept printing a "Slings —" heading
// the app had stopped emitting, at a length the app had stopped producing:
//
//     lifting fmtSlingRack   p50 83   p90 171   max 396   over-120 23.1%   "Slings" on 84.3%
//     lifting rackLines      p50 26   p90  79   max 252   over-120  2.2%   "Slings" on 74/590
//
// A stale instrument reports a fixed defect as live, and this one would have sent the next reader
// to re-fix the label split. It lifts `rackLines` now, with ANCHOR LOST, and measures the BULLET a
// climber reads rather than a string no screen shows.
//
// The two suspicions this was written for, restated against the real renderer:
//   1. is a bullet labelled for gear it does not carry? (only the ARRAY branch can be, now)
//   2. is a single key's value still a paragraph inside a bullet? -- the check:token-boxes
//      question, one element over.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
function lift(name) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) dead(`ANCHOR LOST: ${name}`);
  let j = src.indexOf("{", i), depth = 0, k = j;
  for (; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}") { depth--; if (!depth) break; } }
  return src.slice(i, k + 1);
}

// rackLines is what RackBox calls. Lift it and both helpers it delegates to, never a copy: a copy
// agrees with itself whatever the app does, which is the entire question here.
const rackLines = new Function(
  lift("fmtSlingVal") + "\n" + lift("fmtSlingRack") + "\n" + lift("rackLines") + "\nreturn rackLines;"
)();

// Self-test the LIFT, not the data. The array shape is the one branch still labelled "Slings".
const probe = rackLines([{ qty: 2, sizeCm: 60 }]);
if (!Array.isArray(probe) || probe.length !== 1 || probe[0].label !== "Slings" || probe[0].text !== "2× 60cm") {
  dead("the lifted renderer is wrong — got " + JSON.stringify(probe));
}

const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("empty read");

// The old NOT_SLINGS list (cams/nuts/pickets/pitons/... as "unambiguously not slings") is GONE
// rather than kept unused: with one bullet per key there is no heading covering foreign gear for
// it to test, so it could only ever return 0, and a counter that cannot fire reads as coverage.
//
// The pipeline's own shape read out loud. Widened past size/count/qty because the label-per-key
// split exposed the same defect under other keys: "pulley: 1, prusiks: 2, purpose: ...".
// `notes?` is here for SYMMETRY with the renderer's synonym list, and it is INERT on today's data
// — measured rather than assumed, because the obvious story was wrong. 24 sling_rack values do mix
// an explanation key with real gear keys, and reading that as 24 missed bullets is a DEPTH
// mistake: 23 of them are the TOP-LEVEL value, which `rackLines` splits into one labelled bullet
// per key ("Note — three independent trip reports converge: …"), so no pair dump happens. Only a
// NESTED object reaches the generic branch, and there is exactly one. Widening this counter moved
// it 15 -> 15 and 1 -> 1. It stays as a sentinel for a nested `{gear, note}` that does not exist
// yet — the argument check:field-renders' SENTINELS makes — not because it found anything.
const MACHINEISH = /\b(size|count|qty|quantity|purpose|length|notes?)\s*:/i;

let valsRendering = 0, valsEmpty = 0, bullets = 0, slingLabelled = 0, fromArray = 0, fromKey = 0;
let machineish = 0, over60 = 0, over120 = 0;
const lens = [], worst = [];

for (const r of rows) {
  const v = r.sling_rack;
  const ls = rackLines(v);
  if (!ls.length) { valsEmpty++; continue; }
  valsRendering++;
  for (const b of ls) {
    const line = b.label + " — " + b.text;
    bullets++;
    lens.push(line.length);
    if (line.length > 60) over60++;
    if (line.length > 120) over120++;
    if (MACHINEISH.test(b.text)) machineish++;
    // TWO DIFFERENT THINGS PRODUCE THIS LABEL and only one of them could ever be a mislabel.
    // An ARRAY gets the "Slings" heading over the whole value; an object with a `slings` KEY gets
    // it over that key alone, with the cams in their own bullet beside it — correct, and the whole
    // point of the split. The old instrument scored the second kind as mislabelled, which is how a
    // fixed defect kept reading as 48 live ones.
    if (b.label === "Slings") { slingLabelled++; if (Array.isArray(v)) fromArray++; else fromKey++; }
    worst.push({ id: r.id, n: line.length, line });
  }
}
if (!bullets) dead("no bullet rendered — the renderer or the read is broken");

lens.sort((a, b) => a - b);
const pc = (p) => lens[Math.min(lens.length - 1, Math.floor(lens.length * p))];
worst.sort((a, b) => b.n - a.n);

console.log(`values: ${rows.length}   rendering: ${valsRendering}   rendering NOTHING: ${valsEmpty}`);
console.log(`BULLETS emitted: ${bullets}\n`);
console.log(`per-bullet length   p50 ${pc(0.5)}   p90 ${pc(0.9)}   max ${lens[lens.length - 1]}`);
console.log(`over 60 chars:   ${over60}  (${(over60 / bullets * 100).toFixed(1)}%)`);
console.log(`over 120 chars:  ${over120}  (${(over120 / bullets * 100).toFixed(1)}%)`);
console.log(`\nbullets labelled "Slings": ${slingLabelled}  (${(slingLabelled / bullets * 100).toFixed(1)}%)`);
console.log(`   from the ARRAY shape (one heading over the whole value): ${fromArray}`);
console.log(`   from a \`slings\` KEY (its own bullet, cams beside it):     ${fromKey}   <- correct, not a mislabel`);
console.log(`bullets reading out a raw key: pair: ${machineish}  (${(machineish / bullets * 100).toFixed(1)}%)`);

console.log(`\nEVERY bullet over 120 chars, as a climber reads it:`);
for (const w of worst.filter((x) => x.n > 120)) console.log(`  ${w.id}  [${w.n}ch]\n    ${w.line}`);

const byLabel = {};
for (const w of worst) { if (w.n <= 120) continue; const l = w.line.split(" — ")[0]; byLabel[l] = (byLabel[l] || 0) + 1; }
console.log(`\nlong bullets by label: ${JSON.stringify(byLabel)}`);
console.log(`(a generic bucket like "Other" is a different defect from a genuinely long value.)`);
