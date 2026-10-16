// Attributive citations, batch 4 of 63. Same three kinds as batch 1 (#1335).
//
// A FIFTH KIND HERE: THE SOURCE IS THE ONLY RECORD THERE IS. Baring's east face is
// "essentially undocumented beyond a single AAJ note", and a pro_tip says "the AAJ note is the
// only source". Removing the reference cannot mean removing the FACT -- that there is one
// first-ascent note and nothing else -- because that fact is the entire reason the route is
// flagged as first-ascent-style climbing. It is reworded to say the same thing without the
// publisher: "essentially undocumented beyond a single first-ascent note".
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  // --- the source is the only record: keep the fact, drop the publisher
  { id: "wa_baring_mountain_east_face", col: "overview", whole: true,
    find: "essentially undocumented beyond a single AAJ note.",
    repl: "essentially undocumented beyond a single first-ascent note." },
  { id: "wa_baring_mountain_east_face", col: "pro_tips", path: [0],
    find: "The AAJ note is the only source and gives a grade and a date, nothing more.",
    repl: "The only record is a first-ascent note giving a grade and a date, nothing more." },

  // --- the metric is the source
  { id: "wa_east_ridge_3", col: "crowds", key: "estimatePerSeason",
    find: "Mountain Project shows no logged ticks for this specific line, and the whole Silver Star Mountain area (all 3 routes combined) draws only ~91 monthly pageviews on Mountain Project, versus ~325/month for Liberty Bell's Beckey Route and ~148/month for South Early Winters Spire's South Arête.",
    repl: "there are no logged ascents of this specific line, and the whole Silver Star Mountain area sees a small fraction of the traffic of Liberty Bell's Beckey Route or South Early Winters Spire's South Arête." },

  // --- the fact is separable
  { id: "wa_lemah_two_goatshead_spire", col: "best_season", whole: true,
    find: "The Mountaineers list the Lemah season as June through September, but",
    repl: "The Lemah season is often given as June through September, but" },
  { id: "wa_mount_norton_scramble", col: "overview", whole: true,
    find: "Wikipedia lists the standard route as Class 2, but",
    repl: "The standard route is Class 2, but" },
  { id: "wa_skookum_peak_twinsisters_scramble", col: "crowds", key: "estimatePerSeason",
    find: "trip reports on CascadeClimbers/SummitPost describe it as a 'dark horse classic'",
    repl: "it has a reputation as a 'dark horse classic'" },
  { id: "wa_south_gully_south_spur", col: "pitch_detail", path: [4, "notes"],
    find: "the 1,500 ft Mountain Project lists for the winter line.",
    repl: "the 1,500 ft quoted for the winter line." },
  { id: "wa_south_gully_south_spur", col: "pro_tips", path: [4],
    find: "Both Mountain Project and the older trip reports on this gully describe tree slings and bucket belays as the actual protection system.",
    repl: "Tree slings and bucket belays are the actual protection system here." },
  { id: "wa_sperry_peak_east_face", col: "hazards", path: [0],
    find: "(Mountain Project; Wikipedia notes evidence of a much larger glacier here a century ago)",
    repl: "(there is evidence of a much larger glacier here a century ago)" },
  { id: "wa_sperry_peak_upper_south_ridge", col: "hazards", path: [0],
    find: "is the main reason SummitPost calls this \"not a recommended route.\"",
    repl: "is the main reason this is not a recommended route." },
  { id: "wa_sperry_peak_upper_south_ridge", col: "itinerary", whole: true,
    find: "SummitPost lists this as \"most of a day\" - plan for a full day out",
    repl: "Reckon on most of a day - plan for a full day out" },
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
