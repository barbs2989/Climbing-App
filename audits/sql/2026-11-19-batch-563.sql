-- WA alpine audit, batch 563 (pass 9)

-- routes.wa_chianti_spire_east_face: three different numbers for the same summit inside one
-- row -- high_point_ft 8459, waypoint "Chianti Spire Summit" elev: 8459, elevFt: 8420 -- while
-- this route's own siblings on the same peak (wa_chianti_spire_lichen_bouquet,
-- wa_chianti_spire_north_face) and the areas.wa_chianti_spire row itself all agree on 8400 ft.
-- External sources (SummitPost, trip reports) put the summit at 8,380-8,400 ft, squarely
-- matching the area record and the other two routes, so East Face's own figures are the
-- outlier. Aligning high_point_ft and the waypoint to 8400 to match.
UPDATE routes SET high_point_ft = 8400
WHERE id = 'wa_chianti_spire_east_face' AND high_point_ft = 8459;

UPDATE routes SET waypoints = jsonb_set(jsonb_set(waypoints, '{5,elev}', '8400'::jsonb), '{5,elevFt}', '8400'::jsonb)
WHERE id = 'wa_chianti_spire_east_face' AND waypoints->5->>'elev' = '8459' AND waypoints->5->>'elevFt' = '8420';
