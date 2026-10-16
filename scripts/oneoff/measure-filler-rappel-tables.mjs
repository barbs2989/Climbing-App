// Which rap-by-rap tables are filler rather than research? Read-only.
// Signals: every station the same length (3+ stations); stations whose only text is a stock phrase
// ("Continues down…", "Mid-sequence rappel", "representative"); stations with no station/anchor text.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,pitches,rappel_detail,rappel_count_note", "rappel_detail=not.is.null", { key, pageSize: 200 });
const STOCK = /^(?:continues?|continuing|mid-sequence|mid-ridge|next|later-stage|second-to-last|lower[- ]\w+ rappel)\b|representative/i;
const out = [];
for (const r of rows) {
  const d = Array.isArray(r.rappel_detail) ? r.rappel_detail : [];
  if (d.length < 2 || !((r.pitches || 0) > 1)) continue;
  const lens = d.map((s) => s.lengthM).filter((n) => typeof n === "number");
  const uniform = d.length >= 3 && lens.length === d.length && new Set(lens).size === 1;
  const stock = d.filter((s) => STOCK.test(String(s.notes || "").trim()) && !String(s.station || "").trim()).length;
  const bare = d.filter((s) => !String(s.station || "").trim() && String(s.notes || "").trim().length < 60).length;
  const rep = /representative/i.test(r.rappel_count_note || "");
  const score = (uniform ? 2 : 0) + (stock >= 2 ? 2 : 0) + (bare >= Math.ceil(d.length / 2) ? 1 : 0) + (rep ? 2 : 0);
  if (score >= 2) out.push({ id: r.id, n: d.length, uniform: uniform ? lens[0] : "", stock, bare, rep, score });
}
out.sort((a, b) => b.score - a.score);
for (const o of out) console.log(`${o.score} ${o.id} n=${o.n} uniform=${o.uniform} stock=${o.stock} bare=${o.bare}${o.rep ? " REPRESENTATIVE" : ""}`);
console.log(out.length, "tables to read");
