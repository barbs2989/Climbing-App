-- 0099: two real summits were typed `crag`, so their route pages showed no peak stats.
--
-- `enrichRoute` (ClimbMatchCore.jsx) only synthesises `peakMetadata` when
-- `_dbArea.areaType === "peak"`. A summit typed `crag` therefore renders NO High point,
-- NO Prominence and no PEAK panel, however complete its data is. That gate is correct --
-- a wall or a spire is not a peak -- but it is only as good as the typing underneath it.
--
-- Audited every WA route in an alpine-ish discipline (alpine / mountaineering /
-- scrambling / ice / mixed) that sits on a NON-peak area: 79 routes across 44 crag-typed
-- areas. Almost all are correctly `crag` -- named towers and spires on a parent ridge
-- (Paisano Pinnacle, Juno Tower, Chablis Spire, Whine Spire, Vasiliki Tower, Molar Tooth),
-- faces and walls (South Face, Cutthroat Wall, North Face Tiffany Mountain), and rows the
-- ETL minted from a route name rather than a place ("Main Peak", "South Peak",
-- "North Side"). None of those is an independent summit and none should change.
--
-- Two are. Both name a real summit, both are the only row for it, and -- the tell --
-- BOTH ALREADY STATE THEIR OWN ELEVATION IN `blurb` PROSE while `elevation_ft` sits null,
-- so the number was in the database the whole time in the one form nothing can render.
--
--   Goose Egg Mountain (wa_goose_egg_mountain)  4,566 ft / 1,566 ft prominence
--     Independent summit above Rimrock Lake with a true summit ridge and a walk-up
--     (SW Ridge); its east cliffs carry the Tieton rock routes we already hold
--     (Dirty Sanchez, Ride the Lightning). Prominence from SummitPost.
--
--   Eagle Peak (wa_eagle_peak)                  5,958 ft /   238 ft prominence
--     West end of the Tatoosh Range inside Mount Rainier National Park; named summit
--     with its own trail and a scramble finish. Elevation and prominence from Wikipedia.
--     The prominence is genuinely small -- it is a minor summit on a connected ridge --
--     but it is published, so it is a fact rather than an estimate.
--
-- DELIBERATELY NOT CHANGED, both found by the same audit:
--
--   Mamie Peak (wa_mamie_peak) -- keeps `crag`. "Peak" in a name does not make a summit.
--     Every source describes it as a granite cragging mass above the Hannegan Pass
--     trailhead, and no source publishes a prominence for it. Its blurb's "6,108 ft" is
--     left in prose rather than promoted, because typing it `peak` would render a PEAK
--     panel with a blank Prominence -- trading a missing section for a hollow one.
--
--   The Brothers (south peak) (wa_brothers_south_peak_the) -- a DUPLICATE, not a mistype.
--     `wa_the_brothers` already exists, typed `peak`, with elevation 6,868 and prominence
--     2,779. The right repair is to move this row's 2 routes onto that peak and drop the
--     duplicate, which is a data operation with real blast radius -- a duplicate flag is a
--     hypothesis, and the last time one was acted on without confirming both halves it
--     destroyed the only copy of Triple Couloirs. Reported, not executed.

update areas set area_type = 'peak',
                 elevation_ft  = coalesce(elevation_ft, 4566),
                 prominence_ft = coalesce(prominence_ft, 1566)
 where id = 'wa_goose_egg_mountain';

update areas set area_type = 'peak',
                 elevation_ft  = coalesce(elevation_ft, 5958),
                 prominence_ft = coalesce(prominence_ft, 238)
 where id = 'wa_eagle_peak';

-- coalesce so this can only ever fill a blank: if an enrichment batch has written a value
-- since this was authored, that value wins and re-running stays safe.
--
-- No parentage changes, so no ltree path cascade and no route_count recount is needed --
-- both rows keep their parent and their routes. (Contrast 0097, where a reparent needed
-- both.) area_type is not part of the leaf-XOR-parent invariant either: these stay leaves.

-- Verify afterward. No ltree operators here on purpose: `!~` on an ltree column raised
-- 42883 while handing over 0097, and because the SQL Editor runs a pasted script as ONE
-- transaction, that error in a read-only SELECT rolled back the correct UPDATEs above it.
--   select id, name, area_type, elevation_ft, prominence_ft from areas
--     where id in ('wa_goose_egg_mountain','wa_eagle_peak') order by id;
--   -- expect eagle_peak      peak 5958 238
--   --        goose_egg_mtn   peak 4566 1566
