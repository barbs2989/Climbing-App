-- wa_goode_mountain_southwest_couloir: seasonal_hazards.crevasses claims "N/A ... no
-- documented glacier crossing" -- but this same row's own approach text, waypoints (a
-- "Goode Glacier crossing" waypoint of type Hazard, and a "Lateral moraine camp above Goode
-- Glacier" waypoint), obj_haz ("crevasses/moat on the Goode Glacier portion of the
-- approach"), and approach_variants[0].hazards ("Receding hidden-glacier snowbridges below
-- 8,000 ft on the way to the gully") all describe crossing the Goode Glacier on the way to
-- the couloir base. The route's own gear list even calls for an ice axe/crampons partly for
-- this reason. seasonal_hazards.crevasses is a self-contradiction against the rest of the
-- row -- corrected to describe the real (if non-technical, standard-route) glacier crossing.
UPDATE routes
SET seasonal_hazards = jsonb_set(
  seasonal_hazards,
  '{crevasses}',
  '"Real -- the approach crosses the Goode Glacier from the moraine camp to reach the couloir base (see waypoints/obj_haz); route-finding is tricky and late-season snow bridges can be deteriorated, with a bergschrund/moat also possible at the couloir base. Not a heavily crevassed glacier on the standard line, but this is not a dry, non-glaciated approach."'::jsonb
)
WHERE id = 'wa_goode_mountain_southwest_couloir';

-- wa_gunrunner: waypoints[1] ("Middle Peak (Gunsight Range)", the route's own Summit-type
-- waypoint) stores elev 8000 -- about 200 ft below this same row's own high_point_ft (8200),
-- below the sibling route wa_gunsight_peak_standard's summit waypoint for the identical peak
-- (elev 8198, at essentially the same lat/lng), and below the externally-confirmed elevation
-- of this peak: Wikipedia gives "Gunsight Peak" (Chelan County, Blue Glacier to the east,
-- Chickamin Glacier to the west -- matching this row's own hazards/waypoint description) as
-- 8,198 ft. Corrected the waypoint elevation to match.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{1,elev}', '8198'::jsonb)
WHERE id = 'wa_gunrunner';
