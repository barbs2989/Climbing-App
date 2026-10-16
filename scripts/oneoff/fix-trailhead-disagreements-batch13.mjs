// Slice aj: the three disagreements that APPEARED DURING this sweep, each on a different witness.
//
// These were not in the backlog when it was captured — a parallel session enriching approaches
// added them while the earlier batches were running. That is the moving-target property this sweep
// has hit repeatedly, and it is why a count from an earlier run is never the worklist.
//
//   wa_glacier_peak_disappointment_peak_cleaver -> LOG, on its own prose.
//     "From the North Fork Sauk River Trailhead (2,050 ft, end of Sloan Creek Road/FR 49), the
//     North Fork Sauk River Trail (#649) climbs gently..." The pin held Trinity Trailhead on the
//     Chiwawa River Road, a different approach to Glacier Peak from the other side of the massif.
//     Consistent with wa_glacier_peak_sitkum_glacier, fixed to North Fork Sauk earlier in this
//     sweep. THE TRACK DISAGREES and is overruled: it votes pin at only 3x, and its start is 8.4 km
//     from that pin, so it is a partial track that begins nowhere near either trailhead.
//
//   wa_mount_barnes_scramble -> PIN, on a road closure, against a 2693x track vote.
//     The route documents two approaches and its blob holds WHISKEY BEND — behind the Elwha
//     closure (no vehicles past Madison Falls since September 2024, indefinitely). Its pin holds
//     the Sol Duc trailhead, which is drivable, and sits ~100 m from the Sol Duc coordinate an
//     earlier batch settled for wa_mount_ferry_standard.
//     THE TRACK STARTS 7 m FROM WHISKEY BEND — the strongest vote in the whole sweep, and it is
//     still the wrong answer. A recorded ascent proves a party once drove there; it cannot prove
//     they could today. A track is evidence about the past, and a closure is evidence about now.
//     Same verdict as Meany, Noyes and Queets, which is what makes it a pattern rather than a
//     one-off judgement.
//
//   wa_mount_berge_southwest_route -> PIN, on the track.
//     Track start sits 87 m from the pin's Little Giant Trailhead and 5.2 km from the blob's
//     Trinity Trailhead, independent (not a digit-copy). The prose frames Trinity as the road end
//     and then routes the SOUTHWEST approach "via the Little Giant", which is this route.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const PLAN = [
  ["wa_glacier_peak_disappointment_peak_cleaver", "log"],
  ["wa_mount_barnes_scramble", "pin"],
  ["wa_mount_berge_southwest_route", "pin"],
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
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  if (i < 0 || !al) { console.error(`${id}: missing a record — refusing`); process.exit(1); }
  const pLat = num(wps[i].lat), pLng = num(wps[i].lng);
  const lLat = num(al.trailheadLat), lLng = num(al.trailheadLng);
  if (pLat === null || lLat === null) { console.error(`${id}: a record has no coordinate — refusing`); process.exit(1); }
  const apart = Math.round(hav(pLat, pLng, lLat, lLng));
  if (apart <= 500) { console.log(`${id}: records now agree (${apart} m) — skipping`); skipped++; continue; }

  let body;
  if (winner === "log") {
    body = { waypoints: wps.map((w, n) => n === i ? { ...w, name: al.trailhead || w.name, lat: lLat, lng: lLng } : w) };
    console.log(`${id} (${apart} m, log wins)\n   pin "${wps[i].name}" -> "${al.trailhead}" @${lLat},${lLng}`);
  } else {
    const next = { ...al, trailhead: wps[i].name, trailheadLat: pLat, trailheadLng: pLng };
    delete next.trailheadDirection;
    body = { approach_logistics: next };
    console.log(`${id} (${apart} m, pin wins)\n   log "${al.trailhead}" -> "${wps[i].name}" @${pLat},${pLng}  (direction dropped)`);
  }
  if (!APPLY) { console.log("   (dry run)\n"); continue; }
  await patchRow("routes", id, body);
  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — ${now} m apart`); process.exit(1); }
  console.log(`   reconciled to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned.`);
