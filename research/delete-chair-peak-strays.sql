-- Chair Peak step 3: remove the two stray rows. Run ONLY after step 2's merge.
--
-- Sequence, each verified before the next:
--   1. moved the unique route to wa_chair_peak, rescued 2 grades   (done)
--   2. merged 16 fields the strays held and the keepers lacked      (done)
--   3. delete the strays                                            (this file)
--
-- Step 2 existed because deleting straight after step 1 would have destroyed
-- dist_km, itinerary, difficulty, pitch_detail, data_quality, disciplines and
-- approach_logistics (trailhead coordinates). A duplicate name is not a
-- duplicate row.
--
-- Each DELETE is guarded three ways: the stray's own id, its area (so a Chair
-- Peak row can never be hit), and an EXISTS on the keeper *carrying the merged
-- data*. If step 2 was skipped or failed, dist_km is null on the keeper, EXISTS
-- is false, and the DELETE removes 0 rows instead of losing the only copy.

delete from routes
 where id = 'wa_east_face_8'
   and area_id = 'wa_summer_fall_rock_3'
   and exists (select 1 from routes k
                where k.id = 'wa_chair_peak_east_face'
                  and k.area_id = 'wa_chair_peak'
                  and k.dist_km is not null
                  and k.itinerary is not null);

delete from routes
 where id = 'wa_northwest_ridge_3'
   and area_id = 'wa_summer_fall_rock_3'
   and exists (select 1 from routes k
                where k.id = 'wa_chair_peak_northwest_ridge'
                  and k.area_id = 'wa_chair_peak'
                  and k.dist_km is not null
                  and k.itinerary is not null);

-- Expect 7 rows on Chair Peak and 0 on the season bucket.
select area_id, count(*) as routes
  from routes
 where area_id in ('wa_chair_peak','wa_summer_fall_rock_3')
 group by area_id order by area_id;
