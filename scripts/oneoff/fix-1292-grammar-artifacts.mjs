// Three sentences #1292 left ungrammatical, on a climber's screen.
//
// My rule mapped "(multiple|several|published|online|…) sources" -> "several accounts" without
// looking at the DETERMINER in front of it, so where one already governed the phrase the result
// was nonsense:
//
//   "No published sources give a rappel count"   -> "No several accounts gives a rappel count"
//   "no published sources name which spire"      -> "no several accounts names which spire"
//   "One published source says two and a half"   -> "One several accounts says two and a half"
//
// WHAT LET IT THROUGH. #1292 added a LOSS GUARD — refuse any value that shrinks by more than a
// rule's own phrase length — precisely because my post-conditions all session had checked that
// nothing bad REMAINS and never that nothing good was LOST. It worked, and it caught a real
// over-match. But a substitution of the same length is invisible to it: this text did not
// shrink, it stopped being English. A length check is not a grammar check, and neither is
// "the forbidden word is gone".
//
// The general rule, which is the part worth keeping: A SUBSTITUTION RULE MUST AGREE WITH THE
// WORDS AROUND IT. Replacing a noun phrase changes number and definiteness, so anything already
// governing it — an article, a quantifier, a verb — has to be part of the match or the result is
// checked against it.
//
// Each edit is a literal find/replace asserted to match exactly once, and idempotent.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const EDITS = [
  { id: "wa_concerto_in_c_for_drill_and_hammer", col: "rappel_count_note",
    from: "No several accounts gives", to: "No published account gives" },
  { id: "wa_tepeh_towers", col: "approach_variants",
    from: "no several accounts names", to: "no published account names" },
  { id: "wa_seven_fingered_jack_southwest_slopes", col: "approach_variants",
    from: "One several accounts says", to: "One account says" },
];

// Nothing may still read as a determiner colliding with the replacement phrase.
const BROKEN = /\b(?:no|one|a|an|the)\s+several accounts\b|\bseveral accounts (?:gives|says|describes|states|reports|names|lists)\b/i;

function deepSub(v, from, to) {
  if (typeof v === "string") return v.split(from).join(to);
  if (Array.isArray(v)) return v.map((x) => deepSub(x, from, to));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepSub(x, from, to)]));
  return v;
}
const flat = (v) => JSON.stringify(v);

const cur = new Map(); const fails = []; const skipped = [];
for (const e of EDITS) {
  const [row] = await (await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=id,${e.col}`, { headers: H })).json();
  if (!row) { fails.push(`${e.id}: no row`); continue; }
  const s = flat(row[e.col]);
  if (s.includes(e.to) && !s.includes(e.from)) { skipped.push(e.id); continue; }
  const n = s.split(e.from).length - 1;
  if (n !== 1) { fails.push(`${e.id}.${e.col}: expected ${JSON.stringify(e.from)} exactly once, found ${n}`); continue; }
  cur.set(e.id, row[e.col]);
}
if (fails.length) {
  console.error("REFUSING TO WRITE — rows are not what this was written against:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
for (const s of skipped) console.log(`  (already repaired, skipped) ${s}`);
for (const e of EDITS) {
  if (!cur.has(e.id)) continue;
  console.log(`### ${e.id} ${e.col}\n  - …${e.from}…\n  + …${e.to}…\n`);
}
if (!cur.size) { console.log("nothing to change."); process.exit(0); }
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const e of EDITS) {
  if (!cur.has(e.id)) continue;
  await patchRow("routes", e.id, { [e.col]: deepSub(cur.get(e.id), e.from, e.to) });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=${e.col}`, { headers: H })).json();
  const s = flat(after[e.col]);
  if (s.includes(e.from) || BROKEN.test(s)) { console.log(`  MISMATCH ${e.id}`); bad++; }
  else console.log(`  ok ${e.id}`);
}
console.log(bad ? `\n${bad} did not take` : "\nall verified on re-read");
process.exit(bad ? 1 : 0);
