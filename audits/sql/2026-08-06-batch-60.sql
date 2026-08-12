-- Sloan Peak: Diamond in the Rough's access.land_manager wrongly names "Glacier Peak
-- Wilderness" -- Sloan Peak sits in Henry M. Jackson Wilderness, per this same row's own
-- access.wilderness_zone/permitZone fields and access._raw.land_manager (no wilderness
-- suffix), confirmed via USFS (Henry M. Jackson Wilderness, 103,297 acres, Mt.
-- Baker-Snoqualmie/Wenatchee NF).
UPDATE routes SET access = jsonb_set(access, '{land_manager}', '"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Henry M. Jackson Wilderness"') WHERE id = 'wa_diamond_in_the_rough' AND access->>'land_manager' LIKE '%Glacier Peak Wilderness%';

-- Sloan Peak: same wrong-wilderness-name contamination in access.rules. The specific
-- group-size/campfire-elevation figures themselves could not be confirmed as applying to
-- Henry M. Jackson Wilderness specifically -- left unchanged, only the wilderness name is
-- corrected here (see log flag for the unconfirmed figures).
UPDATE routes SET access = jsonb_set(access, '{rules}', '"Group size capped at 12 (people + stock combined) in Henry M. Jackson Wilderness; larger groups must split with 1-mile separation. Campfires prohibited above 3,500 ft."') WHERE id = 'wa_diamond_in_the_rough' AND access->>'rules' LIKE '%Glacier Peak Wilderness%';

-- Sloan Peak: access.parking_pass cites "Sunrise Mine TH for Vesper Peak" as an example --
-- that trailhead (FR 4065, ~28 mi from Granite Falls) serves Vesper Peak, an unrelated
-- peak, not Sloan Peak/Diamond in the Rough. This route's own waypoints already name its
-- actual trailhead as "Bedal Creek/Sloan Creek Trailhead."
UPDATE routes SET access = jsonb_set(access, '{parking_pass}', '"Northwest Forest Pass required at Mountain Loop Highway trailheads (e.g. Bedal Creek TH) -- $5/day or $30/year."') WHERE id = 'wa_diamond_in_the_rough' AND access->>'parking_pass' LIKE '%Sunrise Mine TH%';

-- Sloan Peak: waypoints[3] ("Route GPS pin (Mountain Project, SW Face)") is a fabricated
-- duplicate of the summit waypoint's exact lat/lng, and this same row's own
-- data_quality.gaps field already states "No public GPS track found for this route" --
-- contradicts presenting this entry as a real sourced pin. Removing it (gpx has the
-- matching duplicate final point but is left as-is here; see log flag on waypoint/gpx
-- ordering, a separate issue not fixed in this pass).
UPDATE routes SET waypoints = waypoints - 3 WHERE id = 'wa_diamond_in_the_rough' AND waypoints->3->>'name' = 'Route GPS pin (Mountain Project, SW Face)';

-- Cutthroat Peak: area elevation_ft has drifted back to the stale 8,065 ft figure for the
-- SECOND time today -- batch 59 (earlier this pass) already corrected this same field to
-- 8,066 ft (Wikipedia/Peakbagger agree), and it reverted again before this batch ran. See
-- log note: this now looks like a systemic re-seeding issue, not a one-off typo.
UPDATE areas SET elevation_ft = 8066 WHERE id = 'wa_cutthroat_peak' AND elevation_ft = 8065;

-- Cutthroat Peak: same drift reflected in the area's free-text blurb.
UPDATE areas SET blurb = replace(blurb, '8,065 ft', '8,066 ft') WHERE id = 'wa_cutthroat_peak' AND blurb LIKE '%8,065 ft%';

-- Cutthroat Peak, South Buttress: summit waypoint elev also carries the same stale 8,065
-- figure, contradicting this same row's own high_point_ft (8,066) and all 4 sibling
-- routes' summit waypoints.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elev}', '8066') WHERE id = 'wa_cutthroat_south_buttress' AND waypoints->1->>'name' = 'Cutthroat Peak summit' AND (waypoints->1->>'elev')::int = 8065;

-- Cutthroat Peak, South Buttress: pitch 12's notes field also embeds the stale 8,065 ft
-- figure in prose.
UPDATE routes SET pitch_detail = jsonb_set(pitch_detail, '{11,notes}', '"The final airy pitch to Cutthroat''s true summit (8,066 ft); exposed but moderate, after which most parties transition straight into the West Ridge or reversed-buttress descent."') WHERE id = 'wa_cutthroat_south_buttress' AND pitch_detail->11->>'notes' LIKE '%8,065 ft%';

-- Cutthroat Peak, Northeast Face (formerly "East Face"): rock_grade (5.7) contradicts this
-- same row's own overview ("two 5.10 pitches") and pitch_detail (crux pitch listed as
-- 5.10), and AAC Publications' "Cutthroat Peak, East Face, The Swarm" writeup confirms the
-- 1976 Bard/Chouinard/Cunningham route is III 5.10.
UPDATE routes SET rock_grade = '5.10' WHERE id = 'wa_cutthroat_peak_northeast_face' AND rock_grade = '5.7';

