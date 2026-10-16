// A trailhead pin has a SECOND copy of itself on the same row, and nothing ever compared them.
//
// `routes.approach_logistics` is a jsonb blob carrying `trailhead`, `trailheadLat`, `trailheadLng`
// and `trailheadDirection`. `routes.waypoints[]` separately carries a `type:"Trailhead"` entry with
// its own name and coordinate. They are written by different enrichment passes and neither reads
// the other, so where they disagree, one of them is wrong on a row that looks complete.
//
// WHY THIS BEATS THE MAJORITY VOTE. probe-trailhead-consensus.mjs compares a pin against OTHER
// ROUTES that name the same trailhead. That is a hypothesis, and it has now been wrong four times
// — the Alpental/Rainier "Snow Lake" pair, Esmeralda, Goodell Creek, and wa_early_winter_couloir,
// whose own prose says the consensus trailhead is "the wrong side of the mountain for this route".
// This test never leaves the row, so a route with a legitimately unusual start cannot be outvoted
// by its neighbours.
//
// It is also not circular the way the gpx track start is. A track is frequently GENERATED from the
// waypoints — on 4 of 5 Goodell Creek routes the first track point equals the pin to the digit —
// so the track agreeing with the pin is one claim counted twice
// ([[probe-trailhead-vs-track-start]]). approach_logistics is prose-derived and independent.
//
// Read-only, reports only. node scripts/oneoff/probe-trailhead-vs-logistics.mjs [--state=wa] [--min=500]
import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const STATE = arg("state", "wa");
const MIN_M = Number(arg("min", 500));
const key = requireServiceKey();

/* `+null` is 0 and `Number.isFinite(0)` is true, so a guard written as `Number.isFinite(+x.lat)`
   silently promotes a MISSING coordinate to the equator. The first draft did exactly that and
   invented three findings 12,000 km wide — off-Africa null-island pins that do not exist; every
   coordinate in the catalog is either real or null. Test for null BEFORE coercing.
   [[fail-open-coercion-hides-missing-data]], walked into by a script written to find that class. */
/* This is a SECOND placement predicate — the app has wpPlaced(). Deliberately not imported: an
   audit is a second opinion about the data, and one that shares the app's function agrees with it
   by construction. But two implementations of one rule is how this repo got four grade parsers and
   a tenth placement test, so the equivalence is MEASURED rather than assumed —
   scripts/oneoff/probe-audit-placement-gate-equivalence.mjs lifts wpPlaced() and compares the two
   over the shapes contributed rows actually store ("", " ", [], false, a bare lat). 16/16 today. */
const num = v => (v === null || v === undefined || v === "" ? null
  : Number.isFinite(+v) ? +v : null);

const R = Math.PI / 180;
const hav = (aLat, aLng, bLat, bLng) => {
  const dLat = (bLat - aLat) * R, dLng = (bLng - aLng) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * R) * Math.cos(bLat * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
};

/* Two heavy jsonb columns over 8k rows: 57014 here is intermittent and MOVES BETWEEN RUNS, so it
   is contention rather than a page size to tune down — this audit died twice on 2026-08-13 before
   it had retries. Retries are PRINTED, because absorbing one silently turns a measurable flake
   into an invisible one. Same reasoning check:field-renders records.

   It uses the SERVICE key only because the anon role's 3s statement_timeout cannot complete this
   read; it issues no write of any kind, and there is no code path here that could. */
const withRetry = async (label, fn, tries = 5) => {
  for (let i = 1; i <= tries; i++) {
    try {
      const v = await fn();
      if (i > 1) console.log(`(${label} succeeded on attempt ${i})`);
      return v;
    } catch (e) {
      if (i === tries) throw e;
      console.log(`(${label} attempt ${i} failed: ${String(e.message).slice(0, 90)} — retrying)`);
      await new Promise(r => setTimeout(r, 800 * 2 ** (i - 1)));
    }
  }
};
const rows = await withRetry("routes", () => selectAll("routes",
  "id,name,area_id,waypoints,approach_logistics", `id=like.${STATE}_*`, { pageSize: 150, key }));
