// The sling_rack values all render. That is the problem.
//
// measure-sling-rack-shapes.mjs establishes that 242 of 242 stored values produce output, so the
// recorded blocker ("a text box would render NOTHING") is about a contributed STRING, not about
// the stored data. What it did not ask is whether what renders is any good. Two suspicions, both
// visible in a single sample:
//
//   Slings — cams: size: #0 C3 to 0.75 in, count: 2; size: #1 to #3, count: 1, nuts: ...
//
//   1. The line is LABELLED "Slings" and the value is a whole rack -- cams, nuts, pickets, pitons.
//   2. The generic object branch emits `size: X, count: N` pairs, which is the pipeline's shape
//      read out loud rather than something a climber wrote.
//
// It renders into a BULLET in the RACK box, so length matters the way it does for a chip -- the
// check:token-boxes question, one element over.
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
const fmt = new Function(lift("fmtSlingVal") + "\n" + lift("fmtSlingRack") + "\nreturn fmtSlingRack;")();
if (fmt([{ qty: 2, sizeCm: 60 }]) !== "2× 60cm") dead("the lifted formatter is wrong");

const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("empty read");

// Keys that are unambiguously NOT slings. Deliberately conservative: `runners` and `webbing` ARE
// slings, and `cordelette` is arguable, so none of them counts toward the mislabel.
const NOT_SLINGS = /^(cams?|nuts?|pickets?|pitons?|ice_screws?|tricams?|hexes?|ball_?nuts?|cordelette|second_tool|crevasse_rescue_kit|rock_gear|light_rack|rack|other|notes?)$/i;

let mislabelled = 0, machineish = 0, over60 = 0, over120 = 0;
const lens = [];
const worst = [];
for (const r of rows) {
  const v = r.sling_rack, out = fmt(v);
  if (!out) continue;
  lens.push(out.length);
  if (out.length > 60) over60++;
  if (out.length > 120) over120++;
  if (/\b(size|count|qty)\s*:/.test(out)) machineish++;
  const ks = (v && !Array.isArray(v) && typeof v === "object") ? Object.keys(v) : [];
  if (ks.some((k) => NOT_SLINGS.test(k))) mislabelled++;
  worst.push({ id: r.id, n: out.length, out });
}
if (!lens.length) dead("nothing rendered — the formatter or the read is broken");

lens.sort((a, b) => a - b);
const pc = (p) => lens[Math.min(lens.length - 1, Math.floor(lens.length * p))];
worst.sort((a, b) => b.n - a.n);

console.log(`rendered values: ${lens.length}\n`);
console.log(`length   p50 ${pc(0.5)}   p90 ${pc(0.9)}   max ${lens[lens.length - 1]}`);
console.log(`over 60 chars in one bullet:  ${over60}  (${(over60 / lens.length * 100).toFixed(1)}%)`);
console.log(`over 120 chars:               ${over120}  (${(over120 / lens.length * 100).toFixed(1)}%)`);
console.log(`\nlabelled "Slings" but carrying non-sling gear: ${mislabelled}  (${(mislabelled / lens.length * 100).toFixed(1)}%)`);
console.log(`emitting a raw size:/count:/qty: pair:          ${machineish}  (${(machineish / lens.length * 100).toFixed(1)}%)`);

console.log(`\nthe five longest, as they appear in the RACK bullet:`);
for (const w of worst.slice(0, 5)) console.log(`  ${w.id}  [${w.n}ch]\n    Slings — ${w.out}`);

console.log(`\nfive that are genuinely slings and read fine:`);
const fine = worst.filter((w) => !/\b(size|count|qty)\s*:/.test(w.out) && w.n <= 60);
for (const w of fine.slice(0, 5)) console.log(`  ${w.id}  Slings — ${w.out}`);
console.log(`\n(${fine.length} of ${lens.length} are in that clean set.)`);
