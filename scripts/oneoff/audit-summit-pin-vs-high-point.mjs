// REPORT-ONLY. A row that stores TWO elevations for one summit -- its `high_point_ft` column and
// its own Summit waypoint -- is contradicting itself, and it needs no external source to say so.
//
// This has turned up in three consecutive audit batches and two were repaired by hand:
//   wa_big_snagtooth_west_ridge        pin 8379 vs high_point_ft 8374  (a differential-GPS survey
//                                      independently gives 8,374.3 +/- 0.1) -- REPAIRED
//   wa_castle_peak_tatoosh_la_villa    pin 6460 vs high_point_ft 6440  (Wikipedia gives 6,440;
//                                      Mountain Project gives 6,393 for the very coordinates the
//                                      pin copied, which are MP's AREA centroid) -- REPAIRED
//   wa_chianti_spire_*                 pin 8400 vs high_point_ft 8459, on BOTH rows
//
// IT IS USER-VISIBLE ON TWO SURFACES AT ONCE. `high_point_ft` renders in the route header strap;
// the waypoint elevation renders in the waypoint list AND is written into the GPX file a climber
// downloads and carries. So the two numbers are read in different places by the same person.
//
// WHY A THRESHOLD AT ALL: waypoint elevations in this catalog are rounded to the nearest 10 or 20
// ft and summit figures differ between survey sources by a few feet, so a small gap is noise rather
// than a contradiction. 25 ft is above the rounding and below every instance found by hand.
//
// WHICH FIGURE IS RIGHT IS NOT DECIDABLE HERE, and the script does not guess. It reports the pair.
// Where the two agree to within the threshold the row is silent, which is the common case.
//
// PRECISION WENT 143 -> 43 -> 34 AND I STOPPED THERE. Each narrowing was structural:
//   * match the `type` field, never the NAME (a Junction called "Little Jack summit", a Water point
//     "Summit Chief Lake talus basin", a Hazard "Bergschrund on the summit snow finger");
//   * require the pin to NAME THE SAME SUMMIT as the row's own peak, because `high_point_ft` is the
//     ROUTE'S high point while a Summit pin may legitimately mark a different one -- Curtis Ridge
//     tops out at 13,800 ft with a pin on Columbia Crest at 14,406, and both are right.
// The remaining 34 still carry noise -- traverses whose first summit is not the highest, and crag
// top-outs ~99 ft off a ridge figure -- and tightening further would be fitting the detector to its
// own output, which is the failure this repo records under half a dozen names. Read the pair.
//
// THE 34 WERE READ, 2026-09-03, and this is what they are -- recorded because I started to
// re-derive the paragraph above rather than reading it. Three explicable classes:
//   - THE PIN NAMES A POINT THE ROUTE PASSES THROUGH, not one it ends at: "Lexington Tower
//     notch", "Der Dihedral base area", "The Tooth summit (traverse start point)".
//   - THE ROW IS A TRAVERSE -- and the MECHANISM is what the note above does not say.
//     wa_tooth_chair_traverse pins The Tooth (5,606) against a high_point_ft of Chair Peak's
//     6,238; both are right. The `su.length !== 1` filter reports ZERO traverses skipped on a
//     full run, because a traverse row typically pins only ONE of its summits -- so there is no
//     second summit pin for that filter to detect, and the class it exists to exclude walks
//     straight past it. CLAUDE.md: traverses belong to no single peak.
//   - THE PIN NAMES THE FORMATION CLIMBED and the AREA *is* that formation ("Ed Wood Memorial
//     Buttress"), so the identity test above passes and the comparison is still weak.
//
// A SUBFEATURE DENY-LIST WAS CONSIDERED AND REJECTED, which is worth naming because the next
// session will reach for the same rule. The camp solver's test -- a structure noun the matched
// feature lacks means a DIFFERENT place standing near it -- does NOT transfer here: a route
// that ENDS at a top-out or a notch has that point as its high point, so the disagreement is
// real. Suppressing "top-out" would have silenced wa_moss_out_for_harambe and wa_ez_way, where
// the pin sits 54-99 ft ABOVE the stated high_point_ft and one of the two is simply wrong.
//
// IT FOUND A FOLLOW-ON FROM ITS OWN FOUNDING REPAIR, which is the best evidence it is measuring
// something real: wa_castle_peak_tatoosh_southeast_face pins The Castle's summit at 6,640 ft, while
// the sibling row repaired above had 6,460 and the column says 6,440. THREE elevations for one
// summit across one peak's rows.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();
const rows = await selectAll("routes", "id,high_point_ft,gain_ft,waypoints,areas!inner(name,path,elevation_ft)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: KEY });
console.log("WA rows:", rows.length);
if (rows.length < 5000) { console.error("SHORT READ"); process.exit(1); }

const TOL = 25;
const elevOf = w => {
  // NULL IS NOT ZERO. Number(null) is 0 and isFinite(0) is true, so a waypoint with no elevation
  // would read as a summit at sea level and every row carrying one would be a finding. This repo
  // has already shipped that coercion twice -- a 12,215 km waypoint distance, and a gain check
  // that manufactured 71% of its own findings.
  const v = w.elev ?? w.elevFt ?? w.elev_ft;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

let compared = 0, multi = 0, offpeak = 0;
const hits = [];
for (const r of rows) {
  const hp = r.high_point_ft === null || r.high_point_ft === undefined ? null : Number(r.high_point_ft);
  if (!Number.isFinite(hp) || hp <= 0) continue;
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  // MATCH THE `type` FIELD, NEVER THE NAME. A first version tested name+type for /summit/ and
  // reported 143, whose whole top end was correct data: a Junction called "Little Jack summit
  // (ridge crest en route to ...)", a Campsite "Talus Basin Below the Summit Chief Group", a Water
  // point "Summit Chief Lake talus basin", a Hazard "Bergschrund on the summit snow finger". None
  // of those is a summit; they merely mention one. `type` is the structured field and says so.
  const su = wps.filter(w => String(w.type || "").trim().toLowerCase() === "summit");
  // A TRAVERSE HAS SEVERAL SUMMITS AND EVERY ONE OF THEM IS CORRECT. wa_traverse_of_mount_index
  // pins "Mount Index - North Peak (first of three summits)" at 5,338 ft against a high_point_ft
  // of 5,991 -- the main peak -- and both are right. Requiring exactly ONE summit pin excludes that
  // whole class structurally, rather than by a keyword test on the route name.
  if (su.length !== 1) { multi += su.length ? 1 : 0; continue; }
  for (const w of su) {
    // THE PIN MUST NAME THE SAME SUMMIT THE ROW IS ABOUT, and this is what the class actually is.
    // `high_point_ft` is the ROUTE'S high point; a Summit pin may legitimately mark a DIFFERENT
    // summit, and then the two disagree correctly:
    //   wa_mount_rainier_curtis_ridge   hp 13,800 (where the ridge tops out) vs a pin on "Columbia
    //                                   Crest" at 14,406 (Rainier's true summit). Both right.
    //   wa_plan_9_from_outer_space      pin "Ed Wood Memorial Buttress" -- the feature climbed, not
    //                                   the peak.
    //   wa_junior_s_farm                pin "Tyler Peak" on a crag route 1,448 ft below it.
    // The two instances repaired by hand both had the pin naming the peak itself ("Big Snagtooth
    // Summit", "The Castle summit"). So require the pin name and the AREA name to share a
    // distinctive word -- which is a structural test on identity, not a keyword list about routes.
    const GENERIC = new Set(["summit","peak","mountain","mount","the","of","and","spire","tower",
      "rock","point","ridge","true","north","south","east","west","upper","lower","main"]);
    const words = t => new Set(String(t || "").toLowerCase().split(/[^a-z0-9]+/)
      .filter(x => x.length > 2 && !GENERIC.has(x)));
    const pinW = words(w.name), areaW = words(r.areas.name);
    if (!areaW.size || ![...pinW].some(x => areaW.has(x))) { offpeak++; continue; }
    const e = elevOf(w);
    if (e === null) continue;
    compared++;
    const d = Math.abs(e - hp);
    if (d < TOL) continue;
    // A THIRD FIELD CAN ADJUDICATE, AND IT SETTLED THE FIRST CASE THIS AUDIT COULD NOT.
    // `gain_ft` is derived from a summit height, so it agrees with whichever of the two the author
    // actually used. On the Chianti Spire pair it is decisive: gain_ft 4450 = pin 8400 - trailhead
    // 4250 + the row's own stated 300 ft re-gain, EXACTLY, where high_point_ft 8459 would give
    // 4509. So the pin and gain_ft are the coherent pair and the column is the outlier -- a
    // direction reached by arithmetic rather than by picking a source.
    // It only speaks where a trailhead pin carries an elevation, and it is SILENT rather than
    // guessing otherwise; a tolerance is allowed because a route re-gains ground on the way in.
    let arb = null;
    const thW = wps.find(x => /trailhead/i.test(String(x.type || "") + String(x.name || "")));
    const thE = thW ? elevOf(thW) : null;
    const g = r.gain_ft === null || r.gain_ft === undefined ? null : Number(r.gain_ft);
    if (thE !== null && Number.isFinite(g) && g > 0) {
      const dPin = Math.abs(g - (e - thE)), dHp = Math.abs(g - (hp - thE));
      // require a clear separation, or the arbitration says nothing
      if (Math.min(dPin, dHp) <= 15 && Math.abs(dPin - dHp) >= 20) arb = dPin < dHp ? "PIN" : "high_point_ft";
    }
    hits.push({ id: r.id, peak: r.areas.name, pin: e, hp, d, arb,
      area: r.areas.elevation_ft ?? null, type: String(w.type || ""), name: String(w.name || w.type || "") });
  }
}
hits.sort((a, b) => b.d - a.d);
console.log(`\nrows skipped as multi-summit traverses (several summit pins, all legitimate): ${multi}`);
console.log(`pins skipped as naming a DIFFERENT summit or feature from the row's own peak: ${offpeak}`);
console.log(`summit pins compared against their row's own high_point_ft: ${compared}`);
console.log(`disagreeing by ${TOL} ft or more: ${hits.length}\n`);
for (const h of hits) {
  const agree = h.area == null ? "" :
    `   area says ${h.area} ft -> ${Math.abs(h.area - h.hp) <= Math.abs(h.area - h.pin) ? "closer to high_point_ft" : "closer to the PIN"}`;
  console.log(`  !! ${h.id.padEnd(44)} pin ${String(h.pin).padStart(6)} vs hp ${String(h.hp).padStart(6)} (${String(h.d).padStart(4)} ft)` + (h.arb ? `   gain_ft agrees with the ${h.arb}` : "") + `   name=${JSON.stringify(h.name.slice(0,40))}`);
}
console.log(`\nREPORT-ONLY. The peak's own \`areas.elevation_ft\` is printed as a THIRD record where it`);
console.log(`exists, because it is written by a different pass -- but it is not decisive on its own:`);
console.log(`on wa_castle_peak_tatoosh_la_villa the pin had copied Mountain Project's AREA centroid,`);
console.log(`so the "third record" and the wrong pin shared a source. Read the row.`);
