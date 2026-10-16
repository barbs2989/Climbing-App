// Does rendered prose talk about OUR OWN DATABASE to the climber reading it?
//
// Found in a rope_note while classifying citations:
//
//   "Second named line on the south summit-block face, rated 5.0 per source
//    — matches DB's 'Easy 5th' grade well."
//
// That is not a citation. It is the ENRICHMENT PASS narrating its own bookkeeping — a note written
// for whoever was checking the import, rendered to a climber deciding what rope to carry.
// audit:note-voice asks this of `waypoints[].note` and of nothing else; these columns feed the
// route page's rack and rope boxes and have never been asked.
//
// Report-only. The repair is a rewrite per value, and some of these sentences carry a real fact
// welded to the bookkeeping.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

// Talking about the RECORD rather than the mountain. Deliberately narrow: each alternative names
// the store or the act of cataloguing, so ordinary climbing prose cannot match. "the database" on
// its own is not enough -- a route description could conceivably mention one -- so every branch
// pairs it with a possessive, a comparison, or a field name.
const VOICE = [
  ["names our own store", /\b(?:the )?DB(?:'s)?\b|\bour (?:database|catalog|record)\b|\bthis (?:database|catalog)\b/],
  ["compares to a stored field", /\bmatches (?:the )?(?:DB|database|catalog|stored)\b|\bagrees with (?:the )?(?:DB|database|catalog)\b|\bconsistent with (?:the )?(?:DB|database|catalog)\b/i],
  ["names a column", /\b(?:grade_num|area_id|dist_km|gain_ft|sling_rack|rope_note|pitch_detail|climbing_route|route_id)\b/],
  /* `this pass` IS NOT IN HERE, and it was: a pass is a LANDFORM in this domain, so
     "short rappels ... back toward this pass" read as an enrichment run narrating itself.
     A domain word cannot be borrowed for pipeline vocabulary. */
  ["narrates the import", /\b(?:enrichment|backfill|import(?:ed)? (?:pass|batch)|this batch|the pipeline)\b/i],
  /* THE GAP IS BOUNDED TO ONE CLAUSE. An unbounded `.*` here spanned 300+ characters and three
     sentences, joining "treat it as the technical crux of the day" to "there is no record" at
     the far end of the value — a confident false positive on correct descent prose. `[^.]{0,40}`
     cannot cross a full stop. */
  ["addresses a reviewer", /\btreat (?:this|it) as[^.]{0,40}\b(?:record|entry|row)\b|\bflagged? (?:as )?suspect\b|\bneeds? (?:verification|review) in\b/i],
];

const COLS = ["rope_note", "sling_rack", "detailed_rack", "pro_needs", "gear", "what_to_bring",
  "beta", "overview", "watch_out", "climbing_route", "descent_text", "rappel_count_note"];

const leaves = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
};

let grand = 0, cols = 0;
for (const col of COLS) {
  const rows = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 })
    .catch((e) => dead(`read of ${col} failed: ` + (e && e.message)));
  if (!rows) dead(`read of ${col} returned nothing`);
  cols++;
  const hits = [];
  for (const r of rows) {
    for (const s of leaves(r[col])) {
      const why = VOICE.filter(([, re]) => re.test(s)).map(([label]) => label);
      if (why.length) hits.push({ id: r.id, why, s });
    }
  }
  if (!hits.length) { console.log(`${col.padEnd(18)} ${String(rows.length).padStart(5)} rows   clean`); continue; }
  console.log(`\n${col}  —  ${hits.length} value(s) of ${rows.length} rows`);
  hits.sort((a, b) => a.s.length - b.s.length);
  for (const h of hits.slice(0, 8)) {
    console.log(`  [${h.why.join("; ")}] ${h.id}`);
    console.log(`    ${h.s.length > 220 ? h.s.slice(0, 220) + "…" : h.s}`);
  }
  if (hits.length > 8) console.log(`  … ${hits.length - 8} more`);
  grand += hits.length;
}
if (cols !== COLS.length) dead(`read ${cols} of ${COLS.length} columns`);
console.log(`\n${grand} rendered value(s) talk about the RECORD rather than the route.`);
console.log(`Report-only: the repair is a rewrite per value, and several weld a real fact to the`);
console.log(`bookkeeping — deleting the sentence would lose the fact with it.`);
