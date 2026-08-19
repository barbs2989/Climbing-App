// A TRAIL CANNOT BE SHORTER THAN THE STRAIGHT LINE. That is the whole audit.
//
// Every waypoint stores a cumulative `distMi` from the trailhead AND a coordinate. Those are
// two independent records of the same journey, and one arrangement of them is IMPOSSIBLE
// rather than merely suspicious: if the stored trail distance to a pin is less than the
// great-circle distance to it, one of the two records is wrong. No prose is needed to know it,
// and no judgement is involved.
//
// Found on wa_mount_cameron_standard, by an agent writing drive directions rather than by any
// guard: Grand Pass is stored at 6 trail miles from the trailhead while its coordinate sits
// 7.5 miles away, and the summit at 9.8 trail miles sits 12.2 miles away. The pin is ~2.5 km
// too far north-west — consistent with marking the START of Obstruction Point Road near
// Hurricane Ridge rather than its end.
//
// NONE OF THE THREE EXISTING WAYPOINT AUDITS CAN SEE THIS, and the reason matters:
//   audit:waypoints        — is each pin on the route's own gpx track?
//   audit:waypoint-track   — the same question, different tolerances and a blame column
//   audit:waypoint-order   — is the LIST sensible (ordering, duplicate pins)?
// All three compare pins against the track or against each other's ORDER. None compares a
// stored distance against the geometry of the two pins it spans. So this needs no gpx, which
// means it also works on the ~40% of routes that have none — and on the 201 WA routes whose
// "track" is just the waypoint list joined up, where the track-based audits are vacuous by
// construction (isSyntheticTrack in lib/track.js).
//
// Read-only, report-only, anon key, fails closed on an empty read. NOT a build gate: this is a
// property of the database, not of the checkout, so no code change can cause or fix it — the
// same reasoning check:counts records.
//
//   node scripts/audit-waypoint-distances.mjs                # whole catalog
//   node scripts/audit-waypoint-distances.mjs --state wa
//   node scripts/audit-waypoint-distances.mjs --list 40
//   node scripts/audit-waypoint-distances.mjs --inject=<case>
import { SUPABASE_URL, headers, anonKey } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 15);
const INJECT = (argv.find(a => a.startsWith("--inject=")) || "").split("=")[1] || null;

// THE TOLERANCE IS THE PRECISION KNOB, and it is deliberately generous. `distMi` is stored to
// one decimal and coordinates to 4-5 places, so a genuinely straight trail can round to a
// hair under its own straight line. Flagging that would manufacture findings on correct data,
// which is how a report-only audit gets ignored — the lesson audit:aspect-name paid for when
// 6 of its first 20 hits were its own parser's fault. A violation must exceed BOTH bars.
const ABS_MI = 0.25;   // absolute slack, comfortably over 0.1mi rounding + ~10m coord precision
const REL = 0.10;      // and at least 10% beyond the stored distance

// A placeholder coordinate is not a measurement. audit:waypoints carries the same guard: a pin
// stored to 3 decimals or fewer is a rounded stand-in, and comparing a real distance against
// it produces confident nonsense.
const COORD_DP = 4;
const dp = (n) => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

