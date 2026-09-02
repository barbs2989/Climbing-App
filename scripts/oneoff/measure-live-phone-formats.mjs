// The decision (2026-09-02) makes the LIVE bucket load-bearing rather than decorative, so ask
// whether its needle actually catches the phone numbers this catalog writes. LIVE requires
// parentheses: /\(\d{3}\)\s*\d{3}-\d{4}/. A bare-dash number is the other common format.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const lift = (n) => {
  const m = src.match(new RegExp("^const " + n + " = (/.*/[a-z]*);$", "m"));
  if (!m) { console.error("ANCHOR LOST: " + n); process.exit(1); }
  return eval(m[1]);
};
const LIVE = lift("LIVE"), NAMED = lift("NAMED"), ACT = lift("ACT");
const CN = lift("COMMON_NOUN");
const de = (t) => t.replace(CN, (m) => "x".repeat(m.length));

const pcm = src.match(/const PROSE_COLS = \[[\s\S]*?\];/);
const PROSE = eval(pcm[0].replace("const PROSE_COLS =", "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/;\s*$/, ""));

const rows = await selectAll("routes", "id," + PROSE.join(","), "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — 0 routes."); process.exit(1); }
const leaves = (v, out) => {
  if (v == null) return out;
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (typeof v === "object") { for (const k of Object.keys(v)) leaves(v[k], out); return out; }
  return out;
};
const values = [];
for (const r of rows) for (const f of PROSE) for (const t of leaves(r[f], [])) values.push({ id: r.id, field: f, text: t });

// Any US phone number, however written.
const ANYPHONE = /\b(?:\(\d{3}\)\s*|\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/;

let live = 0, phoneAny = 0, phoneMissed = 0, missedAndUncited = 0;
const show = [];
for (const v of values) {
  const t = de(v.text);
  const cited = NAMED.test(t) || ACT.test(t);
  if (LIVE.test(v.text)) live++;
  if (ANYPHONE.test(v.text)) {
    phoneAny++;
    if (!LIVE.test(v.text)) {
      phoneMissed++;
      if (!cited) { missedAndUncited++; if (show.length < 10) show.push(v); }
    }
  }
}
console.log(`values: ${values.length}`);
console.log(`LIVE (current needle) matches:        ${live}`);
console.log(`values carrying ANY phone number:     ${phoneAny}`);
console.log(`  ...that LIVE misses:                ${phoneMissed}`);
console.log(`  ...missed AND not otherwise cited:  ${missedAndUncited}  <- these are the undercount\n`);
for (const v of show) {
  const m = v.text.match(ANYPHONE);
  console.log(`${v.id}  ${v.field}\n   ${JSON.stringify(m[0])}  …${v.text.slice(Math.max(0, v.text.indexOf(m[0]) - 70), v.text.indexOf(m[0]) + 60).trim()}…`);
}
