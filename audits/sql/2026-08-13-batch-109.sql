-- === wa_tooth_chair_traverse (Tooth - Chair Traverse, The Tooth) ===

-- length_m (274, i.e. ~900 ft) is far short of the traverse's actual crest distance.
-- Mountain Project's route page for this exact traverse states it "covers approximately
-- 1.5 miles" on the crest (3-4 hours), and that page's other stated facts already match
-- this row exactly and independently -- the "one mandatory rappel off Bryant Peak,
-- approximately 50 feet" detail and the "3-4 hours on the crest" timing are both already
-- on file here (see rappels/turnaround/timing.summitTimeHrs), which corroborates MP as
-- this row's real source. 1.5 mi = ~2,414 m; 274 m appears to be a stray/placeholder
-- figure rather than the sourced crest distance. dist_km (4.8, doubled by the app to
-- ~9.6 km / ~6 mi round trip) is left unchanged -- it already tracks MP's separately
-- stated "4-5 miles of hiking in and out" and needs no correction.
UPDATE routes
SET length_m = 2414
WHERE id = 'wa_tooth_chair_traverse';
