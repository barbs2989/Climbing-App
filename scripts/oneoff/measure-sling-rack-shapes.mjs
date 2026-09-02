// What SHAPES does routes.sling_rack actually hold, and which of them reach a screen?
//
// `sling_rack` is the last column from the contributable sweep with no editor. CLAUDE.md records
// the blocker as "NOT the cheap text field it looks like: fmtSlingRack returns null for a plain
// string, so a text box there would be contributable and render NOTHING" — the very defect the
// sweep exists to remove. That is a claim about the READER; this asks what the DATA is, because
// the right editor depends on it and "three incompatible shapes" is a note that can rot.
//
// It runs the app's REAL fmtSlingRack, lifted from RouteDetail.jsx with ANCHOR LOST rather than
// copied — a copy would agree with the source the day it was written and measure a fossil
// afterwards, which is exactly the question here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

// --- lift the two real functions out of the source -------------------------------------------
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
function lift(name) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) dead(`ANCHOR LOST: ${name} is not in RouteDetail.jsx under that name`);
  // Balance braces from the first { after the signature.
  let j = src.indexOf("{", i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (!depth) break; }
  }
  if (depth !== 0) dead(`could not balance braces for ${name}`);
  return src.slice(i, k + 1);
}
const mod = new Function(lift("fmtSlingVal") + "\n" + lift("fmtSlingRack") + "\nreturn fmtSlingRack;")();
if (typeof mod !== "function") dead("lifting fmtSlingRack did not yield a function");
// Prove the lift works before trusting a single verdict below.
if (mod([{ qty: 2, sizeCm: 60 }]) !== "2× 60cm") dead("the lifted fmtSlingRack does not format a known shape — the lift is wrong");

// --- read the column -------------------------------------------------------------------------
const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("zero routes carry sling_rack — an empty read, not an empty column");

const kind = (v) => Array.isArray(v)
  ? (v.length && v[0] && typeof v[0] === "object" ? "array<object>" : (v.length ? "array<" + typeof v[0] + ">" : "array<empty>"))
  : (v === null ? "null" : typeof v);

const byKind = {}, renders = {}, samples = {};
for (const r of rows) {
  const k = kind(r.sling_rack);
  byKind[k] = (byKind[k] || 0) + 1;
  const out = mod(r.sling_rack);
  renders[k] = renders[k] || { yes: 0, no: 0 };
  out ? renders[k].yes++ : renders[k].no++;
  if (!samples[k]) samples[k] = { id: r.id, raw: JSON.stringify(r.sling_rack).slice(0, 160), out };
}

console.log(`routes carrying sling_rack: ${rows.length}\n`);
console.log("shape".padEnd(16) + "rows".padEnd(8) + "renders".padEnd(10) + "silent");
for (const k of Object.keys(byKind).sort((a, b) => byKind[b] - byKind[a])) {
  console.log(k.padEnd(16) + String(byKind[k]).padEnd(8) + String(renders[k].yes).padEnd(10) + renders[k].no);
}
console.log("\nsamples (raw -> what the RACK box would print):");
for (const k of Object.keys(samples)) {
  console.log(`  ${k}\n    ${samples[k].id}  ${samples[k].raw}\n    -> ${JSON.stringify(samples[k].out)}`);
}

// Object-shaped values: what keys do they use? That decides whether a keyed editor is possible.
const keys = {};
for (const r of rows) {
  const v = r.sling_rack;
  if (v && !Array.isArray(v) && typeof v === "object") for (const k of Object.keys(v)) keys[k] = (keys[k] || 0) + 1;
  if (Array.isArray(v)) for (const e of v) if (e && typeof e === "object") for (const k of Object.keys(e)) keys["[]." + k] = (keys["[]." + k] || 0) + 1;
}
const ks = Object.entries(keys).sort((a, b) => b[1] - a[1]);
if (ks.length) {
  console.log("\nkeys in use (object and array-of-object shapes):");
  for (const [k, n] of ks.slice(0, 25)) console.log(`  ${String(n).padStart(5)}  ${k}`);
}

const silent = Object.values(renders).reduce((a, x) => a + x.no, 0);
console.log(`\n${silent} of ${rows.length} stored values render NOTHING in the RACK box today.`);
