#!/usr/bin/env node
// Tightened: a note is stale only if it AFFIRMS that a figure is displayed. A negation saying no
// distance is given is the honest case and must stay quiet — the "a negation is not a claim" trap
// this repo records for audit:trailhead-road and check:rappel-lengths, which my first pass walked
// straight into (4 hits, all four of them negations).
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,rappel_count_note,rappel_detail",
  "rappel_detail.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

const stations = (r) => { const d = r.rappel_detail; return Array.isArray(d) ? d : (d && Array.isArray(d.stations) ? d.stations : []); };
const numbered = (arr) => arr.filter((s) => { const v = s && (s.lengthM ?? s.length_m ?? s.lengthFt ?? s.length); return v != null && v !== "" && Number.isFinite(Number(v)); });

// AFFIRMATIVE only: the note says a figure IS here. Anything negated is the honest case.
const AFFIRM = /\b(?:are|is)\s+estimated\s+(?:here|below|as)\b|\bfigures?\s+below\s+are\b|\blengths?\s+(?:below|shown|given)\s+are\b/i;
const NEGATED = /\bno\b[^.]{0,60}\b(?:distance|length|figure|breakdown)\b|\bnone is given\b|\bnot (?:given|published|documented|specified)\b|\bunconfirmed\b/i;

let emptyTables = 0;
const stale = [];
for (const r of rows) {
  const st = stations(r);
  if (!st.length || numbered(st).length) continue;
  emptyTables++;
  const n = r.rappel_count_note;
  if (typeof n !== "string" || !n.trim()) continue;
  // Judge the SENTENCE carrying the affirmation, not the whole note: several of these correctly
  // pair "no distance is published" with planning guidance in the next sentence.
  for (const sent of n.split(/(?<=[.;])\s+/)) {
    if (AFFIRM.test(sent) && !NEGATED.test(sent)) { stale.push({ id: r.id, sent: sent.trim() }); break; }
  }
}
console.log(`${emptyTables} route(s) have a station table with NO numbered length.`);
console.log(`${stale.length} of them carry a note AFFIRMING a figure is displayed:\n`);
for (const s of stale) console.log(`   ${s.id}\n      ${s.sent.slice(0, 200)}`);
if (!stale.length) console.log("   (none — every remaining note either states no figure is given, or gives planning guidance only)");
if (!emptyTables) { console.error("\nFAIL — no empty tables found at all; the shape moved."); process.exit(1); }
