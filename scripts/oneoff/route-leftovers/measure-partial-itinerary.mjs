// How many routes does effDistKm read from an itinerary that states miles on only SOME days?
// Mount Seattle stated miles only on its summit day, so the route page showed ~2 mi against a
// stored 19 mi. This measures the class before choosing a rule: rows whose itinerary has a
// day with no `miles`, that also store dist_km, and how far the two readings differ.
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
import { effDistKm, itinTotalMi } from "../../../lib/outing.js";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,dist_km,itinerary,outing_shape", "id=like.wa_*&itinerary=not.is.null", { pageSize: 1000, key });
let n = 0, partial = 0, partialWithKm = 0; const ex = [];
for (const r of rows) {
  const days = r.itinerary?.days; if (!days?.length || !itinTotalMi(r)) continue; n++;
  const missing = days.filter(d => d.miles == null).length;
  if (!missing) continue; partial++;
  if (r.dist_km == null) continue; partialWithKm++;
  const cur = effDistKm(r), km = Number(r.dist_km);
  ex.push({ id: r.id, days: days.length, missing, missingIdx: days.map((d, i) => d.miles == null ? i : null).filter(x => x != null).join("/"), cur: +cur.toFixed(1), km, ratio: +(cur / km).toFixed(2) });
}
console.log({ rows: rows.length, withItinMiles: n, partial, partialWithKm });
const rs = ex.map(e => e.ratio).sort((a, b) => a - b), q = f => rs[Math.floor(f * (rs.length - 1))];
console.log("ratio (current / stored) min, q1, median, q3, max:", q(0), q(0.25), q(0.5), q(0.75), q(1));
for (const e of ex.sort((a, b) => a.ratio - b.ratio)) console.log(e.ratio, e.id, `days=${e.days} missing=${e.missingIdx}`, `shown=${e.cur}km stored=${e.km}km`);
