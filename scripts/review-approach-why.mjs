// Offline review of a research batch for apply-approach-why.mjs: parses it, checks it against its
// census input (names, the primary, coverage) and prints every `why` line to read. No database.
//   node scripts/review-approach-why.mjs b03 [b04 ...]
import { readFileSync } from "node:fs";
const SRC = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|beckey|nelson|guide ?book|trip report|according to|reported by|mountaineers|wta)\b/i;
for (const b of process.argv.slice(2)) {
  const inp = JSON.parse(readFileSync(`audits/approach-why/in/${b}.json`, "utf8"));
  let out;
  try { out = JSON.parse(readFileSync(`audits/approach-why/out/${b}.json`, "utf8")); } catch (e) { console.log(`${b}: DOES NOT PARSE — ${e.message}`); continue; }
  let n = 0, alts = 0;
  for (const r of inp) {
    alts += r.ways.filter(w => !w.primary).length;
    const s = out[r.id];
    if (!s) { console.log(`${b} MISSING ${r.id}`); continue; }
    const names = new Set(r.ways.map(w => w.name));
    const prim = (r.ways.find(w => w.primary) || {}).name || s.primary;
    if (s.primary && !names.has(s.primary)) console.log(`${b} ${r.id} BAD PRIMARY ${s.primary}`);
    for (const [k, t] of Object.entries(s.why || {})) {
      n++;
      const bad = [!names.has(k) && "NO SUCH WAY IN", k === prim && "ON PRIMARY", t.length > 240 && "LONG", SRC.test(t) && "SOURCE"].filter(Boolean);
      console.log(`${b} ${r.id} | ${k}${bad.length ? "  <<" + bad.join(",") : ""}\n     ${t}`);
    }
  }
  console.log(`${b}: ${n} why lines for ${alts} alternative ways in\n`);
}
