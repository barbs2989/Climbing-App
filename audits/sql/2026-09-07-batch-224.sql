-- Batch 224 (pass 4), 2026-09-07
-- wa_point_success_south_side, wa_poltergeist_pinnacle, wa_poltergeist_pinnacle_north_route,
-- wa_primus_peak_south_ridge, wa_prusik_peak_der_sportsman, wa_prusik_peak_south_face_burgner_stanley,
-- wa_prusik_peak_west_ridge, wa_ragged_edge

-- wa_poltergeist_pinnacle: road.name said the Ross Lake Resort water taxi runs to "Little Beaver" --
-- but this route's own `approach` text names "Big Beaver Trail landing" / "Big Beaver Landing" /
-- "Big Beaver valley" three times, and the Ross Lake Resort's own water-taxi service is documented
-- (rosslakeresort.com) as running specifically to "Big Beaver landing" for the Big Beaver Trail --
-- Little Beaver is a real, different trail/creek further up the lake. Corrects the road name to
-- match this row's own approach narrative and the external source; nothing else in the road jsonb
-- is touched.
UPDATE routes
SET road = jsonb_set(
  road,
  '{name}',
  '"Ross Lake water taxi (from Ross Dam TH off SR-20) to Big Beaver, Northern Pickets"'::jsonb
)
WHERE id = 'wa_poltergeist_pinnacle'
  AND road->>'name' = 'Ross Lake water taxi (from Ross Dam TH off SR-20) to Little Beaver, Northern Pickets';

-- access_checked_at stamped for all 8 routes reviewed this batch (external sources cross-checked
-- 2026-09-07 -- Point Success's elevation (14,158 ft) and Mount Rainier NP's climbing registration
-- ($82/person) and wilderness camping ($12/person/night + $6 reservation fee) fees corroborated
-- against current NPS-sourced figures; Primus Peak's elevation (8,508 ft) and Prusik Peak's
-- elevation (8,008 ft, consistent across all three routes filed on it) corroborated against
-- Wikipedia; the 1968 Burgner-Stanley first ascent of Prusik's South Face, Der Sportsman's 1990s
-- Brooke Sandahl development, the West Ridge's 1957/party-unrecorded first ascent (confirmed
-- distinct from the peak's famous 1948 Beckey/Holben first ascent via a different line), Vesper
-- Peak's elevation (6,214 ft), and Ragged Edge's exact 2013-08-18 Berdinka/Pires first ascent all
-- corroborated. wa_poltergeist_pinnacle's waypoint/trailhead inconsistency and
-- wa_primus_peak_south_ridge's two-approaches conflation were read but NOT corrected -- see the
-- audit log for why both are flagged for human review rather than fixed.
UPDATE routes
SET access_checked_at = '2026-09-07T12:00:00+00:00'
WHERE id IN (
  'wa_point_success_south_side',
  'wa_poltergeist_pinnacle',
  'wa_poltergeist_pinnacle_north_route',
  'wa_primus_peak_south_ridge',
  'wa_prusik_peak_der_sportsman',
  'wa_prusik_peak_south_face_burgner_stanley',
  'wa_prusik_peak_west_ridge',
  'wa_ragged_edge'
);
