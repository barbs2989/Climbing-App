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
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const STATE = arg("state", "wa");
const MIN_M = Number(arg("min", 500));
const key = requireServiceKey();

/* `+null` is 0 and `Number.isFinite(0)` is true, so a guard written as `Number.isFinite(+x.lat)`
   silently promotes a MISSING coordinate to the equator. The first draft did exactly that and
   invented three findings 12,000 km wide — off-Africa null-island pins that do not exist; every
   coordinate in the catalog is either real or null. Test for null BEFORE coercing.
   [[fail-open-coercion-hides-missing-data]], walked into by a script written to find that class. */
const num = v => (v === null || v === undefined || v === "" ? null
  : Number.isFinite(+v) ? +v : null);

const R = Math.PI / 180;
const hav = (aLat, aLng, bLat, bLng) => {
  const dLat = (bLat - aLat) * R, dLng = (bLng - aLng) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * R) * Math.cos(bLat * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
};

/* Two heavy jsonb columns on one read: 400 rows/page trips the statement timeout intermittently.
   150 is measured to stay under it. */
const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics",
  `id=like.${STATE}_*`, { pageSize: 150, key });
if (!rows.length) { console.error("read 0 routes — refusing to report"); process.exit(1); }

/* Name comparison is deliberately loose and is NEVER the finding on its own — it only labels a
   coordinate disagreement. Two correct records routinely word one trailhead differently
   ("Blue Lake TH" vs "Blue Lake Trailhead (SR-20)"), so a name diff is not evidence of anything. */
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\b(trailhead|th|trail|parking|lot|pullout|the|sr|20|fr|fs)\b/g, " ")
  .replace(/\s+/g, " ").trim();

let both = 0, agree = 0, shadowed = 0;
const findings = [], dists = [], shadows = [];
for (const r of rows) {
  const al = (r.approach_logistics && typeof r.approach_logistics === "object"
    && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  const lLat = al ? num(al.trailheadLat) : null, lLng = al ? num(al.trailheadLng) : null;
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  /* The app's reader picks the trailhead by TYPE ALONE and only then tests the coordinate, so a
     typed-but-uncoordinated pin short-circuits the `||` chain and hides a usable
     approach_logistics coordinate sitting on the same row. Count that separately — it is a
     reader defect, not a disagreement. */
  const typed = wps.find(x => x && String(x.type || "").toLowerCase() === "trailhead");
  const w = wps.find(x => x && String(x.type || "").toLowerCase() === "trailhead"
    && num(x.lat) !== null && num(x.lng) !== null);
  if (typed && !w && lLat !== null && lLng !== null) {
    shadowed++;
    if (shadows.length < 12) shadows.push({ id: r.id, pin: typed.name, log: al.trailhead, lLat, lLng });
  }
  if (lLat === null || lLng === null || !w) continue;
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

console.log(`-- SHADOWED: ${shadowed} routes carry a Trailhead pin with NO coordinate while --`);
console.log(`   approach_logistics holds a usable one. RouteDetail picks the pin by type alone,`);
console.log(`   so the "Directions to trailhead" button finds it, fails its own lat!=null test,`);
console.log(`   and returns null — the good coordinate beside it is never reached.`);
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
