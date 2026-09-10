// `gain_ft` against `loss_ft`: you cannot finish lower than you started.
//
// On an out-and-back the total gain and the total loss are the same number, and the app already
// knows it — `gainCoversWholeOuting` is |loss - gain| / gain <= 3% and relabels the TECH STATS
// tile "On foot" when it holds. So `loss_ft` materially LARGER than `gain_ft` on a route that
// returns to its own trailhead is impossible, in the way `check:impossible-leg` is impossible:
// no prose, no judgement, the row contradicts itself.
//
// ONE-SIDED, for audit:gain's reason. Loss SMALLER than gain is ordinary — 135 of these 640 rows
// differ by more than 3% and the bulk of them have a tiny `loss_ft`, because that column also
// holds the approach's net descent rather than the outing's. Two conventions in one column, the
// shape CLAUDE.md records for `dist_km`. Only the other direction is a contradiction.
//
// AND A TRAVERSE IS ALLOWED TO FINISH LOWER, which is most of the raw count: 45 of the 52 say
// traverse / point-to-point / one-way / shuttle in their own prose.
//
// OF THE 7 LEFT, FOUR ARE A CONVENTION AND NOT A DEFECT, and separating them is the whole
// precision: where `gain_ft` matches the trailhead-to-summit PIN RISE almost exactly while
// `loss_ft` is larger, gain is the RISE and loss is the total descent including re-gains over
// intermediate bumps — two true numbers answering different questions, the shape five of the
// seven pairs in the facts-stored-twice census turned out to be. The other three have `gain_ft`
// below BOTH `loss_ft` and the pin rise, so that reading cannot explain them; they are repaired
// by fix-gain-below-its-own-loss.mjs, which copies `loss_ft` rather than typing a number.
//
// Read-only. Fails closed on a short read.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,gain_ft,loss_ft,pitches,waypoints,itinerary,overview,beta,approach,descent_text",
  "loss_ft=not.is.null", { pageSize: 1000, key: requireServiceKey() });
const wa = rows.filter((r) => String(r.id).startsWith("wa_") || /^(rainier|adams|stuart)_/.test(String(r.id)));
if (wa.length < 200) { console.error(`FAIL - only ${wa.length} WA rows read. A short read reports a clean catalog.`); process.exit(1); }

const TRAVERSE = /travers|point[- ]to[- ]point|thru[- ]hike|one[- ]way|shuttle|different trailhead/i;
const ef = (w) => { const v = w && w.elev; const n = v == null || v === "" ? NaN : Number(v); return Number.isFinite(n) ? n : null; };
const ty = (w) => String((w && w.type) || "").toLowerCase();

let both = 0, larger = 0, traverses = 0;
const undulation = [], contradictions = [];
for (const r of wa) {
  const g = Number(r.gain_ft), l = Number(r.loss_ft);
  if (!Number.isFinite(g) || !Number.isFinite(l) || g <= 0 || l <= 0) continue;
  both++;
  if (l <= g * 1.05) continue;
  larger++;
  const prose = ["overview", "beta", "approach", "descent_text"].map((k) => String(r[k] || "")).join("  ")
    + "  " + String((r.itinerary && r.itinerary.totalNote) || "");
  if (TRAVERSE.test(prose) || /travers/i.test(r.id) || /travers/i.test(r.name || "")) { traverses++; continue; }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const th = wps.filter((w) => ty(w).includes("trailhead")).map(ef).filter((n) => n !== null);
  const su = wps.filter((w) => ty(w).includes("summit")).map(ef).filter((n) => n !== null);
  const rise = (th.length && su.length) ? Math.max(...su) - Math.min(...th) : null;
  const rec = { id: r.id, g, l, rise, days: (r.itinerary && Array.isArray(r.itinerary.days)) ? r.itinerary.days.length : null };
  // Undulation explains it when the stored gain IS the rise; a contradiction is short of both.
  (rise != null && g >= rise - 300 ? undulation : contradictions).push(rec);
}

console.log(`WA routes carrying both gain_ft and loss_ft   : ${both}`);
console.log(`  loss more than 5% larger than gain          : ${larger}`);
console.log(`  ...said traverse / one-way in their own prose: ${traverses}`);
console.log(`  ...the UNDULATION convention (gain = the pin rise, loss includes re-gains): ${undulation.length}`);
console.log(`  ...CONTRADICTIONS (gain below the pin rise as well)                       : ${contradictions.length}\n`);
for (const x of contradictions.sort((a, b) => (b.l - b.g) - (a.l - a.g)))
  console.log(`  ${x.id.padEnd(44)} gain ${String(x.g).padStart(6)}  loss ${String(x.l).padStart(6)}  pin rise ${String(x.rise ?? "-").padStart(6)}  days ${x.days ?? "-"}`);
for (const x of undulation)
  console.log(`  ok  ${x.id.padEnd(40)} gain ${String(x.g).padStart(6)} = pin rise ${String(x.rise).padStart(6)}, loss ${String(x.l).padStart(6)} — two true numbers`);