-- Cutthroat Peak, Southeast Buttress: rock_grade (5.6) conflicts with Mountaineers.org's
-- route page, which states "Grade III, 5.8 rock climb" -- the row's own top-level grade
-- ("III") is correct, only rock_grade was wrong.
UPDATE routes SET rock_grade = '5.8' WHERE id = 'wa_cutthroat_peak_southeast_buttress' AND rock_grade = '5.6';

-- Crooked Thumb Peak, South Route: high_point_ft (8129) is a regression of a deliberate
-- pass-1 decision to leave this field NULL, since it's unconfirmed whether the route
-- actually tops the true summit fin. This pass's own source review reinforces the
-- ambiguity: the route's own cited 2016 trip report (already referenced in
-- itinerary.sourceNote) says the party found "no feasible way to reach [the true summit
-- thumb] directly" and instead surmounted a headwall crack short of it.
UPDATE routes SET high_point_ft = NULL WHERE id = 'wa_crooked_thumb_peak_south_route' AND high_point_ft = 8129;

-- Crooked Thumb Peak, South Route: access.landManager wrongly claims the approach crosses
-- Ross Lake National Recreation Area. This route's own approach/road fields describe the
-- Hannegan Trailhead -> Hannegan Pass -> Chilliwack River approach, which per USFS (Trail
-- #674) crosses directly from Mt. Baker-Snoqualmie NF (Mt. Baker Wilderness) into North
-- Cascades NP -- no Ross Lake NRA involved on this approach (NRA only applies to the
-- separate Big Beaver/SR-20 water-taxi alternate, described correctly elsewhere in this
-- same row).
UPDATE routes SET access = jsonb_set(access, '{landManager}', '"North Cascades National Park Complex (National Park Service) — approach crosses Mt. Baker-Snoqualmie National Forest (Mt. Baker Wilderness) before entering the National Park proper."') WHERE id = 'wa_crooked_thumb_peak_south_route' AND access->>'landManager' LIKE '%Ross Lake National Recreation Area%';

-- Crooked Thumb Peak, South Route: 2026 early-access lottery window is off by a day on
-- both ends -- NPS lists March 3-14, 2026, not March 2-13.
UPDATE routes SET access = jsonb_set(access, '{notes}', '"60% of sites are reservable in advance via Recreation.gov (2026 lottery Mar 3-14); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount."') WHERE id = 'wa_crooked_thumb_peak_south_route' AND access->>'notes' LIKE '%Mar 2%13%';

-- Dark Peak: area prominence_ft (273) has no corroboration in any source found this pass;
-- multiple independent secondary sources (SummitPost/Bulger List context) converge on 264
-- ft instead. Primary sources (Peakbagger, Wikipedia) were unreachable this session
-- (network policy blocked those domains) -- flagged in the log as secondary-source-only
-- corroboration, worth a follow-up primary-source check.
UPDATE areas SET prominence_ft = 264 WHERE id = 'wa_dark_peak' AND prominence_ft = 273;

-- Bear Mountain, Direct North Buttress: ice_grade "WI5+" contradicts this route's own
-- summer-rock-only season field and gear/pitch_detail (no roped ice pitches, only an
-- approach snow patch) -- no independent source (Mountain Project, AAC, skisickness.com,
-- StephAbegg) describes ice climbing on this route. Likely contamination from an unrelated,
-- identically-named "Direct North Buttress" route on Dragontail Peak (Enchantments), whose
-- Mountain Project page lists a crux pitch graded exactly "WI5+ M4."
UPDATE routes SET ice_grade = NULL WHERE id = 'wa_direct_north_buttress' AND ice_grade = 'WI5+';

-- Liberty Bell Mountain, Dark Side of Liberty: partner_requirements.approachTime names
-- "Blue Lake trailhead" -- wrong. This route's own approach field (already correct)
-- describes the hairpin-curve/pond pullout on WA-20 east of Washington Pass, ~20 minutes
-- from the road, per AAC Publications and Climbing.com's FA writeups -- a different,
-- shorter approach than the Blue Lake Trail (used for the unrelated SW-side routes on this
-- same peak). The numeric fields tied to the same contamination (gpx track, dist_km,
-- gain_ft, itinerary times) could not be corrected here -- no authoritative replacement
-- figures were found for the actual hairpin-pullout approach; see log flag.
UPDATE routes SET partner_requirements = jsonb_set(partner_requirements, '{approachTime}', '"~20 min from the hairpin-curve/pond pullout on WA-20 east of Washington Pass (per AAC Publications / Climbing.com FA accounts)"') WHERE id = 'wa_dark_side_of_liberty' AND partner_requirements->>'approachTime' LIKE '%Blue Lake trailhead%';
