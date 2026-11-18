-- Bulls Tooth (wa_bulls_tooth): areas.elevation_ft (6849) disagreed with the route's own
-- high_point_ft (6840) and with external sources (Wikipedia/Peakbagger, GNIS-derived topo
-- data, all converging on ~6840-6842 ft). Correcting to 6840.
-- NOTE: identical to the fix already proposed in audits/sql/2026-10-08-batch-387.sql
-- (pass 7) -- the live DB still reads 6849, so that one appears to have never been run.
UPDATE areas SET elevation_ft = 6840 WHERE id = 'wa_bulls_tooth' AND elevation_ft = 6849;
