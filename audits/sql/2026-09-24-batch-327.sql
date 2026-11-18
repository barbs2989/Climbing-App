-- WA alpine audit batch 327 (pass 6)
-- Routes: wa_guye_peak_r2, wa_guye_peak_southeast_gully, wa_hadley_peak_cougar_divide,
--         wa_hadley_peak_skyline_divide, wa_helmet_butte_standard_route,
--         wa_himmelhorn_southeast_route, wa_honeymoon_route, wa_hourglass_gully_winter

-- =========================================================================
-- Mount Index, Main Peak, Hourglass Gully (Winter) -- wa_hourglass_gully_winter
-- =========================================================================
-- This row's own `high_point_ft` (5,991 ft) is correct -- it matches Wikipedia's "Mount
-- Index" article and Peakbagger.com, both independently giving Mount Index's Main/South
-- Peak (the summit this route climbs) as 5,991 ft. But the row's own `waypoints` array
-- gives the same summit a DIFFERENT elevation, 5,979 ft, in its second entry ("Mount
-- Index Main Peak Summit") -- a 12 ft internal contradiction between two fields on one
-- row describing the same point. 5,979 ft is not a distinct, real elevation for a
-- nearby feature either (it doesn't match Middle or North Peak, which are lower, at
-- roughly 5,485 ft and 5,502 ft) -- it looks like a stray/transposed figure. Corrected
-- the waypoint to match this row's own (externally-verified) `high_point_ft`.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '5991'::jsonb)
WHERE id = 'wa_hourglass_gully_winter'
  AND waypoints->1->>'name' = 'Mount Index Main Peak Summit'
  AND (waypoints->1->>'elev')::int = 5979
  AND high_point_ft = 5991;

-- =========================================================================
-- Helmet Butte, Standard Route -- wa_helmet_butte_standard_route
-- =========================================================================
-- This row already carries a `corrections` note explaining that `high_point_ft` was
-- deliberately set to 7,400 ft ("research supports 7,400 ft (Wikipedia, most
-- consistently corroborated topo/USGS figure)... ListsOfJohn's page title cites 7,420
-- ft -- a minor secondary-source discrepancy, not treated as authoritative"). That
-- earlier research pass updated `high_point_ft` to 7,400 but never propagated the same
-- decision to the `waypoints` array, whose "Helmet Butte Summit" entry still carries the
-- rejected 7,420 ft figure in both `elev` and `elevFt`. Re-verified independently this
-- run (Wikipedia gives 7,400 ft; a WTA trip report title gives a third figure, 7,366 ft,
-- for context -- three-way disagreement across sources, matching what this row's own
-- corrections note already found) and see no reason to revisit that earlier call.
-- Bringing the waypoint in line with the row's own already-made decision, not asserting
-- a new elevation judgment.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(waypoints, '{1,elev}', '7400'::jsonb),
      '{1,elevFt}', '7400'::jsonb
    )
WHERE id = 'wa_helmet_butte_standard_route'
  AND waypoints->1->>'name' = 'Helmet Butte Summit'
  AND (waypoints->1->>'elev')::int = 7420
  AND (waypoints->1->>'elevFt')::int = 7420
  AND high_point_ft = 7400;

-- =========================================================================
-- Hadley Peak -- wa_hadley_peak_cougar_divide / wa_hadley_peak_skyline_divide
-- =========================================================================
-- Both of Hadley Peak's two standard-approach routes share `high_point_ft = 7522`, and
-- that figure could not be corroborated by any source checked. ListsOfJohn.com (a
-- USGS/LIDAR-derived peak database, the same class of source this database's own prior
-- corrections already treat as authoritative for Cascades peak elevations -- see the
-- Helmet Butte entry above and its own `corrections` note) lists Hadley Peak at 7,515
-- ft, and this figure recurs independently across multiple other results (Steven's
-- Peak-bagging Journey, best-hikes-bc trip notes). Notably, the `skyline_divide` sibling
-- route's OWN waypoint already has the correct figure baked in ("Hadley Peak Summit",
-- elev/elevFt 7,515) at the peak's precise 6-decimal coordinate (48.814065,
-- -121.822285) -- only the shared top-level `high_point_ft` field on both rows is wrong.
-- The `cougar_divide` sibling's own waypoint additionally carries a THIRD figure, 7,470
-- ft, at essentially the same coordinate (48.8140103, -121.8223671, i.e. the same
-- summit) -- likely a coarser topo-contour read rather than the precise summit spot
-- elevation. Standardizing all three fields (both routes' `high_point_ft`, plus the
-- cougar_divide waypoint) on 7,515 ft; the skyline_divide waypoint is already correct
-- and untouched.
UPDATE routes
SET high_point_ft = 7515
WHERE id = 'wa_hadley_peak_skyline_divide'
  AND high_point_ft = 7522;

UPDATE routes
SET high_point_ft = 7515,
    waypoints = jsonb_set(
      jsonb_set(waypoints, '{1,elev}', '7515'::jsonb),
      '{1,elevFt}', '7515'::jsonb
    )
WHERE id = 'wa_hadley_peak_cougar_divide'
  AND high_point_ft = 7522
  AND waypoints->1->>'name' = 'Hadley Peak'
  AND (waypoints->1->>'elev')::int = 7470
  AND (waypoints->1->>'elevFt')::int = 7470;

-- =========================================================================
-- Checked and confirmed correct (no action needed -- listed for the record):
-- =========================================================================
-- wa_guye_peak_r2 / wa_guye_peak_southeast_gully: `high_point_ft` 5,168 ft matches
-- Wikipedia's "Guye Peak" article exactly; both routes agree with each other.
-- wa_himmelhorn_southeast_route: FA "Ed Cooper, Glen Denny, Joan Firey, Joe Firey,
-- George Whitmore -- September 8, 1961" confirmed verbatim against AAC Publications'
-- "First Ascents in the Southern Pickets" and Alpinist's Whitmore obituary. This row's
-- own `corrections`/`data_quality` fields already flag the "Grade IV, 5.8" technical
-- grade as unconfirmed against a primary topo and note Beckey's account calls it a
-- class-4 line -- that self-flagged gap stands as previously recorded; not re-litigated
-- here since no new source was found to resolve it either way.
-- wa_honeymoon_route (Mount Deception): `high_point_ft` 7,788 ft matches Wikipedia's
-- "Mount Deception (Washington)" article exactly.

-- =========================================================================
-- NOT fixed here (flagged for human review -- see audit log for detail):
-- =========================================================================
-- wa_hadley_peak_cougar_divide / skyline_divide: could not find a source that
-- independently corroborates 7,515 ft beyond ListsOfJohn plus the two informal
-- peak-bagging pages noted above -- no Wikipedia article exists for Hadley Peak itself,
-- and USGS topo quads were not directly checked (not accessible from this run). Treating
-- ListsOfJohn as sufficiently authoritative given the pattern already established
-- elsewhere in this codebase's own corrections, but flagging the single-class-of-source
-- limitation for a future pass with topo access.
