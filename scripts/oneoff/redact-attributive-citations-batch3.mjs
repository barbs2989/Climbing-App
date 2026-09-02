// Attributive citations, batch 3 of 63. Same three kinds as batch 1 (#1335).
//
// FIVE OF THESE ARE "THE METRIC IS THE SOURCE" and one is a shape batch 1 and 2 did not have:
// a DISAGREEMENT BETWEEN sources, where the disagreement itself is the content a climber needs.
//   "The Mountaineers and Wikipedia call the crux pitch 5.0, while Mountain Project lists it as
//    5.3"  ->  "some accounts call the crux pitch 5.0, others 5.3"
// The fact is that the grade is disputed and by how much. Which publications disagree is not
// something a climber can act on, so the attribution goes and the disagreement stays. Deleting
// the clause outright would be worse than the citation: it would leave a single confident grade
// on a route where the record does not support one.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  // --- the fact is separable
  { id: "wa_amphitheater_mountain_north_buttress", col: "pitch_detail", path: [2, "notes"],
    find: "Mountain Project describes the hard climbing as a short section only",
    repl: "The hard climbing is a short section only" },
  { id: "wa_wings", col: "watch_out", path: [0],
    find: "Mountain Project rates Wings", repl: "Wings is rated" },
  { id: "wa_cathedral_peak_southwest_route", col: "watch_out", path: [2],
    find: "SummitPost calls it Class 4-", repl: "it is arguably Class 4-" },
  { id: "wa_cathedral_rock_northeast_ridge_2003_variation", col: "pro_tips", path: [2],
    find: "Mountain Project calls for protection", repl: "protection is wanted" },
  { id: "wa_jack_mountain_northeast_glacier", col: "itinerary", whole: true,
    find: "Wikipedia notes that most parties on Jack Mountain take",
    repl: "Most parties on Jack Mountain take" },
  { id: "wa_jack_mountain_southeast_ridge_direct", col: "itinerary", whole: true,
    find: "and Wikipedia notes that most parties on Jack take",
    repl: "and most parties on Jack take" },
  { id: "wa_jack_mountain_southeast_ridge_direct", col: "best_season", whole: true,
    find: "SummitPost notes the mountain", repl: "the mountain" },
  { id: "wa_deep_blue", col: "pitch_detail", path: [7, "notes"],
    find: "Mountain Project describes the route as climbing well",
    repl: "The route climbs well" },
  { id: "wa_deep_blue", col: "itinerary", whole: true,
    find: "Mountain Project notes that multiple parties have completed",
    repl: "Multiple parties have completed" },

  // --- the metric is the source: cut, the qualitative fact is already stated
  { id: "wa_mount_pugh_stujack", col: "crowds", key: "estimatePerSeason",
    find: " (AllTrails lists 556 reviews for the approach trail)", repl: "" },
  { id: "wa_plummer_peak_r1", col: "crowds", key: "estimatePerSeason",
    find: " (AllTrails lists 1,600+ reviews for the Pinnacle Peak Trail and 700+ for the Plummer variant specifically)",
    repl: "" },
  { id: "wa_north_ridge_2", col: "crowds", key: "peakTraffic",
    find: "Mountain Project rates it 2.5/5 on only 4 votes — among the lowest-engagement routes in the range. ",
    repl: "" },

  // --- a DISAGREEMENT between sources: keep the disagreement, drop who disagreed
  { id: "wa_mount_cruiser_south_corner", col: "pro_tips", path: [4],
    find: "Grade is reported inconsistently across sources: The Mountaineers and Wikipedia call the crux pitch 5.0, while Mountain Project lists it as 5.3",
    repl: "Grade is reported inconsistently: some accounts call the crux pitch 5.0, others 5.3" },
  { id: "wa_hozomeen_mountain_west_face", col: "pro_tips", path: [6],
    find: "AAJ says IV 5.9, another published account says V 5.9+ R/X.",
    repl: "one account gives IV 5.9, another V 5.9+ R/X." },
];

