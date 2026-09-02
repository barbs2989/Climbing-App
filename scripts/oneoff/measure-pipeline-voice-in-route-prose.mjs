// IS THIS SENTENCE WRITTEN FOR A CLIMBER, OR FOR THE PIPELINE? — asked of the ROUTE PROSE columns.
//
// audit:note-voice already asks this of waypoint NOTES. Nothing asks it of the route prose columns,
// and reading audit:prose-citations' output shows the class is there and is NOT a citation:
//
//   "the claim that these bolts were 'replaced in 2001' is not supported by any source specific to
//    this Washington peak and should not be presented as fact"
//   "No source found documents its exact length"
//   "the source doesn't break out per-station anchor type or individual lengths, so all 4 are
//    treated as roughly equal-length doubled-rope rappels (length estimated, not measured)"
//
// Those are an EDITOR TALKING TO THE NEXT EDITOR, shipped to a climber. "Should not be presented as
// fact" is an instruction about the record; a climber reading it learns nothing about the route and
// is told the app does not trust itself.
//
// WHY IT IS ITS OWN CLASS, distinct from the citation sweep several sessions are working:
//   - a CITATION names a third party and the repair is to cut the attribution while keeping the
//     fact;
//   - PIPELINE VOICE names no publisher, so every publisher-keyed needle misses it, and the repair
//     is different — usually cut the whole clause, because the clause is ABOUT the record rather
//     than about the mountain.
//
// WHAT MUST NOT BE SWEPT, and this is most of what a loose needle would return:
//   - a genuine UNCERTAINTY the climber needs — "length estimated" warns a party not to rig to it,
//     and that is content. The defect is explaining WHY we are unsure by describing our research,
//     not the hedge itself.
//   - a NEGATIVE RESULT that is the content, which CLAUDE.md already records for the guidebook
//     class: "no guidebook covers this" carries a real warning.
// So this is REPORT-ONLY and prints the whole value, because the repair is a judgement per row.
import { selectAll } from "../lib/supabase-env.mjs";

// Columns that RENDER. Taken from audit:prose-citations' own list rather than invented, so the two
// cannot drift on what reaches a screen.
const COLS = ["overview", "approach", "beta", "descent_text", "watch_out", "climbing_route",
  "hazards", "best_season", "rappels", "rappel_count_note", "rappel_detail", "detailed_rack",
  "pro_needs", "rope_note", "what_to_bring", "gear", "crowds", "partner_requirements"];

// Each needle is a phrase about THE RECORD, never about the route. Deliberately narrow: a bare
// "estimated" or "unclear" is a climber-facing hedge and must not match.
const NEEDLES = [
  // THE OBJECT DECIDES, not the phrase. "should not be treated as a casual scramble" and "should
  // not be treated as guaranteed snow-free" are advice about the MOUNTAIN and are correct; only an
  // object naming the RECORD ("as fact", "as verified", "as a repeated line") is pipeline voice.
  // Requiring the object took this needle from 1-real-of-3 to 2-of-2.
  [/should not be (?:presented|treated|read) as (?:a )?(?:fact|verified|confirmed|authoritative|repeated|reliable|definitive)/i,
    "instruction about the record"],
  [/not supported by any (?:source|record|report)/i, "sourcing verdict"],
  [/no (?:source|record|reference)s? (?:found|located|available|documents?|covers?)/i, "sourcing verdict"],
  [/could not be (?:found|located|verified|confirmed)/i, "sourcing verdict"],
  [/the source (?:does|doesn|did)/i, "talks about the source"],
  [/estimated,? not measured/i, "describes our method"],
  // "entry" is OUT: "the entry gully" and "the entry hourglass" are ordinary climbing terms, and
  // including it put 27 correct values in this report — a detector manufacturing findings, which
  // sends somebody to "fix" good prose. Same failure as the camp name-matcher, one needle over.
  [/\b(?:this|our) (?:record|dataset|catalog|database)\b/i, "names our own record"],
  [/for (?:the )?(?:pipeline|enrichment|import)/i, "names our own pipeline"],
  [/(?:sources|reports) (?:vary|disagree|conflict)/i, "describes source disagreement"],
  [/treated as (?:roughly|approximately)/i, "describes our method"],
];

const rows = await selectAll("routes", `id,${COLS.join(",")}`, "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

// Walk STRING LEAVES of a jsonb value, never JSON.stringify output — the trap audit:access-prose
// records, where a stringified blob welds half a value to the next key and reports a fragment
// nobody wrote.
const leaves = (v, path, out) => {
  if (typeof v === "string") { if (v.trim()) out.push([path, v]); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => leaves(x, `${path}[${i}]`, out)); return; }
  if (v && typeof v === "object") { for (const k of Object.keys(v)) leaves(v[k], `${path}.${k}`, out); }
};

let scanned = 0;
const hits = [];
for (const r of rows) {
  for (const c of COLS) {
    const out = [];
    leaves(r[c], c, out);
    for (const [path, text] of out) {
      scanned++;
      const fired = NEEDLES.map(([re, w]) => [re.exec(text), w]).filter(([m]) => m);
      if (fired.length) hits.push({
        id: r.id, path, text,
        why: [...new Set(fired.map(([, w]) => w))],
        // The matched substring plus a little context, so a loose needle cannot hide behind a
        // plausible-looking value the way the "entry gully" one did.
        matched: fired.map(([m]) => text.slice(Math.max(0, m.index - 25), m.index + m[0].length + 45)
          .replace(/\s+/g, " ")),
      });
    }
  }
}
if (!scanned) { console.log("FAIL CLOSED: zero prose leaves parsed"); process.exit(1); }

console.log(`scanned ${scanned} prose leaves across ${rows.length} routes\n`);
console.log(`${hits.length} value(s) on ${new Set(hits.map((h) => h.id)).size} route(s) speak about the RECORD\n`);

const byWhy = new Map();
for (const h of hits) for (const w of h.why) byWhy.set(w, (byWhy.get(w) || 0) + 1);
for (const [w, n] of [...byWhy].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${w}`);

const byCol = new Map();
for (const h of hits) {
  const c = h.path.split(/[.[]/)[0];
  byCol.set(c, (byCol.get(c) || 0) + 1);
}
console.log("\nby column:");
for (const [c, n] of [...byCol].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${c}`);

const N = process.argv.includes("--full") ? hits.length : 12;
console.log(`\nfirst ${Math.min(N, hits.length)} (--full for all):\n`);
for (const h of hits.slice(0, N)) {
  console.log(`  ${h.id}  ${h.path}   [${h.why.join(", ")}]`);
  for (const m of h.matched) console.log(`     ...${m}...`);
}

console.log("\nREPORT-ONLY, and most of a LOOSE needle's output would be correct work:");
console.log("a genuine hedge is content (\"length estimated\" warns a party not to rig to it), and a");
console.log("NEGATIVE RESULT is content too (\"no guidebook covers this\" is a real warning). The");
console.log("defect is a sentence about OUR RECORD rather than about the mountain. Read each one.");
