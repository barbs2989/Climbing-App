// The remaining `audit:summit-pins` contradictions, settled by the ground — IN BOTH DIRECTIONS.
//
// A contradiction says the summit waypoint and the peak's `areas.lat/lng` disagree. It cannot
// say which is wrong, and the answer is not the same one every time: `fix-lemah-two-summit-pin`
// repaired a WAYPOINT, `fix-peak-coords-from-summit-pins` repaired five AREA rows. A script that
// assumes a direction would damage half of what it touches.
//
// So this one DERIVES the direction. The peak states an elevation; the ground states what is at
// each candidate. Whichever candidate is at the claimed height is the summit, and the other is
// the record to overwrite — whichever table it lives in.
//
// TWO PRECISION RULES, both earned by reading the measurements rather than assumed:
//
//   THE MARGIN. Both candidates are often real summits a few hundred metres apart, and then
//   neither record is wrong. Mount Cameron reads 38 ft and 30 ft from its claim, Mount Berge 48
//   and 18. Picking a winner there is noise. The loser must be at least 3x further from the
//   claimed height AND at least 60 ft worse before this writes anything. That rejects Cameron
//   and Berge and keeps Whatcom (822 vs 65) and Gray Wolf (885 vs 12).
//
//   A PIN THAT NAMES A SUB-SUMMIT IS MAKING A DELIBERATE CLAIM, and is never overwritten.
//   Reynolds Peak's pin is named "Reynolds Peak (true/south summit)" and reads 232 ft below its
//   claim while the area reads 38 ft below — the margin rule alone would overwrite it. But
//   somebody asserted which summit that route tops out on, and the ground disagreeing with a
//   deliberate claim is a question for a person, not a licence for a script. Reported instead.
//
// What this leaves, and why each is right:
//   Whatcom Peak (3 routes) — pin 822 ft below the claim; area 65 ft below and near-maximal.
//                             The pin is wrong. THE WAYPOINT is repaired on all three routes.
//   Gray Wolf Ridge         — pin 885 ft below the claim; area 12 ft below. Same, one route.
//   Skookum Peak            — pin reads its claimed 6,534 ft EXACTLY and is a local maximum; the
//                             area is a 99 ft lower bump 679 m away. THE AREA ROW is repaired.
//   Mount Cameron / Mount Berge — two genuine summits, margin too thin. LEFT.
//   Reynolds Peak           — the pin names a sub-summit. LEFT, and reported.
//
// IT DECLARES A WINNER, NEVER A COORDINATE: whichever record wins is copied verbatim onto the
// loser. No number is retyped, so this cannot introduce a value that was not already in the DB.
// Every threshold is re-proved against the live DB and the DEM at write time.
//
//   node scripts/oneoff/fix-summit-contradictions-by-terrain.mjs          # dry run
//   node scripts/oneoff/fix-summit-contradictions-by-terrain.mjs --apply
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { summitProbe, selfTest } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
// Area ids are RESOLVED, never inferred from a route name — 91% of route ids in this catalog
// are derived from the route's name, so `wa_skookum_peak_twinsisters_scramble` says nothing about
// its peak. The first draft guessed `wa_skookum_peak` and got NOT FOUND; the row is
// `wa_skookum_peak_twinsisters`.
const PEAKS = ["wa_whatcom_peak", "wa_gray_wolf_ridge", "wa_skookum_peak_twinsisters", "wa_poltergeist_pinnacle",
               "wa_mount_cameron", "wa_mount_berge", "wa_reynolds_peak"];

const MARGIN_RATIO = 3;    // the loser must be this many times further from the claimed height
const MARGIN_MIN   = 60;   // ft, and this much worse in absolute terms
const MAX_RISE     = 120;  // ft of higher ground tolerated within the probe's 70 m ring
const MIN_MOVE_M   = 25;   // churn floor only — NEVER a "close enough" test, see the Picket note

