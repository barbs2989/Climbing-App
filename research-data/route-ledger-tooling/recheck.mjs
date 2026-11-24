// node recheck.mjs <repo batch dir>  — soften one wording, word/number/brand checks, write dry-copy.json
import fs from "node:fs";
const d = (process.env.BATCH_DIR || ".") + "/";
const P = JSON.parse(fs.readFileSync(d + "prose.json", "utf8"));
const F = JSON.parse(fs.readFileSync(d + "facts-verified.json", "utf8"));
const nb = P.ut_ninja_bedwetter;
if (nb && nb.detailed_rack) { nb.detailed_rack = nb.detailed_rack.replace(/\b([Tt])wo blue Metolius/, "$1wo or so blue Metolius"); console.log("ninja:", nb.detailed_rack); }
fs.writeFileSync(d + "prose.json", JSON.stringify(P, null, 1));
const bad = /mountain ?project|\bMP\b|thecrag|guidebook|according|verif|\bstated\b|\bdata\b|TBD|source|classic|stunning|sandbag|reviewer|poster/i;
let w = 0, n = 0, b = 0;
for (const [id, r] of Object.entries(P)) {
  const fs_ = JSON.stringify(F[id] || {});
  for (const k of ["overview", "detailed_rack", "descent_text"]) {
    const s = r[k]; if (!s) continue;
    if (bad.test(s)) { w++; console.log("WORD", id, s.slice(0, 120)); }
    for (const x of s.match(/\d+(\.\d+)?/g) || []) if (!fs_.includes(x) && !fs_.includes(x.replace(/^0\./, "."))) { n++; console.log("NUM", id, k, x, ":", s.slice(0, 120)); }
    for (const br of ["camalot", "friend", "alien", "tcu", "totem", "metolius"]) if (new RegExp(br, "i").test(s) && !new RegExp(br, "i").test(fs_)) { b++; console.log("BRAND", id, br); }
  }
}
console.log("word", w, "num", n, "brand", b);
if (process.argv[2]) {
  const B = JSON.parse(fs.readFileSync(process.argv[2] + "/batch-ic4-indian-creek.json", "utf8"));
  for (const [id, e] of Object.entries(B)) { const s = { ...(e.set || {}) }; if (P[id] && P[id].detailed_rack) s.pro_needs = P[id].detailed_rack; e.set = s; e.ledger = []; if (!Object.keys(s).length) delete e.set; }
  fs.writeFileSync(d + "dry-copy.json", JSON.stringify(B));
  console.log("dry-copy written");
}
