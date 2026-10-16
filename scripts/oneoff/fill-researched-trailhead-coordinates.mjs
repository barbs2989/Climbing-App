// The six of the twelve no-donor routes whose trailhead has a PUBLISHED coordinate. Sourced from
// the Forest Service, WTA, Natural Atlas and Gaia; nothing here is derived from another row in this
// catalog, because by definition none holds it.
//
// THIS FILE TYPES COORDINATES, which every other applier in this sweep was built to avoid — the
// "declare a winner, never a coordinate" rule makes invention structurally impossible, and it is
// unavailable here precisely because no winner exists. So the safeguard has to come from somewhere
// else, and it is the route's OWN PEAK: `areas` holds a coordinate for the summit, which is a THIRD
// record neither the trailhead name nor the research touched. A trailhead 60 km from its peak is
// wrong whatever a search result said. That is the same instrument `trackOffItsPeak` uses in
// audit:waypoints to decide which of two disagreeing records is the broken one.
//
// The ceiling is deliberately generous. CLAUDE.md records that 236 WA routes sit more than 8 km
// from their peak and are correct — Hozomeen, the Mox Peaks and the Pasayten summits are genuinely
// 28-31 km out. So this rejects the gross error, not the long approach, and every distance is
// PRINTED so a merely surprising one can be read rather than silently accepted.
//
// NOT INCLUDED, and each for a stated reason rather than for want of trying:
//   wa_mount_crowder_northeast_ridge  is NOT a gap. Its value is "No separate trailhead — over
//                                     Mount Crowder (Southwest Ridge)": the route starts from
//                                     another route's summit, so having no coordinate is CORRECT.
//                                     Filling it would manufacture a trailhead that does not exist.
//   wa_lincoln_peak_standard          "NF-38 / Middle Fork Nooksack" names a 12-mile road, not a
//                                     point. Sources give the valley, not a trailhead.
//   wa_mount_persis_the_hexorcist     "FR-6220 / Anderson Creek drainage (no maintained trail)" —
//                                     the row says outright there is no trail.
//   wa_nest_route, wa_spectacle_route "NF-77 roadside pullout (Pinto Rock, Randle)" — informal.
//   wa_south_face_2                   "Highway 20 Pullout (Milepost 166)" — informal; a milepost is
//                                     locatable in principle but no source publishes this one.
//
// UNCERTAIN, and flagged rather than quietly written:
//   wa_rock_mountain_northeast_ridge  says "OLD Merritt Lake Trailhead". The word "old" may mean a
//                                     former trailhead distinct from today's, and writing today's
//                                     coordinate would silently answer a different question. Listed
//                                     with `uncertain: true` and skipped unless --include-uncertain.
//   wa_kyes_peak_northeast_ridge      says "North Fork Sauk River / Quartz Creek Trailhead", which
//                                     names two different drainages. The published Quartz Creek TH
//                                     is off the North Fork SKYKOMISH. Same treatment.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const UNCERTAIN = process.argv.includes("--include-uncertain");
const key = requireServiceKey();
const MAX_KM = 35;

const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };
const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);

const PLAN = [
  { id: "adams_avalanche_glacier", th: /cold springs/i, lat: 46.1359, lng: -121.4976,
    src: "Forest Service / Gaia GPS — Cold Springs Campground, South Climb Trail #183" },
  { id: "wa_mount_pilchuck_east_ridge", th: /pinnacle lake/i, lat: 48.05855, lng: -121.73622,
    src: "WTA / Natural Atlas — Pinnacle Lake Trailhead" },
  { id: "wa_thunder_mountain_north_face", th: /surprise creek/i, lat: 47.7078, lng: -121.1567,
    src: "WTA — Surprise Creek Trailhead, Scenic WA" },
  { id: "wa_spire_mountain_scramble", th: /north fork skykomish/i, lat: 47.92684, lng: -121.27705,
    src: "Forest Service / Natural Atlas — North Fork Skykomish Trailhead" },
  { id: "wa_rock_mountain_northeast_ridge", th: /merritt lake/i, lat: 47.80788, lng: -120.91268,
    src: "Forest Service — Merritt Lake Trailhead, FR 657 off US-2", uncertain: '"OLD" Merritt Lake TH may be a different, former trailhead' },
  { id: "wa_kyes_peak_northeast_ridge", th: /quartz creek/i, lat: 47.98017, lng: -121.27834,
    src: "Natural Atlas — Quartz Creek Trailhead", uncertain: "the stored name says North Fork SAUK; the published TH is off the North Fork SKYKOMISH" },
];

let wrote = 0, skipped = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  const al = r.approach_logistics || {};
  const stored = String(al.trailhead || "");
  // The name is the premise: if the row now names a different trailhead, this coordinate is for
  // something else entirely.
  if (!p.th.test(stored)) { console.error(`${p.id}: trailhead is "${stored}", not what this plan researched — refusing`); process.exit(1); }
  if (num(al.trailheadLat) !== null) { console.log(`${p.id}: already has a coordinate — skipping`); skipped++; continue; }

  const [area] = await selectAll("areas", "id,name,lat,lng", `id=eq.${r.area_id}`, { pageSize: 3, key });
  const peak = area && num(area.lat) !== null ? [num(area.lat), num(area.lng)] : null;
  const km = peak ? hav(p.lat, p.lng, peak[0], peak[1]) / 1000 : null;

  console.log(`\n${p.id}   "${stored}"`);
  console.log(`   candidate @${p.lat},${p.lng}   (${p.src})`);
  console.log(`   peak ${area ? area.name : "?"} ${peak ? `@${peak[0]},${peak[1]}` : "(NO COORDINATE — cannot validate)"}`);
  console.log(`   distance to peak: ${km === null ? "unknown" : km.toFixed(1) + " km"}`);

  // Fail closed: with no peak coordinate there is no third record, so nothing validates this.
  if (km === null) { console.log(`   SKIP — the peak has no coordinate, so this cannot be checked against anything`); skipped++; continue; }
  if (km > MAX_KM) { console.log(`   SKIP — ${km.toFixed(1)} km from its own peak, beyond the ${MAX_KM} km ceiling; this is the wrong place`); skipped++; continue; }
  if (p.uncertain && !UNCERTAIN) { console.log(`   SKIP (uncertain) — ${p.uncertain}. Re-run with --include-uncertain to write it anyway.`); skipped++; continue; }

  if (!APPLY) { console.log("   (dry run) would write approach_logistics.trailheadLat/Lng"); wrote++; continue; }
  await patchRow("routes", p.id, { approach_logistics: { ...al, trailheadLat: p.lat, trailheadLng: p.lng } });
  const [chk] = await selectAll("routes", "id,approach_logistics", `id=eq.${p.id}`, { pageSize: 3, key });
  const a2 = chk.approach_logistics || {};
  if (Math.abs(+a2.trailheadLat - p.lat) > 1e-6 || Math.abs(+a2.trailheadLng - p.lng) > 1e-6) { console.error("   RECONCILE FAILED"); process.exit(1); }
  for (const k of Object.keys(al)) if (k !== "trailheadLat" && k !== "trailheadLng" && JSON.stringify(a2[k]) !== JSON.stringify(al[k])) { console.error(`   LOST approach_logistics.${k}`); process.exit(1); }
  console.log("   reconciled, and no other approach_logistics key changed");
  wrote++;
}
console.log(`\n${APPLY ? `wrote ${wrote}` : `DRY RUN — ${wrote} would be written`}, ${skipped} skipped.`);