// A pin whose name qualifies WHICH summit is asserting something a script must not overwrite.
const SUB_SUMMIT = /\b(true|south|north|east|west|middle|main|lower|upper)\s+(summit|peak|top)\b|\bpeak\s*\(|\bsummit\s*\(/i;

const H = { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` };
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };
const rise = t => t.isMax ? 0 : (Number((/\+(\d+) ft/.exec(t.note || "") || [])[1]) || 0);

if (APPLY) requireServiceKey();
console.log("terrain probe calibration:\n" + await selfTest());

let wrotePins = 0, wroteAreas = 0, left = 0;
for (const pid of PEAKS) {
  const [area] = await get(`areas?id=eq.${pid}&select=id,name,lat,lng,elevation_ft,area_type`);
  if (!area) { console.log(`\n${pid}: NOT FOUND — refusing to guess`); left++; continue; }
  console.log(`\n=== ${area.name}  (${area.id})  claims ${area.elevation_ft} ft`);
  if (area.area_type !== "peak" || area.elevation_ft == null) { console.log("   not a peak with an elevation — skipping"); left++; continue; }

  const routes = await get(`routes?area_id=eq.${pid}&select=id,waypoints`);
  const hits = [];
  for (const r of routes) {
    const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
    const i = wps.findIndex(w => /^(summit|topout)$/i.test(String(w.type || "").trim()) && w.lat != null);
    if (i >= 0) hits.push({ route: r.id, wps, i });
  }
  if (!hits.length) { console.log("   no summit pin on any route"); left++; continue; }

  // CLUSTER the pins rather than demanding they agree. Whatcom Peak has four routes: three put
  // the summit at one point and `wa_castle_in_the_sky` puts it exactly on the area coordinate.
  // A disagreeing pin is EVIDENCE about which point is right, not a reason to give up.
  const clusters = [];
  for (const h of hits) {
    const w = h.wps[h.i];
    const c = clusters.find(c => hav(c.lat, c.lng, w.lat, w.lng) <= 50);
    if (c) c.hits.push(h); else clusters.push({ lat: w.lat, lng: w.lng, name: w.name, hits: [h] });
  }
  if (clusters.length > 1)
    console.log(`   ${hits.length} pins fall into ${clusters.length} groups — they do not agree with each other`);

  const p0 = clusters[0];
  const moved = Math.max(...clusters.map(c => hav(c.lat, c.lng, area.lat, area.lng)));
  if (moved <= MIN_MOVE_M) { console.log(`   every pin already coincides with the area (${Math.round(moved)} m)`); left++; continue; }

  const tArea = await summitProbe(area.lat, area.lng);
  for (const c of clusters) c.t = await summitProbe(c.lat, c.lng);
  if (tArea.centre == null || clusters.some(c => c.t.centre == null)) {
    console.log("   the DEM could not answer for every candidate — no evidence, refusing"); left++; continue; }

  const areaOff = Math.abs(tArea.centre - area.elevation_ft);
  for (const c of clusters) c.off = Math.abs(c.t.centre - area.elevation_ft);
  console.log(`   area ${area.lat}, ${area.lng}  ground ${Math.round(tArea.centre)} ft (${Math.round(areaOff)} off) ${tArea.note}`);
  for (const c of clusters)
    console.log(`   pin  ${c.lat}, ${c.lng}  ground ${Math.round(c.t.centre)} ft (${Math.round(c.off)} off) ${c.t.note}` +
      `  [${c.hits.length} route(s), "${c.name || "unnamed"}", ${Math.round(hav(c.lat, c.lng, area.lat, area.lng))} m from the area]`);

  // A pin cluster sitting ON the area coordinate is not a rival candidate — it is the SAME
  // claim, corroborating it. Whatcom Peak's four pins split 3/1, and the lone one is exactly on
  // the area row; comparing that against the area gave 65 ft vs 65 ft, a tie, and the margin
  // rule threw the whole peak out. Only a cluster that actually disagrees can be the challenger.
  const alts = clusters.filter(c => hav(c.lat, c.lng, area.lat, area.lng) > MIN_MOVE_M);
  const agree = clusters.length - alts.length;
  if (agree) console.log(`   ${agree} pin group(s) sit ON the area coordinate — corroboration, not a rival`);
  if (!alts.length) { console.log("   nothing disagrees with the area row"); left++; continue; }
  const best = alts.reduce((a, b) => (b.off < a.off ? b : a));
  const pinWins = best.off < areaOff;
  const [win, lose, tWin] = pinWins ? [best.off, areaOff, best.t] : [areaOff, best.off, tArea];
  if (!(lose >= win * MARGIN_RATIO && lose - win >= MARGIN_MIN)) {
    console.log(`   MARGIN TOO THIN (${Math.round(win)} vs ${Math.round(lose)} ft) — both may be real summits. LEFT.`); left++; continue; }
  if (rise(tWin) > MAX_RISE) {
    console.log(`   the winner has ${rise(tWin)} ft of higher ground beside it — not a summit either. LEFT.`); left++; continue; }

  if (!pinWins && clusters.some(c => c !== best && SUB_SUMMIT.test(String(c.name || "")))
      || (!pinWins && SUB_SUMMIT.test(String(best.name || "")))) {
    console.log(`   the pin NAMES a sub-summit — that is a deliberate claim, not a script's to overwrite. LEFT.`); left++; continue; }

  if (pinWins) {
    console.log(`   => the PIN is the summit; copying it onto areas.${area.id}`);
    if (!APPLY) { left++; continue; }
    await patchRow("areas", area.id, { lat: best.lat, lng: best.lng });
    const [after] = await get(`areas?id=eq.${pid}&select=lat,lng`);
    if (hav(after.lat, after.lng, best.lat, best.lng) > 1) { console.error("   RECONCILE FAILED"); process.exit(1); }
    console.log(`   verified: areas.${area.id} is now ${after.lat}, ${after.lng}`);
    wroteAreas++;
  } else {
    // Only pins that are actually in the wrong place. A route already pinned at the area
    // coordinate is correct and must not be rewritten (nor have a correction note bolted on).
    const wrong = clusters.filter(c => hav(c.lat, c.lng, area.lat, area.lng) > MIN_MOVE_M)
                          .flatMap(c => c.hits.map(h => ({ ...h, c })));
    const right = hits.length - wrong.length;
    console.log(`   => the AREA is the summit; correcting ${wrong.length} route pin(s)` +
      (right ? `, leaving ${right} already correct` : ""));
    if (!APPLY) { left++; continue; }
    for (const h of wrong) {
      const wps = JSON.parse(JSON.stringify(h.wps));
      const old = wps[h.i];
      wps[h.i] = { ...old, lat: area.lat, lng: area.lng,
        note: `${old.note ? old.note + " " : ""}[Coordinate corrected 2026-08-19: the stored pin sat ${Math.round(hav(h.c.lat, h.c.lng, area.lat, area.lng))} m away at ${Math.round(h.c.t.centre)} ft, ${Math.round(h.c.off)} ft from this peak's ${area.elevation_ft} ft. Replaced with the peak's own coordinate, which the ground reads at ${Math.round(tArea.centre)} ft.]` };
      await patchRow("routes", h.route, { waypoints: wps });
      const [after] = await get(`routes?id=eq.${h.route}&select=waypoints`);
      const now = after.waypoints[h.i];
      if (hav(now.lat, now.lng, area.lat, area.lng) > 1) { console.error(`   RECONCILE FAILED on ${h.route}`); process.exit(1); }
      console.log(`      verified: ${h.route} summit pin is now ${now.lat}, ${now.lng}`);
      wrotePins++;
    }
  }
}
console.log(`\n${APPLY ? `wrote ${wrotePins} waypoint(s) and ${wroteAreas} area row(s)` : "DRY RUN — nothing written"}, left ${left}.`);
if (!APPLY) console.log("Re-run with --apply.");
