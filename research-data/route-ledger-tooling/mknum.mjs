// mknum.mjs collect | merge — re-check numeric claims whose evidence did not cover every number
import fs from "node:fs";
const D = (process.env.BATCH_DIR || ".") + "/";
const rd = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
const nums = (s) => String(s).match(/\d+(?:\.\d+)?/g) || [];
const covered = (val, ev) => nums(val).every((n) => String(ev).includes(n) || String(ev).includes(n.replace(/^0\./, ".")));
if (process.argv[2] === "collect") {
  const items = [];
  for (const N of [1, 2, 3, 4]) {
    const v = rd(`verify${N}.json`), c = rd(`claims${N}.json`);
    for (const [id, r] of Object.entries(v)) for (const [k, arr] of Object.entries(r.facts || {})) arr.forEach((f, i) => {
      if (f.verdict === "confirmed" && nums(f.value).length && !covered(f.value, f.evidence)) items.push({ N, id, field: k, i, url: c[id].url, name: c[id].name, claim: String(f.value) });
    });
  }
  const half = Math.ceil(items.length / 2);
  fs.writeFileSync(D + "numcheck1.json", JSON.stringify(items.slice(0, half), null, 1));
  fs.writeFileSync(D + "numcheck2.json", JSON.stringify(items.slice(half), null, 1));
  console.log(items.length, "claims ->", half, "+", items.length - half);
} else if (process.argv[2] === "merge") {
  const res = [...rd("numresult1.json"), ...rd("numresult2.json")];
  const by = {};
  for (const x of res) by[`${x.id}|${x.field}|${x.i}`] = x;
  let kept = 0, held = 0, unanswered = 0;
  for (const N of [1, 2, 3, 4]) {
    const v = rd(`verify${N}.json`);
    for (const [id, r] of Object.entries(v)) for (const [k, arr] of Object.entries(r.facts || {})) arr.forEach((f, i) => {
      if (!(f.verdict === "confirmed" && nums(f.value).length && !covered(f.value, f.evidence))) return;
      const x = by[`${id}|${k}|${i}`];
      if (x && x.verdict === "confirmed" && covered(f.value, x.evidence)) { f.evidence = x.evidence; kept++; }
      else { f.verdict = "not-on-page"; f.page_says = x ? (x.page_says || "numbers not all on the page") : "not re-checked"; if (x) held++; else unanswered++; }
    });
    fs.writeFileSync(D + `verify${N}.json`, JSON.stringify(v, null, 1));
  }
  console.log(`kept ${kept}, held ${held}, unanswered (held) ${unanswered}`);
}
