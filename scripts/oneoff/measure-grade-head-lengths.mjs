// If shortGrade() gained a hard length cap the way seasonShort() already has one, how many real
// grades would change on screen?
//
// Asked BEFORE touching a shared helper. shortGrade cuts at known delimiters and then stops, so
// a grade containing none of them renders in full inside a nowrap pill — unbounded by
// construction. Its sibling seasonShort truncates at 29 with an ellipsis. The asymmetry is real;
// whether closing it is worth doing depends on how many rows it moves.
//
// Imports the REAL shortGrade rather than reimplementing it — a copy would agree with the source
// the day it was written and measure a fossil afterwards.
import { shortGrade } from "../../lib/grade.js";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const CAP = Number((process.argv.find((a) => a.startsWith("--cap=")) || "--cap=30").split("=")[1]);

// The long grades are RARE (median 3 chars), so an unordered sample never sees one. Query the
// shapes that actually get long, plus a plain sample for the denominator.
const q = async (filter, limit = 1000) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,grade&${filter}&limit=${limit}`, { headers: headers(anonKey()) });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status}) — NOT "no long grades"`); process.exit(1); }
  return r.json();
};

const seen = new Map();
for (const f of ["grade=not.is.null", "grade=like.*(*", "grade=ilike.*class*", "grade=ilike.*grade*", "grade=ilike.*pitch*"]) {
  for (const row of await q(f)) seen.set(row.id, row.grade);
}
if (!seen.size) { console.log("FAIL: read no grades"); process.exit(1); }

let overCap = 0;
const examples = [];
for (const [id, g] of seen) {
  const head = shortGrade(g);
  if (head.length > CAP) { overCap++; examples.push({ id, g, head }); }
}
console.log(`${seen.size} distinct grades sampled (long shapes deliberately over-sampled)\n`);
console.log(`   shortGrade() output longer than ${CAP} chars: ${overCap}`);
if (!overCap) {
  console.log("\n   So a cap would change NOTHING on screen today — it only bounds a reader that is");
  console.log("   currently unbounded. That is the SENTINELS argument: guard the reader, not the");
  console.log("   data that happens to exist.");
} else {
  console.log("\n   these would gain an ellipsis:");
  examples.sort((a, b) => b.head.length - a.head.length).slice(0, 12).forEach((e) => {
    console.log(`   ${String(e.head.length).padStart(3)}  ${e.id}`);
    console.log(`        raw:   ${JSON.stringify(String(e.g).slice(0, 110))}`);
    console.log(`        short: ${JSON.stringify(e.head.slice(0, 110))}`);
  });
}
