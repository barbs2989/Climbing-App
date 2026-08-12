-- === wa_mcmillan_spire_west_west_ridge ===

-- Summit waypoint elev (8,038 ft) and the itinerary's schedule label ("Summit
-- (8,038 ft)") both contradict this row's own high_point_ft (8,004 ft) and its
-- own `corrections` field, which already documents settling this exact
-- cross-source conflict on 8,004 ft ("Wikipedia/USGS-derived figures give
-- 8,004 ft (used here)"). Externally reconfirmed via Wikipedia (8,004 ft /
-- 2,440 m). The waypoint's note also read "(Grade III, 5.6 on the west
-- ridge)" -- III/5.6 is this route's own sibling's rating (Southwest Ridge:
-- alpine_grade III, rock_grade 5.8-), not this route's (Grade II, 4th class
-- up to low 5th, commitment II per this row's own fields), so that looks like
-- cross-route contamination bled in from the sibling row. Fixed the elevation
-- in both places and corrected the note to describe this route's own grade
-- instead of the sibling's.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{7,elev}', '8004'::jsonb),
      '{7,note}',
      '"True summit of West McMillan Spire (Grade II, 4th class, up to low 5th in spots) -- Southern Pickets high point with exposed final scrambling/low 5th class moves."'::jsonb
    ),
    itinerary = jsonb_set(itinerary, '{days,1,schedule,3,label}', '"Summit (8,004 ft)"'::jsonb)
WHERE id = 'wa_mcmillan_spire_west_west_ridge';

-- === wa_mount_adams_adams_glacier ===

-- Two fixes on this row:
-- 1) watch_out was stored as one newline-joined string instead of the jsonb
--    string[] every sibling route on file uses (same shape bug found and
--    fixed on wa_live_free_or_die in batch 74) -- converted to a proper
--    array, same bullet content.
-- 2) data_quality.gaps[1] claims this entry "defers to the more conservative
--    on-file Grade IV / serac-hazard framing", but the row's own grade,
--    alpine_grade, and commitment fields all already read "III", not IV --
--    there is no Grade IV anywhere else on this row. Externally confirmed
--    (Ice and Trail trip report: "Mt. Adams: Adams Glacier (Grade III, Steep
--    Snow, AI2)") that Grade III is the correct, standard rating for this
--    route. The gaps note was rewritten to match the row's own already-correct
--    fields instead of the stale IV reference, and lastVerified bumped.
UPDATE routes
SET watch_out = '["Alpine ice terrain at high elevation (12,276 ft)", "Steep snow slopes requiring careful glacier travel", "Multiple glacier systems on mountain create navigation complexity", "Weather exposure at summit altitude"]'::jsonb,
    data_quality = jsonb_set(
      jsonb_set(
        data_quality,
        '{gaps,1}',
        '"Sources disagree on difficulty framing (a \"good beginning ice climb\" framing vs. one of the more serious Cascades ice routes) -- this entry defers to the on-file Grade III / serac-hazard framing, matching this row''s own alpine_grade, grade, and commitment fields (all III) and external route reports (Ice and Trail: Grade III, AI2)"'::jsonb
      ),
      '{lastVerified}',
      '"2026-08-08"'::jsonb
    )
WHERE id = 'wa_mount_adams_adams_glacier';

-- === wa_mojo_rising ===

-- Same watch_out shape bug as wa_mount_adams_adams_glacier above: stored as
-- one newline-joined string instead of the jsonb string[] every sibling route
-- uses, which collapses into a single run-on bullet client-side since
-- toArr() only splits on commas, not newlines (same bug/fix as batch 74's
-- wa_live_free_or_die). Converted to a proper array, same bullet content.
UPDATE routes
SET watch_out = '["Sustained 5.11b climbing with significant exposure between pitches", "Route-finding complexity requires confident line choice", "Weather hazard - afternoon electrical activity on exposed terrain", "Loose rock hazard on mixed terrain transitions", "Multiple rappels on descent through variable anchor terrain"]'::jsonb
WHERE id = 'wa_mojo_rising';
