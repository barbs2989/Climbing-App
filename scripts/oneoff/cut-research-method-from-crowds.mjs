// Batch 7, the other half of the `crowds` leak: the list of websites somebody searched.
//
// Batch 6 cut the ANALYTICS an estimate was built on. This cuts the METHOD: 20 values end with a
// parenthetical naming which sites were checked - "(a few reports per year found across
// TrailCatJim, WTA, NWHikers, One Hike A Week)", "(Mazamas, SummitPost, Lemke Climbs,
// CountryHighpoints)". That is the research act narrated to the climber, the same tier
// `audit:expiring-closures` flags when a closure dates itself to when a researcher looked.
//
// WHAT SURVIVES, AND WHY IT IS NOT ALSO A CITATION. "based on a sparse trip-report record" stays.
// "Trip reports" is a category rather than a publisher, the audit's needle does not flag it, and
// it is doing real work: it tells the reader the number is INFERRED FROM THIN EVIDENCE rather
// than counted, which is the difference between an estimate and a measurement. Cutting the hedge
// along with the sites would leave a confident figure standing on nothing - a worse value than
// the one we started with. The same reasoning keeps "there is no trailhead register or ranger
// tally" in batch 6.
//
// AND NAMING A CLUB THAT RUNS THE TRIP IS NOT A CITATION. "the Mountaineers run it as an official
// Alpine Scramble" and "mostly Mountaineers club scramble outings" are facts about WHO CLIMBS the
// route, not claims about where our data came from - the same distinction that keeps 589
// land-manager alert pages and ranger phone numbers in the catalog. Those are left alone, and the
// audit will keep reporting them; that is the deny-list being blunt, not a defect.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";

