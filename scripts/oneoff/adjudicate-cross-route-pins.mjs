// WHICH PIN IS THE WRONG ONE? — the question audit:cross-route-pins deliberately refuses.
//
// That audit reports 14 named POINTS placed 2 km or more apart by different routes, and says
// outright that it will not pick: "a majority can be one enrichment pass counted many times."
// That is right, and it leaves the findings unactionable — a pin is drawn on the map and written
// into the GPX a climber carries, so a misplaced one is worse than a merely inconsistent number.
//
// The adjudicator it asks for is the gate this catalog settled on today: an INDEPENDENT record of
// the same place, and a DISTANCE. It cuts both ways, which is what makes it usable:
//   - Pelton Basin: gazetteer feature 14 m from the pin -> same place, the ground speaks.
//   - Sahale Glacier Camp: 458 m -> the PIN is misplaced, and the feature cannot speak for it.
// So: a pin within CLOSE_M of a uniquely-named gazetteer feature is CORROBORATED; one more than
// FAR_M away, when a sibling is corroborated, is the misplaced one.
//
// WHAT IT REFUSES, and the refusals are most of the value:
//   - a name the gazetteer does not hold -> no independent record, nothing to adjudicate with.
//   - SEVERAL features of that name in Washington -> a namesake, and "one match cannot be the
//     wrong one of several" is the rule the elevation solver already runs on.
//   - a feature that is LINEAR or has extent -> its label node hangs at an arbitrary point along
//     it, so distance to it means nothing. "Mary's Falls Camp" is a point; a creek is not.
//   - EVERY pin far from the feature -> the feature is describing somewhere else, not the pins.
//   - EVERY pin close -> they agree; the audit's 2 km spread was between two nearby clusters.
//
// REPORT-ONLY. It says which pin the evidence refuses, never rewrites a coordinate: moving a pin
// is a bigger step than correcting a number, and this catalog has an apparatus for that
// (verify-researched-pin-coords) which requires the new position to land on the route's own track.
import { selectAll } from "../lib/supabase-env.mjs";

const CLOSE_M = 250;     // corroborated — the Pelton Basin distance was 14 m
const FAR_M = 1500;      // misplaced, when a sibling is corroborated — Sahale's was 458 m
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));

// A label point cannot locate an edge. Same list the camp solver uses, and for the same reason.
const LINEAR = /\b(stream|river|creek|trail|path|track|ridge|arete|glacier|moraine|gully|couloir|valley|wood|forest|cliff|road)\b/i;
const WA = (f) => f.lat > 45.4 && f.lat < 49.1 && f.lng > -124.9 && f.lng < -116.8;

const rows = await selectAll("routes", "id,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

const byName = new Map();
for (const r of rows) for (const w of (r.waypoints || [])) {
  if (!w || !w.name) continue;
  const lat = Number(w.lat), lng = Number(w.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
  const k = String(w.name).trim();
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push({ routeId: r.id, lat, lng, elev: w.elev ?? null });
}
if (!byName.size) { console.log("FAIL CLOSED: no placed pins"); process.exit(1); }

// the audit's own subject: one NAME, pins 2 km or more apart
const split = [];
for (const [name, pins] of byName) {
  if (pins.length < 2) continue;
  let worst = 0;
  for (let i = 0; i < pins.length; i++)
    for (let j = i + 1; j < pins.length; j++) worst = Math.max(worst, metres(pins[i], pins[j]));
  if (worst >= 2000) split.push({ name, pins, worst });
}
split.sort((a, b) => b.worst - a.worst);
console.log(`${split.length} name(s) placed 2 km or more apart. Adjudicating against the gazetteer.\n`);

const nominatim = async (q) => {
  const u = "https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=us&q=" +
    encodeURIComponent(q);
  try {
    const r = await fetch(u, { headers: { "User-Agent": "climbing-app-pin-adjudicator" } });
    if (!r.ok) return null;
    return (await r.json()).map((f) => ({
      lat: Number(f.lat), lng: Number(f.lon), name: String(f.display_name).split(",")[0], type: f.type,
    }));
  } catch { return null; }
};

let answered = 0, settled = 0;
for (const s of split) {
  console.log(`=== "${s.name}"  ${s.pins.length} pins, up to ${(s.worst / 1000).toFixed(1)} km apart`);
  const hits = await nominatim(s.name);
  await new Promise((r) => setTimeout(r, 1100));
  if (hits == null) { console.log("   gazetteer unreachable — NOT the same as unmapped\n"); continue; }
  answered++;
  const exact = hits.filter((h) => h.name.toLowerCase() === s.name.toLowerCase() && WA(h));
  if (!exact.length) { console.log("   no exact feature of this name in WA — nothing to adjudicate with\n"); continue; }
  if (exact.length > 1) { console.log(`   ${exact.length} features of this name in WA — a namesake, not guessed\n`); continue; }
  const f = exact[0];
  if (LINEAR.test(f.type) || LINEAR.test(f.name)) {
    console.log(`   feature is [${f.type}] — linear or extended, its label point locates nothing\n`);
    continue;
  }
  const scored = s.pins.map((p) => ({ ...p, d: metres(p, f) })).sort((a, b) => a.d - b.d);
  const close = scored.filter((p) => p.d <= CLOSE_M);
  const far = scored.filter((p) => p.d >= FAR_M);
  console.log(`   gazetteer [${f.type}] "${f.name}" @ ${f.lat.toFixed(4)},${f.lng.toFixed(4)}`);
  for (const p of scored) console.log(`      ${String(Math.round(p.d)).padStart(6)} m  ${p.routeId}  ${p.elev ?? "—"} ft`);
  if (!close.length) {
    console.log("   -> NO pin is near the feature. It describes somewhere else; the pins are not adjudicated.\n");
  } else if (!far.length) {
    console.log("   -> every pin is near it; the 2 km spread is between nearby clusters, not a defect.\n");
  } else {
    settled++;
    console.log(`   -> ${close.length} CORROBORATED (<= ${CLOSE_M} m); ${far.length} MISPLACED (>= ${FAR_M} m):`);
    for (const p of far) console.log(`         ${p.routeId}  ${Math.round(p.d)} m away`);
    console.log("");
  }
}

if (!answered) { console.log("FAIL CLOSED: the gazetteer answered nothing — an outage, not a result."); process.exit(1); }
console.log(`\n${settled} of ${split.length} adjudicated. REPORT-ONLY: this names the pin the evidence`);
console.log("refuses; it does not move one. A coordinate repair needs its own verification — the");
console.log("new position landing on the route's own track — which is a separate apparatus.");
