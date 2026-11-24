// node checkv.mjs <N> — accept a strict verifier file only if every "confirmed" carries an evidence phrase.
import fs from "node:fs";
const N = process.argv[2];
const v = JSON.parse(fs.readFileSync(`${process.env.BATCH_DIR || "."}/verify${N}.json`, "utf8"));
const c = JSON.parse(fs.readFileSync(`${process.env.BATCH_DIR || "."}/claims${N}.json`, "utf8"));
let conf = 0, diff = 0, nop = 0, noev = 0, wrong = 0, claims = 0, missing = 0;
for (const [id, cl] of Object.entries(c)) {
  const r = v[id];
  if (!r) { missing++; continue; }
  if (!r.right_page) wrong++;
  for (const [k, arr] of Object.entries(cl.facts)) {
    claims += arr.length;
    const vv = (r.facts || {})[k] || [];
    if (vv.length !== arr.length) missing += Math.abs(arr.length - vv.length);
    for (const f of vv) {
      if (f.verdict === "confirmed") { conf++; if (!String(f.evidence || "").trim()) noev++; }
      else if (f.verdict === "differs") diff++; else nop++;
    }
  }
}
console.log(`part ${N}: claims ${claims}, confirmed ${conf}, differs ${diff}, not-on-page ${nop}, wrong pages ${wrong}, confirmed WITHOUT evidence ${noev}, verdicts missing ${missing}`);
console.log(noev || missing ? "REJECT" : conf === claims ? "ACCEPT (but 100% confirmed — spot-check evidence)" : "ACCEPT");