function haversineMi(a, b) {
  const R = 3958.7613;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const coordOf = (w) => {
  const lat = Number(w && w.lat), lng = Number(w && w.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.min(dp(lat), dp(lng)) < COORD_DP) return { lat, lng, coarse: true };
  return { lat, lng };
};

async function page(after) {
  const key = anonKey();
  let url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints&waypoints=not.is.null` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") +
    (STATE ? `&id=like.${STATE}_*` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key), signal: AbortSignal.timeout(45000) })
      .catch((e) => ({ ok: false, status: 0, text: async () => String(e.message) }));
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${String(t).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 900 * (a + 1)));
  }
}

const rows = [];
let after = null;
for (;;) {
  const j = await page(after);
  if (!j.length) break;
  rows.push(...j);
  after = j[j.length - 1].id;
  if (rows.length > 250000) break;
}
// FAIL CLOSED. Zero rows makes every route look consistent, so the realistic failure mode of
// this audit is a false pass — the same reasoning check:counts and audit:area-parents record.
if (!rows.length) {
  console.log("FAIL-CLOSED: read zero routes. That is a broken scan, not a clean catalog.");
  process.exit(1);
}

// The fault lives in the DB and this script cannot write, so the injections edit the rows in
// memory on the way past. Each must MOVE THE COUNTER, not merely log.
function inject(list) {
  if (!INJECT) return list;
  const first = list.find(r => Array.isArray(r.waypoints) && r.waypoints.length > 2 &&
    r.waypoints.every(w => coordOf(w) && !coordOf(w).coarse));
  if (!first) { console.log("inject: no suitable row"); process.exit(1); }
  const w = first.waypoints;
  if (INJECT === "shortleg") {
    // The real Cameron defect: stored distances far under the straight line.
    //
    // THE FIRST VERSION OF THIS CASE SET ONLY THE LAST distMi TO 0.1 AND THE COUNTER DID NOT
    // MOVE. It looked like the detector missing an obvious defect; it was the INJECTION being
    // invalid. Shrinking one entry below its predecessor makes the array non-monotonic, and a
    // non-monotonic row is deliberately skipped here because audit:waypoint-order owns it. So
    // the case was handing this audit a row it correctly declines to judge. Scale every
    // distance instead, which keeps travel order intact and makes them all impossible.
    w.forEach((x) => { if (Number.isFinite(Number(x.distMi))) x.distMi = Number(x.distMi) / 20; });
    console.log(`inject shortleg -> ${first.id} all distances divided by 20 (order preserved)`);
  } else if (INJECT === "clean") {
    // Every distance made generously large. MUST report zero — a detector that flags this is
    // flagging the direction that is always physically possible.
    w.forEach((x, i) => { x.distMi = i * 50; });
    console.log(`inject clean -> ${first.id} distances inflated`);
  } else if (INJECT === "coarse") {
    // The SAME impossible distances as `shortleg`, but every pin behind a 2-dp placeholder
    // coordinate. Must report exactly the baseline: a rounded stand-in is not a measurement,
    // so there is nothing here to contradict.
    w.forEach((x, i) => {
      if (Number.isFinite(Number(x.distMi))) x.distMi = Number(x.distMi) / 20;
      if (i === 0) return;
      x.lat = Math.round(x.lat * 100) / 100;
      x.lng = Math.round(x.lng * 100) / 100;
    });
    console.log(`inject coarse -> ${first.id} impossible distances behind 2-dp coordinates`);
  } else if (INJECT === "tie") {
    // Every distance set to EXACTLY its straight line. Physically fine — a dead-straight trail —
    // and inside the tolerance, so it must NOT be reported. Without this case a detector that
    // simply tested `stored < straight` would look correct on `shortleg` and flag half the
    // catalog on rounding alone.
    const a = coordOf(w[0]);
    w.forEach((x, i) => {
      if (i === 0 || !Number.isFinite(Number(x.distMi))) return;
      const b = coordOf(x);
      if (b) x.distMi = Math.round(haversineMi(a, b) * 10) / 10;
    });
    console.log(`inject tie -> ${first.id} every distance set exactly to its straight line`);
  } else { console.log(`unknown --inject=${INJECT}`); process.exit(1); }
  return list;
}

const t = { rows: 0, measurable: 0, skipNoCoord: 0, skipCoarse: 0, skipNoDist: 0, skipZero: 0,
  skipNonMono: 0, pairs: 0, bad: 0, routes: 0, legOnly: 0 };
const findings = [];

for (const r of inject(rows)) {
  t.rows++;
  const w = r.waypoints;
  if (!Array.isArray(w) || w.length < 2) continue;

  const pts = w.map(coordOf);
  const d = w.map((x) => (x && x.distMi != null ? Number(x.distMi) : null));

  if (!pts[0] || pts[0].coarse) { t.skipNoCoord++; continue; }
  if (d[0] == null || Number(d[0]) !== 0) {
    // distMi is cumulative FROM the trailhead, so index 0 is 0. A row that does not start at 0
    // is using some other convention and this audit has nothing to say about it — measuring it
    // anyway would report a units mismatch as a coordinate defect.
    t.skipNoDist++; continue;
  }
  let mono = true;
  for (let i = 1; i < d.length; i++) {
    if (d[i] == null || !Number.isFinite(d[i])) continue;
    const prev = d.slice(0, i).filter((x) => Number.isFinite(x)).pop();
    if (prev != null && d[i] < prev) { mono = false; break; }
  }
  // A non-monotonic list is out of travel order, which audit:waypoint-order already reports.
  // Reading it as a distance defect would blame the wrong record.
  if (!mono) { t.skipNonMono++; continue; }

  t.measurable++;
  const hits = [];
  for (let i = 1; i < w.length; i++) {
    if (!Number.isFinite(d[i])) continue;
    // A ZERO IS AN UNFILLED FIELD, NOT A ZERO-MILE TRAIL, and treating it as a measurement is
    // what the first run of this script did: its three worst "findings" were summits stored at
    // distMi 0 sitting 8-14 miles away, i.e. rows where nobody recorded the distances at all.
    // That is a coverage gap and a different report; counting it here buries the real pin
    // defects under it. Same fail-open coercion the repo records for `+distKm||0` making "no
    // approach data" and "a zero approach" identical.
    if (d[i] === 0) { t.skipZero++; continue; }
    if (!pts[i]) { t.skipNoCoord++; continue; }
    if (pts[i].coarse) { t.skipCoarse++; continue; }
    t.pairs++;
    // TWO COMPARISONS, AND THE SECOND IS STRICTLY MORE SENSITIVE. From the trailhead catches a
    // displaced index 0 and a pin belonging to another route. But a LEG can be impossible while
    // the cumulative total is comfortable — Mount Appleton stores its pass at 7.3 mi and its
    // summit at 8.0, a 0.7 mi leg between two pins 0.96 mi apart, and both totals clear the
    // trailhead test easily. Found by an agent reading one row, not by the first version of
    // this script. Report whichever contradiction is larger.
    const fromTh = haversineMi(pts[0], pts[i]) - d[i];
    let leg = -Infinity, legFrom = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (!Number.isFinite(d[j]) || (j > 0 && d[j] === 0) || !pts[j] || pts[j].coarse) continue;
      leg = haversineMi(pts[j], pts[i]) - (d[i] - d[j]);
      legFrom = j;
      break;
    }
    const useLeg = leg > fromTh;
    const straight = useLeg ? haversineMi(pts[legFrom], pts[i]) : haversineMi(pts[0], pts[i]);
    const stored = useLeg ? d[i] - d[legFrom] : d[i];
    const short = useLeg ? leg : fromTh;
    if (short > ABS_MI && short > Math.max(stored, 0) * REL) {
      t.bad++;
      if (useLeg) t.legOnly += fromTh > ABS_MI ? 0 : 1;
      hits.push({ i, name: w[i].name || "", type: w[i].type || "", stored, straight, short,
        from: useLeg ? legFrom : 0, fromName: useLeg ? (w[legFrom].name || `#${legFrom + 1}`) : "the trailhead" });
    }
  }
  if (hits.length) {
    t.routes++;
    // Report the WORST pin per route, with the count. One misplaced trailhead makes every pin
    // downstream of it look wrong, so listing all of them buries the routes with a single bad
    // pin under the ones with a single bad ORIGIN.
    hits.sort((a, b) => b.short - a.short);
    findings.push({ id: r.id, name: r.name, n: hits.length, of: w.length - 1, worst: hits[0] });
  }
}

