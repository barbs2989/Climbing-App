// Can a route's GPX TRACK settle a trailhead disagreement its own prose cannot?
//
// Five routes are excluded from the batch appliers because both records name the same place and
// nothing on the row says which coordinate is right. A third record would settle them, and each
// route may already carry one: the first point of its gpx track.
//
// THE TRACK IS OFTEN NOT INDEPENDENT, and that is the whole difficulty. Tracks are frequently
// GENERATED from the waypoints — on 4 of 5 Goodell Creek routes the first track point equals the
// pin to the digit — so "the track agrees with the pin" can be one claim counted twice.
// [[probe-trailhead-vs-track-start]]
//
// But that gives a usable test rather than a reason to give up: if the track start is NOT
// digit-identical to the pin, it was not copied from it, and it is then real evidence. So this
// classifies every route rather than reporting a number:
//
//   DERIVED    track start == pin to ~1 m -> circular, NO VOTE
//   VOTES-PIN  independent, and lands nearer the pin
//   VOTES-LOG  independent, and lands nearer the blob
//   AMBIGUOUS  independent, but not decisively nearer either (< 2x ratio)
//   NO TRACK   nothing to ask
//
// Report-only. Nothing here writes.
//   node scripts/oneoff/probe-track-start-as-third-trailhead-record.mjs [id ...]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const ALL = process.argv.includes("--all");
const IDS = process.argv.slice(2).filter(a => !a.startsWith("--"));
const DEFAULTS = [
  "wa_bedal_peak_standard",
  "wa_mount_anderson_eel_glacier",
  "wa_little_big_chief_mountain_northeast_face",
  "wa_northwest_face_4",
  "wa_phantom_peak_south_route",
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

/* --all derives the worklist from the live data rather than from a list pasted out of an audit
   run. That matters here specifically: a parallel session enriching approaches adds new
   disagreements while you work, so an id list is stale the moment it is written. */
async function disagreeing() {
  const rows = await selectAll("routes", "id,waypoints,approach_logistics", "id=like.wa_*",
    { pageSize: 150, key });
  const out = [];
  for (const r of rows) {
    const al = (r.approach_logistics && typeof r.approach_logistics === "object"
      && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
    const w = (Array.isArray(r.waypoints) ? r.waypoints : []).find(x => x
      && String(x.type || "").toLowerCase() === "trailhead" && num(x.lat) !== null && num(x.lng) !== null);
    const lLat = num(al && al.trailheadLat), lLng = num(al && al.trailheadLng);
    if (!w || lLat === null || lLng === null) continue;
    if (hav(num(w.lat), num(w.lng), lLat, lLng) > 500) out.push(r.id);
  }
  return out;
}

const TARGETS_RESOLVED = IDS.length ? IDS : (ALL ? await disagreeing() : DEFAULTS);
if (ALL) console.log(`--all: ${TARGETS_RESOLVED.length} route(s) currently disagree by >500 m\n`);

// gpx has held more than one shape in this catalog, so read defensively rather than assuming.
const firstPoint = g => {
  const arr = Array.isArray(g) ? g : (g && Array.isArray(g.points) ? g.points : null);
  if (!arr || !arr.length) return null;
  const p = arr[0];
  if (Array.isArray(p) && p.length >= 2) {
    const a = num(p[0]), b = num(p[1]);
    return a === null || b === null ? null : { lat: a, lng: b };
  }
  if (p && typeof p === "object") {
    const a = num(p.lat != null ? p.lat : p[1]), b = num(p.lng != null ? p.lng : p.lon);
    return a === null || b === null ? null : { lat: a, lng: b };
  }
  return null;
};

const tally = { "VOTES-PIN": 0, "VOTES-LOG": 0, DERIVED: 0, AMBIGUOUS: 0, "NO TRACK": 0 };
for (const id of TARGETS_RESOLVED) {
  const [r] = await selectAll("routes", "id,name,waypoints,approach_logistics,gpx", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { console.log(`${id}\n   NOT FOUND\n`); continue; }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const w = wps.find(x => x && String(x.type || "").toLowerCase() === "trailhead");
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  const pLat = num(w && w.lat), pLng = num(w && w.lng);
  const lLat = num(al && al.trailheadLat), lLng = num(al && al.trailheadLng);
  const t = firstPoint(r.gpx);

  console.log(`${id}`);
  if (pLat === null || lLat === null) { console.log(`   a record has no coordinate — not a two-record disagreement\n`); continue; }
  const apart = Math.round(hav(pLat, pLng, lLat, lLng));
  console.log(`   pin  "${w.name}" @${pLat},${pLng}`);
  console.log(`   log  "${al.trailhead}" @${lLat},${lLng}   (${apart} m apart)`);
  if (!t) { tally["NO TRACK"]++; console.log(`   NO TRACK — nothing to ask\n`); continue; }

  const dPin = Math.round(hav(t.lat, t.lng, pLat, pLng));
  const dLog = Math.round(hav(t.lat, t.lng, lLat, lLng));
  console.log(`   track start @${t.lat},${t.lng}   ->  ${dPin} m from pin, ${dLog} m from log`);
  if (dPin <= 1) { tally.DERIVED++; console.log(`   DERIVED — the track starts ON the pin, so it is the same claim twice. NO VOTE\n`); continue; }
  const lo = Math.min(dPin, dLog), hi = Math.max(dPin, dLog);
  if (lo === 0 || hi / lo < 2) { tally.AMBIGUOUS++; console.log(`   AMBIGUOUS — independent, but not decisively nearer either\n`); continue; }
  const verdict = dPin < dLog ? "VOTES-PIN" : "VOTES-LOG";
  tally[verdict]++;
  console.log(`   ${verdict} — independent, and ${Math.round(hi / lo)}x nearer\n`);
}
console.log(`-- ${TARGETS_RESOLVED.length} route(s) asked --`);
for (const [k, v] of Object.entries(tally)) console.log(`   ${String(v).padStart(3)}  ${k}`);
console.log("\nReport only; nothing was written. A vote is evidence, not a verdict — read the route's");
console.log("prose before acting on one, and remember a track can start mid-approach rather than at a road.");
