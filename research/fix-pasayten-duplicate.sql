-- Drop the duplicate "Pasayten Wilderness" (wa_pasayten_wilderness) + its 17-area,
-- ZERO-route subtree; wa_pasayten (41 routes) is the real one. Each delete self-
-- guards on being empty. Archived: research/crag-merges/pasayten-husk-archive.json
-- Why delete not reparent, and the check:sql gap: research/crag-merges/NOTES.md
begin;
delete from areas where id='wa_left_side_2' and not exists (select 1 from routes where area_id='wa_left_side_2') and not exists (select 1 from areas where parent_id='wa_left_side_2');
delete from areas where id='wa_right_side_3' and not exists (select 1 from routes where area_id='wa_right_side_3') and not exists (select 1 from areas where parent_id='wa_right_side_3');
delete from areas where id='wa_east_face_3' and not exists (select 1 from routes where area_id='wa_east_face_3') and not exists (select 1 from areas where parent_id='wa_east_face_3');
delete from areas where id='wa_west_face_3' and not exists (select 1 from routes where area_id='wa_west_face_3') and not exists (select 1 from areas where parent_id='wa_west_face_3');
delete from areas where id='wa_pick_peak_sunny_pass' and not exists (select 1 from routes where area_id='wa_pick_peak_sunny_pass') and not exists (select 1 from areas where parent_id='wa_pick_peak_sunny_pass');
delete from areas where id='wa_lower_east_face_of_upper_toats_coulee' and not exists (select 1 from routes where area_id='wa_lower_east_face_of_upper_toats_coulee') and not exists (select 1 from areas where parent_id='wa_lower_east_face_of_upper_toats_coulee');
delete from areas where id='wa_middle_east_face_of_upper_toats_coulee' and not exists (select 1 from routes where area_id='wa_middle_east_face_of_upper_toats_coulee') and not exists (select 1 from areas where parent_id='wa_middle_east_face_of_upper_toats_coulee');
delete from areas where id='wa_se_face_of_upper_toats_coulee' and not exists (select 1 from routes where area_id='wa_se_face_of_upper_toats_coulee') and not exists (select 1 from areas where parent_id='wa_se_face_of_upper_toats_coulee');
delete from areas where id='wa_upper_east_face_of_upper_toats_coulee' and not exists (select 1 from routes where area_id='wa_upper_east_face_of_upper_toats_coulee') and not exists (select 1 from areas where parent_id='wa_upper_east_face_of_upper_toats_coulee');
delete from areas where id='wa_upper_middle_fork_of_toats_coulee' and not exists (select 1 from routes where area_id='wa_upper_middle_fork_of_toats_coulee') and not exists (select 1 from areas where parent_id='wa_upper_middle_fork_of_toats_coulee');
delete from areas where id='wa_bauerman_ridge' and not exists (select 1 from routes where area_id='wa_bauerman_ridge') and not exists (select 1 from areas where parent_id='wa_bauerman_ridge');
delete from areas where id='wa_lower_east_face_of_windy_peak' and not exists (select 1 from routes where area_id='wa_lower_east_face_of_windy_peak') and not exists (select 1 from areas where parent_id='wa_lower_east_face_of_windy_peak');
delete from areas where id='wa_lower_east_slabs_of_windy_peak' and not exists (select 1 from routes where area_id='wa_lower_east_slabs_of_windy_peak') and not exists (select 1 from areas where parent_id='wa_lower_east_slabs_of_windy_peak');
delete from areas where id='wa_upper_east_face_windy_peak' and not exists (select 1 from routes where area_id='wa_upper_east_face_windy_peak') and not exists (select 1 from areas where parent_id='wa_upper_east_face_windy_peak');
delete from areas where id='wa_zebra_slabs' and not exists (select 1 from routes where area_id='wa_zebra_slabs') and not exists (select 1 from areas where parent_id='wa_zebra_slabs');
delete from areas where id='wa_windy_peak_windy_lake' and not exists (select 1 from routes where area_id='wa_windy_peak_windy_lake') and not exists (select 1 from areas where parent_id='wa_windy_peak_windy_lake');
delete from areas where id='wa_pasayten_wilderness' and not exists (select 1 from routes where area_id='wa_pasayten_wilderness') and not exists (select 1 from areas where parent_id='wa_pasayten_wilderness');
commit;
