// Slice ah: the eight Washington Pass roadside-pullout disagreements.
//
// Every one is settled by the ROUTE'S OWN approach prose naming the pullout its blob already
// holds, so these are row-local decisions and not a cross-route consensus. That distinction
// matters here more than usual, because these eight sit on two pullouts that several OTHER routes
// also reference, and it would have been easy to resolve them by majority instead.
//
//   MILEPOST 166 (M&M Wall x4, Chianti Spire x1)
//     M&M routes: "Park at a pullout near milepost 166 on ..." -> blob "SR-20 pullout near
//       milepost 166 (Washington Pass)".
//     Chianti: "From the SR-20 pullout near milepost ~166 (~0.7 mile past the Cutthroat Lake Road
//       turnoff)" -> blob "SR-20 Wine Spires pullout (milepost 166)".
//
//   HAIRPIN / POND PULLOUT (Lexington East Face, Tooth and Claw, Flycatcher Buttress)
//     Lexington: "Park at the pond pullout on the south side of SR-20, about 1.2 miles east of
//       Washington Pass (a small dirt turnout marked by a roadside pond)".
//     Tooth and Claw: "the informal pullout on the north shoulder ... a short walk east of the
//       small pond, about 1.2 miles east of Washington Pass".
//     Flycatcher: "Start from the hairpin turn used for other Liberty Bell Group routes".
//     All three blobs hold "SR-20 Hairpin / Pond Pullout (east of Washington Pass)".
//
// THE GPX IS NOT A WITNESS HERE and I checked before relying on it. Almost every Liberty Bell
// route's track starts at 48.51913,-120.67427 — the BLUE LAKE trailhead on the WEST side — so the
// tracks are generic peak tracks that never record the east-face approach. Lexington's track start
// is a digit-copy of its own pin. Any vote from them would have been the derived-track trap.
//
// Pass --apply to write; default is a dry run. Re-running is safe: rows already agreeing are skipped.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  ["wa_ellen_pea", "log"],
  ["wa_the_exorcism_of_mark_hanna", "log"],
  ["wa_the_l_h_route_free_variation", "log"],
  ["wa_the_tiger", "log"],
  ["wa_chianti_spire_east_face", "log"],
  ["wa_lexington_tower_east_face", "log"],
  ["wa_tooth_and_claw", "log"],
  ["wa_flycatcher_buttress", "log"],
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

let wrote = 0, skipped = 0;
for (const [id, winner] of PLAN) {
  const [r] = await selectAll("routes", "id,name,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { console.error(`${id}: NOT FOUND`); process.exit(1); }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics))
    ? r.approach_logistics : null;
  if (i < 0 || !al) { console.error(`${id}: missing a record — refusing`); process.exit(1); }
  const pLat = num(wps[i].lat), pLng = num(wps[i].lng);
  const lLat = num(al.trailheadLat), lLng = num(al.trailheadLng);
  if (pLat === null || lLat === null) { console.error(`${id}: a record has no coordinate — refusing`); process.exit(1); }
  const apart = Math.round(hav(pLat, pLng, lLat, lLng));
  if (apart <= 500) { console.log(`${id}: records now agree (${apart} m) — skipping`); skipped++; continue; }

  const body = { waypoints: wps.map((w, n) => n === i ? { ...w, name: al.trailhead || w.name, lat: lLat, lng: lLng } : w) };
  console.log(`${id}  (${apart} m apart, log wins)\n   pin "${wps[i].name}" @${pLat},${pLng}\n   -> "${al.trailhead}" @${lLat},${lLng}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", id, body);
  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — still ${now} m apart`); process.exit(1); }
  console.log(`   reconciled: both records agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);

// REPORTED, NOT FIXED — a cross-route inconsistency this sweep created, which the agreement audit
// cannot see because the row's two records AGREE with each other:
//   wa_liberty_bell_thin_red_line holds "Washington Pass East Face Trailhead (Pond Approach)"
//   @48.5245,-120.6581, while its four east-face siblings (liberty_crack, liberty_crack_free,
//   liberty_bell_east_face, liberty_and_injustice_for_all) hold the hairpin/pond pullout
//   @48.51454,-120.64332 — 1.5 km apart, same wall, same approach. An earlier batch of mine set
//   the first from its own prose without checking the siblings. Both name the pond approach, so
//   the PLACE is agreed and only the coordinate differs. Not corrected here because doing so would
//   be resolving a row by cross-route majority, which these appliers exclude by construction and
//   which probe-trailhead-consensus.mjs has been wrong about four times.
