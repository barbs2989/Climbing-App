-- Rollback for research-batch10 (11 areas set 2026-10-08). Clears only those ids,
-- and only while they still hold one of the batch's lots.
begin;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id in ('co_buick_rocks_and_hitler_s_sex_life','co_bullet_the','co_button_rock_parking_lot_boulders','co_entryway_slabs','co_fraternal_twins_boulder','co_longmont_reservoir_area_aka_buttonrock','co_old_yellar_dome','co_river_wall_ii','co_rock_of_all_ages_boulder','co_tigers_in_lipstick','co_tortuga_boulder')
  and (parking_lat, parking_lng) in ((40.228949, -105.341724));
commit;
