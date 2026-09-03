// A WINTER ROUTE PARKING IN THE ALPENTAL VALLEY MUST NOT QUOTE THE SUMMER FEE ALONE.
//
// Outside ski season the Alpental/Snow Lake trailhead is an ordinary Forest Service fee site: $5 a
// day or a Northwest Forest Pass. In winter the whole valley's parking is run by the ski area, at
// roughly $25/vehicle on weekends and holidays, and the Northwest Forest Pass is NOT accepted on
// those days. A climber reading only the summer figure arrives in January with the wrong pass.
//
// MEASURED FIRST, and the measurement is what kept this to two rows. Across the 39 WA routes whose
// own fields name the Alpental approach: 20 already state the winter fact, 11 have no winter season
// so silence is correct, and of the remainder only TWO are winter routes whose `access.fees`
// answers parking and omits it. Both have a donor ON THEIR OWN PEAK:
//
//   wa_east_face_variation           (The Tooth, `ice`, season "Dec-Apr")
//        <- wa_the_tooth_south_face  (same peak, same lot)
//   wa_chair_peak_northeast_buttress (Chair Peak, `alpine`, season "Dec-Mar (ice/mixed)")
//        <- wa_chair_peak_north_face (same peak, same lot)
//
// THREE CANDIDATES ARE DELIBERATELY EXCLUDED, and each exclusion is the point rather than a caveat:
//   * wa_mount_roosevelt_standard -- season "Jul-Sep", best_season "July through October". A summer
//     scramble never meets the resort fee. It reached the candidate list only because the census's
//     own needle matched the word "winter" inside "depending on the WINTER'S SNOWPACK" -- a
//     needle over-matching, which is the same failure as a deny-list under-matching and is why the
//     candidate list was READ rather than swept.
//   * wa_snoqualmie_mountain_boogie_wonderland and wa_snoqualmie_mountain_the_snostril -- both are
//     winter routes, and NEITHER ROW NAMES ALPENTAL anywhere in its access, road or approach text.
//     Snoqualmie Mountain is in fact approached from that valley, but the ROW does not say so, and
//     copying a parking rule onto a row whose approach the catalog does not state is assuming the
//     fact rather than copying it. A repair needing something the catalog does not hold must not be
//     expressible -- the rule that makes fix-road-blocks-from-a-named-sibling.mjs safe.
//
// DISCIPLINE: nothing is typed here that is not already in the donor row. The winter clause is
// declared below AND asserted to appear verbatim in the live donor before any write, so this
// cannot invent a fee, a dollar figure or a programme name. The target's existing text is APPENDED
// TO, never rewritten, so no summer fact is lost -- and the appended sentence scopes itself ("In
// winter ...", "During winter ..."), so the surviving first half needs no edit to stay true.
// Idempotence asks whether the APPENDED SENTENCE is already present -- see the note at that test
// for why equality with the composed result cannot work for an append.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const DRY = !process.argv.includes("--apply");
const S = v => typeof v === "string" ? v : JSON.stringify(v ?? "");

const JOBS = [
  {
    id: "wa_east_face_variation", donor: "wa_the_tooth_south_face", peak: "The Tooth",
    // asserted, case-insensitively, to be present in the donor's live access.fees
    clause: "in winter the Alpental lot runs under the privately-operated 'Park at the Summit' " +
      "program, which charges roughly $25/vehicle only on weekends and a handful of holidays " +
      "(late Nov into spring) rather than a flat daily rate — the NW Forest Pass is not accepted " +
      "on those specific paid days. Carpools of 3+ can often park free as space allows.",
    lead: "In winter",
  },
  {
    id: "wa_chair_peak_northeast_buttress", donor: "wa_chair_peak_north_face", peak: "Chair Peak",
    clause: "during winter, all parking in the Alpental Valley is managed by Summit at Snoqualmie " +
      "— climbers need a Summit parking/uphill permit (currently about $25/vehicle on weekends and " +
      "holidays; carpools of 3+ can often park free), separate from the Northwest Forest Pass.",
    lead: "During winter",
  },
];

const ids = [...new Set(JOBS.flatMap(j => [j.id, j.donor]))];
const rows = await selectAll("routes", "id,season,best_season,access,road,approach,areas!inner(name)",
  `id=in.(${ids.join(",")})`, { pageSize: 20, key: KEY });