if (!rows.length) { console.error("read 0 routes — refusing to report"); process.exit(1); }

/* Name comparison is deliberately loose and is NEVER the finding on its own — it only labels a
   coordinate disagreement. Two correct records routinely word one trailhead differently
   ("Blue Lake TH" vs "Blue Lake Trailhead (SR-20)"), so a name diff is not evidence of anything. */
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\b(trailhead|th|trail|parking|lot|pullout|the|sr|20|fr|fs)\b/g, " ")
  .replace(/\s+/g, " ").trim();

let both = 0, agree = 0, shadowed = 0;
/* WHAT THIS AUDIT CANNOT SEE, COUNTED RATHER THAN DROPPED. The comparison needs a coordinate on
   BOTH sides, so every row missing one silently left the run and the headline percentage was a
   share of a denominator nobody stated. Measured 2026-08-19: 176 WA rows carry a trailhead NAME in
   approach_logistics with no coordinate beside it, against the 14 the defect index had recorded —
   23% of every row that carries a direction at all. An unstated denominator reads as a guarantee
   ([[when-an-audit-reports-zero-ask-its-denominator]]), and overstated coverage is the false-pass
   direction, so these are now reported as their own class.

   They split by whether the row has ANY trailhead position, because the two are different states:
   a row whose PIN still has a coordinate knows where it starts, while a row with neither does not
   and needs research. NEITHER is repaired by copying one record into the other — this audit's only
   value is that the two were written by passes that never read each other, and a copy retires that
   evidence while reporting a 0 m agreement it did not earn.
   [[do-not-create-a-trailhead-pin-from-the-logistics-copy]]

   The positionless bucket is decided by pin TYPE, while trailheadPoint() has a THIRD branch this
   does not model — a placed waypoint whose NAME matches /trailhead|parking/, whatever its type. So
   the bucket COULD have been calling rows positionless that the app resolves anyway. Measured
   rather than argued (probe-audit-vs-app-trailhead-resolution.mjs): 0 of the 10 resolve, so the
   phrase "need research" is earned. Re-run it if that branch changes — a negative result here is
   a fact about today's data, not a property of the test. */
