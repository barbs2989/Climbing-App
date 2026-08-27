// Stamp routes.access_checked_at for the road/access claims actually read against a primary source.
//
// 0172 adds the column and deliberately backfills NOTHING: we do not know when the existing prose
// was written, so stamping now() catalog-wide would assert that 205,492 stale claims were checked
// today — fabricating the verifications the column exists to expose.
//
// This stamps the rows where the checking really happened, on 27 Aug 2026, each against a named
// primary source. Nothing here is a guess and nothing is bulk.
//
// WHAT DISQUALIFIES A ROW FROM THIS LIST, because that is the part that keeps the column meaningful:
//   - being EDITED today is not being CHECKED. A row whose prose was improved by copying a sibling's
//     order number was not read against a source; the SOURCE row was.
//   - being in a cluster whose road was checked is not enough either. The check is per road, and a
//     row is only stamped if the source read covers the road THAT ROW describes.
//   - Harts Pass is excluded outright: it was researched and came back UNSETTLEABLE (public sources
//     stop at May 2026). A failed check is not a check, and stamping it would claim currency the
//     research explicitly could not establish.
//
// Report-only without --apply. Idempotent: a row already carrying this date is skipped, not
// re-written, so a re-run cannot silently move the date forward.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
// Stamped as noon UTC so the rendered date cannot shift by a day for a reader west of Greenwich —
// the same trap check:anniversary records for locally-constructed dates.
const CHECKED = "2026-08-27T12:00:00Z";

/* Each group names the primary source that was read. The ROUTES are those whose road/access prose
   describes that road — verified by re-reading the row below, not assumed from the cluster. */
const GROUPS = [
  { source: "USFS alert, Suiattle River Road washout closure — order 06-05-26-03, 2 Apr 2026 to 1 Jan 2028",
    must: /suiattle|06-05-26-03|downey creek/i,
    ids: ["wa_dome_peak_dome_glacier", "wa_dome_peak_indian_summer", "wa_east_face", "wa_gunrunner",
          "wa_elephant_head_standard", "wa_gunsight_peak_standard", "wa_lizard_mountain_south_route",
          "wa_old_guard_peak_southwest_route", "wa_old_guard_peak_east_side_route", "wa_mount_buckindy_scramble"] },

  { source: "USFS alert, Railroad and Preston Creek road closures — order 06-17-05-26-04, 28 Jan 2026 to 31 Dec 2027 (FSR 8301 from the Lucerne commercial dock)",
    must: /8301|holden|lucerne/i,
    ids: ["wa_bonanza_peak_mary_green_glacier", "wa_bonanza_peak_north_ridge",
          "wa_bonanza_peak_northeast_buttress", "wa_bonanza_peak_west_ridge", "wa_soviet_route",
          "wa_north_star_mountain_east_route", "wa_north_star_mountain_cloudy_peak_traverse",
          "wa_copper_peak_south_route"] },

  { source: "MBS alert, Middle Fork Nooksack (FSR 38) road closure — closed at Mile Post 7 by a washout, posted 27 Jul 2026",
    must: /FSR? ?38|FR[- ]?38|elbow lake/i,
    ids: ["wa_little_sister_north_face", "wa_little_sister_southeast_ridge", "wa_little_sister_west_face",
          "wa_little_sister_south_couloir", "wa_cinderella_peak_scramble"] },

  { source: "Okanogan-Wenatchee alert, Labor Mountain Fire road and trail closure — 20 May to 31 Dec 2026",
    must: /labor mountain|beverly|9737/i,
    ids: ["wa_argonaut_peak_east_ridge", "wa_south_face_12"] },

  { source: "Okanogan-Wenatchee alert, FR 6200 beyond Atkinson Flat — order 06-17-07-2026-11, 20 May 2026 to 31 Dec 2027",
    must: /6200|atkinson|chiwawa/i,
    ids: ["wa_buck_mountain_south_ridge", "wa_carne_mountain_trail_route",
          "wa_fortress_mountain_east_ridge", "wa_fortress_mountain_southwest_face",
          "wa_chiwawa_mountain_southwest", "wa_cloudy_peak_southwest_slopes", "wa_dumbell_mountain_west"] },

  { source: "NPS North Cascades road conditions — Cascade River Road gated at Eldorado (MP 20) for the 2026 season",
    must: /cascade river road|eldorado/i,
    ids: ["wa_forbidden_peak_east_ridge", "wa_boston_peak_west_face", "wa_horseshoe_peak_scramble"] },

  { source: "NPS North Cascades fire update, 10 Aug 2026 — Border 2 Fire still active, Silver-Skagit Road closed at km 6",
    must: /silver[- ]skagit|hozomeen|border 2/i,
    ids: ["wa_hozomeen_mountain_north_peak_north_route", "wa_hozomeen_mountain_north_peak_south_ridge",
          "wa_hozomeen_mountain_south_peak_north_ridge", "wa_castle_peak_pasayten_scramble"] },
];

if (APPLY) requireServiceKey();

const ids = [...new Set(GROUPS.flatMap(g => g.ids))];
const rows = await selectAll("routes", "id,road,access,access_checked_at", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) {
  const got = new Set(rows.map(r => r.id));
  console.error(`read ${rows.length} of ${ids.length}; missing: ${ids.filter(i => !got.has(i)).join(", ")}`);
  process.exit(1);
}
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

const textOf = r => {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  return [rd.name, rd.status, rd.seasonalGate, rd.driveNote, ac.closures, ac.seasonal]
    .filter(v => typeof v === "string").join(" ");
};

let ok = true, toStamp = [], already = 0;
for (const g of GROUPS) {
  console.log(`\n${g.source}`);
  for (const id of g.ids) {
    const r = byId[id];
    /* THE ROW MUST STILL DESCRIBE THE ROAD THAT WAS CHECKED. Without this the list is a claim from
       memory: routes move between areas and prose gets rewritten, and a stamp on a row that no
       longer mentions the road would assert a check that never covered it. */
    if (!g.must.test(textOf(r))) { console.log(`   REFUSE  ${id} — its road prose no longer names this road`); ok = false; continue; }
    if (r.access_checked_at) { console.log(`   already ${id} — ${r.access_checked_at}`); already++; continue; }
    console.log(`   stamp   ${id}`);
    toStamp.push(id);
  }
}

console.log(`\n${toStamp.length} to stamp, ${already} already carried a date, across ${ids.length} route(s).`);
if (!ok) { console.error("refusing to apply while any row is refused"); process.exit(1); }
if (!toStamp.length) { console.log("nothing to do"); process.exit(0); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const id of toStamp) await patchRow("routes", id, { access_checked_at: CHECKED });

const after = await selectAll("routes", "id,access_checked_at", `id=in.(${toStamp.join(",")})`);
const bad = after.filter(r => !r.access_checked_at);
console.log(bad.length ? `\n${bad.length} did not land: ${bad.map(r => r.id).join(", ")}`
  : `\nverified: ${after.length} route(s) now record when their road and access claims were last checked.`);
process.exit(bad.length ? 1 : 0);
