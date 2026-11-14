-- WA alpine audit, batch 551 (pass 8)
-- wa_vasiliki_ridge_standard (Ares Tower, Vasiliki Ridge): high_point_ft is stored as 8190, but
-- the row's own `corrections` field states "the more precise 8,203 ft figure is used here as
-- highPointFt, with the older 8,190 ft figure noted as the commonly cited rounded value" -- and
-- the route's own "Ares Tower summit" waypoint already carries elev: 8203 to match that stated
-- intent. high_point_ft was left at the old 8,190 ft figure the corrections note says was
-- superseded. Fixing it to match what the row itself says it did.
UPDATE routes SET high_point_ft = 8203 WHERE id = 'wa_vasiliki_ridge_standard';

-- wa_west_craggy_peak_standard_route (West Craggy Peak): the mirror-image of the above. The
-- row's own `corrections` field says sources disagree (8,366 / 8,372 / 8,367 ft) and states
-- "8,372 ft is used here as the most commonly cited figure" -- matching the stored high_point_ft
-- (8372). But the "West Craggy Peak summit" waypoint still carries the superseded 8,366 ft figure
-- in both its elev and elevFt fields. Fixing the waypoint to match the value the row says it
-- adopted.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{3,elev}', '8372'::jsonb),
  '{3,elevFt}', '8372'::jsonb
) WHERE id = 'wa_west_craggy_peak_standard_route';

-- wa_washington_ellinor_traverse_ridge (Mount Washington / Mount Ellinor traverse): the row
-- stores Mount Washington's summit as 6,260 ft (both high_point_ft and the "Mount Washington -
-- Summit" waypoint), which matches Wikipedia and Mountain Project (two independent authoritative
-- sources agree on 6,260 ft). But the route's own approach_variants prose instead states "a
-- final short Class 3-4 scramble to the 6,255 ft summit" -- the SummitPost figure, outvoted by
-- Wikipedia/MP and contradicted by the row's own stored elevation. Correcting the prose to match
-- the DB's own (better-supported) number.
UPDATE routes SET approach_variants = jsonb_set(
  approach_variants, '{0,notes}',
  to_jsonb(replace(approach_variants->0->>'notes', '6,255 ft summit', '6,260 ft summit'))
) WHERE id = 'wa_washington_ellinor_traverse_ridge';
