// Slice af: six trailhead disagreements settled against REPUTABLE EXTERNAL SOURCES.
//
// Every earlier batch decided from evidence ON THE ROW — the route's own prose, a peer route, the
// gpx track. This one was asked to cross-reference each against an outside authority, which
// changed two verdicts I would otherwise have shipped from prose alone. Recorded per route.
//
//   winner:"log" — the waypoint pin is wrong; overwrite the pin name+coords from approach_logistics
//   winner:"pin" — approach_logistics is wrong; overwrite its trailhead+coords from the pin, and
//                  DELETE trailheadDirection, which names the trailhead being removed
//
// Pass --apply to write; default is a dry run. Re-running is safe: rows already agreeing are skipped.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  // NPS: the Elwha is closed to vehicles beyond the Madison Falls parking lot since a September
  // 2024 washout, indefinitely, and Whiskey Bend Road sits behind that closure. So the blob named
  // a trailhead NOBODY CAN DRIVE TO. Noyes' own text also makes Quinault the shorter line: ~16 mi
  // to Low Divide against ~28 mi plus the ~7 mi walk-in the closure adds. Meany's beta
  // independently describes going up the North Fork Quinault and through Seattle Basin, which
  // matches the published standard route. Same shape as wa_mount_queets_south and sitkum: when one
  // record names a road that is closed, it is not the headline trailhead.
  ["wa_mount_meany_standard", "pin"],
  ["wa_mount_noyes_standard", "pin"],

  // The route's own approach opens "Primary approach: drive the narrow, one-lane gravel Obstruction
  // Point Road ... to the Obstruction Point trailhead", and Cameron is documented as a peak reached
  // from the Obstruction Point high routes via Grand Pass. The blob held the Dosewallips washout —
  // the wrong side of the range, and itself a road closed to vehicles since 2002.
  ["wa_mount_cameron_standard", "pin"],

  // "The accepted approach follows the southern leg of the Ptarmigan Traverse corridor out of the
  // Downey Creek Trailhead (~1,600 ft) on the Suiattle River Road (FR 26)". The pin held Cascade
  // Pass — a different drainage entirely, and the north end of that traverse rather than the south.
  ["wa_lizard_mountain_south_route", "log"],

  // THE ONE I HAD BACKWARDS FROM PROSE, and the reason the cross-reference was worth doing. Both
  // routes' approach text opens "From the Dutch Miller Gap Trailhead", so reading it literally
  // hands the win to the blob. The USFS page for Dutch Miller Gap Trail 1030 says plainly: "The
  // trail begins at Dingford Creek Trailhead", 15.2 miles to the gap. "Dutch Miller Gap" is the
  // TRAIL's name and its destination, not a trailhead — and the blob's coordinate proves it, sitting
  // 7.3 km straight-line from a peak that is 15 trail-miles in, i.e. a point ON the trail. The pin
  // holds the real road end at 14.9 km, consistent with a 15.2-mile trail.
  ["wa_little_big_chief_mountain_northeast_face", "pin"],
  ["wa_northwest_face_4", "pin"],
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
  console.log(`${id}  (${apart} m apart, ${winner} wins)\n   ${before}\n   -> ${after}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", id, body);
  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  const got = winner === "log" ? num(w2 && w2.lat) : num(a2.trailheadLat);
  const want = winner === "log" ? lLat : pLat;
  if (got === null || Math.abs(got - want) > 1e-6) { console.error(`   RECONCILE FAILED — got ${got}, wanted ${want}`); process.exit(1); }
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  if (winner === "pin" && a2.trailheadDirection) { console.error("   DIRECTION SURVIVED"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — still ${now} m apart`); process.exit(1); }
  console.log(`   reconciled: both records agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);
