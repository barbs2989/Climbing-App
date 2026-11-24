// node demote.mjs <N> id:field[:substring] ... — turn named confirmed verdicts into not-on-page (conservative holds)
import fs from "node:fs";
const N = process.argv[2];
const f = `${process.env.BATCH_DIR || "."}/verify${N}.json`;
const v = JSON.parse(fs.readFileSync(f, "utf8"));
for (const spec of process.argv.slice(3)) {
  const [id, field, sub] = spec.split(":");
  const arr = ((v[id] || {}).facts || {})[field] || [];
  let n = 0;
  for (const x of arr) if (x.verdict === "confirmed" && (!sub || String(x.value).toLowerCase().includes(sub.toLowerCase()))) { x.verdict = "not-on-page"; x.page_says = "held: verifier flagged as a soft confirmation"; n++; }
  console.log(`${id} ${field}: demoted ${n}`);
}
fs.writeFileSync(f, JSON.stringify(v, null, 1));
