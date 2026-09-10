#!/usr/bin/env node
// audit:gain — is a route's stored `gain_ft` even possible, given its own waypoints?
//
// A physical invariant, in the same family as the chord-vs-trail-mileage test: a party that starts
// at a trailhead at X ft and stands on a summit at Y ft has gained AT LEAST Y - X. Any route whose
// `gain_ft` is less than the net rise between its own waypoints is storing a number that cannot be
// true, and it needs no research to say so — the contradiction is inside the row.
//
// WHY IT MATTERS RATHER THAN BEING TIDY: `gain_ft` is not decorative. `scarfHrs()` computes the
// planner's approach time from distance AND gain, and the Plan tab turns that into an estimated
// summit time and an "after dark" warning. An understated gain produces an optimistic turnaround
// that a party can plan around — the same class as #641, where a missing approach silently became
// a zero-hour hike and the return tile went green.
//
// The test is deliberately ONE-SIDED. Too little gain is impossible; too MUCH is not, because a
// real route rolls over intermediate bumps and every one of them adds gain the endpoints cannot
// see. So this reports only routes gaining less than their own geometry demands, and says nothing
// about the rest.
//
// WHAT IS LEFT IS PER-ROUTE RESEARCH, AND THAT IS A MEASURED CONCLUSION RATHER THAN A SHRUG.
// Three ways to narrow the remainder mechanically were built and all three were REJECTED — each
// for a different reason, so none of them should be re-derived:
//
//   1. CLASSIFY BY rise/dist AS AN AVERAGE GRADE. If the trailhead-to-summit rise is impossibly
//      steep over the stored distance but the stored gain is not, then both stored numbers agree
//      with each other and disagree with the trailhead pin — i.e. the row measures the whole
//      approach from higher up. Plausible, and defeated by the base rate: over the routes that
//      PASS this audit, rise/dist is p50 364 and p90 748 ft/km with a CONTINUOUS tail — 8.9% are
//      already over 800, and 26.9% of findings are. A 3x lean is not a separator, and any
//      threshold that splits the findings mislabels ~57 correct routes.
//   2. ASK THE ROW WHICH PIN dist_km STARTS FROM. Waypoints carry `distMi`, so the distance from
//      each pin to the summit is computable and one of those segments may match `dist_km` — no
//      threshold fitted, the row's own second record. It is DECISIVE where it applies:
//      wa_austera_peak stores dist_km 4.5 against 4.51 km from its own "Eldorado (East Ridge)
//      camp", a match to ten metres. It reaches 3 of 61, because 33 findings carry no usable
//      `distMi` at all. Worth re-running if that column ever fills.
//   3. EXCUSE BY CUMULATIVE ASCENT RATHER THAN NET RISE. Gain is cumulative and the convention
//      test below compares it against a NET height, so a traverse that drops to a col and climbs
//      again has its implied start pushed too low and the pin at the real start is missed —
//      Austera again: camp 7,600 -> col 7,900 -> crevasses 7,700 -> summit 8,339 is 939 ft of
//      ascent against a net 739, so a stored 1,280 reads as starting at 7,059 and misses the camp
//      by 541 ft. Correct in principle, and it moves exactly ONE finding. A detector for a class
//      of one is the thing this repo keeps refusing to build.
//
// Read-only, anon key, fails closed on an empty read. NOT a build gate — a property of the DB, not
// the checkout, so no code change can cause or fix it; same reasoning as check:counts.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";
import fs from "node:fs";

const argv = process.argv.slice(2);
const arg = (kk, d) => { const i = argv.indexOf(kk); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = String(arg("--state", "wa")).toLowerCase();
const LIMIT = Number(arg("--limit", 40));
const JSON_OUT = argv.includes("--json");
/* Slack, in feet. A waypoint elevation is hand-entered or read off a map, and `gain_ft` is
   usually a published round number — so a route "missing" 50 ft is noise, not a finding. The
   threshold is about the precision of the two records, not about what is worth climbing. */
const SLACK_FT = Number(arg("--slack", 300));
/* How close an intermediate waypoint has to be to the elevation a stored gain implies before the
   gain is read as measured FROM there. A camp elevation and a published gain are both round
   numbers, so this is looser than SLACK_FT. */
const START_TOL_FT = Number(arg("--start-tol", 400));
const FIXTURE = arg("--fixture", null);

const k = anonKey();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

/* Waypoint elevations are stored in FEET under `elev`, with a legacy metric spelling `elevM` that
   the reader converts — CLAUDE.md records this, and mixing them silently would put a 3.28x error
   into every comparison. Read both, and convert the metric one. */
const elevFt = (w) => {
  const ft = num(w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft));
  if (ft != null) return ft;
  const m = num(w.elevM != null ? w.elevM : w.elev_m);
  return m == null ? null : m * 3.28084;
};

