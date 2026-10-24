-- WA alpine route audit -- batch 354 (2026-09-30, pass 6)
-- Human-reviewable fix. Nothing here is applied automatically.

-- wa_mushroom_tower_standard (Mushroom Tower, Standard Route / South Side)
-- The route's own `overview` field cites its immediate neighbor Big Kangaroo's summit
-- elevation as "8,280 ft" -- but that contradicts TWO other places this exact fact is
-- already stored: Big Kangaroo's own area row (elevation_ft = 8326) and Mushroom
-- Tower's OWN area-table blurb ("immediately north of Big Kangaroo (8,326 ft)"), both
-- of which say 8,326 ft. Externally, Wikipedia and a 2023 theodolite survey (8,326 ft
-- +/- 2 ft) corroborate 8,326 ft; the competing "8,280 ft" figure traces to an older,
-- less precise source, and a 2024 LiDAR pass landed in between at 8,318 ft -- so 8,326
-- ft is both the internally-agreed value (2 of 3 in-app mentions) and the best-
-- supported external one. Corrected the outlier overview sentence to match.
UPDATE routes SET overview = 'Mushroom Tower is a slender granite tower at the north end of Kangaroo Ridge, immediately north of Big Kangaroo (8,326 ft), above Washington Pass on the North Cascades Highway (SR 20). It takes its name from a blocky, overhanging summit block that must be gained via a short, exposed step-across — a memorable finish to an otherwise moderate low-5th-class scramble/climb.'
  WHERE id = 'wa_mushroom_tower_standard'
  AND overview = 'Mushroom Tower is a slender granite tower at the north end of Kangaroo Ridge, immediately north of Big Kangaroo (8,280 ft), above Washington Pass on the North Cascades Highway (SR 20). It takes its name from a blocky, overhanging summit block that must be gained via a short, exposed step-across — a memorable finish to an otherwise moderate low-5th-class scramble/climb.';