let logNoCoord = 0, logNoCoordPinHas = 0, noPositionAtAll = 0;
const findings = [], dists = [], shadows = [];
for (const r of rows) {
  const al = (r.approach_logistics && typeof r.approach_logistics === "object"
    && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  const lLat = al ? num(al.trailheadLat) : null, lLng = al ? num(al.trailheadLng) : null;
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  /* A pin TYPED Trailhead with no coordinate beside a usable logistics one. This was a reader
     defect when the audit was written — the pin short-circuited the chain and hid the good
     coordinate — and is not one now: wpPlaced() gates every branch of trailheadPoint(). Still
     counted separately, because it is not a DISAGREEMENT either: the two records name two
     different places and only one of them has a position. See the SHADOWED block below. */
  const typed = wps.find(x => x && String(x.type || "").toLowerCase() === "trailhead");
  const w = wps.find(x => x && String(x.type || "").toLowerCase() === "trailhead"
    && num(x.lat) !== null && num(x.lng) !== null);
  if (typed && !w && lLat !== null && lLng !== null) {
    shadowed++;
    if (shadows.length < 12) shadows.push({ id: r.id, pin: typed.name, log: al.trailhead, lLat, lLng });
  }
  if (lLat === null || lLng === null || !w) {
    /* Count the miss before dropping it. `al.trailhead` is the NAME, so a row that names a
       trailhead and cannot place it is the class that hides from this audit entirely. */
    if (al && String(al.trailhead || "").trim() && (lLat === null || lLng === null)) {
      logNoCoord++;
      if (w) logNoCoordPinHas++; else noPositionAtAll++;
    }
    continue;
  }
  both++;
  const d = Math.round(hav(num(w.lat), num(w.lng), lLat, lLng));
  dists.push(d);
  if (d <= MIN_M) { agree++; continue; }
  findings.push({ id: r.id, area: r.area_id, d,
    pinName: w.name, pinLat: num(w.lat), pinLng: num(w.lng),
    logName: al.trailhead, logLat: lLat, logLng: lLng,
    nameDiffers: norm(w.name) !== norm(al.trailhead),
    dir: String(al.trailheadDirection || "").replace(/\s+/g, " ") });
}

const pct = (n, d) => d ? `${((n / d) * 100).toFixed(1)}%` : "n/a";
const sorted = [...dists].sort((a, b) => a - b);
const q = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
console.log(`${STATE}: ${rows.length} routes · ${both} carry BOTH a trailhead pin and approach_logistics coords`);
console.log(`agree within ${MIN_M} m: ${agree} (${pct(agree, both)})   disagree: ${findings.length}`);
console.log(`separation: p50 ${q(0.5)} m · p90 ${q(0.9)} m · p95 ${q(0.95)} m · max ${q(1)} m\n`);

console.log(`-- NOT COMPARABLE: ${logNoCoord} routes NAME a trailhead in approach_logistics but --`);
console.log(`   store no coordinate for it, so they never enter the ${both} above. This audit is`);
console.log(`   silent about them by construction — it compares two coordinates, and one is absent.`);
console.log(`   ${logNoCoordPinHas} of them still carry a coordinate on the waypoint pin, so the row is not`);
console.log(`   positionless — but do NOT copy it across to "reconcile" them. These two records are`);
console.log(`   worth comparing only while they are INDEPENDENT, and a copy agrees by construction:`);
console.log(`   it would move ${logNoCoordPinHas} rows into the agreeing column having checked nothing.`);
console.log(`   The other ${noPositionAtAll} carry NO trailhead position at all and need research, not repair.`);
console.log(`   Read the agreement percentage above against ${both}, not ${rows.length}.\n`);

/* THIS BLOCK USED TO ASSERT THE BUTTON WAS BROKEN, AND IT WAS TRUE WHEN WRITTEN. #1183 swept nine
   placement tests into wpPlaced(); #1213/#1215/#1222 put it on EVERY branch of trailheadPoint(),
   so an uncoordinated pin no longer short-circuits the chain — it falls through to the logistics
   copy, the button drives there, and the map draws that point dashed as derived. Verified against
   the live row by scripts/oneoff/probe-shadowed-trailhead-button.mjs rather than by reading the
   source. An audit still asserting something it no longer has evidence for gives WRONG ADVICE, and
   here the advice pointed at a fabrication. [[semantic-invariants-need-a-script]] */
console.log(`-- SHADOWED: ${shadowed} routes carry a Trailhead pin with NO coordinate while --`);
console.log(`   approach_logistics holds a usable one. NOT A DEFECT — trailheadPoint() falls`);
console.log(`   through to the logistics coordinate, so the button drives there and the map draws`);
console.log(`   it dashed. Reported because the two records name DIFFERENT PLACES on one row.`);
console.log(`   Do NOT "close" it by copying that coordinate onto the pin: it would invent a`);
console.log(`   position nothing published, and a record and a copy of itself always agree.`);
for (const s of shadows) console.log(`   ${s.id}\n      pin "${s.pin}" (no coords)  ->  log "${s.log}" @${s.lLat},${s.lLng}`);
console.log("");

findings.sort((a, b) => b.d - a.d);
const named = findings.filter(f => f.nameDiffers);
console.log(`-- of the disagreements, ${named.length} also give the trailhead a DIFFERENT NAME --`);
console.log(`   (those are the strongest: two records naming two different places, on one row)\n`);
for (const f of findings) {
  console.log(`${String(f.d).padStart(6)} m  ${f.id}${f.nameDiffers ? "   [NAME DIFFERS]" : ""}`);
  console.log(`         pin  "${f.pinName}" @${f.pinLat},${f.pinLng}`);
  console.log(`         log  "${f.logName}" @${f.logLat},${f.logLng}`);
  if (f.nameDiffers && f.dir) console.log(`         dir  ${f.dir.slice(0, 130)}`);
}
console.log(`\nNothing was written. A disagreement says one of the two is wrong, NOT which — read the`);
console.log(`route's approach prose to decide. approach_logistics is prose-derived, so it is usually`);
console.log(`the better record, but that is a tendency and not a rule.`);
