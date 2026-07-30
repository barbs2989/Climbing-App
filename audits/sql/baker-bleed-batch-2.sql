-- Batch 2. Run AFTER audits/sql/baker-bleed-national.sql. Kept as a separate
-- paste because the two together exceed the size at which the Supabase SQL
-- Editor has silently truncated input before.
--
-- Two more numeric bleeds of the same shape as the Baker one, both surfaced only
-- after the roundness fix stopped burying them under unit-conversion noise.

-- ---------------------------------------------------------------- Mount Goode
-- high_point_ft 9220 is Mount Goode's real summit elevation and belongs on its
-- four routes. It also sits on three unrelated California routes, which each
-- ALSO carry gain_ft 5800 -- the same contaminated "Northeast Buttress" gain
-- already corrected on Goode, Johannesburg and Bonanza. Two fields travelling
-- together, exactly as Baker's 7150/10781 did.
--
-- Flatiron Butte, Mount Cotter and Torre De Mierda are nowhere near 9,220 ft as
-- a shared summit, and all three areas have elevation_ft = null. These are
-- 13-of-85-column stubs, so as with the 28 North Ridge rows there is no internal
-- source to repair from and both fields are nulled rather than guessed.
update routes set gain_ft = null, high_point_ft = null
where gain_ft = 5800 and high_point_ft = 9220
  and id in ('ca_northeast_buttress',     -- Flatiron Butte (Shangri La)
             'ca_northeast_buttress_2',   -- Mount Cotter
             'ca_northeast_buttress_3');  -- Torre De Mierda

-- -------------------------------------------------------- Sherpa Balanced Rock
-- All three routes on Sherpa Balanced Rock carry high_point_ft 8630, which is
-- SHERPA PEAK's summit. Their own area is 8605 ft. The two are genuinely
-- distinct formations about 93 m apart -- this is a wrong number on a legitimate
-- pair, not a duplicate area -- so the fix is to their own area's elevation
-- rather than a deletion.
-- Ids listed explicitly rather than filtering on area_id alone, so check:sql can
-- confirm each target exists instead of warning that the predicate is opaque.
update routes set high_point_ft = 8605
where high_point_ft = 8630
  and id in ('wa_sherpa_balanced_rock_ne_couloir',
             'wa_sherpa_balanced_rock_north_ridge',
             'wa_sherpa_balanced_rock_standard');

-- verify
--   expect: the 3 CA rows gone from 9220, leaving only Mount Goode's four
select id, area_id, gain_ft, high_point_ft from routes
where high_point_ft = 9220 order by id;
--   expect: 8605 on all three Sherpa Balanced Rock routes; Sherpa Peak keeps 8630
select id, area_id, high_point_ft from routes
where area_id in ('wa_sherpa_balanced_rock', 'wa_sherpa_peak') order by id;
