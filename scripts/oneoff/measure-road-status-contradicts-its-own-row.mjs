// DOES road.status SAY OPEN WHILE THE SAME ROW SAYS CLOSED?
//
// The worst defects found in the closure grind were not stale claims — they were AFFIRMATIVE ones,
// and three of them contradicted the row they sat in:
//
//   wa_little_sister_north_face / _southeast_ridge / _west_face
//     road.status       "Open as of mid-2026 but see seasonalGate"
//     road.seasonalGate "... FR 38 washout/barrier at MP 7."
//     access.closures   "... FR 38 washout/barrier at MP 7 ..."
//
// road.status is rendered first on the route page, beside the road name, and it is the field a
// climber reads to answer "can I drive there". An affirmative wrong answer there is worse than
// silence, and worse than a stale one: nothing prompts the reader to look further.
//
// VERDICT: THIS DETECTOR DOES NOT WORK, AND THE REASON IS WORTH MORE THAN THE DETECTOR WOULD HAVE
// BEEN. It is kept, unshipped, as the measurement — do not revive it without reading this.
//
// It was written on the premise that a WITHIN-ROW comparison needs no road-identity resolution,
// because both fields describe the same route's own access by construction — so the near-miss
// classes this repo keeps recording (a name is not an identity; a drive has several named legs)
// could not arise. THE PREMISE IS FALSE: one row describes SEVERAL roads, so the same trap arrives
// intra-row exactly as it does across rows.
//
// The run went 56 -> 30 -> 3 -> 0 across five suppressions, and every one of them is a principled
// rule this repo has already paid for elsewhere (seasonal, past tense, advisory, different-road,
// susceptibility). Then the injection was run, and it MISSED:
//
//   live               0 findings
//   --inject=prefix    0 findings   <-- restores the exact defect fixed earlier today
//
// The same-road constraint that removed the false positives removes the TRUE ones too, because the
// real defect's status field — "Open as of mid-2026 but see seasonalGate" — NAMES NO ROAD AT ALL.
// Without that constraint the detector reports 30 with roughly 1 real; with it, 0 with 0 recall.
// There is no setting in between: the signal that distinguishes a contradiction from a two-leg drive
// is absent from precisely the values that carry the defect.
//
// THE LESSON IS THE INJECTION, NOT THE COUNT. A tightening sequence that ends at zero looks like
// success — five defensible rules, a clean run, nothing to report. Only a case the detector was
// SUPPOSED to catch shows that it had been tightened into blindness. This repo records the shape
// ("a detector tightened until its healthy output is empty is one that no longer fires"); this is
// that shape caught in the act, by one case, after the count had already reached the wanted answer.
//
// Report-only, read-only, anon key. Fails closed on an empty read and on a needle that matches
// nothing.
import { selectAll } from "../lib/supabase-env.mjs";

/* An AFFIRMATIVE claim of drivable access, not a mere absence of bad news. Anchored at the start or
   after a separator, because "closed" and "open" both appear constantly mid-sentence:
   "open to foot and bike beyond the closure" is a CLOSURE, and "reopened in May" is history. */
const SAYS_OPEN = /(?:^|[.;]\s*|—\s*)(?:currently\s+)?(?:open\b(?!\s*(?:to\s+(?:foot|bike|hike|hikers|pedestrian|non-motor)|until|from|for the season\b))|good\b|passable\b|drivable\b|paved\b|gravel(?:\/paved)?\b)/i;

// Does some OTHER field of the same row assert the access is cut? Deliberately specific verbs — a
// seasonal gate is not a contradiction of "open in summer", so those are excluded below.
const SAYS_SHUT = /\b(?:washout|washed out|barrier|impassable|closed at|closed to vehicles|closed to motor|closed beyond|gated at (?:milepost|MP)|not (?:currently )?(?:passable|drivable)|no vehicle access)\b/i;

/* THREE SUPPRESSIONS, EACH A SHAPE THIS REPO ALREADY PAID FOR. The first run reported 56 and the
   sample was dominated by correct rows; every false positive was one of these, and the same three
   are what audit:trailhead-road needed six tightenings to survive. Read them as the precision rule,
   not as defensiveness — a detector that flags correct work is one people learn to ignore. */

