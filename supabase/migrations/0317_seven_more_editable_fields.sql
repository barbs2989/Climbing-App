-- Seven more route columns become editable from the route page (route quality control, step 5).
--
-- check:editable-coverage (scripts/check-editable-coverage.mjs) asks of every `routes` column that
-- reaches a screen: can a climber correct it? These seven rendered and could not be: alternative
-- names and variations (ROUTE FACTS), first free / first winter ascent (ROUTE FACTS), the high
-- point (TECHNICAL STATS), the sun note (ROUTE FACTS) and pro tips (BETA / PRO TIPS). Each gets a
-- `contribution_fields` row so its confidence level is computed from the column (0308) and the
-- edit-sheet entry in RouteDetail.jsx can be offered (check:contrib-field-columns holds the two
-- lists equal). Static rows, so the file replays on an empty database.
insert into contribution_fields (form_key, column_name, is_prose, is_gear, label) values
  ('altNames',    'alt_names',     false, false, 'Also known as'),
  ('variations',  'variations',    false, false, 'Variations'),
  ('ffa',         'ffa',           false, false, 'First free ascent'),
  ('fwa',         'fwa',           false, false, 'First winter ascent'),
  ('highPointFt', 'high_point_ft', false, false, 'High point'),
  ('sun',         'sun',           true,  false, 'Sun'),
  ('proTips',     'pro_tips',      true,  false, 'Pro tips')
on conflict (form_key) do update
  set column_name = excluded.column_name, is_prose = excluded.is_prose,
      is_gear = excluded.is_gear, label = excluded.label;

-- Confirm:  select count(*) from contribution_fields;   -- 83

-- ---------------------------------------------------------------------------------------------
-- Top contributors count only edits that were CHECKED. 0148's area_top_contributors gave one
-- point per (route, field) a climber filed, whatever became of it; since 0307–0309 every field
-- edit is held and may be turned down, so an unreviewed or rejected edit must not rank — or
-- flooding a crag with wrong edits would top its leaderboard. Photos, pairings, start locations
-- and sun reports are live when filed and count as before. user_top_contributor_areas (0222)
-- reads this function and needs no change.
-- ---------------------------------------------------------------------------------------------
create or replace function area_top_contributors(aid text, lim int default 3)
returns table(contributor text, n bigint) language sql stable as $$
  select c.contributor,
         count(distinct case
           when c.kind = 'field'
             then 'f|' || coalesce(c.route_id, c.area_id, '') || '|' || coalesce(c.field, '')
           else 'r|' || c.id::text
         end) as n
  from contributions c
  left join routes r on r.id = c.route_id
  join areas ca on ca.id = coalesce(c.area_id, r.area_id)
  join areas pa on pa.id = aid
  where ca.path <@ pa.path
    and c.contributor is not null
    and c.contributor not in ('anon', '')
    and (c.kind <> 'field' or c.status = 'approved')
  group by c.contributor
  order by n desc, c.contributor
  limit lim;
$$;
