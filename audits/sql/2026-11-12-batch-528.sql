-- Batch 528 (pass 8, 2026-11-12)
-- Routes: Mount Townsend (standard trail); Mount Triumph (Northeast Ridge); Mount Washington,
-- Olympic (Winter Direct); Mount Wilder (Scramble); Mushroom Tower (Standard Route/South Side);
-- Mutchler Peak (Scramble); Navaho Peak (South Slopes); Cathedral Peak, Pasayten (NE Ridge).

-- wa_mount_triumph: areas.elevation_ft stores 7260 ft, but the route's own high_point_ft for
-- wa_mount_triumph_northeast_ridge already stores 7270 ft -- an internal 10 ft contradiction
-- for the same peak. No source found gives exactly 7260 ft: SummitPost and the Mountaineers'
-- own route page for this route both give 7,270 ft (matching the route row already in this
-- database); Wikipedia's infobox gives an imprecise "7240+ ft" (NGVD 29); Skyward Mountaineering
-- gives 7,257 ft. 7,270 ft is the figure most independently repeated and is already what this
-- database's own route row uses, so correcting the area row to match resolves the contradiction
-- without introducing a new, unsupported number.
UPDATE areas SET elevation_ft = 7270
WHERE id = 'wa_mount_triumph' AND elevation_ft = 7260;
