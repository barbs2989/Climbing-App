-- wa_goat_mountain_south_ridge (Goat Mountain, South Ridge / Standard Scramble)
-- `overview`, `descent`, and `watch_out[0]` all state the true (east) summit's elevation as
-- "6,891 ft" -- this figure appears nowhere in authoritative sources and is corroborated
-- wrong by two independent searches: Wikipedia and Peakbagger both give Goat Mountain
-- (Whatcom County)'s true summit as 6,844 ft, with a subsidiary west/false summit at
-- 6,725 ft -- matching the 6,721 ft this same row already stores correctly in `beta`. The
-- route's own `high_point_ft` (6,721 ft) is also wrong for this record: overview/descent/
-- watch_out all describe the standard route continuing past the false summit to the true
-- summit ("many parties turn around at the easier 6,600 ft false (west) summit rather than
-- continue... to the true east summit"), so the row's own high point should be the true
-- summit's corrected elevation, not the false summit's.
UPDATE routes SET
  overview = replace(overview, '6,891 ft', '6,844 ft'),
  descent = replace(descent, '6,891 ft', '6,844 ft'),
  watch_out = (
    SELECT jsonb_agg(
      CASE WHEN elem LIKE '%6,891 ft%' THEN replace(elem, '6,891 ft', '6,844 ft') ELSE elem END
    )
    FROM jsonb_array_elements_text(watch_out) AS elem
  ),
  high_point_ft = 6844
WHERE id = 'wa_goat_mountain_south_ridge'
  AND overview LIKE '%6,891 ft%';

-- wa_glacier_peak_kennedy_glacier (Glacier Peak, Kennedy Glacier)
-- waypoints[0] ("White Chuck River Trailhead") stores elev/elevFt = 1700, but this exact
-- trailhead is documented elsewhere -- in this same route's own `approach` field, and in
-- sibling route wa_glacier_peak_sitkum_glacier's `approach` field, which shares this
-- trailhead verbatim -- as "2,350 ft". USFS/trip-report sources independently corroborate
-- 2,300-2,350 ft. Also fixing waypoints[0].note, which claims the trailhead sits on
-- "Suiattle River Rd (FR 26)" -- contradicting this same route's own `road` field
-- (name: "White Chuck Road (FR 23)") and its own `approach` field ("White Chuck River
-- Trailhead (FS-23...)"). FR 26/Suiattle River Road is a different road serving a different
-- trailhead entirely (used by sibling route wa_glacier_peak_frostbite_ridge's separate Milk
-- Creek approach) -- the note appears to have been contaminated from that route.
UPDATE routes
SET waypoints = jsonb_set(
      jsonb_set(
        jsonb_set(waypoints, '{0,elev}', '2350'),
        '{0,elevFt}', '2350'
      ),
      '{0,note}',
      '"Road-end trailhead on White Chuck Road (FR 23), about 23.5 mi from Darrington via the Mountain Loop Highway. Road closed at MP 3.7 per a Dec 2024 flood-damage order. North Fork Sauk TH (48.05832,-121.28793) is a valid alternate approach for this route."'::jsonb
    )
WHERE id = 'wa_glacier_peak_kennedy_glacier'
  AND waypoints#>>'{0,name}' = 'White Chuck River Trailhead'
  AND (waypoints#>>'{0,elev}')::numeric = 1700;
