-- Mount Baker's North Ridge bled two numeric fields across the WHOLE routes
-- table, not just Washington. 28 non-WA routes -- every one named "North Ridge"
-- -- carry Baker's gain_ft 7150 AND Baker's high_point_ft 10781. That puts the
-- Grand Teton (13,775 ft), Mount Moran, Mt. Conness and the Pfeifferhorn all at
-- a 10,781 ft summit. None of the 28 is anywhere near that elevation.
--
-- A field-by-field diff against wa_mount_baker_north_ridge found exactly two
-- contaminated columns. Everything else that matches (name, discipline,
-- grade_system, classic) is generic; grade, pitches and fa vary per row, so the
-- rest of each import is per-route data worth keeping.
--
-- Both fields are NULLED, not corrected: these are skeletal stubs (11 of 83
-- columns populated) and all 28 areas have elevation_ft = null, so there is no
-- internal source to derive a real figure from. A blank is honest; 10,781 ft on
-- the Grand Teton is a number someone could plan against and be wrong.
--
-- Rows are NOT deleted. Whether these routes exist at all is a separate identity
-- question about the deferred out-of-state expansion, and deleting on suspicion
-- is exactly what cost us Triple Couloirs.
--
-- Ids are enumerated rather than matched with `id LIKE 'wa\_%'` on purpose --
-- an unescaped LIKE in a WHERE clause corrupted 8 routes in PR #324.
-- Guarded on BOTH contaminated values so a row already fixed is skipped.

update routes set gain_ft = null, high_point_ft = null
where gain_ft = 7150 and high_point_ft = 10781
  and id in (
  'ca_north_ridge_10',   -- Hurd Peak
  'ca_north_ridge_11',   -- Whaleback
  'ca_north_ridge_12',   -- Independence Peak
  'ca_north_ridge_13',   -- Mt. Conness
  'ca_north_ridge_4',    -- Lone Pine Peak
  'ca_north_ridge_5',    -- Cirque Peak
  'ca_north_ridge_6',    -- Mt. Tom
  'ca_north_ridge_7',    -- Feather Peak
  'ca_north_ridge_8',    -- Trapezoid Peak
  'ca_north_ridge_9',    -- Peak 12,486
  'co_north_ridge',      -- Isolation Peak
  'co_north_ridge_2',    -- Spearhead
  'co_north_ridge_3',    -- Arrow Peak
  'co_north_ridge_4',    -- The Citadel
  'co_north_ridge_5',    -- Mount Toll
  'co_north_ridge_6',    -- Mount Neva
  'co_north_ridge_7',    -- Fool's Peak
  'or_north_ridge',      -- South Sister
  'or_north_ridge_2',    -- Mt. Washington
  'ut_north_ridge_4',    -- Pfeifferhorn
  'ut_north_ridge_5',    -- Dromedary Peak
  'wy_north_ridge',      -- Mt Owen
  'wy_north_ridge_2',    -- Mount Moran
  'wy_north_ridge_3',    -- Middle Teton
  'wy_north_ridge_4',    -- Grand Teton
  'wy_north_ridge_5',    -- Mt. Sacagawea
  'wy_north_ridge_6',    -- Ellingwood Peak
  'wy_north_ridge_7'     -- Steeple Peak
);

-- verify: should return 9 rows, all of them Mount Baker's own routes
select id, area_id, gain_ft, high_point_ft from routes
where gain_ft = 7150 or high_point_ft = 10781
order by id;
