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
// Read-only, anon key, fails closed on an empty read. NOT a build gate — a property of the DB, not
// the checkout, so no code change can cause or fix it; same reasoning as check:counts.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

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
  const sel = "id,name,area_id,discipline,gain_ft,dist_km,waypoints,high_point_ft";
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

const rows = await readAll();
if (!rows.length) { console.error(`FAIL — read 0 routes for state "${STATE}". That is a broken query, not a clean catalog.`); process.exit(1); }

let comparable = 0, noElev = 0, conventionally = 0;
const findings = [];
for (const r of rows) {
  const wps = (r.waypoints || []).filter(Boolean);
  const withElev = wps.map((w) => ({ w, ft: elevFt(w) })).filter((x) => x.ft != null);
  if (withElev.length < 2) { noElev++; continue; }

  /* Prefer the NAMED endpoints — a trailhead-to-summit rise is the claim `gain_ft` is making.
     Falling back to min/max across all waypoints is weaker but still a lower bound on the climb,
     and it keeps routes that label their pins unusually from dropping out of the audit. */
  const th = withElev.find((x) => /trailhead/i.test(String(x.w.type || "")));
  const sum = withElev.find((x) => /summit|topout/i.test(String(x.w.type || "")));
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
  if (gain >= rise - SLACK_FT) continue;

  /* ONE ALTERNATIVE HAD TO DIE FIRST, and it is half true — which is why it is a filter here
     rather than a footnote. `gain_ft` may legitimately be measured not from the trailhead but
     from somewhere higher: a high camp on a multi-day route, or the base of the climb on a rock
     route. Measured over the 112 routes that fail the raw test, 24 have a waypoint at exactly the
     elevation the stored gain implies — `wa_mount_adams_adams_glacier` stores 5,150 against a
     "High Camp" pin at 7,000 ft, and 12,276 − 5,150 = 7,126. Those are a CONVENTION, not an
     error, and reporting them would be reporting correct data.
     The remaining 88 imply a starting elevation the row records nothing at. Same shape as
     `dist_km` holding one-way and half-round-trip values at once — this column has two readings
     too, and only one of them is wrong. */
  const impliedStart = hi.ft - gain;
  const anchored = withElev.some((x) => Math.abs(x.ft - impliedStart) <= START_TOL_FT && x.ft > lo.ft + SLACK_FT);
  if (anchored) { conventionally++; continue; }

  findings.push({
    id: r.id, name: r.name, disc: r.discipline, gain, rise: Math.round(rise), basis,
    shortBy: Math.round(rise - gain), distKm: r.dist_km, impliedStart: Math.round(impliedStart),
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
console.log(`  ${conventionally} measure their gain from an intermediate point the row RECORDS (high camp, base of the climb) — a convention, not an error`);
console.log(`  ${findings.length} store a gain below their own net rise with NOTHING recorded at the implied start (slack ${SLACK_FT} ft)\n`);
for (const f of findings.slice(0, LIMIT)) {
  console.log(`  short by ${String(f.shortBy).padStart(5)} ft  ${f.id.padEnd(46)} [${String(f.disc).padEnd(7)}]`);
  console.log(`      stores gain_ft ${f.gain}, but ${f.basis} is ${f.rise} ft:  ${f.lo}  ->  ${f.hi}${f.distKm != null ? `   (dist_km ${f.distKm})` : ""}`);
  console.log(`      that gain would imply starting at ${f.impliedStart} ft, and this route records no waypoint there`);
}
if (findings.length > LIMIT) console.log(`  … ${findings.length - LIMIT} more (raise --limit)`);
console.log(`\nOne-sided by design: too LITTLE gain is impossible, too much is not — a real route rolls`);
console.log(`over intermediate bumps its endpoints cannot see. Report only; nothing was changed.`);

}
