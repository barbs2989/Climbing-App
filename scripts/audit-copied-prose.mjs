// audit:copied-prose — does a research batch repeat its own sources word for word?
//
// Reads batch files in the enrich:apply shape ({routeId: {area, pitch_detail, …, review: {sources}}}),
// fetches every URL in review.sources, and reports each rendered string that shares a run of
// MIN_RUN+ words with one of them. enrich:apply runs the same check and REFUSES such an entry; this
// is the read-only form, for a batch before review and for batches already applied.
//
//   node scripts/audit-copied-prose.mjs <batch.json> [more.json …]
//   node scripts/audit-copied-prose.mjs --selftest        (no network)
//   node scripts/audit-copied-prose.mjs --live [--cache DIR] [--json out.json]   (live rows; see audit-copied-prose-live.mjs)
//
// Exit 1 when any string repeats a source. An unreadable source is listed, never counted as clean.
// The rule, the threshold and what it cannot see: scripts/lib/source-overlap.mjs.
import fs from "node:fs";
import { MIN_RUN, sourceIndex, copiedRuns, proseStrings, checkEntry } from "./lib/source-overlap.mjs";

const argv = process.argv.slice(2);

// --live: the same test against the LIVE rows of every route the audits/ research cited a page for.
if (argv.includes("--live")) { await import("./audit-copied-prose-live.mjs"); process.exit(process.exitCode ?? 0); }

if (argv.includes("--selftest")) {
  const src = ["From the bolt anchor, take the right-facing desert-varnished dihedral for about 60 feet, then move left to the belay anchors."];
  const g = sourceIndex(src);
  const cases = [
    // the #2655 Dark Shadows P2 note as applied: copied
    ["From the bolt anchor, take the right-facing desert-varnished dihedral for about 60 ft, then move left to the belay anchors.", true],
    // the same facts in other words: clean
    ["Leave the bolts up the varnished corner that faces right; after roughly 60 ft step left to the next bolted station.", false],
    // climbing's shared vocabulary, shorter than the run: clean
    ["Belay at the two-bolt anchors after moving left.", false],
  ];
  let bad = 0;
  for (const [t, want] of cases) if ((copiedRuns(t, g).length > 0) !== want) { bad++; console.error(`  selftest: ${JSON.stringify(t)} should be ${want ? "flagged" : "clean"}`); }
  // review notes and identifiers never render, so they are not checked
  const paths = proseStrings({ area: "x", review: { changed: src[0] }, pitch_detail: [{ pitch: "1", notes: src[0] }] }).map(s => s.path);
  if (paths.join() !== "pitch_detail[0].notes") { bad++; console.error(`  selftest: proseStrings walked ${paths.join()}`); }
  if (bad) process.exit(1);
  console.log(`selftest: ${cases.length + 1}/${cases.length + 1} as expected (run length ${MIN_RUN}).`);
  process.exit(0);
}

const files = argv.filter(a => !a.startsWith("--"));
if (!files.length) { console.error("usage: node scripts/audit-copied-prose.mjs <batch.json> [more.json …]"); process.exit(2); }

let copied = 0, strings = 0, unchecked = 0;
for (const f of files) {
  const batch = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const [id, spec] of Object.entries(batch)) {
    if (!spec || typeof spec !== "object" || !spec.area || !proseStrings(spec).length) continue; // no area = not a route entry (a batch's skip_reasons block)
    const r = await checkEntry(spec);
    if (!r.read) { unchecked++; console.log(`?  ${id} — none of its ${r.listed} listed source(s) could be read; NOT checked`); continue; }
    for (const u of r.unread) console.log(`   ${id} — could not read ${u}`);
    for (const h of r.hits) { strings++; for (const run of h.runs) console.log(`✗  ${id}  ${h.path}: "${run}"`); }
    if (r.hits.length) copied++;
  }
}
console.log(`\n${copied} route(s), ${strings} string(s) repeat a run of ${MIN_RUN}+ words from a listed source; ${unchecked} route(s) could not be checked.`);
if (copied) process.exitCode = 1;
