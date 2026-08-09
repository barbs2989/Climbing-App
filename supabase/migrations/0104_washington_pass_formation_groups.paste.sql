-- 0104 — paste-safe extract. Statements only; the reasoning, the safety argument and the
-- verify queries live in 0104_washington_pass_formation_groups.sql, which is the record.
--
-- This file exists because check:sql warns that the documented migration is 9 KB against a
-- 4 KB soft limit and the Supabase SQL Editor has silently TRUNCATED large pastes before.
-- A truncated paste that still parses reports success and applies half the change.
--
-- Runs as ONE transaction. Do not append a verify SELECT to this paste: an error in a
-- read-only check rolls back the writes above it (that is how 0097's six correct UPDATEs
-- were undone). Run the verify queries from the main file separately, afterwards.

update areas set parent_id = 'wa_liberty_bell_group'
 where id in ('wa_lexington_tower','wa_north_early_winters_spire','wa_south_early_winters_spire');

update areas set parent_id = 'wa_kangaroo_ridge'
 where id in ('wa_big_kangaroo','wa_kangaroo_temple','wa_mushroom_tower',
              'wa_half_moon','wa_wallaby_peak');

update areas set parent_id = 'wa_silver_star_and_wine_spires'
 where id in ('wa_burgundy_spire','wa_chianti_spire','wa_pernod_spire',
              'wa_silver_star_mountain_okanogan','wa_vasiliki_ridge');

delete from areas where id = 'wa_north_early_winter_spire'
  and not exists (select 1 from routes where area_id = 'wa_north_early_winter_spire')
  and exists (select 1 from areas k where k.id = 'wa_north_early_winters_spire'
                                      and k.route_count > 0);

update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in ('wa_liberty_bell_group','wa_kangaroo_ridge','wa_silver_star_and_wine_spires');
