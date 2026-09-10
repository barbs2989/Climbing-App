// A route's own `itinerary.totalNote` often states the trip's gain. Does `gain_ft` agree with it?
//
// A NINTH pair for the facts-stored-twice census, and one `audit:gain` structurally cannot see:
// that audit compares `gain_ft` against the rise between the route's own PINS, so a route whose
// pins are absent, or agree, is invisible to it however loudly its prose disagrees. Measured
// 2026-09-09: of the 17 routes reported here, `audit:gain` flags NONE.
//
// TWO NARROWINGS, both of which the first version got wrong and which are the whole precision.
//
//   1. THE FIGURE MUST BE A TOTAL, NOT A LEG. A totalNote routinely describes the trip day by
//      day — "hike in ~6 mi to a camp in the Valley of the Silent Men (~2,900 ft gain), then a
//      big summit day" — and taking the first number found reads a LEG as the total. That draft
//      reported 44, dominated by exactly that, several of them with `gain_ft` LARGER than the
//      "total" it had picked. The clause must itself say round trip / car-to-car /
//      point-to-point / over N days, or be the "(~N ft gain)" that follows an "N-day trip".
//
//   2. ONE-SIDED, for audit:gain's reason. Too little gain is impossible; too much is ordinary
//      rolling terrain. And the climbing vertical is credited first, exactly as
//      `gainBelowOwnPins` does, so a pitched route is not accused for vertical the app attributes
//      to the technical leg.
//
// REPORT-ONLY, AND IT MUST STAY SO. Where the trip has a CAMP, "the trip total" and "the gain
// this column holds" are different questions by the documented high-camp convention, so 12 of the
// 17 are ambiguous rather than wrong. The five with a ONE-DAY itinerary are the decidable ones —
// car-to-car, no camp to measure from, so the trip total IS the route's gain. Even there, read
// the row first: `wa_grotto_mountain_e_route` stores dist_km 7.72 against a note saying 4.8 miles
// ROUND TRIP, i.e. the same row is carrying the two `dist_km` conventions CLAUDE.md forbids
// normalising in bulk. A gain repair on such a row is a per-route judgement, not a sweep.

import { SUPABASE_URL, headers, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const rows = await selectAll("routes", "id,name,gain_ft,dist_km,pitches,itinerary", "itinerary=not.is.null", { pageSize: 1000, key: requireServiceKey() });
const wa = rows.filter(r => String(r.id).startsWith("wa_") || /^(rainier|adams|stuart)_/.test(String(r.id)));
// A TOTAL, not a leg: the clause naming the figure must also say the trip is what is being
// measured. "hike in ~6 mi to a camp (~2,900 ft gain)" is a LEG and must not match.
const TOTAL = [
  /(?:round[- ]trip|round trip|\bRT\b|car[- ]to[- ]car|point[- ]to[- ]point|total)[^.;]{0,80}?(\d{1,2},?\d{3})\s*\+?\s*(?:ft|feet|')\s*(?:of\s+)?(?:elevation\s+)?gain/i,
  /(\d{1,2},?\d{3})\s*\+?\s*(?:ft|feet|')\s*(?:of\s+)?(?:elevation\s+)?gain[^.;]{0,40}?(?:round[- ]?trip|\bRT\b|car[- ]to[- ]car|over \d+ days|total)/i,
  /^[^.;]{0,60}?\b\d+[- ]?(?:day|night)\b[^.;]{0,60}?\((?:~|about |roughly )?(\d{1,2},?\d{3})\s*\+?\s*(?:ft|feet|')\s*gain\)/i,
];
let comparable = 0; const hits = [];
for (const r of wa) {
  const it = r.itinerary; if (!it || typeof it !== "object") continue;
  const note = String(it.totalNote || ""); if (!note) continue;
  let stated = null;
  for (const re of TOTAL) { const m = re.exec(note); if (m) { stated = Number(m[1].replace(/,/g, "")); break; } }
  if (stated == null) continue;
  const stored = Number(r.gain_ft);
  if (!Number.isFinite(stored) || stored <= 0) continue;
  comparable++;
  // Credit the climbing vertical, exactly as gainBelowOwnPins does, so a pitched route is not
  // accused for vertical the app attributes to the technical leg.
  const climb = Number(r.pitches) > 0 ? Number(r.pitches) * 35 * 3.28084 : 0;
  const shortfall = stated - climb - stored;
  if (shortfall > Math.max(500, stated * 0.15)) hits.push({ id: r.id, stored, stated, climb: Math.round(climb), shortfall: Math.round(shortfall), note: note.slice(0, 150) });
}
hits.sort((a, b) => b.shortfall - a.shortfall);
console.log("comparable (totalNote states a TRIP TOTAL gain): " + comparable);
console.log("  gain_ft materially SMALLER than it            : " + hits.length + "\n");
const days = (r) => (r && r.itinerary && Array.isArray(r.itinerary.days)) ? r.itinerary.days.length : null;
const byId = new Map(wa.map((r) => [r.id, r]));
for (const x of hits) {
  const d = days(byId.get(x.id));
  console.log("  " + (d === 1 ? "ONE-DAY  " : "camped   ") + x.id.padEnd(44) + " gain_ft " + String(x.stored).padStart(6) + "  note " + String(x.stated).padStart(6) + "  (climb credit " + x.climb + ")");
  console.log("     " + JSON.stringify(x.note) + "\n");
}
console.log("  ONE-DAY (decidable — no camp, so the trip total IS the route's gain): " + hits.filter((x) => days(byId.get(x.id)) === 1).length);
console.log("  camped  (ambiguous by the high-camp convention)                     : " + hits.filter((x) => days(byId.get(x.id)) !== 1).length);
if (!comparable) { console.error("FAIL - no route stated a trip-total gain. A short read reports a clean catalog."); process.exit(1); }
