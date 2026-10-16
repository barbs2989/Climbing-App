// Extract each maximal ALL-CAPS run (containing at least one ordinary English word) from the
// unique target strings, with context, into chunk files for recasing.
import fs from "fs";
const dir = new URL("./", import.meta.url);
const t = JSON.parse(fs.readFileSync(new URL("targets.json", dir)));
const dict = new Set(fs.readFileSync("/usr/share/dict/words", "utf8").split("\n").filter(w => w && w === w.toLowerCase()));
const uniq = [...new Set(t.map(x => x.s))];
// Caps token = 2+ capital letters (or a single capital A/I inside a run). Separators may hold digits and punctuation.
const RUN = /\b[A-Z][A-Z'’]*[A-Z](?:['’]s)?\b(?:(?:[\s,;:\-–—/&().0-9"“”%~+]|\b[a-z]{1,2}\b(?=[\s.,]))*\b(?:[A-Z][A-Z'’]*[A-Z]|A|I)(?:['’]s)?\b)*/g;
const word = w => dict.has(w.toLowerCase().replace(/['’]s$/, "").replace(/['’]/g, ""));
const runs = [];
uniq.forEach((s, si) => {
  for (const m of s.matchAll(RUN)) {
    const toks = m[0].match(/[A-Z][A-Z'’]*[A-Z]/g) || [];
    if (!toks.some(w => word(w))) continue;
    runs.push({ k: `${si}:${m.index}`, before: s.slice(Math.max(0, m.index - 70), m.index), run: m[0], after: s.slice(m.index + m[0].length, m.index + m[0].length + 50) });
  }
});
console.log("unique strings", uniq.length, "runs", runs.length, "run chars", runs.reduce((a, r) => a + r.run.length, 0));
fs.writeFileSync(new URL("uniq.json", dir), JSON.stringify(uniq));
const N = +(process.argv[2] || 8);
fs.mkdirSync(new URL("chunks/", dir), { recursive: true });
const per = Math.ceil(runs.length / N);
for (let i = 0; i < N; i++) fs.writeFileSync(new URL(`chunks/in-${i}.json`, dir), JSON.stringify(runs.slice(i * per, (i + 1) * per), null, 0).replace(/\},\{/g, "},\n{"));
