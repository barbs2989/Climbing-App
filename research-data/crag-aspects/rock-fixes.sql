-- Disputed crag rock corrected from online research (rock-verdicts-a/b.json); Ophir Main Wall left alone (the two checks disagreed).
begin;
with v(id,rock) as (values
('az_lookout_mountain','basalt'),
('ca_behind_the_yaks','rhyolite'),
('ca_south_face','rhyolite'),
('ca_grotto_the_3','latite'),
('ca_ort_wall','latite'),
('ca_welcome_wall','latite'),
('ca_memorial_wall_2','limestone'),
('co_lookout_mountain_crag','gneiss'),
('tn_main_wall_3','sandstone'),
('vt_duck_soup_boulder','schist'),
('wi_2_north_wall','sandstone'),
('wi_indian_head','basalt'),
('wi_rod_s_area','basalt'),
('wi_sentinel_area','basalt'),
('wi_wisconsin_strip','basalt'))
update areas a set rock=v.rock, rock_basis='researched' from v where a.id=v.id and (a.rock is distinct from v.rock or a.rock_basis<>'researched');
with v(id,rock) as (values
('az_lookout_mountain','basalt'),
('ca_behind_the_yaks','rhyolite'),
('ca_south_face','rhyolite'),
('ca_grotto_the_3','latite'),
('ca_ort_wall','latite'),
('ca_welcome_wall','latite'),
('ca_memorial_wall_2','limestone'),
('co_lookout_mountain_crag','gneiss'),
('tn_main_wall_3','sandstone'),
('vt_duck_soup_boulder','schist'),
('wi_2_north_wall','sandstone'),
('wi_indian_head','basalt'),
('wi_rod_s_area','basalt'),
('wi_sentinel_area','basalt'),
('wi_wisconsin_strip','basalt'))
update routes r set rock=v.rock from v where r.area_id=v.id and r.rock is not null and r.rock<>v.rock;
commit;
