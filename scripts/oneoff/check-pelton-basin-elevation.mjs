// DID I PROPAGATE A WRONG NUMBER? — Pelton Basin, 25 rows, four of them filled today.
//
// audit:camp-elevations reports the only disagreement in the whole camp store: "Pelton Basin"
// stores 5,400 ft against ground of 4,767 ft at the gazetteer's coordinate, +633 ft, on 25 rows.
// Four of those rows were filled by solve-camp-elevations this morning, copying 5,400 from the
// catalog waypoint "Pelton Basin Camp" — so if 5,400 is wrong I spread it.
//
// The gate established hours earlier is exactly what decides this, and it cuts BOTH ways:
// NOT-COMPUTED IS NOT NOT-MISPLACED, and equally, a gazetteer coordinate is not automatically the
// camp either. Sahale Glacier Camp's pin was 458 m downhill of the real camp and its ground
// "settled" a split at the wrong value; the same mistake is available here in reverse, where the
// gazetteer's "Pelton Basin, WATER ACCESS TRAIL" may be a lakeside access point rather than the
// basin camp.
//
// So ask the same three questions:
//   1. is the catalog waypoint's pin REAL (not interpolated)?
//   2. how far apart are the pin and the gazetteer feature? Under ~250 m they are the same place
//      and the ground can speak; far apart and it cannot.
//   3. what is the ground under EACH?
import { selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const NAME = /pelton basin/i;
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const dp = (n) => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

const rows = await selectAll("routes", "id,bivy,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes"); process.exit(1); }

const stored = new Map();
for (const r of rows) for (const b of (r.bivy || [])) {
  if (!b || !NAME.test(b.name || "") || b.elev == null) continue;
  const v = Number(b.elev);
  if (!stored.has(v)) stored.set(v, []);
  stored.get(v).push(r.id);
}
console.log("stored in the camp store:");
for (const [v, ids] of stored) console.log(`   ${v} ft on ${ids.length} row(s)`);

const pins = [];
for (const r of rows) for (const w of (r.waypoints || [])) {
  if (!w || !NAME.test(w.name || "")) continue;
  const lat = Number(w.lat), lng = Number(w.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  pins.push({ routeId: r.id, name: w.name, lat, lng, elev: w.elev == null ? null : Number(w.elev) });
}
if (!pins.length) { console.log("\nno catalog waypoint of this name — the ground cannot be anchored"); process.exit(0); }

const q = "https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=us&q=" +
  encodeURIComponent("Pelton Basin");
const r = await fetch(q, { headers: { "User-Agent": "climbing-app-camp-elev-check" } });
const feats = r.ok ? await r.json() : [];

console.log(`\n${pins.length} catalog waypoint(s), ${feats.length} gazetteer hit(s)\n`);
for (const p of pins) {
  const g = Math.round(await elevationAt(p.lat, p.lng));
  console.log(`PIN  ${p.routeId}`);
  console.log(`   "${p.name}"  ${p.lat},${p.lng}  decimals ${dp(p.lat)}/${dp(p.lng)}` +
    (dp(p.lat) > 8 ? "  COMPUTED-LOOKING" : "  surveyed-looking"));
  console.log(`   states ${p.elev ?? "—"} ft;  GROUND UNDER IT ${g} ft  (diff ${g - (p.elev ?? g)} ft)`);
  for (const f of feats.slice(0, 4)) {
    const lat = Number(f.lat), lng = Number(f.lon);
    const d = Math.round(metres(p, { lat, lng }));
    const fg = Math.round(await elevationAt(lat, lng));
    console.log(`      gazetteer "${String(f.display_name).slice(0, 58)}"`);
    console.log(`         ${d} m away, ground ${fg} ft` +
      (d <= 250 ? "   <- SAME PLACE: the ground can speak" : "   <- too far to speak for this pin"));
  }
}
console.log("\nREAD IT. If the pin is real and the gazetteer feature is far away, the gazetteer is");
console.log("describing somewhere else and the stored value may be fine — that is the Sahale shape");
console.log("in reverse, and it is why this is checked rather than swept.");
