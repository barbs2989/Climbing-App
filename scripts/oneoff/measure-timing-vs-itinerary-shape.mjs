#!/usr/bin/env node
// IS `timing.sectionBreakdown` ANYTHING MORE THAN A LOSSY COPY OF `itinerary.days`?
//
// measure-timing-itinerary-overlap.mjs established that 450 of 857 routes store an identical
// string in both columns and that both render on the Planner tab. That says they OVERLAP; it does
// not say what the repair is. Merging the two panels — my first recommendation — assumes they
// carry different content. Reading the raw rows says otherwise:
//
//   timing.sectionBreakdown[i] = { section, fromTo, note, hrs }
//   itinerary.days[i]          = { n, title, note, hours, miles, gainFt, lossFt, packLb,
//                                  objective, schedule }
//
// entry for entry: `fromTo` == `title`, `hrs` == `hours`, `note` == `note` (and on
// wa_the_devils_club the sectionBreakdown copy is TRUNCATED mid-sentence with an ellipsis, so it
// is the WORSE copy). `days` additionally carries miles, gain, loss, pack weight and an
// objective. The only things sectionBreakdown has that days lacks are `section` ("Approach") — a
// coarse category, not content — and the hour tiles above it, which are separate fields.
//
// A FIRST VERSION OF THIS SCRIPT REPORTED "540 DISJOINT, 0 OVERLAP" AND THAT WAS MY OWN BUG: it
// compared `section` against a guessed day-label field (`label|title|summary|plan`), so it lined
// up "Approach" against "Harts Pass to Holman Pass" and found nothing, while reporting equal
// counts on all 540 — same-count-with-zero-overlap is the fingerprint of comparing two different
// fields, not of two granularities. READ THE KEYS, never guess them.
//
// So the question this now answers is the one that decides the fix: how much of the catalog would
// LOSE anything if the sectionBreakdown list came off the PUBLISHED TIMES panel?
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,timing,itinerary", "timing=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read — a failed read is not an empty catalog"); process.exit(1); }

const norm = (s) => String(s == null ? "" : s).trim();
let withSB = 0, noDays = 0, countMismatch = 0, mirrored = 0, sbRicher = 0, truncated = 0;
const examples = { noDays: [], mismatch: [], richer: [], truncated: [] };

for (const r of rows) {
  const sb = (r.timing && Array.isArray(r.timing.sectionBreakdown)) ? r.timing.sectionBreakdown : [];
  if (!sb.length) continue;
  withSB++;
  const it = r.itinerary;
  const days = (it && Array.isArray(it.days)) ? it.days : [];
  if (!days.length) { noDays++; if (examples.noDays.length < 4) examples.noDays.push(r.id); continue; }
  if (days.length !== sb.length) { countMismatch++; if (examples.mismatch.length < 4) examples.mismatch.push(`${r.id} (${sb.length} vs ${days.length})`); continue; }
  // Entry for entry: does the day carry everything the section does?
  let ok = true, trunc = false;
  for (let i = 0; i < sb.length; i++) {
    const s = sb[i], d = days[i];
    const titleSame = norm(s.fromTo) === norm(d.title);
    const hrsSame = (s.hrs == null && d.hours == null) || Number(s.hrs) === Number(d.hours);
    const sNote = norm(s.note), dNote = norm(d.note);
    // An ellipsis-terminated copy is the SHORTER one; the day holds the full sentence.
    const noteCovered = !sNote || dNote === sNote || dNote.startsWith(sNote.replace(/[….]+$/, ""));
    if (sNote && dNote !== sNote && dNote.length > sNote.length) trunc = true;
    if (!titleSame || !hrsSame || !noteCovered) { ok = false; break; }
  }
  if (ok) { mirrored++; if (trunc) { truncated++; if (examples.truncated.length < 4) examples.truncated.push(r.id); } }
  else { sbRicher++; if (examples.richer.length < 4) examples.richer.push(r.id); }
}

console.log(`routes with a timing.sectionBreakdown:            ${withSB}`);
console.log(`  fully MIRRORED by itinerary.days:               ${mirrored}  (${(mirrored / withSB * 100).toFixed(1)}%)`);
console.log(`     ...of which the sectionBreakdown note is a`);
console.log(`        TRUNCATED copy, i.e. strictly worse:      ${truncated}`);
console.log(`  sectionBreakdown carries something days lacks:  ${sbRicher}`);
console.log(`  no itinerary days at all (panel is the ONLY`);
console.log(`     place the breakdown renders — must be kept): ${noDays}`);
console.log(`  entry counts disagree:                          ${countMismatch}`);
for (const [k, v] of Object.entries(examples)) if (v.length) console.log(`  e.g. ${k}: ${v.join(", ")}`);
console.log("\nWHAT THIS DECIDES: where `mirrored` dominates, the PUBLISHED TIMES list is a lossy");
console.log("second copy and the repair is to stop rendering it, not to merge two panels. The");
console.log("`noDays` count is what must keep rendering it, and is why the fix has to be conditional.");
