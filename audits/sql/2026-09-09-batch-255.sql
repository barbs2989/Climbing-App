-- WA alpine route audit -- batch 255 (pass 5)
-- Routes checked: wa_eldorado_peak_west_arete, wa_elephant_butte_standard_route,
-- wa_elephant_head_standard, wa_energizer_bunny, wa_fire_on_the_mountain,
-- wa_fish_whistle, wa_flora_mountain_southwest_slope, wa_flycatcher_buttress

-- Elephant Head, Standard Route: high_point_ft (7990) disagrees with THIS SAME ROW's
-- own summit waypoint (elev 7995) and its own approach prose ("toward the peak's high
-- point at 7,995 ft"), and with the areas table's own elevation_ft for wa_elephant_head
-- (7995) -- three internal records agree on 7995 against one outlier. Correcting to
-- match the row's own waypoint/prose and the area record, the same standard used for
-- the Dome Peak high_point_ft fix in batch 251.
UPDATE routes SET high_point_ft = 7995
WHERE id = 'wa_elephant_head_standard' AND high_point_ft = 7990;

-- Elephant Head, Standard Route: top-level permit column is blank even though this
-- same row's own access jsonb already carries the correct, fully-researched answer
-- ("Free self-issue wilderness permit at the Downey Creek trailhead kiosk - no quota
-- or reservation on the Forest Service side"). Re-homing that into the permit column
-- so the fact reaches wherever the app reads the scalar field from, rather than only
-- from inside the access object. No new research -- copied from this row's own data.
UPDATE routes SET permit = 'Mt. Baker-Snoqualmie National Forest, Darrington Ranger District (Glacier Peak Wilderness): free self-issue wilderness permit at the Downey Creek trailhead kiosk, no quota or reservation. Northwest Forest Pass required for trailhead parking.'
WHERE id = 'wa_elephant_head_standard' AND permit IS NULL;

-- Energizer Bunny (Prusik Peak): watch_out is stored as a single string with embedded
-- newlines instead of the jsonb array of strings every other route on this batch (and
-- the overwhelming majority of the catalog) uses -- the same shape defect documented
-- systemically in batch 251. Re-homed into a proper array. While re-homing, also
-- corrected "(8,900+ ft)" to "(8,000+ ft)": Prusik Peak's summit is 8,008 ft per this
-- same row's own high_point_ft, its own summit waypoint, the areas table's
-- elevation_ft (8008), and Wikipedia's cited 8,008 ft (2,441 m) -- nothing in this row
-- reaches 8,900 ft anywhere. Same kind of internal-number correction as the Dorado
-- Needle rope_note pitch-count fix in batch 251; every other word is unchanged.
UPDATE routes SET watch_out = '["Sustained 5.10 climbing with exposure", "Altitude weather hazard (8,000+ ft)", "Route-finding complexity on upper pitches", "Loose rock hazard in mixed sections", "Descent rappel complexity"]'::jsonb
WHERE id = 'wa_energizer_bunny' AND jsonb_typeof(watch_out) = 'string';

-- Fish & Whistle (Vesper Peak, North Face): same string-shaped watch_out defect as
-- Energizer Bunny above -- re-homed into an array, content otherwise preserved
-- verbatim, EXCEPT one bullet is dropped: "Altitude and sustained climbing-8000+ feet
-- with continuous elevation; altitude sickness possible; hydration and energy
-- management critical." Vesper Peak's summit is 6,214-6,221 ft (this row's own
-- high_point_ft, the areas table's elevation_ft, this row's own waypoints, and
-- Wikipedia all agree it is nowhere near 8,000 ft), so this bullet describes a
-- different, much higher route and does not apply here -- altitude sickness is not a
-- credible hazard at 6,200 ft. Reads as boilerplate carried over from a higher peak's
-- template rather than route-specific content. Removing the one unsupported bullet
-- rather than inventing a corrected number for a claim ("altitude sickness possible")
-- that would still be false of this route at any accurate elevation.
UPDATE routes SET watch_out = '["Sustained 5.9/5.10- friction and seam climbing with real runouts between bolts on slab pitches—protection strategy critical; runout potential of 20+ feet on some pitches if protection fails; requires bold climbing and good bolt reading", "Route-finding through short connector pitch (P4)—easy to miss or take variant that increases difficulty; study topo and photos; clear marking or experience essential to identify correct line", "Slab exposure on upper pitches—significant consequence if protection fails; route-finding errors can lead to unprotectable climbing; thorough topo study mandatory", "Weather exposure on open northeast face—afternoon storm potential; exposed position dangerous with lightning; wind common on slab sections; start early and monitor weather", "Approach terrain loose and exposed—scrambling on granite requires caution; early season snow/ice possible on approach; late season loose rock hazard", "Descent via rappels and down-climbing—route-finding important; terrain can be confusing in darkness; headlamps required; inspect anchor quality carefully", "Friable rock on some sections—typical North Cascades granite; test holds and placements; helmet recommended due to rockfall potential from above"]'::jsonb
WHERE id = 'wa_fish_whistle' AND jsonb_typeof(watch_out) = 'string';

-- Flora Mountain, Southwest Slope: top-level permit column states generic "North
-- Cascades NP complex ... backcountry permit (reserve on Recreation.gov or walk-up at
-- the Marblemount Wilderness Information Center)" boilerplate that contradicts this
-- same row's own carefully researched access jsonb, which correctly documents mixed
-- jurisdiction: the initial Stehekin corridor is NPS (Lake Chelan National Recreation
-- Area), but Bird Creek Camp and the summit -- where a party would actually camp and
-- climb -- lie in the Glacier Peak Wilderness (Okanogan-Wenatchee NF, USFS), which
-- requires NO wilderness permit. Corroborated externally: the Devore Creek Trail
-- (this row's own approach) is documented by the Mountaineers/SummitPost/trip reports
-- as entering Glacier Peak Wilderness beyond the NPS boundary, and Bird Creek Camp
-- (4,200 ft) sits within it. Re-homing this row's own access.permit language into the
-- scalar column rather than inventing anything new.
UPDATE routes SET permit = 'Mixed jurisdiction: no permit required for day hiking or for camping at Bird Creek Camp, which lies within the Glacier Peak Wilderness (Okanogan-Wenatchee National Forest). The initial corridor out of Stehekin passes through NPS-managed Lake Chelan National Recreation Area, where an NPS backcountry permit would apply only if camping on that NPS-managed stretch.'
WHERE id = 'wa_flora_mountain_southwest_slope'
  AND permit LIKE 'North Cascades NP complex%';

-- Flycatcher Buttress (North Early Winters Spire): watch_out is a bare newline-joined
-- string instead of a jsonb array -- same shape fix as above, content unchanged.
UPDATE routes SET watch_out = '["Sustained 5.10b climbing on buttress terrain", "Mixed terrain with loose rock throughout sections", "Weather exposure on sustained climbing pitches", "Route-finding near summit can be challenging", "Descent involves multiple rappels through variable terrain"]'::jsonb
WHERE id = 'wa_flycatcher_buttress' AND jsonb_typeof(watch_out) = 'string';

-- Flycatcher Buttress: the road block names "Blue Lake Trailhead, SR-20, Washington
-- Pass" as the trailhead, but this same row's own waypoints and approach_logistics
-- both explicitly and repeatedly say otherwise. The trailhead waypoint's own note
-- reads "East-side approach - NOT Blue Lake TH. MP route text explicitly names the
-- Hairpin as the start point," and its directions add "two trailheads on opposite
-- sides of the pass serve this same summit... the Blue Lake Trailhead ... is for the
-- west-side routes and not for this one, and getting that wrong costs you an hour."
-- approach_logistics.trailhead independently agrees: "SR-20 Hairpin / Pond Pullout
-- (east of Washington Pass)". Read together, the road block is describing the WRONG
-- one of two trailheads that serve this same peak -- the exact defect this row's own
-- waypoint note was written to warn a climber away from. Corrected to match the
-- row's own waypoint/approach_logistics; the seasonal SR-20 pass-closure note (still
-- accurate for the surrounding months) is preserved unchanged.
UPDATE routes SET road = '{"name": "SR-20 Hairpin / Pond Pullout (east of Washington Pass)", "status": "Paved highway roadside pullout at ~5,100 ft. No unpaved road driving required. NOT the Blue Lake Trailhead, which serves the west-side Liberty Bell Group routes and is a different pullout on the far side of the pass.", "driveNote": "Drive SR-20 to the hairpin turn and pond pullout on the east side of Washington Pass (about 5,100 ft) and park there. Two trailheads on opposite sides of the pass serve this peak, and the west-side Blue Lake Trailhead is roughly 2.5 miles away by road and is for other routes, not this one.", "seasonalGate": "SR-20 closes seasonally over Washington Pass due to avalanche danger (closed Dec 12, 2025-June 14, 2026 in the 2025-26 season, with exact dates varying by year)."}'::jsonb
WHERE id = 'wa_flycatcher_buttress'
  AND road->>'name' = 'Blue Lake Trailhead, SR-20, Washington Pass';
