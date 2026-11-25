-- Batch 214 (pass 4): Mount Rainier -- Mowich Face, Nisqually Icefall, Ptarmigan
-- Ridge, Sunset Ridge, Tahoma Glacier, Willis Wall.
--
-- Verified against: this row's own internal waypoint/access/gain data (the primary
-- evidence for all three fixes below, each corroborated by a sibling row on the same
-- mountain sharing the same trailhead/access template), plus WebSearch synthesis of
-- White River Campground's published elevation (multiple camping-info sources: 4,232-
-- 4,440 ft) and Ipsut Creek Campground's published elevation (2,300-2,320 ft).
--
-- NOTE: string/jsonb literals below deliberately avoid embedded semicolons -- the
-- checker (scripts/check-sql-targets.mjs) splits statements on bare ";".

-- wa_mount_rainier_ptarmigan_ridge: the `waypoints` Trailhead entry "White River
-- Campground" stores elevFt 4930, contradicting this same waypoint's own `elev` field
-- (4400) and WebSearch-confirmed published elevations for White River Campground
-- (4,232-4,440 ft across multiple sources). 4930 is not a random error -- it is the
-- exact, independently-verified correct elevation of Mowich Lake Trailhead used
-- elsewhere in this same mountain's route set (e.g. wa_mount_rainier_mowich_face's own
-- Trailhead waypoint: elev 4930, elevFt 4930), i.e. this looks like a stale elevFt left
-- over from before the trailhead was switched from Mowich Lake to White River Campground
-- (this route's own `approach` text explains that switch: the Mowich Lake approach is
-- "shorter" but its access road "opens well after this route comes into condition").
-- Corrected elevFt to match the row's own elev field and White River Campground's real
-- elevation.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '4400'::jsonb)
WHERE id = 'wa_mount_rainier_ptarmigan_ridge'
  AND waypoints->0->>'name' = 'White River Campground'
  AND (waypoints->0->>'elev')::numeric = 4400
  AND (waypoints->0->>'elevFt')::numeric = 4930;

-- wa_mount_rainier_willis_wall: the `waypoints` Trailhead entry "White River Campground"
-- stores elevFt 2320 AND its own `directions` sub-field repeats "at about 2,320 feet" --
-- both contradicting the same waypoint's own `elev` field (4400, which also matches this
-- row's own gain_ft/high_point_ft math: 14112 - 9500 = 4612, close to 4400 within the
-- approach's own stated variance) and WebSearch-confirmed White River Campground
-- elevations (4,232-4,440 ft). 2,320 ft is not a random error either -- it is the
-- WebSearch-confirmed published elevation of Ipsut Creek Campground (2,300-2,320 ft
-- across multiple sources), the historical Carbon River-side trailhead this same row's
-- `approach` text says was used before the Fairfax Bridge closure and has since been
-- replaced by White River Campground as "the practical way to reach Willis Wall" -- i.e.
-- elevFt and the directions text are leftover residue from the old Ipsut Creek entry
-- that never got updated when the waypoint's name/elev were switched to White River
-- Campground. Corrected elevFt and the directions text's elevation figure to 4,400 ft.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{0,elevFt}', '4400'::jsonb),
      '{0,directions}',
      '"This route begins at White River Campground on the mountain''s north side, at about 4,400 feet, now the practical way to reach Willis Wall. The traditional approach up the Carbon River Road is no longer usable: SR-165''s Fairfax Bridge, the only public access to Carbon River, was permanently closed by the state highway department in April 2025 with no detour, turning that side into a roughly 19-mile one-way wilderness approach instead of a drive-in."'::jsonb
    )
WHERE id = 'wa_mount_rainier_willis_wall'
  AND waypoints->0->>'name' = 'White River Campground'
  AND (waypoints->0->>'elev')::numeric = 4400
  AND (waypoints->0->>'elevFt')::numeric = 2320
  AND waypoints->0->>'directions' LIKE '%at about 2,320 feet%';

-- wa_mount_rainier_tahoma_glacier: two independent errors on one row, written as two
-- separate statements (the second statement's copied text contains a real semicolon
-- inside a quoted value -- see the file-level note above -- so combining both fields
-- into one UPDATE would let the checker's bare-";" statement splitter mis-split this
-- file; kept apart so the first statement stays fully checkable).
--
-- (1) gain_ft stored as 5007, but this row's own two waypoints (Trailhead "West Side
-- Road gate / Dry Creek Trailhead" at elev 2900, Summit "Columbia Crest" at elev 14406)
-- imply a net rise of 11,506 ft -- more than double the stored gain_ft -- and the row
-- records no intermediate high-camp waypoint that would explain the shortfall. Sibling
-- route wa_mount_rainier_sunset_ridge shares this exact same trailhead (same lat/lng,
-- same elev 2900) and a nearly identical summit (Liberty Cap 14112 vs Tahoma's Columbia
-- Crest 14406, i.e. Sunset Ridge's true net rise is slightly *less*), yet stores
-- gain_ft = 11500, matching its own net rise almost exactly -- confirming the
-- convention used across this mountain's route set is gain_ft = full trailhead-to-
-- summit net rise, not a partial "climbing only" figure. Corrected to 11500 to match
-- that convention and this row's own waypoint math.
UPDATE routes
SET gain_ft = 11500
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND gain_ft = 5007;

-- wa_mount_rainier_tahoma_glacier (same row, second issue): access.notes states
-- "Northwest Forest Pass required ... No specific climbing permit," directly
-- contradicted by this same row's own access.permit ("Mount Rainier Climbing Permit"),
-- access.fees ($82 Climbing Cost Recovery Fee), and access.parking_pass field, which
-- explicitly states "Northwest Forest Pass does not apply inside the park." Sibling
-- route wa_mount_rainier_sunset_ridge has an access block identical to this row in
-- every field except `notes` and `closures`, using the standard NPS climbing-permit
-- registration text instead. Replaced this row's notes with that same (verified,
-- internally-consistent-with-the-rest-of-this-row) text rather than inventing new
-- content. NOTE: this copied text contains a real semicolon inside the quoted value
-- ("...White River); roughly half...") -- scripts/check-sql-targets.mjs splits
-- statements on bare ";" and cannot fully parse this one as a result (it correctly
-- reports "not checkable" rather than silently passing). Manually verified before
-- writing this statement: wa_mount_rainier_tahoma_glacier exists, and its access.notes
-- / access.permit live values match the WHERE guard below exactly (fetched via a
-- direct REST read moments before this file was written).
UPDATE routes
SET access = jsonb_set(
      access,
      '{notes}',
      '"How to get it: pay online in advance (pay.gov / recreation.gov), then register in person. Winter (Sept 16–May 21): self-issue at the Paradise Old Station kiosk after paying online. Summer (May 22–Sept 30): no self-issue — register at a Wilderness Information Center (Longmire, Paradise, or White River); roughly half of summer registration slots are held for walk-up, up to 24 hrs ahead. No timed-entry vehicle reservation is in effect for the 2026 season, so park entry itself is first-come, first-served."'::jsonb
    )
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit.'
  AND access->>'permit' = 'Mount Rainier Climbing Permit';
