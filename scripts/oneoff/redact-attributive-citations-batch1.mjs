// Remove attributive citations — "PUBLISHER notes/describes/shows X" — batch 1 of 63.
//
// The second-largest shape in the citation backlog, after the 515 that need individual reading:
// 63 values across 52 routes where a publisher is named as the SOURCE of a claim. Unlike the
// publisher-only parentheticals (#1325, mechanical), these change grammar — the subject moves and
// the verb changes — so they are proposed mechanically and then READ, one batch at a time.
//
// THREE KINDS HERE, and they need different repairs:
//
//   THE METRIC IS THE SOURCE. "AllTrails lists ~2,950+ reviews", "Mountain Project shows only
//     ~1,220 total page views". Strip the publisher and the number means nothing — reviews of
//     what, views of what? In every case the sentence ALREADY carries the qualitative fact ("a
//     well-known Mountain Loop Highway destination", "heavily hiked", "one of the more popular
//     short scrambles"), so the clause goes whole and nothing is lost.
//
//   THE FACT IS SEPARABLE. "SummitPost notes Mount Prophet sees fewer than one ascent per year"
//     -> "Mount Prophet sees fewer than one ascent per year". The claim stands on its own; only
//     the attribution goes.
//
//   THE ATTRIBUTION IS THE VERB. "WTA and Mountaineers reports describe it as a straightforward
//     scramble" -> "it stays a straightforward scramble". Cutting the subject alone would leave
//     "describe it as", so the sentence has to be re-made rather than trimmed.
//
// Declared find -> replace, exact-once, all-or-nothing, dry-run by default, every write re-read.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  // --- the metric is the source: cut the clause, the fact is already stated
  { id: "wa_gothic_peak_standard", col: "crowds", key: "estimatePerSeason",
    find: " (AllTrails lists ~2,950+ reviews for the basin trail)", repl: "" },
  { id: "wa_pinnacle_peak_tatoosh_r1", col: "crowds", key: "estimatePerSeason",
    find: " (AllTrails lists 1,600+ reviews)", repl: "" },
  { id: "wa_winchester_mountain_south_trail", col: "crowds", key: "estimatePerSeason",
    find: " (AllTrails lists ~1,000 reviews for the trail)", repl: "" },
  { id: "wa_hoodoo_peak_sawtooth_scramble", col: "crowds", key: "estimatePerSeason",
    find: " (AllTrails shows only ~13 reviews total, several trip reports on WTA/SummitPost span years apart)",
    repl: "" },
  { id: "wa_northeast_ridge_1963_route", col: "crowds", key: "estimatePerSeason",
    find: "Mountain Project shows only ~1,220 total page views (~17/month) for this route's page; a separate account estimates only 3–5 ascents per year",
    repl: "an estimated 3–5 ascents per year" },

  // --- the fact is separable: drop the attribution, keep the claim
  { id: "wa_mount_prophet_east", col: "crowds", key: "estimatePerSeason",
    find: "SummitPost notes Mount Prophet sees fewer than one ascent per year on average",
    repl: "Mount Prophet sees fewer than one ascent per year on average" },

  // --- the attribution is the verb: re-make the clause
  { id: "wa_iron_peak_teanaway_scramble", col: "itinerary", path: ["days", 0, "note"],
    find: "the ridge narrows near the top but WTA and Mountaineers reports describe it as a straightforward hands-optional scramble in dry conditions",
    repl: "the ridge narrows near the top but stays a straightforward hands-optional scramble in dry conditions" },
  { id: "wa_south_ridge_3", col: "itinerary", path: ["days", 0, "note"],
    find: "Mountaineers.org and WTA reports put this at 4-6 hours.",
    repl: "Allow 4-6 hours." },
];

const PUBS = /\b(SummitPost|Mountain ?Project|AllTrails|WTA|Mountaineers|Peakbagger|Wikipedia|CalTopo|AAJ)\b/i;
const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
const read = async (id, col) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,${col}`, { headers: H });
  if (!r.ok) throw new Error(`read ${id}: HTTP ${r.status}`);
  const [row] = await r.json(); return row;
};
const getLeaf = (colVal, e) => e.key ? colVal[e.key] : e.path.reduce((o, k) => o && o[k], colVal);
const setLeaf = (colVal, e, v) => {
  if (e.key) { colVal[e.key] = v; return colVal; }
  let o = colVal; for (let i = 0; i < e.path.length - 1; i++) o = o[e.path[i]];
  o[e.path[e.path.length - 1]] = v; return colVal;
};

let refused = 0; const writes = [];
for (const e of EDITS) {
  const row = await read(e.id, e.col);
  const colVal = row && row[e.col];
  if (colVal == null) { console.error(`  REFUSE ${e.id}.${e.col}: null`); refused++; continue; }
  const cur = getLeaf(colVal, e);
  if (typeof cur !== "string") { console.error(`  REFUSE ${e.id}.${e.col}: leaf is not a string`); refused++; continue; }
  const n = cur.split(e.find).length - 1;
  if (n !== 1) { console.error(`  REFUSE ${e.id}.${e.col}: declared text matches ${n} times, expected 1`); refused++; continue; }
  const next = cur.replace(e.find, e.repl).replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
  if (PUBS.test(next)) { console.error(`  REFUSE ${e.id}.${e.col}: the rewrite still names a publisher`); refused++; continue; }
  console.log(`\n  ${e.id}.${e.col}`);
  console.log(`    before: ${cur.slice(0, 190)}`);
  console.log(`    after : ${next.slice(0, 190)}`);
  writes.push({ id: e.id, col: e.col, value: setLeaf(JSON.parse(JSON.stringify(colVal)), e, next) });
}

console.log(`\n${writes.length} edit(s) planned, ${refused} refused.`);
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