// Two values are plain strings on the row (itinerary here is a string, not the {days:[]} shape).
const PUBS = /\b(SummitPost|Mountain ?Project|AllTrails|WTA|Mountaineers|Wikipedia|AAJ|CascadeClimbers|14ers)\b/i;
const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
const read = async (id, col) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,${col}`, { headers: H });
  if (!r.ok) throw new Error(`read ${id}: HTTP ${r.status}`);
  const [row] = await r.json(); return row;
};
const getLeaf = (v, e) => e.whole ? v : (e.key != null ? v[e.key] : e.path.reduce((o, k) => o && o[k], v));
const setLeaf = (v, e, s) => {
  if (e.whole) return s;
  if (e.key != null) { v[e.key] = s; return v; }
  let o = v; for (let i = 0; i < e.path.length - 1; i++) o = o[e.path[i]];
  o[e.path[e.path.length - 1]] = s; return v;
};

/* ACCUMULATE PER (route, column) — a bug the verify step caught on the first apply. Two routes
   here have TWO edits in one column (helmet_butte pro_tips[0] and [1]; jack_mountain pro_tips[1]
   and [3]), and the first version deep-copied the ORIGINAL column for each edit, so the second
   patchRow silently overwrote the first. 9 of 11 landed and the re-read reported the other two as
   failures. Build one working copy per column, apply every edit to it, then write once. */
let refused = 0, done = 0; const working = new Map();
for (const e of EDITS) {
  const k = `${e.id}\u0000${e.col}`;
  if (!working.has(k)) {
    const row = await read(e.id, e.col);
    if (!row || row[e.col] == null) { console.error(`  REFUSE ${e.id}.${e.col}: null`); refused++; continue; }
    working.set(k, { id: e.id, col: e.col, value: JSON.parse(JSON.stringify(row[e.col])) });
  }
  const colVal = working.get(k).value;
  const cur = getLeaf(colVal, e);
  if (typeof cur !== "string") { console.error(`  REFUSE ${e.id}.${e.col}: leaf is ${typeof cur}, not a string`); refused++; continue; }
  const n = cur.split(e.find).length - 1;
  /* ALREADY APPLIED is not a failure, and conflating the two is what made a partially-applied
     run impossible to finish. When the declared text is gone AND the replacement is present, this
     edit is done: skip it silently rather than refusing, so the all-or-nothing guard still
     protects a stale table without blocking a resume. Only a non-empty `repl` can be checked this
     way -- an edit that deletes text leaves no marker, so it keeps refusing. */
  if (n === 0 && e.repl && cur.includes(e.repl)) { done++; continue; }
  if (n !== 1) { console.error(`  REFUSE ${e.id}.${e.col}: declared text matches ${n} times, expected 1`); refused++; continue; }
  const next = cur.replace(e.find, e.repl).replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
  if (PUBS.test(next)) { console.error(`  REFUSE ${e.id}.${e.col}: the rewrite still names a publisher`); refused++; continue; }
  console.log(`\n  ${e.id}.${e.col}`);
  console.log(`    - ${cur.slice(0, 170)}`);
  console.log(`    + ${next.slice(0, 170)}`);
  const w = working.get(k);
  w.value = setLeaf(w.value, e, next);
  w.n = (w.n || 0) + 1;
}
const writes = [...working.values()].filter((w) => w.n);

console.log(`\n${writes.reduce((a, w) => a + w.n, 0)} edit(s) across ${writes.length} column(s), ${done} already applied, ${refused} refused.`);
if (refused) { console.error("refusing to write while any edit is refused."); process.exit(1); }
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }

for (const w of writes) await patchRow("routes", w.id, { [w.col]: w.value });
let bad = 0;
for (const e of EDITS) {
  const row = await read(e.id, e.col);
  const v = getLeaf(row[e.col], e);
  if (typeof v !== "string" || PUBS.test(v)) { console.error(`  VERIFY FAILED ${e.id}.${e.col}`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified: ${EDITS.length} value(s) re-read, none names a publisher`);
