// Report-only: what the typed grade columns hold, so an ice / mixed / aid grade RANGE can be put
// on a single scale. grade_num mixes scales on these disciplines (aid stores its YDS free grade on
// most rows), so the range has to read a scale-specific token out of the text columns instead.
// For each discipline: how many rows carry a WI/AI, M, or A/C token, and in which column.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const COLS = "id,discipline,grade,grade_num,rock_grade,ice_grade,alpine_grade,aid_grade";
const rows = await selectAll("routes", COLS, "", { pageSize: 1000, key });
if (rows.length < 100000 || new Set(rows.map(r => r.id)).size !== rows.length) { console.error("FAIL: " + rows.length + " rows"); process.exit(1); }
const TOK = { wi: /\b(?:WI|AI)\s?(\d+)/i, m: /\bM(\d+)\b/, aid: /\b[AC](\d)\b/ };
const TC = ["grade", "ice_grade", "aid_grade", "rock_grade", "alpine_grade"];
const by = {};
for (const r of rows) {
  const d = r.discipline || "(none)";
  const b = by[d] || (by[d] = { n: 0, tok: {}, sample: {} });
  b.n++;
  for (const [t, rx] of Object.entries(TOK)) for (const c of TC) {
    const v = r[c]; if (typeof v !== "string" || !rx.test(v)) continue;
    const k = t + " in " + c; b.tok[k] = (b.tok[k] || 0) + 1; (b.sample[k] = b.sample[k] || []).length < 3 && b.sample[k].push(v.slice(0, 50));
  }
}
console.log("routes read: " + rows.length);
for (const d of ["ice", "mixed", "aid", "alpine", "mountaineering", "trad", "sport"]) {
  const b = by[d]; if (!b) continue;
  console.log("\n" + d + " (" + b.n + ")");
  for (const [k, n] of Object.entries(b.tok).sort((a, z) => z[1] - a[1])) console.log("  " + k.padEnd(22) + String(n).padStart(6) + "  e.g. " + b.sample[k].join(" | "));
}