// 1. A SEASONAL gate is not a contradiction. "Open seasonally, snow-free June-October" beside
//    "Gated/impassable in winter" is ONE coherent statement split across two fields — six
//    Amphitheater Mountain routes read exactly that way. Note "impassable" must be escapable here:
//    the first draft kept it out of the escape, so every seasonal "impassable in winter" fired.
const SEASONAL = /\b(?:winter|snow|seasonal(?:ly)?|elk|wildlife|spring|Dec(?:ember)?|Nov(?:ember)?|Jun(?:e)?|Jul(?:y)?)\b/i;
const HARD_SHUT = /\b(?:washout|washed out|barrier|landslide|slide debris|flood)\b/i;

// 2. PAST TENSE IS NOT A CLAIM. "has experienced washouts in past seasons", "sections have washed
//    out in the past" describe history, and a road that once washed out is not a closed road.
//    audit:trailhead-road records the same trap from the other end ("Formerly open to vehicles").
const PAST = /\b(?:has|have|had)\s+(?:\w+\s+){0,2}(?:experienced|been|washed out)\b|\bin past (?:seasons|years)\b|\bin the past\b|\bhistorically\b|\bpreviously\b|\bformerly\b/i;

// 3. AN INSTRUCTION TO CHECK IS NOT A CLOSURE. "call the ranger district for current washout
//    status", "check for spring washouts" is advice to verify, which is what a correct row does.
const ADVISORY = /\b(?:check|call|verify|confirm|contact|consult)\b[^.;]{0,60}\b(?:status|washout|condition|report|alert|before)\b/i;

/* 4. THE PREMISE OF THIS WHOLE MEASUREMENT WAS WRONG, AND THIS IS THE CORRECTION.
   It was written believing that a within-row comparison needs no road-identity resolution, because
   both fields describe the same route's access by construction. They do not: ONE ROW DESCRIBES
   SEVERAL ROADS. "A drive has several named legs" — the trap audit:trailhead-road needed six
   tightenings to survive — arrives intra-row exactly as it does across rows, and at 30 findings
   roughly half were a closure on a road the row ITSELF calls a different one:

     wa_glacier_peak_frostbite_ridge  "The White Chuck Road (FR 23) approach from the north is A
                                       DIFFERENT START and is closed at milepost 3.7."
     wa_mount_appleton_standard       "the ALTERNATE Elwha-side road ... is permanently closed"
     wa_courtney_peak_scramble        "the NEARBY War Creek Trailhead road has had washout closures"

   What made the three Little Sister rows catchable is that both fields named THE SAME ROAD (FR 38).
   So the contradiction is only a contradiction when the two sentences are about one road. */
const ROAD_ID = /\b(?:FSR?|FS|FR|forest (?:service )?road|road|hwy|highway|SR|US)[- ]?(\d{1,4}(?:[-.]\d{1,4})*)\b/gi;
const roadIds = s => new Set([...String(s).matchAll(ROAD_ID)].map(m => m[1]));
const shareARoad = (a, b) => { const A = roadIds(a), B = roadIds(b); for (const x of A) if (B.has(x)) return true; return false; };

// A row that names NO road number anywhere cannot be judged this way. Counted, never guessed at.
let unjudgeable = 0;

/* 5. SUSCEPTIBILITY IS NOT A CLOSURE, and it is what the last three findings all were.
   "washout-prone spots around mile 1", "subject to washout closures", "EVEN WHEN OPEN, FR 49 has
   rough washout sections" — a road that can wash out, or that is rough where it once did, is a
   drivable road being described accurately. Same family as PAST and ADVISORY above: the needle sees
   the word "washout" and the sentence is not making the claim. */
const SUSCEPTIBLE = /\b(?:prone|subject to|susceptible|at risk|can (?:wash|become)|may (?:wash|become)|even when open|rough(?:er)? washout)\b/i;

/* --inject=prefix restores the pre-fix wa_little_sister_* road.status IN MEMORY. Without this the
   run below is worthless: "3 findings, none real" and "the needle is broken" print identically, and
   the only known true instances of this defect were repaired earlier today, so live data can no
   longer demonstrate that the detector works. Never writes. */
const INJECT = process.argv.includes("--inject=prefix");
const PREFIX_IDS = ["wa_little_sister_north_face", "wa_little_sister_southeast_ridge", "wa_little_sister_west_face"];

