// 23 WA routes NAME a trailhead and carry no coordinate for it. That is not a clean row — every
// trailhead audit (agreement, road-agreement, and all three waypoint audits) needs a coordinate, so
// these are rows nothing has ever been able to examine. They were found while measuring the
// legacy-id blind spot: `adams_avalanche_glacier` reported "only ONE record — nothing to compare".
//
// Ten of them name a trailhead that ANOTHER route already holds a coordinate for, so they can be
// filled by COPYING. This does that and nothing else; the twelve with no donor need research and
// are listed at the bottom rather than guessed at.
//
// DECLARE A WINNER, NEVER A COORDINATE. The donor is looked up at run time by matching the
// trailhead NAME, and its coordinate is copied verbatim. No coordinate is typed into this file, so
// a fix needing a value nothing in the catalog holds cannot be expressed here at all — the same
// structural guarantee the trailhead and road appliers use.
//
// MATCHING IS ON THE DISTINCTIVE WORDS. "Trailhead", "campground", "road", "pullout" and the like
// are shared by half the catalog and would match unrelated places, so they are dropped before
// comparing. And a donor SET THAT DISAGREES WITH ITSELF settles nothing: if the donors for one name
// are spread more than 500 m apart the route is skipped, not filled with whichever came first.
// `wa_booker_mountain_northeast_face` is exactly that case — two donors 524 m apart.
//
// BOTH RECORDS ARE WRITTEN where both exist. A one-sided repair creates the very disagreement
// audit:trailhead-agreement exists to find, and the next pass would then "resolve" it in whichever
// direction its plan happened to say.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };
const STOP = new Set(["trailhead", "th", "campground", "camp", "road", "rd", "trail", "the", "and", "to",
  "from", "off", "via", "end", "spur", "pullout", "parking", "lot", "area", "access", "no", "separate"]);
const nameKey = s => [...new Set(String(s || "").toLowerCase().match(/[a-z]{3,}/g) || [])].filter(t => !STOP.has(t)).sort().join(" ");

const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics", "", { pageSize: 1000, key });
if (!rows.length) { console.error("read 0 routes — refusing"); process.exit(1); }
const areas = new Map((await selectAll("areas", "id,path", "", { pageSize: 1000, key })).map(a => [a.id, a]));
// Segment, not substring: `path.includes("washington")` also matches Washington Column (Yosemite)
// and Washington State Park (Missouri).
const inWa = r => { const a = areas.get(r.area_id); return a && String(a.path || "").split(".").includes("washington"); };

const thOf = r => {
  const al = r.approach_logistics || {};
  const w = (Array.isArray(r.waypoints) ? r.waypoints : []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  return { al, w, name: al.trailhead || (w && w.name),
    lat: num(al.trailheadLat) ?? (w ? num(w.lat) : null), lng: num(al.trailheadLng) ?? (w ? num(w.lng) : null) };
};

const donors = new Map(), needy = [];
for (const r of rows) {
  if (!inWa(r)) continue;
  const t = thOf(r);
  if (!t.name) continue;
  const k = nameKey(t.name);
  if (!k) continue;
  if (t.lat !== null && t.lng !== null) { if (!donors.has(k)) donors.set(k, []); donors.get(k).push({ id: r.id, lat: t.lat, lng: t.lng }); }
  else needy.push({ r, t, k });
}
console.log(`${needy.length} WA route(s) name a trailhead with no coordinate\n`);

let wrote = 0, skipped = 0;
const noDonor = [];
for (const n of needy) {
  const d = donors.get(n.k) || [];
  if (!d.length) { noDonor.push(n); continue; }
  let spread = 0;
  for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) spread = Math.max(spread, hav(d[i].lat, d[i].lng, d[j].lat, d[j].lng));
  if (spread > 500) {
    console.log(`SKIP  ${n.r.id}  "${n.t.name}" — its ${d.length} donors disagree by ${Math.round(spread)} m, so they settle nothing`);
    skipped++; continue;
  }
  const src = d[0];
  const body = {};
  // approach_logistics: fill the pair, leave every other key alone.
  if (n.t.al && typeof n.t.al === "object" && n.t.al.trailhead) {
    body.approach_logistics = { ...n.t.al, trailheadLat: src.lat, trailheadLng: src.lng };
  }
  // waypoints: fill the existing Trailhead pin's coordinate. Deliberately does NOT ADD a waypoint —
  // creating a pin is a different decision from completing one, and would change the pin count that
  // audit:waypoint-order reads.
  if (n.t.w) {
    body.waypoints = n.r.waypoints.map(w => (w === n.t.w ? { ...w, lat: src.lat, lng: src.lng } : w));
  }
  if (!Object.keys(body).length) { console.log(`SKIP  ${n.r.id} — no writable record`); skipped++; continue; }

  console.log(`FILL  ${n.r.id.padEnd(44)} "${String(n.t.name).slice(0, 40)}"`);
  console.log(`         <- ${src.id} @${src.lat},${src.lng}   (${d.length} donor(s), spread ${Math.round(spread)} m)`);
  console.log(`         writing: ${Object.keys(body).join(" + ")}`);
  if (!APPLY) { wrote++; continue; }

  await patchRow("routes", n.r.id, body);
  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${n.r.id}`, { pageSize: 3, key });
  const c = thOf(chk);
  if (c.lat === null || Math.abs(c.lat - src.lat) > 1e-6) { console.error("   RECONCILE FAILED"); process.exit(1); }
  if ((chk.waypoints || []).length !== (n.r.waypoints || []).length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  // Both records must now agree, or this repair has manufactured the defect it exists to prevent.
  if (body.approach_logistics && body.waypoints) {
    const a2 = chk.approach_logistics || {}, w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
    const apart = Math.round(hav(+a2.trailheadLat, +a2.trailheadLng, +w2.lat, +w2.lng));
    if (apart > 1) { console.error(`   THE TWO RECORDS NOW DISAGREE BY ${apart} m`); process.exit(1); }
  }
  console.log("         reconciled");
  wrote++;
}

console.log(`\n${APPLY ? `wrote ${wrote}` : `DRY RUN — ${wrote} would be written`}, ${skipped} skipped.`);
console.log(`\n${noDonor.length} route(s) name a trailhead NOTHING in the catalog has a coordinate for — research, not a copy:`);
for (const n of noDonor) console.log(`   ${n.r.id.padEnd(46)} "${String(n.t.name).slice(0, 55)}"`);