async function readAll() {
  const sel = "id,name,area_id,discipline,gain_ft,dist_km,waypoints,bivy,high_point_ft,pitches";
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=like.${STATE}_*&waypoints=not.is.null&gain_ft=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

/* `--fixture <path>` reads a synthetic catalog instead of the live one. It exists because the
   faults this audit reports live in the DATA, so a case cannot be injected by editing code, and
   this must never write to the live project to make one. Same mechanism `audit:trailhead-road`
   uses, and the reason its rules are testable at all. */
const rows = FIXTURE ? JSON.parse(fs.readFileSync(FIXTURE, "utf8")) : await readAll();
if (!rows.length) { console.error(`FAIL — read 0 routes for state "${STATE}". That is a broken query, not a clean catalog.`); process.exit(1); }

let comparable = 0, noElev = 0, conventionally = 0;
const findings = [];
for (const r of rows) {
  const wps = (r.waypoints || []).filter(Boolean);
  const withElev = wps.map((w) => ({ w, ft: elevFt(w) })).filter((x) => x.ft != null);
  if (withElev.length < 2) { noElev++; continue; }

  /* Every elevation the ROW records anywhere, for the convention test below. Deliberately NOT
     folded into `withElev`: that list decides the trailhead→summit rise, and a camp is neither
     endpoint — letting one set `lo` or `hi` would change what the audit is measuring. */
  const camps = (Array.isArray(r.bivy) ? r.bivy : []).filter(Boolean);
  const anchors = withElev.map((x) => x.ft).concat(camps.map(elevFt).filter((n) => n != null));

  /* Prefer the NAMED endpoints — a trailhead-to-summit rise is the claim `gain_ft` is making.
     Falling back to min/max across all waypoints is weaker but still a lower bound on the climb,
     and it keeps routes that label their pins unusually from dropping out of the audit. */
  /* WHICH summit, and which trailhead? `.find()` takes whichever the enrichment happened to list
     FIRST, so on the 24 WA routes carrying more than one summit-typed pin the audit's answer
     depended on row order — one of them by 1,815 ft. Row order is not a record.

     THE CONSERVATIVE ENDPOINTS ARE THE ONES THIS AUDIT CAN DEFEND: the LOWEST summit-typed pin
     and the HIGHEST trailhead, which give the smallest rise. `rise` is used as a LOWER BOUND on
     the gain — the whole one-sidedness rests on it — so a smaller rise can only ever under-report,
     never accuse a correct row.

     "HIGHEST SUMMIT" WAS MEASURED AND REJECTED, and the measurement is the point. It adds 5
     findings and loses none, which looks like strictly better coverage until you read them:
     FOUR are Squire Creek Wall south-face routes whose own Topout pin says they end at the
     3,249 ft grassy saddle, while a Summit pin records the FORMATION's 4,958 ft high point that
     those routes never reach. Only `wa_sherpa_glacier` is genuine. One real in five is the
     precision that teaches people to ignore an audit.
     Preferring the route's own Topout does not rescue it either: `wa_sherpa_glacier` carries
     "Top of Sherpa Glacier" (7,600) as an INTERMEDIATE topout on the way to Stuart's 9,415 ft
     summit, so the same field means "where the route ends" on one route and "a milestone" on the
     other. The endpoint cannot be resolved from the pin TYPES, and this records that rather than
     trading an arbitrary rule for a wrong one.
     KNOWN MISS, stated rather than hidden: `wa_sherpa_glacier` stores 6,000 ft against a
     trailhead-to-Stuart rise of 6,485 and is not reported here, because its lowest summit-typed
     pin is that intermediate topout. */
  const lowest = (a, b) => (!a || b.ft < a.ft ? b : a);
  const highest = (a, b) => (!a || b.ft > a.ft ? b : a);
  const sums = withElev.filter((x) => /summit|topout/i.test(String(x.w.type || "")));
  const ths = withElev.filter((x) => /trailhead/i.test(String(x.w.type || "")));
  const sum = sums.reduce(lowest, null);
  const th = ths.reduce(highest, null);
  let lo, hi, basis;
  if (th && sum && sum.ft > th.ft) { lo = th; hi = sum; basis = "trailhead→summit"; }
  else {
    lo = withElev.reduce((a, b) => (b.ft < a.ft ? b : a));
    hi = withElev.reduce((a, b) => (b.ft > a.ft ? b : a));
    basis = "lowest→highest pin";
  }
  const rise = hi.ft - lo.ft;
  if (rise <= 0) continue;
  comparable++;
  const gain = num(r.gain_ft);
  if (gain == null) continue;

  /* CREDIT THE CLIMBING VERTICAL FIRST — the rule the app's own `gainBelowOwnPins` has had since
     #1533 and this audit did not, so the two disagreed about one question for as long as both
     existed. `scarfHrs` is the HIKE leg and `techHrs` the climbing leg, so `gain_ft` is the
     APPROACH gain — trailhead to the base — and a trailhead→summit rise therefore includes
     vertical the PITCHES already account for. Subtract what the app itself attributes to them
     (count x 35 m, its own default) before judging.

     THE DISAGREEMENT WAS LIVE AND THE GUARD'S OWN SUITE NAMED THE CASE: `check:gain-floor-stated`
     pins `wa_liberty_traverse` — 26 pitches over a 2,520 ft rise — as a route that must NOT be
     accused, and this audit was accusing it. Measured across the whole WA catalog, the credit
     removes 26 of 60 findings and adds none; every one it removes is a row where the pitch count
     alone explains the gap.

     IT CANNOT HIDE A FINDING BY MOVING THE HIGH PIN, which is the failure worth guarding against:
     crediting the climb against a rise whose high pin is the BASE of the route would excuse a row
     wrongly, and that is the false-pass direction. Measured before shipping — 0 of the 26 has a
     base-like high pin; every one tops out at a named summit. Re-check that if the endpoint rule
     above ever changes.

     A route with no pitch count subtracts NOTHING, which matches what the app credits it for time,
     and keeps this one-sided: a smaller walk rise can only ever under-report, never accuse a row
     whose gain is fine. */
  const pitches = num(r.pitches);
  const climbFt = (pitches != null && pitches > 0) ? pitches * 35 * 3.28084 : 0;
  const walkRise = rise - climbFt;
  if (walkRise <= 0) continue;
  if (gain >= walkRise - SLACK_FT) continue;

  /* ONE ALTERNATIVE HAD TO DIE FIRST, and it is half true — which is why it is a filter here
     rather than a footnote. `gain_ft` may legitimately be measured not from the trailhead but
     from somewhere higher: a high camp on a multi-day route, or the base of the climb on a rock
     route. Of the 104 routes that fail the raw test, 24 have a WAYPOINT at exactly the
     elevation the stored gain implies — `wa_mount_adams_adams_glacier` stores 5,150 against a
     "High Camp" pin at 7,000 ft, and 12,276 − 5,150 = 7,126. Those are a CONVENTION, not an
     error, and reporting them would be reporting correct data.
     The remaining imply a starting elevation the row records nothing at. Same shape as
     `dist_km` holding one-way and half-round-trip values at once — this column has two readings
     too, and only one of them is wrong.

     AND "RECORDS SOMETHING" MEANS EITHER STORE. Most high camps live in `bivy`, not in
     `waypoints` — they are the same fact filed in the two columns `campSites()` already merges
     for CAMPING & BIVY. Reading waypoints alone overstated this audit by 19 of 80 findings
     (80 -> 61), and the identical blind spot in the app's own `gainBelowOwnPins` was rendering
     a caveat on 12 routes whose gain is correct.

     THE 19 ARE NOT ALL EQUALLY STRONG, and saying so is the honest form. Most name the approach
     camp or the base of the climb outright — "Cutthroat Wall base terrace" on four Cutthroat
     routes, "Boston Basin lower camp" matching to the FOOT, the Goodell Creek roadbed on two
     Pickets routes. A few match a camp on the WRONG SIDE of the same peak: Tahoma Glacier
     (south-west) is excused by Camp Schurman (north-east), 41 ft away. That is a real weakness
     and it belongs to `audit:camp-route-fit`, not here — the camp is filed on a route it does
     not serve, which is the propagated-zone-list shape, and reporting it as an impossible GAIN
     would send somebody to fix the wrong column. Being excused wrongly is a false negative on a
     reading list; being REPORTED wrongly is what teaches people to ignore one. */
  /* THE CONVENTION TEST IS SUMMIT-BASED AND MUST STAY SO, even though the impossibility test
     above now credits the climb. That looks inconsistent and is not: this column holds TWO
     readings, the way `dist_km` holds one-way and half-round-trip at once. A row storing the
     APPROACH gain is what the credit is for; a row storing a CAMP-TO-SUMMIT gain is what this
     test is for, and the audit's own worked example is the second kind —
     `wa_mount_adams_adams_glacier` stores 5,150 against a "High Camp" pin at 7,000 ft, and
     12,276 - 5,150 = 7,126. Subtracting `climbFt` here looks for a camp that much lower and
     stops matching it.
     Measured rather than reasoned: crediting here as well moved TWO routes INTO the findings
     (`wa_colchuck_balanced_rock_west_face`, `wa_mount_terror_southeast_face`) by un-excusing a
     convention they legitimately use, which a credit must never do. */
  const impliedStart = hi.ft - gain;
  const anchored = anchors.some((ft) => Math.abs(ft - impliedStart) <= START_TOL_FT && ft > lo.ft + SLACK_FT);
  if (anchored) { conventionally++; continue; }

  findings.push({
    id: r.id, name: r.name, disc: r.discipline, gain, rise: Math.round(rise), basis,
    shortBy: Math.round(walkRise - gain), distKm: r.dist_km, impliedStart: Math.round(impliedStart),
    pitches: pitches || 0, climbFt: Math.round(climbFt), walkRise: Math.round(walkRise),
    lo: `${lo.w.name} ${Math.round(lo.ft)}ft`, hi: `${hi.w.name} ${Math.round(hi.ft)}ft`,
  });
}

findings.sort((a, b) => b.shortBy - a.shortBy);

/* `--json` must NOT be followed by process.exit(). On a TTY, stdout is synchronous and the exit
   is harmless; on a PIPE it is asynchronous, and exiting truncates whatever has not flushed. The
   first consumer of this flag got valid-looking JSON cut off at a different byte on every run —
   which reads as "this script emits broken JSON" when the output is fine and the exit is the
   bug. Structure the two modes as branches instead, so the process ends on its own. */
if (JSON_OUT) {
  console.log(JSON.stringify(findings, null, 1));
} else {

console.log(`\n=== gain_ft that the route's own waypoints say is impossible ===`);
console.log(`${rows.length} ${STATE.toUpperCase()} routes carry both waypoints and a gain`);
console.log(`  ${noElev} have fewer than two waypoint elevations — nothing to compare, so they are NOT judged`);
console.log(`  ${comparable} comparable`);
console.log(`  ${conventionally} measure their gain from an intermediate point the row RECORDS — a high camp in \`waypoints\` OR in \`bivy\`, or the base of the climb. A convention, not an error`);
console.log(`  ${findings.length} store a gain below their own net rise with NOTHING recorded at the implied start (slack ${SLACK_FT} ft)\n`);
for (const f of findings.slice(0, LIMIT)) {
  console.log(`  short by ${String(f.shortBy).padStart(5)} ft  ${f.id.padEnd(46)} [${String(f.disc).padEnd(7)}]`);
  console.log(`      stores gain_ft ${f.gain}, but ${f.basis} is ${f.rise} ft:  ${f.lo}  ->  ${f.hi}${f.distKm != null ? `   (dist_km ${f.distKm})` : ""}`);
  if (f.climbFt > 0) console.log(`      ${f.pitches} pitches credited as ${f.climbFt} ft of climbing, leaving ${f.walkRise} ft for the walk`);
  console.log(`      that gain would imply starting at ${f.impliedStart} ft, and this route records no waypoint there`);
}
if (findings.length > LIMIT) console.log(`  … ${findings.length - LIMIT} more (raise --limit)`);
console.log(`\nOne-sided by design: too LITTLE gain is impossible, too much is not — a real route rolls`);
console.log(`over intermediate bumps its endpoints cannot see. Report only; nothing was changed.`);

}
