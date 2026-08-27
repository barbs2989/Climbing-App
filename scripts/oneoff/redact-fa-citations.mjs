// Remove third-party attribution from `fa` (first ascent), which RENDERS on the route page.
//
// The standing rule is that no SOURCE appears anywhere in the app. `audit:prose-citations` never
// opened this column until #1309, so these eight sat on screen uncounted: "sources confirm",
// "sources describe", "sources conflict", "no source explicitly states", "not given in source".
//
// EVERY EDIT IS A REWRITE, NOT A DELETION, and that is the rule this repo already records for
// road/access prose: the citation is welded into a sentence that also carries the FACT and, here,
// a genuine HEDGE. "sources describe the Northwest Shoulder as the peak's primary route, so this
// is presumed to be the FA line" is three claims — the party, the presumption, and the fact that
// it IS a presumption. Only the attribution is removed; the uncertainty is preserved, because
// deleting the hedge would turn a careful record into a false certainty, which is worse than the
// citation.
//
// The one deletion is `wa_high_plains_drifter`, whose entire value is "See guidebook". That names
// a source AND carries no fact: it tells a climber nothing about who made the first ascent. Null
// is the honest value, and nothing is lost.
//
// Declared find -> replace, exact-once, dry-run by default: nothing can be invented, and a value
// that has changed since this was written is REFUSED rather than half-applied.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  { id: "wa_bleed_for_the_chodecophagus",
    find: "Daniel (surname not given in source), 2024",
    repl: "Daniel (surname unrecorded), 2024" },

  { id: "wa_copper_peak_south_route",
    find: "(this is the peak's documented first ascent; sources confirm the peak FA but do not explicitly state the FA party used this exact line, though it is the mountain's standard/easiest route)",
    repl: "(the peak's documented first ascent; whether that party climbed this exact line is unrecorded, though it is the mountain's standard and easiest route)" },

  { id: "wa_monument_peak_pasayten_scramble",
    find: "(first ascent of the peak; sources describe the easiest/standard route as class 3 scrambling, consistent with this south ridge line, though the exact FA line is not independently confirmed)",
    repl: "(first ascent of the peak; the easiest and standard route is class 3 scrambling, consistent with this south ridge line, though the exact FA line is unconfirmed)" },

  { id: "wa_mount_clark_standard",
    find: 'this is the documented first ascent of Mount Clark itself; sources describe the Corkscrew line as "the only route that makes sense" to the summit, so it is likely (but not explicitly confirmed) that this was also the FA party\'s line',
    repl: "the documented first ascent of Mount Clark itself; the Corkscrew is the only line that makes sense to the summit, so this was likely the FA party's route, though that is not confirmed" },

  { id: "wa_mount_maude_r3",
    find: "or as a distinct named route by Leland Windham (Sep 6, 2001) - sources conflict.",
    repl: "or as a distinct named route by Leland Windham (Sep 6, 2001) - the record is contradictory." },

  { id: "wa_sundial_northeast",
    find: "(this is the peak's overall first ascent; sources describe the East Face as the mountain's easiest natural line and the FA is presumed to have gone this way, but no source explicitly confirms the FA followed this exact route)",
    repl: "(the peak's overall first ascent; the East Face is the mountain's easiest natural line and the FA is presumed to have gone that way, but this is unconfirmed)" },

  { id: "wa_whitehorse_mountain_nw_shoulder",
    find: "(first recorded ascent of the peak; sources describe the Northwest Shoulder as the peak's primary/original route, so this is presumed to be the FA line, though no source explicitly states the historical party's exact line)",
    repl: "(first recorded ascent of the peak; the Northwest Shoulder is the peak's primary and original route, so this is presumed to be the FA line, though the historical party's exact line is unrecorded)" },

  // The only clear: a pointer to a source, carrying no fact of its own.
  { id: "wa_high_plains_drifter", clear: true, find: "See guidebook" },
];

const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
const read = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,fa`, { headers: H });
  if (!r.ok) throw new Error(`read ${id}: HTTP ${r.status}`);
  const [row] = await r.json();
  return row;
};

let planned = 0, refused = 0;
const writes = [];
for (const e of EDITS) {
  const row = await read(e.id);
  if (!row) { console.error(`  REFUSE ${e.id}: not found`); refused++; continue; }
  const arr = Array.isArray(row.fa);
  const cur = arr ? row.fa[0] : row.fa;
  if (typeof cur !== "string") { console.error(`  REFUSE ${e.id}: fa is ${typeof cur}, not a string`); refused++; continue; }
  const n = cur.split(e.find).length - 1;
  if (n !== 1) { console.error(`  REFUSE ${e.id}: the declared text matches ${n} times, expected exactly 1`); refused++; continue; }
  const next = e.clear ? null : cur.replace(e.find, e.repl);
  if (!e.clear && /\bsources?\b/i.test(next)) { console.error(`  REFUSE ${e.id}: the rewrite still names a source`); refused++; continue; }
  planned++;
  console.log(`\n  ${e.id}`);
  console.log(`    before: ${cur.slice(0, 150)}`);
  console.log(`    after : ${next === null ? "(cleared — the value was only a pointer to a source)" : next.slice(0, 150)}`);
  writes.push({ id: e.id, value: next === null ? null : (arr ? [next] : next) });
}

console.log(`\n${planned} edit(s) planned, ${refused} refused.`);
if (refused) { console.error("refusing to write while any edit is refused — the table has moved since this was written."); process.exit(1); }
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }

for (const w of writes) await patchRow("routes", w.id, { fa: w.value });
let bad = 0;
for (const e of EDITS) {
  const row = await read(e.id);
  const cur = Array.isArray(row.fa) ? row.fa[0] : row.fa;
  if (e.clear) { if (cur != null) { console.error(`  VERIFY FAILED ${e.id}: still ${JSON.stringify(cur)}`); bad++; } continue; }
  if (typeof cur !== "string" || /\bsources?\b/i.test(cur)) { console.error(`  VERIFY FAILED ${e.id}: ${JSON.stringify(String(cur).slice(0,90))}`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified: ${EDITS.length} value(s) re-read, none names a source`);
