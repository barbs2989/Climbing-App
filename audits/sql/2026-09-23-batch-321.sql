-- wa_east_slope (Primus Peak, East Slope / Lucky Pass route): the bivy array carried a
-- "Klawatti Col camp, Eldorado ice-cap traverse approach" (7,800 ft) entry that belongs to
-- an entirely different corridor. This route's own approach/itinerary/waypoints describe
-- exclusively the Thunder Creek -> Lucky Ridge -> Borealis Glacier -> Lucky Pass line out
-- of Colonial Creek Campground; Klawatti Col is a feature of the Eldorado/Inspiration/
-- Klawatti glacier massif reached from Cascade River Road, nowhere near Thunder Creek.
-- The identical entry (name and elevation) appears verbatim in all five wa_eldorado_peak_*
-- routes' bivy arrays, where it correctly belongs -- confirming this is the shared-corridor
-- contamination pattern (one camp entry propagated to a route outside its own corridor),
-- not a genuine second use of that col from this route's own documented approach.
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(bivy) elem
  WHERE elem->>'name' <> 'Klawatti Col camp, Eldorado ice-cap traverse approach'
)
WHERE id = 'wa_east_slope'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(bivy) elem
    WHERE elem->>'name' = 'Klawatti Col camp, Eldorado ice-cap traverse approach'
  );

-- wa_eldorado_peak_eldorado_glacier_nw (Eldorado Peak, Northwest Couloir / Eldorado Glacier):
-- the compact `season` field read "Oct-Apr", which both omits and contradicts this same
-- row's own `best_season` prose. best_season names two favorable windows -- "Early season
-- (roughly May-June)" and "a good cold snap in early fall/winter (e.g., late October-
-- November)" -- with mid-to-late summer merely mediocre (mostly snow-filled). "Oct-Apr"
-- excludes May-June entirely, which best_season explicitly calls a good climbing window,
-- while including the deep-winter months (Dec-Apr) that best_season never describes as
-- viable given the long glaciated approach. Extending the window to include the May-June
-- period the row's own prose names is a minimal, additive correction; it removes nothing
-- that was previously stated.
UPDATE routes
SET season = 'Oct-Jun'
WHERE id = 'wa_eldorado_peak_eldorado_glacier_nw'
  AND season = 'Oct-Apr';
