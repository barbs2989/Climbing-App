// Attributive citations, batch 2 of 63. Same three kinds as batch 1 (#1335).
//
// ONE VALUE IS DELIBERATELY LEFT, and it is the interesting one. `wa_jack_mountain_east_ridge.
// pro_tips[0]` reads "Read both CascadeClimbers trip reports (2006 ... and July 2025) before you
// go - they are the fullest public accounts of the line." That is not attributing a CLAIM; it is
// telling a climber where to find beta on a route that has almost none. It sits much closer to
// the LIVE references this audit already protects -- a ranger phone number, a land-manager alert
// page -- than to "SummitPost says the rock is loose". Deciding it inside a mechanical batch
// would be deciding the user's rule by accident, so it is flagged and left.
//
// `wa_mount_mccausland_n_route` is also left: its citation is woven through a 500-character
// argument about what the review counts imply, and unpicking that is a rewrite of the whole
// value rather than of a clause.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  // --- the fact is separable
  { id: "wa_helmet_butte_standard_route", col: "pro_tips", path: [0],
    find: "which SummitPost describes as the easiest Class 3 line",
    repl: "which is the easiest Class 3 line" },
  { id: "wa_helmet_butte_standard_route", col: "pro_tips", path: [1],
    find: "SummitPost estimates only 1-2 hours round trip from Pass No Pass",
    repl: "reckon on only 1-2 hours round trip from Pass No Pass" },
  { id: "wa_helmet_butte_standard_route", col: "watch_out", path: [0],
    find: "grass and heather that SummitPost flags as likely dangerous when wet",
    repl: "grass and heather that is likely dangerous when wet" },
  { id: "wa_helmet_butte_standard_route", col: "itinerary", key: null, whole: true,
    find: "(SummitPost estimates 1-2 hours round trip from Pass No Pass)",
    repl: "(1-2 hours round trip from Pass No Pass)" },
  { id: "wa_little_big_chief_mountain_northeast_face", col: "pro_tips", path: [0],
    find: "— Mountain Project notes 'the start is obvious'",
    repl: "— the start is obvious" },
  { id: "wa_mount_persis_west_ridge", col: "pro_tips", path: [1],
    find: "SummitPost describes its brush as 'thicker than the bristles of a paint brush.'",
    repl: "its brush is thicker than the bristles of a paint brush." },
  { id: "wa_mount_roosevelt_standard", col: "crowds", key: "peakTraffic",
    find: "SummitPost notes the peak is visible from popular Snow Lake yet 'few have climbed it'",
    repl: "the peak is visible from popular Snow Lake yet few have climbed it" },

  // --- the attribution is the verb / the possessive
  { id: "wa_jack_mountain_east_ridge", col: "pro_tips", path: [1],
    find: "The AAJ's 9.5 hours from low on the glacier is the only published timing figure for this route",
    repl: "The only published timing for this route is 9.5 hours from low on the glacier" },
  { id: "wa_jack_mountain_east_ridge", col: "pro_tips", path: [3],
    find: "Long and very exposed is the AAJ's own description - the difficulty",
    repl: "The route is long and very exposed - the difficulty" },
  { id: "wa_jack_mountain_east_ridge", col: "climate", key: "fall",
    find: "shortening days on a route the AAJ calls long",
    repl: "shortening days on a long route" },

  // --- the metric is the source
  { id: "wa_north_star_mountain_east_route", col: "crowds", key: "estimatePerSeason",
    find: "no trip-report volume found beyond scattered 14ers.com/WTA mentions of the broader Lyman Lakes area",
    repl: "almost no trip reports beyond scattered mentions of the broader Lyman Lakes area" },
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
