-- 0283: three closed Missouri boulders take their OWN pins back.
--
-- Asked: "update now" (2026-10-08). 0281 folded the old park copies of Hide and seek boulders, Hiker's
-- Boulder and Solus Boulder into the current ones under "XM: Closed Areas > EM: (closed)", and kept the
-- current copies' pins: the closed area's placeholder (38.353, -90.886), ~52 km from the boulders. Each
-- boulder's own pin, from the copy 0281 deleted (scripts/data/closed-copies-rollback.json), puts it back at
-- Mooner's Hollow. The boulders stay filed as closed, and no parking is added (0281 kept the park
-- trailhead's off them).
-- ABORTS unless each pin is still the placeholder 0281 left.
begin;

do $$ declare n int; begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to move.
  select count(*) into n from areas where id in ('mo_hide_and_seek_boulders_2', 'mo_hiker_s_boulder_2', 'mo_solus_boulder_2');
  if n = 0 then raise notice '0283: no catalog, nothing to move'; return; end if;
  if n <> 3 then raise exception '0283: expected 3 boulders, found %', n; end if;

  update areas a set lat = v.lat, lng = v.lng, coords_approx = false
    from (values
      ('mo_hide_and_seek_boulders_2', 37.97761::double precision, -90.53041::double precision, 38.35321::double precision, -90.88554::double precision),
      ('mo_hiker_s_boulder_2',        37.98128, -90.52276, 38.35355, -90.886),
      ('mo_solus_boulder_2',          37.98089, -90.5242,  38.35338, -90.88553)
    ) v(id, lat, lng, from_lat, from_lng)
   where a.id = v.id and a.lat = v.from_lat and a.lng = v.from_lng and a.parent_id = 'mo_em_closed';
  get diagnostics n = row_count;
  if n <> 3 then raise exception '0283: % of 3 pins were the placeholder 0281 left', n; end if;
end $$;

commit;
