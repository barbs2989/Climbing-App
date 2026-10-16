// How many routes does the waypoint ORDERING guarantee actually apply to?
//
// `orderWaypoints` sorts by distMi — but only if EVERY waypoint has a finite numeric distMi;
// otherwise it returns the list untouched. So for a route missing one distance the app renders
// the STORED order, however wrong, and `audit:waypoint-order` reports "0 out of order" for it
// by construction. A guarantee that silently does not apply is the vacuous-pass shape this
// repo keeps meeting: the audit's clean answer is about the routes it can see, not the catalog.
//
// This measures the size of the hole and then asks what is actually sitting inside it, since
// "the check cannot see these" is only interesting if some of them are wrong.
//
// A Summit pin that is not last is NOT automatically a defect — a descent leg legitimately adds
// hazards and junctions after the top, and a loop returns to the trailhead. What cannot be
// justified is a summit reached BEFORE the approach markers: you do not pass a trail junction
// on the way in after having already topped out.
//
//   node scripts/oneoff/probe-waypoint-order-coverage.mjs [--state wa] [--list 25]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { dedupeWaypoints } from "../../lib/waypoints.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const LIST = +arg("--list", 25);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,waypoints` +
    `&waypoints=not.is.null` + (STATE ? `&id=like.${STATE}_*` : "") +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 900 * (a + 1)));
  }
}

const rows = [];
for (let after = null; ;) {
  const p = await page(after);
  if (!p.length) break;
  rows.push(...p);
  if (p.length < 1000) break;
  after = p[p.length - 1].id;
}
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

const typeOf = w => String((w && w.type) || "?").toLowerCase();
const isSummit = w => /summit|topout|top out|high ?point/.test(typeOf(w));
const isTrailhead = w => /trailhead|parking|car/.test(typeOf(w));
// Markers you pass on the WAY IN. A hazard or campsite can legitimately follow the summit on
// the descent; a trail junction or water source before the top cannot follow it.
const isApproachMarker = w => /junction|water|trailhead|parking/.test(typeOf(w));

let sortable = 0, unsortable = 0, tooShort = 0;
const findings = [];
for (const r of rows) {
  const wps = dedupeWaypoints(Array.isArray(r.waypoints) ? r.waypoints : []);
  if (wps.length < 2) { tooShort++; continue; }
  const all = wps.every(w => w && typeof w === "object" && typeof w.distMi === "number" && Number.isFinite(w.distMi));
  if (all) { sortable++; continue; }
  unsortable++;

  const si = wps.findIndex(isSummit);
  if (si < 0) continue;
  const after = wps.slice(si + 1);
  const approachAfterSummit = after.filter(isApproachMarker);
  // A loop legitimately ends back at the trailhead, so a SINGLE trailhead as the very last pin
  // is not evidence. Anything else after the top that you only meet walking in, is.
  const lastIsTrailhead = after.length === 1 && isTrailhead(after[0]);
  if (!approachAfterSummit.length || lastIsTrailhead) continue;

  // A DESCENT route legitimately starts at the summit — Forbidden's East Ledges is the
  // standard way down, so Summit -> ledges -> gully -> basin is the correct reading order and
  // flagging it would be the guard manufacturing a finding. Judge by what the pins AFTER the
  // summit are called, not by the route's name, since a descent line is rarely named one.
  const DESCENT = /descen|rappel|rap\b|down|return|back to|exit|egress|walk[- ]?off|retreat/i;
  const descentish = after.filter(w => DESCENT.test(`${w.type || ""} ${w.name || ""}`)).length;
  const kind = descentish >= Math.ceil(after.length / 2) ? "descent-sequence" : "approach-after-summit";

  findings.push({ kind, id: r.id, name: r.name, discipline: r.discipline,
    summitAt: si + 1, of: wps.length,
    seq: wps.map(w => (w.type || "?")).join(","),
    offenders: approachAfterSummit.map(w => `${w.type}${w.name ? ` (${String(w.name).slice(0, 40)})` : ""}`),
    dists: wps.map(w => (w.distMi == null ? "-" : w.distMi)).join(","),
  });
}

const real = findings.filter(f => f.kind === "approach-after-summit");
const descents = findings.filter(f => f.kind === "descent-sequence");

real.sort((a, b) => (a.summitAt - b.summitAt) || (b.of - a.of));
for (const f of real.slice(0, LIST)) {
  console.log(`\n── ${f.name}  (${f.id})  [${f.discipline}]  summit is pin ${f.summitAt} of ${f.of}`);
  console.log(`   types: ${f.seq}`);
  console.log(`   distMi: ${f.dists}`);
  console.log(`   approach markers listed AFTER the summit: ${f.offenders.join("  |  ")}`);
}
if (real.length > LIST) console.log(`\n… ${real.length - LIST} more (raise --list)`);

console.log(`\n${rows.length} ${STATE} routes carry waypoints`);
console.log(`  ${sortable} have distMi on every pin — orderWaypoints CAN sort them`);
console.log(`  ${unsortable} do not — the app renders their STORED order and the audit reports them as in-order by construction`);
console.log(`  ${tooShort} have fewer than 2 pins`);
console.log(`\n${findings.length} of the ${unsortable} unsortable routes list an approach marker AFTER the summit:`);
console.log(`  ${real.length} look like a genuine ordering defect`);
console.log(`  ${descents.length} read as a DESCENT sequence, where summit-first is correct — not findings`);
for (const d of descents.slice(0, 8)) console.log(`      ${d.id} — ${d.seq}`);
console.log("Report only — nothing was changed.");
