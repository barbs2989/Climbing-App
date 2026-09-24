-- A PEAK's main type of climbing is never a crag type (owner rules, 2026-09-24: "Trad only
-- applies to climbs at a crag"; "if it's class 4 it's scrambling"; "rock" is not a type at all).
-- 0051 voted a peak's type from its routes, so a mountain with a few trad lines read "trad".
--
-- Audit, over every map-visible peak with climbs: 25 read "trad" and 1 "rock", all in WA; none
-- read sport, aid or bouldering. Each was researched online for its STANDARD route:
-- Class 2-4 -> scrambling, 5th class -> alpine, glacier-defined -> mountaineering. One, Goose Egg
-- Mountain, is roadside Tieton River cragging filed as a peak: it becomes a crag, where trad is
-- correct. (The other types each peak holds are listed by 0198's `disciplines`.)
--
-- Three parts: the researched values; Goose Egg re-filed; and the 0051 function changed so a
-- crag type can never win on a peak again, and a peak's mountain type, once set, is kept rather
-- than re-voted the next time one of its routes is edited.

-- 1. Researched values (standard route in the comment).
update areas set dominant_discipline = 'alpine' where area_type = 'peak' and id in (
  'wa_baring_mountain',          -- OWNER'S CALL. Standard NW Ridge is Class 2-3/4, which the class
                                 --   rule would make scrambling; kept alpine as the owner stated
  'wa_colchuck_balanced_rock',   -- NW Ridge 5.6
  'wa_chianti_spire',            -- easiest line 5.6
  'wa_himmelhorn',               -- Southeast Route IV 5.8
  'wa_ingalls_peak',             -- South Ridge 5.4, roped
  'wa_big_snagtooth',            -- West Ridge ends in 5.7 summit pitches
  'wa_bears_breast_mountain',    -- 5.6 summit block
  'wa_big_kangaroo',             -- multi-pitch 5th class to the summit
  'wa_mushroom_tower',           -- one mid-5th pitch; was "rock"
  'wa_the_chopping_block'        -- South Route 5.5, five pitches
);
update areas set dominant_discipline = 'mountaineering' where area_type = 'peak' and id in (
  'wa_mount_fury_east'           -- Southeast Glacier, roped for crevasses (Northern Pickets)
);
update areas set dominant_discipline = 'scrambling' where area_type = 'peak' and id in (
  'wa_cashmere_mountain',        -- West Ridge, Class 3
  'wa_cathedral_rock',           -- SW route, Class 3-4
  'wa_lundin_peak',              -- West Ridge, Class 3-4
  'wa_golden_horn',              -- SW route Class 3, Class 4 summit moves
  'wa_indian_head_peak',         -- SW slopes, Class 2
  'wa_ruby_mountain',            -- boot-path scramble
  'wa_castle_peak_pasayten',     -- Class 2-3
  'wa_greenwood_mountain',       -- W ridge, Class 2-4
  'wa_huckleberry_mountain',     -- Class 3-4
  'wa_davis_peak_nc',            -- South Ridge, Class 2-3
  'wa_sperry_peak',              -- Class 2-3
  'wa_wing_peak',                -- NW ridge, low Class 4 (coordinate confirmed beside Gunn Peak)
  'wa_hozomeen_mountain',        -- North Peak (the high point), Class 4; South Peak is 5.5-5.6
  'wa_garfield_mountain'         -- South Route to the Main Peak, Class 4/4+ (Beckey)
);

-- 2. A crag filed as a peak.
update areas set area_type = 'crag' where id = 'wa_goose_egg_mountain' and area_type = 'peak';

-- 3. The rule, so it cannot come back.
create or replace function areas_update_dominant_discipline(target_area_id text) returns void as $$
declare
  t text;
  cur text;
  mountain_types constant text[] := array['alpine','mountaineering','scrambling','ice','mixed','hiking'];
begin
  select area_type, dominant_discipline into t, cur from areas where id = target_area_id;
  if t = 'peak' then
    if cur = any(mountain_types) then
      return;  -- already a mountain type (voted or researched): keep it
    end if;
    update areas set dominant_discipline = coalesce(
      (select discipline from routes
        where area_id = target_area_id and discipline = any(mountain_types)
        group by discipline
        order by count(*) desc, discipline
        limit 1),
      case when exists (select 1 from routes where area_id = target_area_id) then 'alpine' end,
      cur)
    where id = target_area_id;
  else
    update areas set dominant_discipline = (
      select discipline from routes
      where area_id = target_area_id and discipline is not null
      group by discipline
      order by count(*) desc, discipline
      limit 1
    )
    where id = target_area_id;
  end if;
end $$ language plpgsql;
