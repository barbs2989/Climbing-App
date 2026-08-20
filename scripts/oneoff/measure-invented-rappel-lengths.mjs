// A rappel length the row's OWN NOTE says is invented.
//
// `check:rappel-lengths` asks whether a stated distance EXCEEDS what the rope described can
// reach -- the rope-off-the-end defect. It is structurally blind to the opposite failure: a
// length that is inside the rope's reach and was never published at all. Those rows say so
// themselves, in the station's own `notes`: "length is an assumed typical figure, not stated in
// the source", "Length not documented; estimated."
//
// CLAUDE.md is explicit that this is wrong, and it is the rule the #1043 repair followed:
//   "`null` is the CORRECT value where no source gives a distance, and writing nulls rather than
//    inventing numbers is what the repair did. Halving is also wrong: a rappel with no published
//    distance may be 35m or 15m, so a halved figure replaces one fabricated number with another."
//
// It matters because RappelTable renders each station's number AND SUMS THEM. A route whose
// every station is an assumed 30 m prints a confident total for a descent nobody measured.
//
// Read-only. Reports; changes nothing.
import { loadEnv } from "../lib/supabase-env.mjs";
import { probeDbLatency } from "../lib/db-preflight.mjs";

const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const health = await probeDbLatency();
if (health.state === "error") { console.error(`DB not answering (${health.err}).`); process.exit(1); }
console.log(`db: ${health.ms}ms\n`);

// The admission, not the hedge -- AND IT MUST BE ABOUT THE LENGTH.
//
// A first draft matched "not documented" anywhere in the note and reported two routes whose
// notes say "exact ANCHOR TYPE not documented" and "exact STATION COORDINATES are not
// independently documented". Both are honest remarks about something that is not the number in
// the table, and flagging them is a guard telling an author to delete correct work. Test the
// OBJECT, not the preposition -- the lesson this repo already records for the OSM saddle match.
//
// So a station qualifies only when ONE SENTENCE both admits the gap and names the measurement.
const INVENTED = /\b(?:not (?:independently )?(?:documented|stated|specified|published)|not stated in (?:the )?source|estimated(?: as| from| similar| a typical)?|assumed typical|approximate estimate|typical figure)\b/i;
const ABOUT_LENGTH = /\b(?:length|distance|per-rap|how (?:long|far)|\d+\s*m\b)/i;
const admitsInventedLength = (note) => note
  .split(/(?<=[.;!?])\s+/)
  .some((sent) => INVENTED.test(sent) && ABOUT_LENGTH.test(sent));

// A station may honestly say "exact length not specified" while carrying NO number. That is fine.
const lenOf = (s) => (typeof s.lengthM === "number" ? s.lengthM
  : typeof s.length_m === "number" ? s.length_m
  : typeof s.length === "number" ? s.length : null);

const r = await fetch(`${U}/rest/v1/routes?select=id,rappel_detail,rappel_count_note&rappel_detail=not.is.null&limit=10000`,
  { headers: H, signal: AbortSignal.timeout(30000) });
if (!r.ok) { console.error(`read failed ${r.status} -- nothing measured.`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.error("zero rows with rappel_detail -- broken read, not a clean catalog."); process.exit(1); }

let stations = 0, withLen = 0, invented = 0;
const hits = [];
for (const x of rows) {
  const d = Array.isArray(x.rappel_detail) ? x.rappel_detail : [];
  if (!d.length) continue;
  const bad = [];
  for (const s of d) {
    stations++;
    const L = lenOf(s);
    if (L === null) continue;
    withLen++;
    const note = [s.notes, s.note, s.description].filter((v) => typeof v === "string").join(" ");
    if (admitsInventedLength(note)) { invented++; bad.push({ L, note: note.replace(/\s+/g, " ") }); }
  }
  if (!bad.length) continue;
  // A route where EVERY numbered station is invented is the serious case: the rendered total is
  // entirely manufactured. One estimated station among measured ones is milder.
  const numbered = d.filter((s) => lenOf(s) !== null).length;
  hits.push({ id: x.id, bad, numbered, all: bad.length === numbered, total: bad.reduce((a, b) => a + b.L, 0) });
}

console.log(`${rows.length} routes carry rappel_detail · ${stations} stations · ${withLen} carry a number`);
console.log(`${invented} of those numbers are admitted in their own note to be invented`);
console.log(`across ${hits.length} routes, ${hits.filter((h) => h.all).length} of which have NO measured station at all\n`);

for (const h of hits.sort((a, b) => b.bad.length - a.bad.length)) {
  console.log(`### ${h.id} — ${h.bad.length} of ${h.numbered} numbered station(s) invented${h.all ? "  ** EVERY station **" : ""}`);
  if (h.all) console.log(`    the table's rendered total for this route is ${h.total} m of pure estimate`);
  for (const b of h.bad.slice(0, 3)) console.log(`    ${String(b.L).padStart(3)} m  ← ${b.note.slice(0, 150)}`);
  if (h.bad.length > 3) console.log(`    … ${h.bad.length - 3} more, all the same shape`);
  console.log("");
}
console.log("Report only. The repair is to null the invented numbers and say so once in prose,");
console.log("never to halve them -- a halved guess is still a guess.");