const EDITS = [
  {
    id: "wa_cutthroat_south_buttress", col: "crowds",
    find: "multiple trip reports posted per season on Mountain Project/SummitPost",
    repl: "multiple trip reports posted per season",
  },
  {
    id: "wa_fifth_of_july_mountain_scramble", col: "crowds",
    find: " (a few reports per year found across TrailCatJim, WTA, NWHikers, One Hike A Week)",
    repl: " (a few reports per year)",
  },
  {
    id: "wa_grotto_mountain_e_route", col: "crowds",
    find: "only a single WTA trip report and one recent blog trip report were found for this route, indicating",
    repl: "only two trip reports are on record for this route, indicating",
  },
  {
    id: "wa_katsuk_peak_gully", col: "crowds",
    find: "sparse online trip reports (Mazamas, SummitPost, Lemke Climbs, CountryHighpoints) suggest",
    repl: "sparse online trip reports suggest",
  },
  {
    id: "wa_lewis_creek_route", col: "crowds",
    find: "one trip-report author noted concern about " + Q + "growing social media popularity" + Q + " implying",
    repl: "one trip report raised concern about growing social-media popularity, implying",
    note: "the attribution IS the verb; a quotation cannot survive its speaker. The Mountaineers clause after it is KEPT - running the route as an official scramble is a fact about who climbs it.",
  },
  {
    id: "wa_massie_peak_west_route", col: "crowds",
    find: "during peak larch/wildflower and Mountaineers/WTA trip-report season",
    repl: "during peak larch and wildflower season",
  },
  {
    id: "wa_monte_cristo_peak_scramble", col: "crowds",
    find: "trip-report frequency on WTA/SummitPost for the Monte Cristo group is sparse",
    repl: "trip-report frequency for the Monte Cristo group is sparse",
  },
  {
    id: "wa_mount_degenhardt_southwest_route", col: "crowds",
    find: "trip-report frequency online (SummitPost, Mountain Project, personal blogs) suggests",
    repl: "trip-report frequency online suggests",
  },
  {
    id: "wa_mount_mastiff_south_route", col: "crowds",
    find: "mostly Mountaineers club scramble outings, WTA/peakery trip-report regulars, and Nason Ridge peak-baggers",
    repl: "mostly Mountaineers club scramble outings, trip-report regulars, and Nason Ridge peak-baggers",
    note: "only the publisher names go. 'Mountaineers club scramble outings' names who climbs the route and stays.",
  },
  {
    id: "wa_mount_saul_se_route", col: "crowds",
    find: " (a single WTA report and one older trailcatjim.com report were the only accounts located, both describing",
    repl: " (only two accounts exist, both describing",
  },
  {
    id: "wa_mount_sefrit_southwest_ridge", col: "crowds",
    find: "based on sparse trip-report cadence (WTA, SummitPost, Mountaineers club trips)",
    repl: "based on sparse trip-report cadence",
  },
  {
    id: "wa_mount_stickney_scramble", col: "crowds",
    find: "online trip-report volume (WTA, SummitPost, willhiteweb, peakery, hike2hike) is sparse",
    repl: "online trip-report volume is sparse",
  },
  {
    id: "wa_mount_washington_olympic_standard", col: "crowds",
    find: "No official trailhead register counts found, but multiple several accounts (WTA, Mountaineers, AllTrails, trip-report blogs) describe it as",
    repl: "No official trailhead register count exists, but several accounts describe it as",
    note: "also repairs 'multiple several accounts', a duplicated word that has been rendering on the route page.",
  },
  {
    id: "wa_northwest_arete", col: "crowds",
    find: "still obscure " + DASH + " Mountain Project page (2020, ~10 ratings/~35 monthly views), independent trip-report blog (2020), Cascade Climbers forum trip report (2020), another trip-report blog (2022)",
    repl: "still obscure " + DASH + " four documented accounts between 2020 and 2022",
    note: "the whole value was a bibliography. What it actually establishes - four accounts across three years - is kept as the fact.",
  },
  {
    id: "wa_sheep_gap_mountain_scramble", col: "crowds",
    find: "based on sparse WTA/SummitPost trip report history",
    repl: "based on sparse trip-report history",
  },
  {
    id: "wa_south_face_12", col: "crowds",
    find: "One public trip report found (Mountain Project, 2018, ~9 ratings / ~30 monthly views as a traffic proxy)",
    repl: "One public trip report on record, from 2018",
    note: "'as a traffic proxy' is the researcher explaining their own method to the climber.",
  },
  {
    id: "wa_star_peak_sawtooth_scramble", col: "crowds",
    find: "based on the small number of trip reports found (Mountaineers scramble outings, occasional WTA/Wenatchee Outdoors reports) relative to",
    repl: "based on the small number of trip reports on record relative to",
  },
  {
    id: "wa_three_queens_standard", col: "crowds",
    find: "sparse trip-report history (a handful of documented trips per year on trailcatjim.com, Mountaineers, WTA) suggests",
    repl: "sparse trip-report history (a handful of documented trips per year) suggests",
  },
  {
    id: "wa_tupshin_peak_scramble", col: "crowds",
    find: " (only a handful of general Tupshin ascent reports found via SummitPost, Mountaineers, WTA, and trailcatjim.com)",
    repl: " (only a handful of general Tupshin ascent reports exist)",
  },
  {
    id: "wa_windy_peak_trail", col: "crowds",
    find: "WTA trip-report frequency for Windy Peak/Windy Creek is sparse",
    repl: "trip-report frequency for Windy Peak/Windy Creek is sparse",
  },
];

const IDS = [...new Set(EDITS.map((e) => e.id))];

function countIn(v, find) {
  if (typeof v === "string") return v.split(find).length - 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countIn(x, find), 0);
  if (v && typeof v === "object") return Object.values(v).reduce((n, x) => n + countIn(x, find), 0);
  return 0;
}
function replaceIn(v, find, repl) {
  if (typeof v === "string") return v.split(find).join(repl);
  if (Array.isArray(v)) return v.map((x) => replaceIn(x, find, repl));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = replaceIn(x, find, repl);
    return o;
  }
  return v;
}
function leaves(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
}

const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,crowds`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) {
  console.error(`read returned ${rows.length} row(s) for ${IDS.length} id(s) - refusing`);
  process.exit(1);
}
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id} ${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find)}, expected exactly 1`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} edit(s) did not match exactly once:\n  ` + refusals.join("\n  "));
  console.error("\nNothing was written. Re-read the live value before changing the declaration.");
  process.exit(1);
}

for (const s of staged.values()) {
  console.log(`\n### ${s.id}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} value(s) on ${IDS.length} route(s).`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  if (countIn(after.get(e.id)[e.col], e.find) !== 0) {
    console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`);
    bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
