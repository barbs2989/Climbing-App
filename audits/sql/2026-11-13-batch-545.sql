-- WA alpine audit, pass 8, batch 545
-- wa_concord_tower (area row backing wa_the_cave_route and other Concord Tower routes):
-- areas.elevation_ft is stored as 7611 ft, but this is well outside the range any outside
-- source gives. Mountain Project's Concord Tower area page states "The summit is at 7560'."
-- Mountain-Forecast's Concord Tower peak page gives 2304 m, which converts to ~7559 ft
-- (2304 * 3.28084 = 7558.6) -- two independently-sourced figures that agree with each other
-- within 1 ft but disagree with our stored 7611 ft by ~50 ft, more than datum/rounding noise.
-- This row's own routes.high_point_ft for wa_the_cave_route is already 7569 ft, much closer to
-- the two outside sources than areas.elevation_ft is -- so the area row, not the route row, is
-- the one carrying the error. Correcting areas.elevation_ft to 7560 ft to match the
-- cross-corroborating outside sources.
UPDATE areas
SET elevation_ft = 7560
WHERE id = 'wa_concord_tower'
  AND elevation_ft = 7611;
