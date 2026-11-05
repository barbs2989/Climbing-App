-- WA alpine audit, batch 209 (pass 4)
-- Routes reviewed: wa_mount_fairchild_standard, wa_mount_formidable_south_face,
-- wa_mount_fury_east_mongo_ridge, wa_mount_fury_east_southeast_glaciers,
-- wa_mount_fury_west_west_ridge, wa_mount_goode_northeast_buttress,
-- wa_mount_hardy_snow_scramble, wa_mount_hinman_hinman_glacier

-- wa_mount_fury_west_west_ridge: the `corrections` column is a stale provenance
-- note contradicted by the row's own current data. It claims (1) "'fa' is left
-- null rather than guessed" -- but `fa` is NOT null; it holds a fully verified
-- first-ascent record (Duke Watson, Vic Josendal, Warren Spickard, Maurice
-- Muzzy, Phil Sharpe, August 1958 -- confirmed against AAC Publications'
-- "New Climbs in the Northern Pickets", 1959, and Alpenglow Ski History's Duke
-- Watson interview). It also claims "the peak's elevationFt is currently null
-- in the database" -- but `high_point_ft` = 8303 and the area row's
-- `elevation_ft` = 8303 are both populated, consistent with the cited 2022
-- Gilbertson theodolite survey (8,305 ft +/-10). Both factual gaps this note
-- describes have since been filled by a later research pass that never
-- cleared the note, leaving it actively misleading about the row's own state.
UPDATE routes
SET corrections = NULL
WHERE id = 'wa_mount_fury_west_west_ridge'
  AND corrections LIKE '%elevationFt is currently null%';
