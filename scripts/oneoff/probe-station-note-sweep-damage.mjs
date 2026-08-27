#!/usr/bin/env node
// #1268 swept 32 station notes that explained a distance no longer shown. Its rule is structural:
// drop a CLAUSE naming the measurement AND admitting it is absent, keeping remarks about anything
// else ("exact ANCHOR TYPE not documented").
//
// Verifying the other direction, which a "32 -> 0" count cannot show: did the sweep DAMAGE
// anything? Two questions a count does not answer —
//   1. did any station that still HAS a number lose the note explaining it?
//   2. did any note lose an admission about something OTHER than a distance?
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,rappel_detail", "rappel_detail.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }
const stations = (d) => (Array.isArray(d) ? d : (d && Array.isArray(d.stations) ? d.stations : []));
const lenOf = (s) => { const v = s && (s.lengthM ?? s.length_m ?? s.lengthFt ?? s.length); return v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null; };

// The class #1268 removed: names a MEASUREMENT and admits it is absent.
const MEASURE = /\b(length|distance|spacing)\b/i;
const ABSENT = /\bnot\b|\bestimat/i.source ? /\bnot\s|\bestimat|\bapproxim|\bassum|\bunknown|\bunconfirmed/i : null;
// Honest remarks about something ELSE that must have survived.
const OTHER_ABSENT = /\b(anchor|bolt|station|rock|tree|sling|fixed gear)\b[^.;]{0,40}\b(not|unknown|unconfirmed|undocumented)\b/i;

let tables = 0, withNote = 0, numbered = 0;
const stillStale = [], numberedNoNote = [], otherKept = [];
for (const r of rows) {
  const st = stations(r.rappel_detail);
  if (!st.length) continue;
  tables++;
  for (const s of st) {
    const note = typeof s.note === "string" ? s.note : (typeof s.notes === "string" ? s.notes : "");
    const L = lenOf(s);
    if (L != null) numbered++;
    if (note.trim()) withNote++;
    // 1. the class itself: does any note still explain an absent measurement?
    for (const clause of note.split(/[;.]/)) {
      if (MEASURE.test(clause) && ABSENT.test(clause)) { stillStale.push({ id: r.id, L, clause: clause.trim() }); break; }
    }
    // 2. honest non-distance admissions that had to survive
    if (OTHER_ABSENT.test(note)) otherKept.push({ id: r.id, note: note.trim() });
    // 3. a station that HAS a number but lost its note entirely is the damage case
    if (L != null && !note.trim()) numberedNoNote.push({ id: r.id, L });
  }
}

console.log(`${tables} routes with a station table; ${numbered} stations carry a length; ${withNote} carry a note.\n`);
console.log(`1. notes STILL explaining an absent measurement (the class #1268 swept): ${stillStale.length}`);
for (const x of stillStale.slice(0, 8)) console.log(`      ${x.id}  len=${x.L ?? "—"}  "${x.clause.slice(0, 100)}"`);
console.log(`\n2. honest NON-distance admissions that survived (must be > 0, or the sweep was too wide): ${otherKept.length}`);
for (const x of otherKept.slice(0, 6)) console.log(`      ${x.id}  "${x.note.slice(0, 110)}"`);
console.log(`\n3. stations with a number and NO note at all (context, not necessarily damage): ${numberedNoNote.length}`);
