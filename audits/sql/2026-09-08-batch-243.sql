-- WA alpine audit batch 243 (pass 5)
-- Routes: wa_austera_peak, wa_austera_peak_chockstone_route, wa_austera_peak_southwest_ridge,
-- wa_bacon_peak_diobsud, wa_baring_mountain_northwest_ridge, wa_baring_mountain_r1,
-- wa_bear_mountain_chilliwack_north_buttress, wa_beckey_davis
--
-- This batch overlaps heavily with batch 54 (pass 2, 2026-08-06), which researched these same
-- seven peaks in depth. Several of batch 54's proposed fixes were re-checked against the current
-- live DB and found NOT applied (the SQL evidently was never run) -- those are re-proposed below
-- with fresh corroborating sources rather than assumed. One item batch 54 explicitly flagged
-- (not fixed) for human review -- both Austera Peak routes sharing byte-identical
-- gain_ft/loss_ft/dist_km (1280/592/4.5) despite different waypoint chains -- is left as-is; that
-- earlier analysis found dist_km plausibly matches a "high-camp-to-summit" segment convention for
-- one of the two routes, which conflicts with treating the shared values as simple corruption, so
-- it is re-flagged rather than guess-fixed.

-- wa_bacon_peak (area row): elevation_ft (7067) and prominence_ft (2512) disagree with Wikipedia/
-- PeakVisor, which converge on 7,070 ft / 2,505 ft. This is the same finding batch 54 made on
-- 2026-08-06 (also citing Wikipedia/Wikidata/Peakbagger convergence on 7,070/2,505); the live row
-- still holds the old values, so the earlier proposed fix appears never to have been applied.
-- Re-verified independently via a fresh web search before re-proposing. elevation_ft was also
-- already self-inconsistent with this peak's own route (`wa_bacon_peak_diobsud`), whose
-- `high_point_ft` and summit waypoint already read 7070.
UPDATE areas SET elevation_ft = 7070, prominence_ft = 2505
WHERE id = 'wa_bacon_peak' AND elevation_ft = 7067 AND prominence_ft = 2512;


