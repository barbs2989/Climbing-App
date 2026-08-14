// A clipboard copy is invisible by nature: nothing on screen changes, so with no confirmation
// the user cannot tell a successful copy from a dead button. Which of this app's copy actions
// say nothing?
//
// Same self-test discipline as the write audit: "no findings" is what a broken detector prints.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.jsx?$/.test(f)).map(f => "lib/" + f)];

// Feedback for a copy is broader than a toast: a local "Copied!" flag flipped in state counts,
// and so does any setter whose name says copied/done.
const FEEDBACK = /showToast|notify\s*\(|setCopied|setCopy|Copied|copied|setDone|setSent|setOk|alert\s*\(/;
const WINDOW = 400;

function scan(src) {
  const hits = [];
  for (const m of src.matchAll(/clipboard\.writeText\s*\(/g)) {
    const around = src.slice(Math.max(0, m.index - WINDOW), m.index + WINDOW);
    hits.push({ line: src.slice(0, m.index).split("\n").length, quiet: !FEEDBACK.test(around),
                snippet: src.slice(m.index, m.index + 60).replace(/\s+/g, " ") });
  }
  return hits;
}

// self-test
const QUIET = `const go = () => { navigator.clipboard.writeText(url); };`;
const LOUD = `const go = () => { navigator.clipboard.writeText(url); showToast("Link copied"); };`;
const s1 = scan(QUIET), s2 = scan(LOUD);
if (!(s1.length === 1 && s1[0].quiet && s2.length === 1 && !s2[0].quiet)) {
  console.error("SELF-TEST FAILED — detector cannot distinguish a quiet copy from a confirmed one.");
  process.exit(1);
}
console.log("self-test: ok — a bare copy is caught, a confirmed one is not\n");

let total = 0;
const quiet = [];
for (const rel of FILES) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  for (const h of scan(fs.readFileSync(p, "utf8"))) {
    total++;
    if (h.quiet) quiet.push({ ...h, file: rel });
  }
}
if (!total) { console.error("REFUSING — found no clipboard calls; the scan broke"); process.exit(1); }
console.log(`${total} clipboard copies; ${total - quiet.length} confirm, ${quiet.length} say nothing\n`);
for (const q of quiet) console.log(`  ${q.file}:${q.line}  ${q.snippet}`);
