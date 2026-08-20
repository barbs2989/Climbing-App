// Verify ALL 72 run-test-only endpoint pins against an independent record, rather than extrapolating
// from the two samples that prompted the question.
//
// Each has a natural second source, written by a different pass than the one that laid out the
// waypoints:
//   Summit    -> the route's `area_id` row in `areas` carries the peak's coordinate.
//   Trailhead -> the route's own `approach_logistics.trailheadLat/Lng`.
//
// "Confirmed" means the independent record agrees to within 50 m AND names the same thing. The name
// test is not decoration: wa_gray_wolf_ridge_se_slopes[4] is "Baldy summit" on a route whose area is
// "Gray Wolf Ridge", so the area coordinate is a different high point and agreement would be
// meaningless. Same rule that stopped "Holden Village" being copied onto "High Bridge".
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const ro = headers(anonKey());
const dec = v => { const s = String(v), j = s.indexOf("."); return j < 0 ? 0 : s.length - j - 1; };
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));
const AGREE_M = 50;

const STOP = new Set(["summit", "topout", "top", "block", "peak", "mount", "mountain", "the", "and",
  "true", "main", "false", "point", "trailhead", "trail", "head", "parking", "lot", "pullout", "north",
  "south", "east", "west", "upper", "lower", "access", "road", "via", "for", "area", "site"]);
const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const key = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !STOP.has(t)));
function sameThing(a, b) {
  const A = key(a), B = key(b);
  if (!A.size || !B.size) return false;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit === Math.min(A.size, B.size);
}

const ends = JSON.parse(fs.readFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/run-endpoints.json", "utf8"))
  .filter(x => !x.decimalClass);
const ids = [...new Set(ends.map(x => x.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,waypoints,approach_logistics&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }
const areaIds = [...new Set(Object.values(rows).map(r => r.area_id).filter(Boolean))];
const areas = {};
for (let i = 0; i < areaIds.length; i += 40) {
  const b = areaIds.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED areas " + r.status); process.exit(1); }
  for (const x of await r.json()) areas[x.id] = x;
}
if (!Object.keys(areas).length) { console.log("FAIL-CLOSED: empty areas read"); process.exit(1); }

const confirmed = [], disagrees = [], noRecord = [], nameMismatch = [];
for (const e of ends) {
  const row = rows[e.route]; if (!row) continue;
  const pin = (row.waypoints || [])[e.i];
  if (!pin || pin.lat == null) continue;
  const P = { lat: +pin.lat, lng: +pin.lng };
  let src = null;
  if (e.type === "Summit" || e.type === "Topout") {
    const a = areas[row.area_id];
    if (a && a.lat != null) src = { kind: "areas row", name: a.name, lat: +a.lat, lng: +a.lng };
  } else {
    const al = row.approach_logistics || {};
    const lat = al.trailheadLat ?? al.trailhead_lat, lng = al.trailheadLng ?? al.trailhead_lng;
    if (lat != null && lng != null && Math.max(dec(lat), dec(lng)) <= 8)
      src = { kind: "approach_logistics", name: al.trailhead, lat: +lat, lng: +lng };
  }
  if (!src) { noRecord.push(e); continue; }
  if (!sameThing(e.name, src.name)) { nameMismatch.push({ ...e, src }); continue; }
  const d = m(P, src);
  if (d <= AGREE_M) confirmed.push({ ...e, src, d: Math.round(d) });
  else disagrees.push({ ...e, src, d: Math.round(d) });
}

const n = ends.length;
console.log(`endpoint pins flagged ONLY by the run test : ${n}\n`);
console.log(`  CONFIRMED CORRECT by an independent record (<=${AGREE_M} m) : ${confirmed.length}`);
console.log(`  the record disagrees — a real candidate                    : ${disagrees.length}`);
console.log(`  the record names something else, so it cannot judge        : ${nameMismatch.length}`);
console.log(`  no independent record on the row                           : ${noRecord.length}\n`);
if (confirmed.length) {
  const d0 = confirmed.filter(x => x.d === 0).length;
  console.log(`  of the confirmed, ${d0} agree to the metre — the pin IS the record's value.\n`);
}
for (const x of disagrees) console.log(`  DISAGREES  ${x.route}[${x.i}] "${x.name}" [${x.type}] — ${x.src.kind} "${x.src.name}" is ${x.d} m away`);
console.log();
for (const x of nameMismatch) console.log(`  CANNOT JUDGE  ${x.route}[${x.i}] "${x.name}" — record names "${x.src.name}"`);
console.log(`\n  (${noRecord.length} have no second record: ${[...new Set(noRecord.map(x => x.type))].join(", ")})`);
fs.writeFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/endpoint-verdicts.json",
  JSON.stringify({ confirmed, disagrees, nameMismatch, noRecord }, null, 1));
