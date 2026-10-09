-- Cutthroat Peak: area elevation_ft is still 8,065 ft, the stale figure this same audit's
-- own pass-2 batches 59/60 (2026-08-06) already corrected to 8,066 ft (Wikipedia/Peakbagger
-- agree, and every route on this peak's own summit waypoints/high_point_ft already say
-- 8,066 ft). Batch 60's SQL for this exact statement is still sitting unapplied in
-- audits/sql/2026-08-06-batch-60.sql -- re-issuing it here rather than re-researching, since
-- nothing about a fixed granite summit's surveyed elevation changes in five weeks.
UPDATE areas SET elevation_ft = 8066 WHERE id = 'wa_cutthroat_peak' AND elevation_ft = 8065;

-- Cutthroat Peak: same stale 8,065 ft figure in the area's free-text blurb. Re-issuing
-- batch 60's fix (unapplied).
UPDATE areas SET blurb = replace(blurb, '8,065 ft', '8,066 ft') WHERE id = 'wa_cutthroat_peak' AND blurb LIKE '%8,065 ft%';

-- Cutthroat Peak, South Buttress: the row's own summit waypoint still carries elev 8065,
-- contradicting this same row's own high_point_ft (8066, correct) and every sibling route's
-- summit waypoint on this peak. NOTE: this row's waypoints array has grown a middle entry
-- since batch 60 was written (the summit is now index 2, not index 1 as that batch's SQL
-- assumed) -- that mismatch is very likely WHY batch 60's UPDATE never took effect even if it
-- had been run: the path `{1,elev}` no longer points at the summit waypoint. Corrected path
-- below, re-verified against the live row before writing.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,elev}', '8066') WHERE id = 'wa_cutthroat_south_buttress' AND waypoints->2->>'name' = 'Cutthroat Peak summit' AND (waypoints->2->>'elev')::int = 8065;

-- Cutthroat Peak, South Buttress: pitch 12 (index 11) notes field still embeds the stale
-- 8,065 ft figure in prose. Re-issuing batch 60's fix (unapplied); text re-verified against
-- the live row.
UPDATE routes SET pitch_detail = jsonb_set(pitch_detail, '{11,notes}', '"The final airy pitch to Cutthroat''s true summit (8,066 ft); exposed but moderate, after which most parties transition straight into the West Ridge or reversed-buttress descent."') WHERE id = 'wa_cutthroat_south_buttress' AND pitch_detail->11->>'notes' LIKE '%8,065 ft%';

-- Cutthroat Peak, Northeast Face (aka East Face -- see this row's own `corrections` field
-- for the name history): rock_grade is still 5.7, contradicting this same row's own overview
-- ("two 5.10 pitches") and pitch_detail (crux pitch listed as 5.10). Re-issuing batch 60's
-- fix (AAC Publications, "Cutthroat Peak, East Face, The Swarm," 1976 Bard/Chouinard/
-- Cunningham route, III 5.10) -- still unapplied.
UPDATE routes SET rock_grade = '5.10' WHERE id = 'wa_cutthroat_peak_northeast_face' AND rock_grade = '5.7';

-- Cutthroat Peak, Southeast Buttress: rock_grade is still 5.6, conflicting with
-- Mountaineers.org's route page ("Grade III, 5.8 rock climb"; this row's own top-level grade
-- field, "III", is already correct -- only rock_grade was wrong). Re-issuing batch 60's fix,
-- still unapplied.
UPDATE routes SET rock_grade = '5.8' WHERE id = 'wa_cutthroat_peak_southeast_buttress' AND rock_grade = '5.6';

-- Crooked Thumb Peak, South Route: high_point_ft is still 8129 -- still a regression of the
-- deliberate pass-1 decision (reaffirmed in pass-2 batch 60) to leave this field NULL, since
-- it is unconfirmed whether this route's south-ridge headwall actually tops the true summit
-- fin (the route's own cited 2016 trip report says the party found "no feasible way to reach
-- [the true summit thumb] directly"). Re-issuing batch 60's fix, still unapplied.
UPDATE routes SET high_point_ft = NULL WHERE id = 'wa_crooked_thumb_peak_south_route' AND high_point_ft = 8129;

-- Crooked Thumb Peak, South Route: access.landManager still wrongly claims the approach
-- crosses Ross Lake National Recreation Area. This route's own approach/road fields describe
-- the Hannegan Trailhead -> Hannegan Pass -> Chilliwack River approach, which per USFS
-- (Trail #674) crosses directly from Mt. Baker-Snoqualmie NF (Mt. Baker Wilderness) into
-- North Cascades NP -- no Ross Lake NRA on this approach (that only applies to the separate
-- Big Beaver/SR-20 water-taxi alternate, described correctly elsewhere in this same row).
-- Re-issuing batch 60's fix, still unapplied.
UPDATE routes SET access = jsonb_set(access, '{landManager}', '"North Cascades National Park Complex (National Park Service) — approach crosses Mt. Baker-Snoqualmie National Forest (Mt. Baker Wilderness) before entering the National Park proper."') WHERE id = 'wa_crooked_thumb_peak_south_route' AND access->>'landManager' LIKE '%Ross Lake National Recreation Area%';

-- Crooked Thumb Peak, South Route: 2026 early-access lottery window is still off by a day on
-- both ends -- NPS lists March 3-14, 2026, not March 2-13. Re-issuing batch 60's fix, still
-- unapplied.
UPDATE routes SET access = jsonb_set(access, '{notes}', '"60% of sites are reservable in advance via Recreation.gov (2026 lottery Mar 3-14); the remaining 40% are walk-up, obtained in person the day before at the Wilderness Information Center in Marblemount."') WHERE id = 'wa_crooked_thumb_peak_south_route' AND access->>'notes' LIKE '%Mar 2%13%';

-- Dark Peak: area elevation_ft (8,518 ft) does not match this peak's own established figure.
-- Multiple independent sources (SummitPost, PeakVisor, Mountaineers.org's own "Dark
-- Peak/Dark Glacier" route page, and the Bulger List) converge on 8,504 ft -- which is also
-- exactly what this route's own summit waypoint already states (elev/elevFt 8504), so the
-- area row is the outlier against its own route data as well as external sources.
UPDATE areas SET elevation_ft = 8504 WHERE id = 'wa_dark_peak' AND elevation_ft = 8518;

-- Dark Peak: area prominence_ft is still 273 ft. Batch 60 (2026-08-06) already found
-- convergent secondary sourcing for 264 ft but could not reach Peakbagger/Wikipedia that
-- session (network policy) to confirm primary; this pass's search reaches SummitPost's
-- "Washington Top 100" list, which states Dark Peak's prominence as 264 ft directly (and
-- separately notes it misses the 400P list only because of that modest prominence) --
-- treating this as confirmed now rather than re-flagging. Re-issuing batch 60's fix.
UPDATE areas SET prominence_ft = 264 WHERE id = 'wa_dark_peak' AND prominence_ft = 273;

-- Dark Peak, Dark Glacier Route: high_point_ft (8507) doesn't match the peak's correct
-- elevation (8,504 ft, see above) or this same row's own summit waypoint (elev/elevFt 8504).
UPDATE routes SET high_point_ft = 8504 WHERE id = 'wa_dark_peak_dark_glacier_route' AND high_point_ft = 8507;
