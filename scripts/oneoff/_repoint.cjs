// node scripts/oneoff/_repoint.cjs <inject-file> <line> <new file value as code> — the injection case
// reported at <line> by check:injection-anchors names its target file in a `file:` key on that line or
// up to 25 lines above it; replace that value. PR61 helper: the anchors moved into src/components/.
const fs = require("fs");
const [f, lineS, val] = process.argv.slice(2);
const L = fs.readFileSync(f, "utf8").split("\n"); const line = +lineS - 1;
const order = [...Array(6).keys()].map(k => line + k).concat([...Array(25).keys()].map(k => line - 1 - k)).filter(i => i >= 0 && i < L.length);
for (const i of order) {
  const m = /\bfile:\s*([^,}\n]+)/.exec(L[i]);
  if (m) { L[i] = L[i].slice(0, m.index) + "file: " + val + L[i].slice(m.index + m[0].length); fs.writeFileSync(f, L.join("\n")); console.log(`${f}:${i + 1}  file: ${m[1].trim()} -> ${val}`); process.exit(0); }
}
console.error(`${f}:${lineS} no file: key found`); process.exit(1);
