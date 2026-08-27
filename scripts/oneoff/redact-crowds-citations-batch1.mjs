// Remove third-party attribution from `crowds`, which renders in EnrichmentPanels.
//
// BATCH 1 of the 105 `crowds` findings `audit:prose-citations` reports. Per-value rewrites in
// reviewed batches, the way the road/access sweep was done — these are 105 individually-worded
// sentences, not one pattern, and a bulk transform would damage them.
//
// AN ORGANISATION THAT RUNS TRIPS IS NOT A SOURCE, and that is the discrimination this batch is
// scoped by. It is the same shape as the audit's own "a LIVE land-manager reference is not a
// citation" rule, one column over:
//   "organized outings (e.g. Mountaineers alpine scramble course trips)"   <- who is ON the
//        mountain. A fact about traffic, which is exactly what this column is for. NOT touched.
//   "trip reports (WTA, Mountaineers, SummitPost) are sparse"              <- where the traffic
//        ESTIMATE came from. An attribution. Redacted.
// `wa_cashmere_mountain_west_ridge.peakTraffic` and `wa_chair_peak_north_face.peakTraffic` are
// deliberately left alone for that reason; the second is genuinely borderline ("featured in
// guidebooks" explains WHY it is busy) and belongs in a batch someone reads rather than this one.
//
// Every edit is a REWRITE where the fact survives, or a clean cut of a clause that carries only
// the attribution. Two are cuts:
//   `boving_roofs`  "~51 monthly Mountain Project views" — the metric IS the source. Without it,
//        "~51 monthly views" of what? The sentence already says "Low"; nothing is lost.
//   `carne_mountain` "(AllTrails alone lists 300+ reviews)" — same: the evidence is the source,
//        and "hundreds of parties per larch season" already carries the fact.
//
// Declared find -> replace, exact-once, dry-run by default, all-or-nothing.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  { id: "wa_abernathy_peak_north_ridge", key: "estimatePerSeason",
    find: " based on the handful of trip reports found (WTA, Mountaineers, SummitPost, personal blogs)",
    repl: "" },
  { id: "wa_argonaut_peak_east_ridge", key: "estimatePerSeason",
    find: "SummitPost describes the whole peak as overlooked relative to its Stuart Range neighbors",
    repl: "the peak as a whole is overlooked relative to its Stuart Range neighbors" },
  { id: "wa_austera_peak_southwest_ridge", key: "estimatePerSeason",
    find: "SummitPost notes the north-side approach (which this glacier route effectively uses) is 'unlikely you'll see anyone,' though",
    repl: "the north-side approach (which this glacier route effectively uses) rarely sees anyone, though" },
  { id: "wa_boving_roofs", key: "estimatePerSeason",
    find: "; ~51 monthly Mountain Project views",
    repl: "" },
  { id: "wa_carne_mountain_trail_route", key: "estimatePerSeason",
    find: " (AllTrails alone lists 300+ reviews)",
    repl: "" },
  { id: "wa_cashmere_mountain_west_ridge", key: "estimatePerSeason",
    find: " (WTA, SummitPost, Mountaineers trip reports all cover it)",
    repl: "" },
  { id: "wa_columbia_peak_scramble", key: "peakTraffic",
    find: "trip reports (WTA, Mountaineers, SummitPost) are sparse compared to",
    repl: "recorded ascents are few compared to" },
];

const NAMES = /\b(SummitPost|Mountain ?Project|AllTrails|WTA|personal blogs)\b/i;

const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
const read = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,crowds`, { headers: H });
  if (!r.ok) throw new Error(`read ${id}: HTTP ${r.status}`);
  const [row] = await r.json();
  return row;
};

let refused = 0; const writes = [];
for (const e of EDITS) {
  const row = await read(e.id);
  const c = row && row.crowds;
  if (!c || typeof c !== "object" || Array.isArray(c)) { console.error(`  REFUSE ${e.id}: crowds is not an object`); refused++; continue; }
  const cur = c[e.key];
  if (typeof cur !== "string") { console.error(`  REFUSE ${e.id}.${e.key}: not a string`); refused++; continue; }
  const n = cur.split(e.find).length - 1;
  if (n !== 1) { console.error(`  REFUSE ${e.id}.${e.key}: declared text matches ${n} times, expected 1`); refused++; continue; }
  const next = cur.replace(e.find, e.repl);
  if (NAMES.test(next)) { console.error(`  REFUSE ${e.id}.${e.key}: the rewrite still names a publisher`); refused++; continue; }
  console.log(`\n  ${e.id}.${e.key}`);
  console.log(`    before: ${cur}`);
  console.log(`    after : ${next}`);
  writes.push({ id: e.id, crowds: { ...c, [e.key]: next } });
}

console.log(`\n${writes.length} edit(s) planned, ${refused} refused.`);
if (refused) { console.error("refusing to write while any edit is refused."); process.exit(1); }
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }

for (const w of writes) await patchRow("routes", w.id, { crowds: w.crowds });
let bad = 0;
for (const e of EDITS) {
  const row = await read(e.id);
  const v = row.crowds && row.crowds[e.key];
  if (typeof v !== "string" || NAMES.test(v)) { console.error(`  VERIFY FAILED ${e.id}.${e.key}`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified: ${EDITS.length} value(s) re-read, none names a publisher`);
