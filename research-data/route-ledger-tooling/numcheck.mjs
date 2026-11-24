// node numcheck.mjs <N> — for every confirmed claim, does each number in the claim appear in its evidence phrase?
import fs from "node:fs";
const N = process.argv[2];
const v = JSON.parse(fs.readFileSync(`${process.env.BATCH_DIR || "."}/verify${N}.json`, "utf8"));
let checked = 0, bad = 0;
for (const [id, r] of Object.entries(v)) for (const [k, arr] of Object.entries(r.facts || {})) for (const f of arr) {
  if (f.verdict !== "confirmed") continue;
  const nums = String(f.value).match(/\d+(?:\.\d+)?/g) || [];
  if (!nums.length) continue;
  checked++;
  const ev = String(f.evidence || "");
  const miss = nums.filter((n) => !ev.includes(n) && !ev.includes(n.replace(/^0\./, ".")));
  if (miss.length) { bad++; if (bad <= 12) console.log(`  ${id} ${k}: "${String(f.value).slice(0, 60)}" vs evidence "${ev.slice(0, 70)}" — missing ${miss.join(",")}`); }
}
console.log(`part ${N}: ${checked} numeric confirmations, ${bad} whose numbers are not all in the evidence`);
