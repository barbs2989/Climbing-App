-- wa_old_snowy_mountain_r1 (Old Snowy Mountain, Northwest Ridge / PCT approach): stored
-- high_point_ft (7880 ft) traces to an older rounded/contour-based figure (e.g. Wikipedia);
-- peakbagger.com (7928.9 ft), listsofjohn.com (7929 ft) and oregonhikers.org (7930 ft) all
-- independently agree on ~7930 ft -- corrected.
UPDATE routes SET high_point_ft = 7930 WHERE id = 'wa_old_snowy_mountain_r1';

-- wa_old_snowy_mountain_r1: top-level lat/lng (46.51194, -121.45389) is a rounded/GNIS-style
-- point about 90-100m from the true summit; peakbagger.com's listed summit coordinate
-- (46.512244, -121.454431) is an exact match for this same row's own
-- approach_logistics.peakLat/peakLng field -- corrected lat/lng to match.
UPDATE routes SET lat = 46.512244, lng = -121.454431 WHERE id = 'wa_old_snowy_mountain_r1';
