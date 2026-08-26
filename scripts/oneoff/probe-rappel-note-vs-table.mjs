#!/usr/bin/env node
// #1259 claims: "Re-measured across every route whose table now has no numbered station: 2 -> 0."
// Verifying that independently, and asking whether the rule is mechanical enough to be an audit
// rather than a one-off — the class has now been demonstrated twice.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes",
  "id,name,rappels,rappel_count_note,rappel_detail,descent_text",
  "or=(rappel_detail.not.is.null,rappel_count_note.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

// A "numbered station" = an entry in the rappel table carrying a usable length.
const stations = (r) => {
  const d = r.rappel_detail;
  const arr = Array.isArray(d) ? d : (d && Array.isArray(d.stations) ? d.stations : []);
  return arr;
};
const withLength = (arr) => arr.filter((s) => {
  const v = s && (s.lengthM ?? s.length_m ?? s.lengthFt ?? s.length);
  return v != null && v !== "" && Number.isFinite(Number(v));
});

// Copy that claims a FIGURE IS DISPLAYED, as opposed to planning guidance which stays true with
// an empty table. The distinction #1259 draws, and the one that decides whether a note is stale.
const CLAIMS_SHOWN = /\b(?:are|is)\s+(?:estimated|shown|listed|given|approximated)\s+(?:here|below|in the table)\b|\bestimated here\b|\bfigures?\s+(?:shown|below)\b|\blengths?\s+(?:shown|listed|given)\b/i;

let tables = 0, empty = 0;
const stale = [], kept = [];
for (const r of rows) {
  const st = stations(r);
  if (!st.length) continue;
  tables++;
  const numbered = withLength(st);
  const note = r.rappel_count_note;
  if (typeof note !== "string" || !note.trim()) continue;
  if (numbered.length) { if (CLAIMS_SHOWN.test(note)) kept.push({ id: r.id, n: numbered.length, note }); continue; }
  empty++;
  if (CLAIMS_SHOWN.test(note)) stale.push({ id: r.id, stations: st.length, note });
}

console.log(`${rows.length} routes carry a rappel table or count note.`);
console.log(`${tables} have a station table; ${empty} of those have NO station carrying a length.\n`);
console.log(`STALE — the note claims a figure is displayed and the table shows none: ${stale.length}`);
for (const s of stale) console.log(`   ${s.id}  (${s.stations} stations, 0 with a length)\n      ${s.note.replace(/\s+/g, " ").slice(0, 200)}`);
console.log(`\nnotes claiming a figure on a table that HAS numbers (correct, must not be rewritten): ${kept.length}`);
for (const k of kept.slice(0, 6)) console.log(`   ${k.id}  (${k.n} numbered)  ${k.note.replace(/\s+/g, " ").slice(0, 120)}`);
if (!tables) { console.error("\nFAIL — zero station tables parsed; the shape moved and 'no stale notes' would be a false pass."); process.exit(1); }
