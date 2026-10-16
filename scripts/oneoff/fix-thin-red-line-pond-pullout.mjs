// wa_liberty_bell_thin_red_line: an inconsistency THIS SWEEP created, now settled.
//
// An earlier batch of mine (slice ad) resolved this route to "Washington Pass East Face Trailhead
// (Pond Approach)" @48.5245,-120.6581 from its own prose, without checking its siblings. Its four
// east-face siblings — liberty_crack, liberty_crack_free, liberty_bell_east_face,
// liberty_and_injustice_for_all — hold the hairpin/pond pullout @48.51454,-120.64332, and slice ah
// added three more (lexington_tower_east_face, tooth_and_claw, flycatcher_buttress). Seven routes
// on one approach at one coordinate, and this route 1.5 km away.
//
// audit:trailhead-agreement CANNOT SEE IT: this row's two records agree with each other, so there
// is no disagreement to report. It is the same blind spot as
// wa_inner_constance_northwest_buttress, reached from the opposite direction — there both records
// were wrong together, here both are merely in the wrong place together.
//
// THE REJECTION OF THE CURRENT VALUE IS EXTERNAL, NOT A VOTE, and that distinction is the whole
// reason this is safe to write. Washington Pass is at 48.5233,-120.6550. The value this row holds
// sits 264 m WEST-north of the pass — 0.16 mi, on the wrong side of it, which is the overlook, not
// a pullout east of the pass. The east-face approach is described by two of this route's own
// neighbours as "the pond pullout on the south side of SR-20, about 1.2 miles EAST of Washington
// Pass" and "a short walk east of the small pond". 0.16 mi west cannot be 1.2 miles east.
//
// The value written comes from the sibling family (0.81 mi east of the pass — right side, right
// order of magnitude), so the DESTINATION is a consensus value even though the rejection is not.
// That is worth stating plainly rather than implying the whole decision was independent: without a
// published coordinate for this informal pullout, the seven-route family is the best available
// answer, and it is at least on the correct side of the pass.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const ID = "wa_liberty_bell_thin_red_line";
const NAME = "SR-20 Hairpin / Pond Pullout (east of Washington Pass)";
const LAT = 48.51454, LNG = -120.64332;
const PASS = [48.5233, -120.6550];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

// The target must be what the siblings actually hold RIGHT NOW, not what I remember them holding.
const sibs = await selectAll("routes", "id,approach_logistics",
  `id=in.(wa_liberty_crack,wa_liberty_crack_free,wa_liberty_bell_east_face,wa_lexington_tower_east_face,wa_tooth_and_claw,wa_flycatcher_buttress)`,
  { pageSize: 10, key });
const agreeing = sibs.filter(s => {
  const al = s.approach_logistics || {};
  return num(al.trailheadLat) !== null && Math.round(hav(LAT, LNG, +al.trailheadLat, +al.trailheadLng)) <= 50;
});
console.log(`sibling check: ${agreeing.length} of ${sibs.length} east-face routes hold the target within 50 m`);
if (agreeing.length < 4) { console.error("fewer than 4 siblings agree — the family has moved since this was researched, refusing"); process.exit(1); }

const [r] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${ID}`, { pageSize: 3, key });
if (!r) { console.error(`${ID}: NOT FOUND`); process.exit(1); }
const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
const al = r.approach_logistics && typeof r.approach_logistics === "object" ? r.approach_logistics : null;
if (i < 0 || !al) { console.error("expected both records — refusing"); process.exit(1); }

const cur = [num(wps[i].lat), num(wps[i].lng)];
const already = Math.round(hav(LAT, LNG, cur[0], cur[1]));
if (already <= 500) { console.log(`already at the target (${already} m) — nothing to do`); process.exit(0); }
console.log(`current  "${wps[i].name}" @${cur[0]},${cur[1]}`);
console.log(`   ${Math.round(hav(PASS[0], PASS[1], cur[0], cur[1]))} m from Washington Pass, on the ${cur[1] < PASS[1] ? "WEST" : "east"} side`);
console.log(`target   "${NAME}" @${LAT},${LNG}`);
console.log(`   ${Math.round(hav(PASS[0], PASS[1], LAT, LNG))} m from Washington Pass, on the ${LNG < PASS[1] ? "west" : "EAST"} side`);
if (!APPLY) { console.log("\n(dry run) pass --apply to write"); process.exit(0); }

await patchRow("routes", ID, {
  waypoints: wps.map((w, n) => n === i ? { ...w, name: NAME, lat: LAT, lng: LNG } : w),
  approach_logistics: { ...al, trailhead: NAME, trailheadLat: LAT, trailheadLng: LNG },
});
const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${ID}`, { pageSize: 3, key });
const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
const a2 = chk.approach_logistics || {};
if (Math.abs(+w2.lat - LAT) > 1e-6 || Math.abs(+a2.trailheadLat - LAT) > 1e-6) { console.error("RECONCILE FAILED"); process.exit(1); }
if ((chk.waypoints || []).length !== wps.length) { console.error("WAYPOINT COUNT CHANGED"); process.exit(1); }
console.log(`\nreconciled: both records now hold "${a2.trailhead}", agreeing to ${Math.round(hav(+w2.lat, +w2.lng, +a2.trailheadLat, +a2.trailheadLng))} m`);
