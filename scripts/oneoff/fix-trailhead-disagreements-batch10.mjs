// Slice ag: five SAME-NAME coordinate disputes, settled against published trailhead coordinates.
//
// These differ from every earlier batch. Both records name the SAME trailhead and disagree only on
// where it is, so the route's own prose cannot help — it names the place, which is not in dispute —
// and the peer/track techniques mostly abstain. What settles them is an outside coordinate.
//
//   BARCLAY LAKE (3 routes, 516 m apart). The published trailhead coordinate is 47.7923,-121.4592,
//   which is the blob's value to the digit. The pin sits 516 m away. Reached from US-2 at milepost
//   42 in Baring, north on FR-6024 for 4.3 miles. Independently consistent with the gpx vote that
//   settled the fourth route on this trailhead (wa_merchant_peak_south_route, 19x nearer the blob)
//   in an earlier batch — two different methods, same answer.
//
//   MOWICH LAKE (2 Rainier routes, 640 m apart). Mowich Lake is 46.93872,-121.86149, which is the
//   PIN to four decimals; the blob is 640 m off. Opposite winner to Barclay, which is the point of
//   checking each rather than assuming a house style.
//
// NOTE, not acted on because it is not a trailhead question: SR-165's Carbon River Fairfax Bridge
// is closed to vehicles, bicyclists and pedestrians with no alternate route, so Mowich Lake has NO
// vehicle access at present. Both records name Mowich Lake, so it does not change which is right —
// but these two Rainier routes are currently unreachable by the trailhead they name, which is the
// Elwha/Dosewallips pattern and worth a separate look by whoever owns access data.
//
// Pass --apply to write; default is a dry run. Re-running is safe: rows already agreeing are skipped.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  ["wa_gunnshy_peak_standard_route", "log"],
  ["wa_tailgunner_peak_w_route", "log"],
  ["wa_vanishing_point", "log"],
  ["wa_mount_rainier_edmunds_headwall", "pin"],
  ["wa_mount_rainier_mowich_face", "pin"],
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

// The published coordinate each pair is being resolved against. Asserted, not assumed: if the
// winning record has drifted away from it, this refuses rather than writing something else.
const EXPECT = {
  wa_gunnshy_peak_standard_route: [47.7923, -121.4592],
  wa_tailgunner_peak_w_route: [47.7923, -121.4592],
  wa_vanishing_point: [47.7923, -121.4592],
  wa_mount_rainier_edmunds_headwall: [46.93872, -121.86149],
  wa_mount_rainier_mowich_face: [46.93872, -121.86149],
};

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

  const [eLat, eLng] = EXPECT[id];
  const wLat = winner === "log" ? lLat : pLat, wLng = winner === "log" ? lLng : pLng;
  const off = Math.round(hav(wLat, wLng, eLat, eLng));
  if (off > 200) { console.error(`${id}: the ${winner} record is ${off} m from the published coordinate — refusing, the row has moved since this was researched`); process.exit(1); }

  let body, before, after;
  if (winner === "log") {
    before = `pin "${wps[i].name}" @${pLat},${pLng}`;
    after = `"${al.trailhead}" @${lLat},${lLng}`;
    body = { waypoints: wps.map((w, n) => n === i ? { ...w, name: al.trailhead || w.name, lat: lLat, lng: lLng } : w) };
  } else {
    const next = { ...al, trailhead: wps[i].name, trailheadLat: pLat, trailheadLng: pLng };
    delete next.trailheadDirection;
    before = `log "${al.trailhead}" @${lLat},${lLng}`;
    after = `"${wps[i].name}" @${pLat},${pLng}  (direction dropped)`;
    body = { approach_logistics: next };
  }
  console.log(`${id}  (${apart} m apart, ${winner} wins, ${off} m from the published coordinate)\n   ${before}\n   -> ${after}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", id, body);
  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — still ${now} m apart`); process.exit(1); }
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  console.log(`   reconciled: both records agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);