-- wa_bacon_peak_diobsud: waypoints[0] ("Watson Lakes Trailhead") carries elev=4300 and
-- elevFt=800 for the same point -- the two fields disagree. Confirmed via web search: the
-- Watson Lakes trailhead (end of FR-1107) sits at approximately 4,300 ft, matching this row's
-- own `elev` field and its own approach text's "~4,360 ft" figure. `elevFt` (800) is the
-- erroneous field and is corrected to match `elev`, the same fix pattern already used for
-- `wa_andersons_thumb_standard`'s waypoints[0] in batch 242.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '4300', false)
WHERE id = 'wa_bacon_peak_diobsud'
  AND (waypoints #>> '{0,name}') = 'Watson Lakes Trailhead'
  AND (waypoints #>> '{0,elev}')::numeric = 4300
  AND (waypoints #>> '{0,elevFt}')::numeric = 800;


-- wa_bacon_peak_diobsud: dist_km (25.75) converts to almost exactly 16.0 miles -- and this
-- row's own `itinerary.totalNote` independently states "roughly 16 miles round trip." The app
-- renders round trip as dist_km * 2, so dist_km is meant to hold the ONE-WAY distance; this row
-- instead stores the round-trip mileage directly, the well-documented "round-trip-stored-as-
-- one-way" dist_km bug seen repeatedly elsewhere in this catalog (see CLAUDE.md's audit:distances
-- notes and many prior batches in this log). The row's own waypoint chain corroborates the
-- correct one-way figure closely: the last waypoint before the summit ("Diobsud Creek Glacier
-- crossing") gives a cumulative one-way distMi of 8.0 mi = 12.87 km. Set to that value.
UPDATE routes SET dist_km = 12.87
WHERE id = 'wa_bacon_peak_diobsud' AND dist_km = 25.75;


-- wa_bacon_peak_diobsud: `access` has no `closures` key at all, and `access_checked_at` is
-- null. Confirmed via web search against USFS-adjacent sources: an atmospheric-river event on
-- Dec 11, 2025 washed out FSR 1107 (Anderson-Watson Road) at approximately milepost 3.8-3.86,
-- currently blocking the Watson Lakes Trailhead that serves this route's entire approach -- a
-- safety-relevant access fact this row says nothing about. Added with a hedge and a
-- check-current-status pointer rather than an assumed reopening date, and access_checked_at is
-- stamped with today's verification date per this row's own convention for that field.
UPDATE routes
SET access = access || jsonb_build_object(
      'closures', 'Forest Service Road 1107 (Anderson-Watson Road), the access road for the Watson Lakes Trailhead this route starts from, washed out at approximately milepost 3.8-3.86 after a Dec 11, 2025 atmospheric-river event and was still closed as of this check -- verify current status on the Mt. Baker-Snoqualmie NF road-closures/alerts page before planning a trip.'
    ),
    access_checked_at = '2026-09-08'
WHERE id = 'wa_bacon_peak_diobsud' AND NOT (access ? 'closures');


-- wa_austera_peak_southwest_ridge: data_quality.gaps still contains "No public GPS track found
-- for this route as of this research pass," even though this row's own `gpx` field holds a
-- populated 325-point track. Same finding batch 54 made on 2026-08-06; the live row still
-- carries the stale claim, so the earlier proposed removal appears never to have been applied.
-- Removed the stale gap entry (leaving the other five gap entries untouched).
UPDATE routes
SET data_quality = jsonb_set(
      data_quality,
      '{gaps}',
      (SELECT jsonb_agg(g) FROM jsonb_array_elements(data_quality->'gaps') g
       WHERE g <> '"No public GPS track found for this route as of this research pass."')
    )
WHERE id = 'wa_austera_peak_southwest_ridge'
  AND data_quality->'gaps' @> '["No public GPS track found for this route as of this research pass."]'
  AND jsonb_typeof(gpx) = 'array' AND jsonb_array_length(gpx) > 0;


-- wa_beckey_davis: length_m (198, ~650 ft) contradicts this row's own rope_note ("6 pitches,
-- 700ft, original 1962 line..."). Same finding batch 54 made on 2026-08-06, still unapplied.
-- Re-verified independently: a StephAbegg trip-report title for this exact route reads "Prusik
-- Peak, Beckey-Davis (5.9, 700', 6p)," confirming 700 ft rather than the stored ~650 ft.
-- 700 ft = 213.36 m.
UPDATE routes SET length_m = 213
WHERE id = 'wa_beckey_davis' AND length_m = 198;


-- wa_beckey_davis: access._raw.group_size_limits says "Maximum party 12 people," contradicting
-- this same row's own access.rules ("capped at 8 people") and access.group_limit (8). Same
-- finding batch 54 made on 2026-08-06 (citing the Enchantment Permit Area's Recreation.gov cap
-- of 8), still unapplied. Re-verified independently via Recreation.gov: the Enchantment Permit
-- Area's maximum group size is 8.
UPDATE routes
SET access = jsonb_set(access, '{_raw,group_size_limits}', '"Maximum party 8 people"', false)
WHERE id = 'wa_beckey_davis'
  AND (access #>> '{_raw,group_size_limits}') = 'Maximum party 12 people';


-- wa_beckey_davis: waypoints[0] is named "Stuart Lake Trailhead" (correct -- coordinates match
-- the real trailhead and this row's own `approach_logistics`/`approach` text both describe
-- Stuart Lake Trailhead as the STANDARD access), but its `note` field describes it backwards --
-- as "Alternate access only, used when the standard Stuart Lake Trailhead / Aasgard Pass
-- approach is closed." A waypoint cannot simultaneously BE Stuart Lake Trailhead and be an
-- alternate used "when Stuart Lake Trailhead is closed." This looks like a leftover from an
-- earlier correction that fixed the coordinates/name (this row's own `approach` field already
-- correctly describes Stuart Lake Trailhead as standard) but never updated the note text to
-- match. Rewritten to state plainly that this is the standard trailhead, while preserving the
-- real information about the longer Snow Lakes/Lake Viviane alternate used during closures
-- (already documented in this row's own `approach` field).
UPDATE routes
SET waypoints = jsonb_set(
      waypoints, '{0,note}',
      '"Standard/preferred trailhead for this route, via Stuart Lake Trail -> Colchuck Lake -> Aasgard Pass (see approach). When this trailhead/pass is closed (e.g. wildfire closures), parties have used the longer Snow Lakes Trail approach instead (~10 mi one-way via Lake Viviane, per this route'\''s own approach text)."',
      false
    )
WHERE id = 'wa_beckey_davis'
  AND (waypoints #>> '{0,name}') = 'Stuart Lake Trailhead'
  AND (waypoints #>> '{0,note}') LIKE 'Alternate access only%';
