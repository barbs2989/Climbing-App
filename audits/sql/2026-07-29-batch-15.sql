-- WA Alpine Audit — Pass 1, Batch 15 — 2026-07-29
-- Peaks: Guye Peak, Hadley Peak, Helmet Butte, Himmelhorn, Mount Deception,
--        Hozomeen Mountain, Hurry-Up Peak, Icy Peak

-- wa_guye_peak_south_gully: access.notes falsely stated this Snoqualmie-Pass-area
-- route (Guye Peak, area wa_guye_peak, parent wa_snoqualmie_i90_region) is in the
-- "Whatcom Peak area, North Cascades" -- Whatcom Peak is a different, unrelated
-- peak ~90 mi north near the Pickets/Canadian border. Same generic boilerplate
-- clause was found stamped onto other unrelated routes' access.notes across the
-- DB; stripped the false location clause here rather than guess a replacement.
UPDATE routes
SET access = jsonb_set(
  access,
  '{notes}',
  '"Northwest Forest Pass required ($5/day or $30/annual). Backcountry permit for overnight."'
)
WHERE id = 'wa_guye_peak_south_gully';

-- wa_icy_peak_southwest_route: access.notes falsely stated this Mount-Baker-area
-- route (Icy Peak, area wa_icy_peak, parent wa_shuksan_baker_neighbors) is in the
-- "Mount Tom area, North Cascades" -- Mount Tom is an unrelated peak. The same
-- boilerplate clause was found copy-pasted onto 35 unrelated routes' access.notes
-- across the DB (including a Wyoming route, wy_gooseneck_glacier_route/Gannett
-- Peak), confirming it is stray filler text, not per-route content. Stripped the
-- false clause; every other field in this route's access object already
-- correctly describes Icy Peak / Mt. Baker-Snoqualmie NF and was left as-is.
UPDATE routes
SET access = jsonb_set(
  access,
  '{notes}',
  '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."'
)
WHERE id = 'wa_icy_peak_southwest_route';

-- wa_hozomeen_mountain (area): elevation_ft was 8072, a 1-ft outlier against this
-- area's own Southeast Face route (high_point_ft = 8071, already correct) and
-- external sources (Wikipedia: "8,071 ft (2,460 m) NAVD 88"; corroborated by a
-- second independent search on the 1904 Tatum/Loudon first-ascent record, which
-- also cites 8,071 ft). Fixed to match.
UPDATE areas
SET elevation_ft = 8071
WHERE id = 'wa_hozomeen_mountain';

-- wa_helmet_butte (area) and wa_helmet_butte_standard_route: both stored
-- elevation as 7372 ft, but the route's OWN `corrections` field already states
-- "Given elevationFt was null; research supports 7,400 ft (Wikipedia, most
-- consistently corroborated topo/USGS figure)" -- i.e. a prior research pass
-- determined 7,400 ft and documented it in `corrections`, but the actual
-- elevation_ft/high_point_ft columns were never updated to match. Independently
-- corroborated externally (Wikipedia and peakery.com both cite 7,400 ft; a
-- single ListsOfJohn page title citing 7,420 ft was the only outlier, already
-- addressed and dismissed in the route's own corrections note). Applying the
-- correction the row itself already describes.
UPDATE areas
SET elevation_ft = 7400
WHERE id = 'wa_helmet_butte';

UPDATE routes
SET high_point_ft = 7400
WHERE id = 'wa_helmet_butte_standard_route';
