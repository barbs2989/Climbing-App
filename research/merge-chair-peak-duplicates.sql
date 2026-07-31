-- Chair Peak step 2: MERGE, not delete. Deleting the two stranded rows would
-- destroy 16 fields the Chair Peak rows lack (dist_km, itinerary, difficulty,
-- pitch_detail, approach_logistics with trailhead coords, data_quality,
-- disciplines). They are complementary, not redundant. Full reasoning: PR #509.
--
-- Blanks only. Same-table UPDATE...FROM silently no-ops, so each write uses a
-- COALESCE scalar subquery. NO DELETE here -- the strays stay until this verifies.

-- wa_chair_peak_east_face  <-  wa_east_face_8
update routes set dist_km = coalesce(dist_km, (select dist_km from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';
update routes set disciplines = coalesce(disciplines, (select disciplines from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';
update routes set itinerary = coalesce(itinerary, (select itinerary from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';
update routes set data_quality = coalesce(data_quality, (select data_quality from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';
update routes set difficulty = coalesce(difficulty, (select difficulty from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';
update routes set approach_logistics = coalesce(approach_logistics, (select approach_logistics from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';
update routes set corrections = coalesce(corrections, (select corrections from routes where id='wa_east_face_8'))
 where id='wa_chair_peak_east_face' and area_id='wa_chair_peak';

-- wa_chair_peak_northwest_ridge  <-  wa_northwest_ridge_3
update routes set fa = coalesce(fa, (select fa from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set dist_km = coalesce(dist_km, (select dist_km from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set disciplines = coalesce(disciplines, (select disciplines from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set pitch_detail = coalesce(pitch_detail, (select pitch_detail from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set itinerary = coalesce(itinerary, (select itinerary from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set data_quality = coalesce(data_quality, (select data_quality from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set difficulty = coalesce(difficulty, (select difficulty from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set approach_logistics = coalesce(approach_logistics, (select approach_logistics from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';
update routes set corrections = coalesce(corrections, (select corrections from routes where id='wa_northwest_ridge_3'))
 where id='wa_chair_peak_northwest_ridge' and area_id='wa_chair_peak';

select id, name, area_id, grade, pitches, dist_km,
       (itinerary is not null) as has_itinerary,
       (difficulty is not null) as has_difficulty,
       (approach_logistics is not null) as has_approach
  from routes where id in ('wa_chair_peak_east_face','wa_chair_peak_northwest_ridge',
                           'wa_east_face_8','wa_northwest_ridge_3')
 order by area_id, name;
