# Merge rationale — Vanishing Point

Survivor: `wa_vanishing_point` (wa_dolomite_tower). Copy: `wa_baring_mountain_vanishing_point` (wa_baring_mountain).
Only fields in merge-body-baring.json change on the survivor; everything else keeps the survivor value.

## Changed fields (14)

- source: copy — survivor null; copy carries provenance "wa-enrich-batch". Straight gap-fill.
- pitches: merged — both rows store 14, but the survivor's own pitch_detail has 20 entries and its topout/area prose says Grade VI over ~20 bolted pitches; set to 20 for internal consistency with the retained pitch_detail. The 14-vs-20 split-convention fact is now stated in beta.
- gear: merged — survivor's fuller 10-item list, minus the redundant standalone "Quickdraws" entry (draws already listed), plus two copy-only items: approach shoes for the gully/creek, and a sling/prusik for the approach fixed ropes.
- beta: merged — survivor prose kept verbatim; appended one reworded sentence explaining that published pitch counts vary 14-20 by splitting convention (fact from copy, third-party attribution dropped).
- best_season: merged — survivor's "June through early July most stable" contradicted its own season field ("approach gully typically wet/snowy until early-mid Aug"); copy's late-season framing (documented September ascents, June-Sep dry-rock window) is internally consistent. Rewrote to late-July-through-September with the gully-melt caveat.
- what_to_bring: merged — survivor's 15-item list plus copy's approach shoes (survivor's list lacked any approach footwear despite a 3-hour technical approach).
- pro_tips: merged — survivor's 8 tips plus two copy-only tips (use the fixed ropes with a sling/prusik; check variation options before committing).
- watch_out: merged — survivor's 7 items plus two copy-only items (no moderate pitches / no rests; recent rockfall on the wet 5.8 approach slab).
- waypoints: merged — survivor's set, curated: dropped the duplicate "Dolomite Tower / Vanishing Point (top of route)" entry (null-elev twin of the Summit entry), moved the trailhead to position 0, and reworded the trailhead note to remove Mountain Project / trip-report attribution from app-facing text. Copy's lone trailhead waypoint (47.7884,-121.4482, 2200 ft) matches neither row's approach_logistics and was not taken.
- itinerary: merged — survivor's 2-3 day structure kept but its "18-pitch" self-contradiction fixed to 20, and copy's single-day car-to-car option (3 hr approach / full day / 3 hr descent) folded in.
- access: merged — copy's concrete sub-values win (real fees, real Jan-2026 road-washout closure, NW Forest Pass detail incl. Discover-Pass-not-valid) over survivor's "N/A" junk and passRequired:"None"; one landManager key kept (dropped land_manager duplicate, permitZone, and the entire _raw blob, which also wrongly called the rock granite); survivor's outside-wilderness note retained. Copy's "no formal climbing permit" wording beat survivor's self-contradictory wilderness-permit claim.
- road: merged — copy's row is plainly better (actual driving directions from US-2 MP 42, current washout status, seasonalGate note); survivor's Seattle drive-time kept inside driveNote.
- climate: merged — survivor's richer seasonal text kept; copy's forecastZone (NWAC Stevens Pass / West Slopes Central) added, a key the survivor lacked.
- emergency: merged — survivor's notes/ranger-station (with hours)/dispatch kept; nearestHospital replaced: survivor pointed to Snoqualmie Valley Health ~30 mi SW, which is off the US-2 corridor — real corridor options are EvergreenHealth Monroe (closest ER) then Providence Everett, matching the copy and the reality check. County normalized to "Snohomish County, WA".

## Kept survivor (notable decisions, no change written)

- name/grade/grade_num/discipline: survivor per instruction — grade "5.12b", discipline "alpine" (copy said "trad"; see flags).
- fa: survivor — far more complete (Burdo late-1990s establishment + 2020 Kluskiewicz/Carroll rebolt, Stefurak approach work) vs copy's bare "Bryan Burdo, 1999". No material conflict between the rows.
- aspect: survivor "NE" over copy "N" — the route is on the tower's northeast prow (consistent with face, Deep Blue's description, and the area layout).
- season, face, overview, turnaround, approach, descent, descent_text, bail, pitch_detail (20-pitch version with 2020-rebolt notes), timing, detailed_rack, pro_needs, hazards, obj_haz, rappels, permit, comms, gain/loss/dist/max_angle, high_point_ft, alpine_grade, commitment, data_quality, difficulty, approach_logistics, corrections, alpine_draws: survivor — richer or equal; copy's counterparts are subsets or null.
- length_m (427), commitment (V), high_point_ft (5708), classic (false): identical on both.

## Flags

- discipline conflict: survivor "alpine" vs copy "trad". Kept survivor per instruction, but the route is a mostly-bolted free big wall — worth a deliberate vocabulary decision later.
- Grade tier inconsistency left in place: survivor alpine_grade "VI" and its topout note say Grade VI, while commitment on both rows (and the task brief) says Grade V. Not resolvable from the file; reconcile externally.
- FA vs task brief: the brief says "Bryan Burdo/Greg Child, early 1990s"; BOTH rows say Burdo alone, late 1990s (~1998-1999), and neither mentions Greg Child. Kept the survivor's fuller string; verify before "correcting" either way.
- pitches changed 14 → 20: an editorial consistency fix (matches retained 20-entry pitch_detail); if the DB prefers the 14-pitch convention, drop this key and instead trim pitch_detail — do not ship 14 alongside a 20-entry topo.
- Trailhead coordinates disagree three ways across the pair: survivor waypoint 47.7954,-121.46434 (claimed USFS), both rows' approach_logistics 47.7923,-121.4592, copy waypoint 47.7884,-121.4482. Kept the survivor waypoint and left approach_logistics untouched; a single authoritative TH coord should be picked once, globally.
- Survivor's gpx (untouched — copy has none) is a 6-point waypoint-derived pseudo-track whose order runs ...topout → summit → trailhead → summit; it is not a usable track and should probably be nulled or rebuilt, but that exceeds this merge's scope.
- Survivor waypoint internal oddities left as-is: "Dolomite Tower Base" at elev 5200 vs a 5708-ft summit and ~1,500 ft of route; "Topout" elev 5900 above high_point_ft 5708; "Barclay Lake" at -121.4267 sits east of the tower. Coordinates need a dedicated verification pass.
- County: both VP rows say Snohomish, but the sibling row wa_baring_mountain_r1 argues (citing GNIS) that the Baring summit and trailhead are King County. Kept Snohomish for this row; unresolved massif-wide.
- classic is false on both rows despite this being the tower's marquee line; candidate for classic=true, not changed here (out of scope).
- Copy row had reworded-out attributions only in beta ("Mountain Project lists...") — dropped; survivor's corrections field keeps its source-ish "Angle N" mentions, allowed as provenance.
