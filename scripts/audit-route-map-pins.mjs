// Three questions the route MAP raises, asked of every alpine route at once.
// They are separate from the existing waypoint audits on purpose:
//
//   audit:waypoints / audit:waypoint-track  ask "is this pin on the line?"
//   audit:waypoint-order                    asks "is the LIST sensible?"
//
// None of them asks what a climber sees when the map draws: how many TRAILHEAD pins
// the map will paint (two is always wrong — a route has one start), and how many pins
// the map will silently DROP because they carry no coordinate. GPXMap skips
// `wp.lat == null` without a word, so a waypoint that is listed below the map is simply
// absent from it and cannot be tapped. That is the "not all waypoints are clickable"
// report, and no existing audit can see it — every one of them starts by filtering to
// pins that HAVE a coordinate, so an uncoordinated pin is not a finding, it is not a row.
//
// Read-only. Fails closed on an empty read: zero routes makes every map look perfect.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const LIMIT = Number(arg("--limit", 40));
const JSON_OUT = argv.includes("--json");

const k = anonKey();

// Alpine scope: the disciplines whose route page draws a map with an approach on it.
const ALPINE = new Set(["alpine", "mountaineering", "ice", "mixed", "snow", "scrambling"]);

async function readAll() {
  const out = [];
  let last = "";
  for (;;) {
    /* `id like 'wa_%'` is the reflex filter and it MISSES the legacy ids — `rainier_*`,
       `adams_*` and the rest, which are Washington routes filed under the pre-fix naming.
       `--state all` is not a nicety here: 4 of the 1,016 routes carrying waypoints are
       invisible to the prefixed scan, and they are Rainier and Adams. */
    const scope = STATE === "all" ? "" : `&id=like.${STATE}_*`;
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,waypoints,gpx,approach_logistics`
      + `&waypoints=not.is.null&id=gt.${encodeURIComponent(last)}${scope}&order=id.asc&limit=1000`;
    const res = await fetch(url, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows);
    last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const norm = (t) => String(t || "").toLowerCase().trim();
const isTrailhead = (w) => /trailhead|^th$/.test(norm(w && w.type));
const hasCoord = (w) => w && w.lat != null && w.lng != null && Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng));

function haversineM(a, b) {
  const R = 6371000, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const rows = await readAll();
if (!rows.length) { console.error(`FAIL — read 0 routes for scope "${STATE}". A clean answer here would be vacuous.`); process.exit(1); }

const alpine = rows.filter((r) => ALPINE.has(norm(r.discipline)));
const findings = { twoTrailheads: [], noCoord: [], thVsLogistics: [] };

for (const r of alpine) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints.filter(Boolean) : [];
  if (!wps.length) continue;

  // 1. Two trailhead pins. A route starts in one place; the map paints both.
  const ths = wps.filter(isTrailhead);
  if (ths.length > 1) {
    const placed = ths.filter(hasCoord);
    const apartM = placed.length > 1
      ? Math.round(Math.max(...placed.slice(1).map((w) => haversineM({ lat: +placed[0].lat, lng: +placed[0].lng }, { lat: +w.lat, lng: +w.lng }))))
      : null;
    findings.twoTrailheads.push({ id: r.id, name: r.name, n: ths.length, apartM, names: ths.map((w) => w.name || "(unnamed)") });
  }

  // 2. Pins the map cannot draw, so they are listed but not tappable.
  const missing = wps.filter((w) => !hasCoord(w));
  if (missing.length) {
    findings.noCoord.push({ id: r.id, name: r.name, n: missing.length, of: wps.length, names: missing.map((w) => `${w.type || "?"}: ${w.name || "(unnamed)"}`) });
  }

  // 3. The pin and approach_logistics disagree about where the trailhead is — the map
  //    draws the pin, TrailheadCard sends you to the blob. Reported here because it is
  //    the same "which start is real" question the two-pin case asks.
  const al = r.approach_logistics || {};
  const thPin = ths.find(hasCoord) || wps.filter(hasCoord).find((w) => isTrailhead(w));
  /* `Number(null)` is 0, not NaN, so a Number.isFinite test alone treats a MISSING blob
     coordinate as a trailhead at (0, 0) in the Gulf of Guinea. That is how this audit's first
     run reported wa_jack_mountain_northeast_glacier as 12,215 km — a finding it manufactured
     rather than found. Null-check before coercing. */
  const alLat = al.trailheadLat, alLng = al.trailheadLng;
  const hasBlob = alLat != null && alLng != null && alLat !== "" && alLng !== ""
    && Number.isFinite(Number(alLat)) && Number.isFinite(Number(alLng))
    && !(Number(alLat) === 0 && Number(alLng) === 0);
  if (thPin && hasBlob) {
    const d = Math.round(haversineM({ lat: +thPin.lat, lng: +thPin.lng }, { lat: +al.trailheadLat, lng: +al.trailheadLng }));
    if (d > 500) findings.thVsLogistics.push({ id: r.id, name: r.name, m: d, pin: thPin.name, blob: al.trailhead });
  }
}

if (JSON_OUT) { console.log(JSON.stringify({ scope: STATE, alpine: alpine.length, findings }, null, 2)); process.exit(0); }

console.log(`\n=== route map pin audit ===`);
console.log(`scope "${STATE}" · ${rows.length} routes with waypoints · ${alpine.length} of them alpine-family`);

console.log(`\n1. TWO OR MORE TRAILHEAD PINS — the map draws every one: ${findings.twoTrailheads.length} route(s)`);
for (const f of findings.twoTrailheads.slice(0, LIMIT)) {
  console.log(`   ${f.id} — ${f.name}: ${f.n} trailhead pins${f.apartM != null ? `, ${f.apartM} m apart` : ""}`);
  console.log(`      ${f.names.join("  |  ")}`);
}
if (findings.twoTrailheads.length > LIMIT) console.log(`   … ${findings.twoTrailheads.length - LIMIT} more (raise --limit)`);

console.log(`\n2. WAYPOINTS WITH NO COORDINATE — listed on the page, absent from the map, not tappable: ${findings.noCoord.length} route(s)`);
const totalMissing = findings.noCoord.reduce((a, f) => a + f.n, 0);
console.log(`   ${totalMissing} pin(s) in total`);
for (const f of findings.noCoord.slice(0, LIMIT)) {
  console.log(`   ${f.id} — ${f.name}: ${f.n}/${f.of} pins unplaced`);
  console.log(`      ${f.names.slice(0, 6).join("  |  ")}`);
}
if (findings.noCoord.length > LIMIT) console.log(`   … ${findings.noCoord.length - LIMIT} more (raise --limit)`);

console.log(`\n3. TRAILHEAD PIN vs approach_logistics DISAGREE (>500 m): ${findings.thVsLogistics.length} route(s)`);
for (const f of findings.thVsLogistics.slice(0, LIMIT)) {
  console.log(`   ${f.id} — ${f.name}: ${f.m} m apart`);
  console.log(`      pin: ${f.pin}   blob: ${f.blob}`);
}
if (findings.thVsLogistics.length > LIMIT) console.log(`   … ${findings.thVsLogistics.length - LIMIT} more (raise --limit)`);

console.log(`\nReport only — nothing was changed.`);
