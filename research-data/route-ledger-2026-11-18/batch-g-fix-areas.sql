-- Research batch fixes (2026-11-18): enrich:apply cannot write — areas. Old value in every WHERE.
begin;

-- Official map figure is 9,511 ft (NPS trip planner map; Mountaineers route page 9,511 ft; the route's own high_point_ft 9511). 9,516 has no source.
update areas set elevation_ft = 9511 where id = 'wa_bonanza_peak' and elevation_ft = 9516;

-- Two wrong facts in the area blurb: elevation (9,511 ft per NPS map) and the FA name (NPS North Cascades history lists Curtis Ijames, Joe Leuthold and Barrie James, 1937; the route row already spell
update areas set blurb = $q$Bonanza Peak (9,511 ft) is the highest non-volcanic summit in Washington and the highpoint of Chelan County, rising deep in the Glacier Peak Wilderness above Lake Chelan. The peak is split into three summits (main, west, and southwest) and flanked by three glaciers — Mary Green (east), Company (north), and Isella (south). It's reached only by a multi-day approach: the Lady of the Lake ferry up Lake Chelan to Lucerne, a bus to the remote village of Holden, and miles of trail/off-trail travel to Holden Lake or Holden Pass. First climbed in 1937 by Curtis Ijames, Barrie James, and Joe Leuthold (Mazamas) via what's now the standard Mary Green Glacier route, the peak is also home to the historically significant 1975 Soviet Route on its southwest summit — one of the most notable big alpine rock routes in the North Cascades.$q$ where id = 'wa_bonanza_peak' and blurb = $q$Bonanza Peak (9,516') is the highest non-volcanic summit in Washington and the highpoint of Chelan County, rising deep in the Glacier Peak Wilderness above Lake Chelan. The peak is split into three summits (main, west, and southwest) and flanked by three glaciers — Mary Green (east), Company (north), and Isella (south). It's reached only by a multi-day approach: the Lady of the Lake ferry up Lake Chelan to Lucerne, a bus to the remote village of Holden, and miles of trail/off-trail travel to Holden Lake or Holden Pass. First climbed in 1937 by Curtis James, Barrie James, and Joe Leuthold (Mazamas) via what's now the standard Mary Green Glacier route, the peak is also home to the historically significant 1975 Soviet Route on its southwest summit — one of the most notable big alpine rock routes in the North Cascades.$q$;

-- Area coordinate is 57 m from GNIS and reads 8,909 ft on the USGS elevation model (300+ ft below the top); the summit is at 48.48303, -120.9114 (9,225 ft, 22 m from GNIS 1520128).
update areas set lat = 48.48303, lng = -120.9114 where id = 'wa_mount_goode' and lat = 48.4829 and lng = -120.9109;

commit;