console.log(`routes read                     : ${t.rows}${STATE ? ` (state=${STATE})` : ""}`);
console.log(`  measurable (cumulative distMi): ${t.measurable}`);
console.log(`  skipped, no usable coordinate : ${t.skipNoCoord}`);
console.log(`  skipped, placeholder coord    : ${t.skipCoarse}`);
console.log(`  skipped, no/!=0 distMi at [0] : ${t.skipNoDist}`);
console.log(`  skipped, distMi 0 = unrecorded : ${t.skipZero}`);
console.log(`  skipped, out of travel order  : ${t.skipNonMono}  (audit:waypoint-order owns these)`);
console.log(`  waypoint pairs compared       : ${t.pairs}`);
console.log(`\nIMPOSSIBLE: stored trail distance is SHORTER than the straight line`);
console.log(`  pins   : ${t.bad}`);
console.log(`  routes : ${t.routes}\n`);

findings.sort((a, b) => b.worst.short - a.worst.short);
for (const f of findings.slice(0, LIST)) {
  const wst = f.worst;
  console.log(`${f.id}`);
  console.log(`   ${f.n} of ${f.of} pins impossible; worst is #${wst.i + 1} ${wst.type ? `[${wst.type}] ` : ""}${wst.name}`);
  console.log(`   stored ${wst.stored.toFixed(1)} mi of trail from ${wst.fromName}, but the two coordinates are ${wst.straight.toFixed(1)} mi apart — short by ${wst.short.toFixed(1)} mi`);
}
if (findings.length > LIST) console.log(`\n… ${findings.length - LIST} more (use --list ${findings.length})`);

// WHICH RECORD IS WRONG IS NOT DECIDABLE HERE, and saying so is the point. The contradiction
// is certain; the repair direction is not. A pin can be misplaced, or the distance can be a
// leg mistaken for a cumulative total, or the route can store one approach's mileage against
// another's pins. Read the row before touching either half — the same rule audit:aspect-name
// records after its first reported repair turned out to be backwards.
if (findings.length) {
  console.log(`\nThe CONTRADICTION is certain; WHICH half is wrong is not. A pin may be misplaced,`);
  console.log(`or a leg distance may have been stored where a cumulative one belongs. Read the row.`);
  console.log(`A whole route flagged on every pin usually means waypoint[0] itself is the bad one,`);
  console.log(`and a SHRINKING shortfall up the list is that signature: on wa_mount_rahm_standard the`);
  console.log(`gap runs 3.6, 2.0, 1.3, 0.6, 0.2 mi, which is one displaced origin rather than five`);
  console.log(`bad distances. A shortfall confined to one leg points at that pin instead.`);
}
process.exit(0);

// Injection cases (the fault lives in the DB, so --inject edits rows in memory):
//   --inject=shortleg  a stored distance far under the straight line     -> MUST report it
//   --inject=clean     every distance inflated                           -> MUST report zero
//   --inject=coarse    short distance behind a 2-dp placeholder coord    -> MUST skip, not flag
//   --inject=tie       distance exactly equal to the straight line       -> MUST NOT flag
// `clean` and `tie` must PASS. A detector that fires on them is flagging the direction that is
// always physically possible, which is every correct route in the catalog.
