-- 0350: the last area named with the source's sort label. Safe Harbor South's sectors run a-k (Key West Wall, Blood
-- Sugar Magic Sector, ... Hydroman Sector); every one lost its letter in the 2026-10-07 rename except "c Electric Co.
-- Sector", whose bare lowercase letter (no period) the label rule does not read as one. The rule is left alone: a bare
-- lowercase word is a real name elsewhere ("lo Boulder" under Lo Area, Rivière Dumoine's "km 29 - ...").
do $$
declare n int;
begin
  if not exists (select 1 from areas where id = 'pa_c_electric_co_sector') then
    raise notice '0350: no Electric Co. Sector here (an empty database)'; return;
  end if;
  if exists (select 1 from areas where parent_id = 'pa_safe_harbor_south' and name = 'Electric Co. Sector') then
    raise exception '0350: Safe Harbor South already has an Electric Co. Sector'; end if;
  update areas set name = 'Electric Co. Sector' where id = 'pa_c_electric_co_sector' and name = 'c Electric Co. Sector' and parent_id = 'pa_safe_harbor_south';
  get diagnostics n = row_count;
  if n <> 1 then raise exception '0350: % rows renamed, not 1', n; end if;
end $$;
