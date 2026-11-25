-- 0533: routes.snow_free_from (0532) is editable from the route's edit sheet, owner-reviewed like every edit.
-- The SuggestFix field `snowFreeFrom` offers the 1st or the 15th of May to October; lib/terrain.js snowFreeOn() reads it.

insert into contribution_fields (form_key, column_name, is_prose, is_gear, label) values
  ('snowFreeFrom', 'snow_free_from', false, false, 'Off the snow from')
on conflict (form_key) do update
  set column_name = excluded.column_name, is_prose = excluded.is_prose, is_gear = excluded.is_gear, label = excluded.label;
