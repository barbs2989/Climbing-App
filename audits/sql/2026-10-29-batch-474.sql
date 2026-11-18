-- WA alpine route audit -- batch 474 (pass 8)
-- Routes: wa_buckner_mountain_north_face, wa_buckner_mountain_southwest_face,
-- wa_bulls_tooth_south_ridge, wa_burgundy_spire_north_face,
-- wa_burnt_boot_peak_north_ridge, wa_cardinal_peak_nw_couloir_north_ridge,
-- wa_cardinal_peak_se_slopes, wa_carne_mountain_trail_route

-- wa_carne_mountain_trail_route: high_point_ft (7085), the row's own Summit
-- waypoint (elev 7085), and the parent wa_carne_mountain area row's
-- elevation_ft (7085) all agree -- and the row's own data_quality.gaps entry
-- cites WTA and a trip report both independently giving 7,085 ft. But the
-- row's own climbing_route[0].notes narrates the final push as reaching "the
-- summit at 7,091 ft", a figure that appears nowhere else on this row and
-- that no external source found in this run corroborates either. This is an
-- internal contradiction on the row's own already-agreed figure, not a
-- source conflict, so it is corrected to match the row's own established
-- 7,085 ft rather than left as a stray number.
update routes set
  climbing_route = jsonb_set(
    climbing_route, '{0,notes}',
    to_jsonb(replace(climbing_route #>> '{0,notes}', 'summit at 7,091 ft', 'summit at 7,085 ft'))
  )
where id = 'wa_carne_mountain_trail_route'
  and climbing_route #>> '{0,notes}' like '%summit at 7,091 ft%';