const by = Object.fromEntries(rows.map(r => [r.id, r]));
for (const id of ids) if (!by[id]) { console.error(`REFUSED: ${id} not found.`); process.exit(1); }

const WINTERY = /\b(?:dec|jan|feb|mar|apr)\b|winter/i;
const plans = [], refuse = [];
const premise = (id, what, held) => { console.log(`  ${held ? "HOLDS " : "FAILED"} [${id}] ${what}`); if (!held) refuse.push(`${id}: ${what}`); };

for (const j of JOBS) {
  const t = by[j.id], d = by[j.donor];
  console.log(`\n== ${j.id}  <- donor ${j.donor}  (${j.peak})`);
  premise(j.id, "target and donor are on the SAME peak", t.areas.name === d.areas.name);
  premise(j.id, "the target is a winter route by its own `season`", WINTERY.test(S(t.season)));
  premise(j.id, "the target's own fields name the Alpental approach",
    /alpental/i.test(S(t.access) + S(t.road) + S(t.approach)));
  // THE CLAUSE MUST BE THE DONOR'S OWN WORDS, checked against the live row rather than trusted.
  const donorFees = S(d.access?.fees);
  premise(j.id, "the winter clause appears verbatim in the DONOR's live access.fees",
    donorFees.toLowerCase().includes(j.clause.toLowerCase()));

  const acc = t.access ? JSON.parse(JSON.stringify(t.access)) : null;
  if (!acc) { refuse.push(`${j.id}: no access blob`); continue; }
  const cur = S(acc.fees);
  const sentence = j.lead + j.clause.slice(j.lead.length);
  const want = cur.replace(/\s*$/, "").replace(/\.?$/, ".") + " " + sentence;
  // IDEMPOTENCE BY THE SENTENCE, NOT BY THE COMPOSED RESULT -- and the first version got this
  // wrong in the way this repo has now recorded twice. `want` is built by APPENDING to `cur`, so
  // after a successful run `cur !== want` forever (it would append a second copy), the equality
  // test never fires, and the "already mentions the programme" guard below then matches the text
  // this script itself wrote and reports a REFUSAL. Safe -- it never double-appends -- but it
  // reports a clean tree as a failure, which is how people learn to ignore a red line. Ask whether
  // the SENTENCE is already there.
  if (cur.includes(sentence)) { console.log(`  == access.fees: already applied — no-op.`); continue; }
  if (/summit at snoqualmie|park at the summit/i.test(cur)) {
    refuse.push(`${j.id}.access.fees already mentions the winter programme in OTHER words; read it before appending`);
    continue;
  }
  if (!/northwest forest pass|\$\s?\d/i.test(cur)) {
    refuse.push(`${j.id}.access.fees no longer answers parking; it reads ${JSON.stringify(cur.slice(0, 90))}`);
    continue;
  }
  acc.fees = want;
  plans.push({ id: j.id, body: { access: acc }, old: cur, neu: want,
    check: v => S(v.access?.fees) === want });
}

console.log("");
if (refuse.length) { for (const x of refuse) console.error(`  !! REFUSED ${x}`); console.error(`\nWriting nothing.`); process.exit(1); }
if (!plans.length) { console.log("Nothing to do — every edit is already applied."); process.exit(0); }
for (const p of plans) console.log(`  -> ${p.id}\n     OLD ${JSON.stringify(p.old)}\n     NEW ${JSON.stringify(p.neu)}\n`);
if (DRY) { console.log(`DRY RUN — ${plans.length} row(s). Re-run with --apply.`); process.exit(0); }

for (const p of plans) await patchRow("routes", p.id, p.body, { key: KEY });
const after = await selectAll("routes", "id,access", `id=in.(${plans.map(p => p.id).join(",")})`, { pageSize: 20, key: KEY });
const aby = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
for (const p of plans) { const held = p.check(aby[p.id] || {}); console.log(`  ${held ? "OK  " : "FAIL"} ${p.id}`); if (!held) bad++; }
console.log(bad ? `\n${bad} check(s) FAILED — re-read the rows.` : `\nApplied and verified: ${plans.length} row(s).`);
process.exitCode = bad ? 1 : 0;
