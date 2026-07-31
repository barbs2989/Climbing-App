# Merge rationale — West McMillan Spire pairs

## Pair 1: wa_mcmillan_spire_west_southwest_ridge ← wa_southwest_ridge

- grade: copy — survivor null; copy's "5.8-" matches survivor's own rock_grade/overview; grade_system yds + grade_num 8 already agree
- hazards: merged — survivor's 3 kept, item 2 reworded to drop "single-digit MP ratings/photos" citation; copy's 2 items already covered semantically
- beta: merged — survivor's facts kept; "Mountain Project directs to Beckey's guide" citation reworded out; added copy's fact that the glacier-to-base line is undocumented
- pro_tips: merged — Beckey/Cascade Alpine Guide attribution reworded to generic printed-guidebook advice; copy's only tip was the same citation
- pro_needs: peak (edited) — dropped "per user notes" attribution; content unchanged
- what_to_bring: merged — survivor's 7 + copy's permit, bear canister, map/GPS; deduped
- itinerary: copy — survivor null; simple 3-day string fills the gap
- access: merged — survivor's base (fees/permit/closures/landManager/passRequired all correct for an NPS trailhead) + copy's notes/rules/permitZone/group_limit; dropped copy's _raw blob, "N/A" fees/closures, duplicate land_manager key, and its wrong "Northwest Forest Pass" (NPS trailhead needs none)
- emergency: merged — survivor base; rangerStation enriched with copy's WIC email + NPS SAR line; sheriffDispatch keeps Whatcom (summit county) + copy's NPS after-hours line; copy's Skagit sheriff dropped
- data_quality: copy — survivor null; provenance field, kept verbatim
- difficulty: copy — survivor null; computed estimate, flagged as such inside data_quality
- sling_rack / alpine_draws / rope_type / rope_length_m / gear_confidence / rack / features: copy — survivor null on all; consistent with the medium-alpine-rack gear list
- rope_note: copy — survivor null; provenance field, MP mention allowed to stay
- corrections: copy — survivor null; provenance field
- fa: NOT taken — copy's "unknown" adds nothing over survivor's null; left null
- timing: peak (unchanged) — copy's is internally inconsistent (7+4+4 hrs vs totalHrs 10); survivor's sparse-but-camp-based numbers kept
- descent/descent_text/pitch_detail/bail/best_season/detailed_rack/overview/turnaround/road/climate: peak — richer, internally consistent, and copy's road is wrong (see flags)

## Pair 2: wa_mcmillan_spire_west_west_ridge ← wa_west_ridge_6

- grade: copy — "4th" is the compact form the column wants; survivor's verbose "Grade II, 4th class (3rd class below)" content already lives in alpine_grade + rock_grade
- rock_grade: merged — survivor's "(3rd class below)" + copy's low-5th-in-spots, matching survivor's own beta/waypoint notes
- hazards: merged — survivor's 5 + copy's fast-deteriorating-weather/long-retreat item (weather was otherwise missing)
- pro_tips: merged — survivor's 3 + copy's trailhead-finding tip (reworded to agree with survivor's group-camp approach text) + copy's late-season axe/crampons tip
- watch_out: merged — survivor's 3 + copy's thin/hollow-snow-probe warning; copy's "reddish summit rock" skipped as likely conflation with the red descent gully already covered
- bail: copy (edited) — survivor's one-liner replaced by copy's concrete gully-crux retreat logic, with survivor's "long but manageable" retained
- access: merged — survivor's content kept wholesale; duplicate land_manager key dropped (landManager kept); + copy's permitZone; + passRequired "None" (from the sibling route's verified NPS-trailhead value; copy's NW Forest Pass claim is wrong)
- emergency: merged — survivor base; rangerStation + hospital enriched with copy's phone numbers and trauma-center alternative; NPS after-hours line appended; copy's Skagit sheriff dropped (Whatcom is the summit county)
- corrections: copy — survivor null; provenance field, source mentions allowed
- discipline: peak — kept "alpine" per rule; see flags
- pitches: NOT taken — copy's pitches=1 is meaningless for a scramble and conflicts with the 4-section pitch_detail; left null
- fa/gear/overview/beta/turnaround/descent/descent_text/pitch_detail/itinerary/timing/waypoints/gpx/climate/road/crowds/partner_requirements/seasonal_*/data_quality: peak — survivor's enrichment is strictly richer and internally consistent; copy's road is wrong (see flags)

## Flags

- BOTH copies' `road` JSONB describes the Ross Lake water taxi from Ross Dam TH — that is Northern Pickets access, not this route. These climbs go in via Goodell Creek at Newhalem. Survivor road kept on both; nothing merged from copy road.
- Copy `access` claims a Northwest Forest Pass is required; the Goodell Creek trailhead is NPS-administered and needs no pass (both survivors and NPS practice agree). Dropped.
- Pair 2 discipline disagreement: survivor "alpine" vs copy "mountaineering". Kept survivor per rule — but note the route crosses the Terror Glacier, which under the glacier-means-mountaineering convention argues for "mountaineering". Review.
- Pair 1 rope/pitch tension: merged rope_length_m 60 (single 60m) while survivor pitch_detail lists 85-90 m "pitches" — those lengths imply simul-climbing blocks, not single rope-stretcher pitches. Internally survivable but worth a look.
- Pair 1 fa left null: copy said "unknown"; no real FA record exists on either side.
- Pair 1 copy timing was internally inconsistent (approach 7 + up 4 + down 4 vs totalHrs 10) — not merged.
- Pair 2 survivor waypoint note calls the summit "Grade III, 5.6 on the west ridge", which contradicts the route's own Grade II / 4th-class rating. Waypoints untouched; consider a follow-up edit.
- Sheriff dispatch ambiguity: summit is Whatcom County but the trailhead/Newhalem side is Skagit; SAR is NPS-coordinated here. Whatcom + NPS after-hours numbers kept, Skagit sheriff number dropped on both.
