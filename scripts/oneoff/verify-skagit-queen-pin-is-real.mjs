// BEFORE BELIEVING THE GROUND UNDER A PIN, CHECK THE PIN IS NOT COMPUTED.
//
// settle-camp-elev-disagreements.mjs found that "Skagit Queen Camp" states 4,000 ft at a coordinate
// where the DEM reads 3,089 ft — and the gazetteer's own feature independently reads 3,093 ft, four
// feet away. That would settle what CLAUDE.md leaves open.
//
// It settles NOTHING if the pin is fabricated. This catalog carries ~346 coordinates interpolated
// along an approach chord, and audit:waypoint-elevations keeps a 2,000 ft tolerance for exactly
// that reason: ground under a computed pin is ground under a place nobody chose. So ask three
// things the fabrication audits ask:
//   1. the DECIMAL TAIL — a surveyed coordinate is written to 4-6 places; 15-17 is the floating
//      point residue of dividing a span into equal parts;
//   2. COLLINEARITY — is this pin on the straight line between two others on its route;
//   3. and whether the gazetteer feature is actually the same PLACE, not merely the same height.
//      Two different places can share an elevation; 4 ft apart is only evidence if they are also
//      near each other.
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const ROUTE = "wa_storm_king_southwest_scramble";
const NAME = "Skagit Queen Camp";

const rows = await selectAll("routes", "id,waypoints", `id=eq.${ROUTE}`, { pageSize: 5 });
if (rows.length !== 1) { console.log(`FAIL CLOSED: ${rows.length} rows for ${ROUTE}`); process.exit(1); }
const wps = (rows[0].waypoints || []).filter((w) => w && w.lat != null && w.lng != null);
if (!wps.length) { console.log("FAIL CLOSED: no placed waypoints"); process.exit(1); }

const me = wps.find((w) => (w.name || "").toLowerCase().includes("skagit queen"));
if (!me) { console.log(`FAIL CLOSED: no "${NAME}" waypoint on ${ROUTE}`); process.exit(1); }

// --- 1. decimal tail -----------------------------------------------------------------------
const dp = (n) => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
console.log(`pin  ${me.lat},${me.lng}   decimals ${dp(me.lat)}/${dp(me.lng)}`);
const computed = dp(me.lat) > 8 || dp(me.lng) > 8;
console.log(computed
  ? "   COMPUTED-LOOKING: a long decimal tail is the fingerprint of an interpolated pin."
  : "   surveyed-looking: 4-6 decimals, no interpolation residue.");

// --- 2. collinearity with its neighbours ----------------------------------------------------
// A fabricated pin sits on the straight line between two real ones. Measure the perpendicular
// offset from every pair's chord and report the smallest.
const R = 6371000, T = Math.PI / 180;
const xy = (p) => [p.lng * T * R * Math.cos(me.lat * T), p.lat * T * R];
const [mx, my] = xy(me);
let best = null;
for (let i = 0; i < wps.length; i++) for (let j = i + 1; j < wps.length; j++) {
  if (wps[i] === me || wps[j] === me) continue;
  const [ax, ay] = xy(wps[i]), [bx, by] = xy(wps[j]);
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 50) continue;
  const off = Math.abs(dx * (ay - my) - (ax - mx) * dy) / len;
  const t = ((mx - ax) * dx + (my - ay) * dy) / (len * len);
  if (t < 0 || t > 1) continue;                 // not BETWEEN them
  if (best == null || off < best.off) best = { off, a: wps[i].name, b: wps[j].name };
}
console.log(best
  ? `\nclosest chord: ${best.off.toFixed(0)} m off the line ${best.a} -> ${best.b}`
  : "\nno pair brackets this pin — collinearity cannot be tested");
if (best && best.off < 25) console.log("   ON A CHORD: consistent with an interpolated pin.");
else if (best) console.log("   OFF every chord: not interpolated between its neighbours.");

// --- 3. is the gazetteer feature the SAME PLACE? --------------------------------------------
const q = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(NAME)}`;
let feat = null;
try {
  const r = await fetch(q, { headers: { "User-Agent": "climbing-app-camp-elev-check" } });
  if (r.ok) {
    const j = await r.json();
    feat = j.find((f) => Math.abs(Number(f.lat) - me.lat) < 0.5 && Math.abs(Number(f.lon) - me.lng) < 0.5) || j[0];
  }
} catch (e) { console.log(`\nOSM lookup failed: ${e.message}`); }

if (feat) {
  const flat = Number(feat.lat), flng = Number(feat.lon);
  const d = 2 * 6371000 * Math.asin(Math.sqrt(
    Math.sin((flat - me.lat) * T / 2) ** 2 +
    Math.cos(me.lat * T) * Math.cos(flat * T) * Math.sin((flng - me.lng) * T / 2) ** 2));
  const fg = await elevationAt(flat, flng);
  console.log(`\ngazetteer: ${feat.display_name.slice(0, 70)}`);
  console.log(`   ${flat.toFixed(5)},${flng.toFixed(5)}   ${Math.round(d)} m from the pin   ground ${Math.round(fg)} ft`);
  console.log(d < 1000
    ? "   SAME PLACE: within a kilometre, so agreeing on height is corroboration rather than coincidence."
    : "   NOT the same place — agreeing on height would be a coincidence, not evidence.");
} else {
  console.log("\nno gazetteer feature returned — the pin's own ground is the only record here.");
}

const g = await elevationAt(me.lat, me.lng);
console.log(`\nSTATED ${me.elev} ft   GROUND UNDER THE PIN ${Math.round(g)} ft   diff ${Math.round(g - me.elev)} ft`);