const rows = await selectAll("routes", "id,name,road,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

if (INJECT) {
  let n = 0;
  for (const r of rows) if (PREFIX_IDS.includes(r.id) && r.road && typeof r.road === "object") {
    r.road.status = "Open as of mid-2026 but see seasonalGate"; n++;
  }
  console.log(`[inject=prefix] restored the pre-fix road.status on ${n} row(s) in memory\n`);
  if (n !== PREFIX_IDS.length) { console.error(`FAIL — restored ${n} of ${PREFIX_IDS.length}; the case proves nothing`); process.exit(1); }
}

let withStatus = 0, openish = 0;
const findings = [];
for (const r of rows) {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  const status = typeof rd.status === "string" ? rd.status : null;
  if (!status || !status.trim()) continue;
  withStatus++;
  // The status itself must not already carry the bad news — that is a complete statement.
  if (SAYS_SHUT.test(status)) continue;
  if (!SAYS_OPEN.test(status)) continue;
  openish++;

  const others = [["road.seasonalGate", rd.seasonalGate], ["road.driveNote", rd.driveNote],
                  ["access.closures", ac.closures], ["access.seasonal", ac.seasonal]]
    .filter(([, v]) => typeof v === "string" && v.trim());

  for (const [field, v] of others) {
    if (!SAYS_SHUT.test(v)) continue;
    /* Judge the SENTENCE, never the field. A field routinely carries a real closure beside a
       seasonal note or an advisory, and testing the whole blob lets any one of them mask the
       others — the "scope a read by SECTION, never a character window" rule, one level finer. */
    const sent = (v.split(/(?<=[.;])\s+/).find(s => SAYS_SHUT.test(s)) || v).trim();
    if (SEASONAL.test(sent) && !HARD_SHUT.test(sent)) continue;
    if (PAST.test(sent)) continue;
    if (ADVISORY.test(sent)) continue;
    if (SUSCEPTIBLE.test(sent)) continue;
    /* Both sentences must be about ONE road. The road number is the only identifier available that
       does not need the spelling normalisation audit:road-coverage had to build, and a row whose
       two halves name different numbers is describing two legs of a drive, not contradicting
       itself. A row naming no number at all is UNJUDGEABLE, not clean. */
    const named = roadIds(status).size && roadIds(sent).size;
    if (!named) { unjudgeable++; continue; }
    if (!shareARoad(status, sent)) continue;
    findings.push({ id: r.id, name: r.name, status, field, sent });
    break;
  }
}

if (!withStatus) { console.error("FAIL — no route carries road.status; the read or the needle broke"); process.exit(1); }
if (!openish) { console.error("FAIL — not one road.status reads as affirmatively open. The SAYS_OPEN needle\nmatches nothing, so every comparison below would be vacuous."); process.exit(1); }

console.log(`${withStatus} WA route(s) carry road.status.`);
console.log(`${openish} of those assert drivable access without stating a closure in the same field.`);
console.log(`${findings.length} are contradicted by another field of THEIR OWN ROW, about the SAME road.`);
console.log(`${unjudgeable} more disagree but name no road number on one side or the other — unjudgeable, not clean.\n`);

for (const f of findings) {
  console.log(`   ${f.id}  —  ${f.name}`);
  console.log(`      road.status  says: ${f.status.replace(/\s+/g, " ").slice(0, 165)}`);
  console.log(`      ${f.field.padEnd(17)} says: ${f.sent.replace(/\s+/g, " ").slice(0, 165)}\n`);
}

console.log(`VERDICT — NOT SHIPPED. Run --inject=prefix: it restores the exact defect repaired earlier
today (three wa_little_sister_* rows whose road.status said "Open as of mid-2026" while their own
seasonalGate and access.closures recorded the FR 38 washout at MP 7) and this detector still reports
ZERO. The same-road constraint that removed the false positives removes the true ones too, because
those status values name no road at all.

Without that constraint: 30 findings, roughly 1 real. With it: 0 findings, 0 recall. No setting in
between works, so there is nothing here to ship.

Read the header for the full argument. The transferable part is that five defensible tightenings
took the count to zero and it LOOKED like success -- only a case the detector was supposed to catch
showed it had been tightened into blindness.`);
