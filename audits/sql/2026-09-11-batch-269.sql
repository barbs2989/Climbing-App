-- WA alpine route audit, pass 5, batch 269.
-- Batch: wa_magic_mountain_south_ridge, wa_magic_mountain_west_ridge,
-- wa_martin_peak_west_ridge, wa_marvin_s_ear, wa_mcmillan_spire_west_southwest_ridge,
-- wa_mcmillan_spire_west_west_ridge, wa_mesahchie_peak_west_ridge, wa_mix_up_peak_east_face.
-- 4 SQL fixes across 3 routes. wa_magic_mountain_west_ridge, wa_mcmillan_spire_west_*,
-- wa_mesahchie_peak_west_ridge and wa_mix_up_peak_east_face are clean (no confirmed
-- errors) -- see the log for what was checked and for two items flagged rather than
-- fixed (an unresolved ~5hr timing.totalHrs-vs-breakdown mismatch shared verbatim by
-- both McMillan Spire routes, and a systemic "Glacier Peak Wilderness" mislabel found
-- on 31 routes catalog-wide, of which only wa_marvin_s_ear is fixed here).

-- Fix 1: wa_magic_mountain_south_ridge -- the `approach` field's closing sentence
-- states "~19-20 mile round trip", which contradicts this same row's own
-- `itinerary.totalNote` ("roughly 16-17 miles and 5,000+ ft of gain/loss total") and
-- the itinerary's own day-by-day mileage, which sums to exactly 16.5 mi
-- (day 1: 6.5 mi + day 2: 3.5 mi + day 3: 6.5 mi). Two independently-stated internal
-- figures agree at ~16-17 mi; only the `approach` text's "~19-20" is the outlier.
-- Corrected to match.
UPDATE routes
SET approach = replace(approach, '~19-20 mile round trip', '~16-17 mile round trip')
WHERE id = 'wa_magic_mountain_south_ridge'
  AND approach LIKE '%~19-20 mile round trip%';

-- Fix 2 & 3: wa_martin_peak_west_ridge -- this row's own `data_quality.gaps` already
-- flags an unresolved internal mismatch: "Route is documented in sources as a 'West
-- Ridge' line from Holden Pass -- the on-file route name/aspect 'Southeast Slopes'
-- does not match any sourced description." Confirmed against external sources
-- (SummitPost's Martin Peak page): the documented route from Holden Pass traverses
-- east along the Bonanza-Martin connecting ridge to a saddle at the base of Martin's
-- own west ridge, then climbs a loose scree gully on the ridge's south side to a
-- Class 3-4 exit below an overhang -- which matches this row's own `timing`/`itinerary`
-- day-2 description almost exactly. So the underlying route description is accurate;
-- only the "Southeast Slopes" label is wrong (this route's own `name`, `face` and
-- `aspect` fields all already say "West Ridge"/"W"). Corrected the label in both the
-- static timing breakdown and the itinerary day title to match, and removed the
-- now-resolved gap entry from data_quality.gaps.
UPDATE routes
SET timing = jsonb_set(
      timing,
      '{sectionBreakdown,1,fromTo}',
      '"Summit day: Martin Peak via West Ridge"'
    )
WHERE id = 'wa_martin_peak_west_ridge'
  AND timing->'sectionBreakdown'->1->>'fromTo' = 'Summit day: Martin Peak via Southeast Slopes';

UPDATE routes
SET itinerary = jsonb_set(
      itinerary,
      '{days,1,title}',
      '"Summit day: Martin Peak via West Ridge"'
    )
WHERE id = 'wa_martin_peak_west_ridge'
  AND itinerary->'days'->1->>'title' = 'Summit day: Martin Peak via Southeast Slopes';

UPDATE routes
SET data_quality = jsonb_set(
      data_quality,
      '{gaps}',
      (SELECT jsonb_agg(g) FROM jsonb_array_elements(data_quality->'gaps') g
       WHERE g::text NOT LIKE '%does not match any sourced description%')
    )
WHERE id = 'wa_martin_peak_west_ridge';

-- Fix 4: wa_marvin_s_ear -- `access.land_manager` and `access.permitZone` both claim
-- this route (Vega Tower, off the Sunrise Mine Trailhead / Morning Star Peak group)
-- sits within or adjacent to Glacier Peak Wilderness. This is contradicted by this
-- same row's own `bivy` entry for "Vesper Creek basin and Lake Elan" -- the closest
-- and most directly relevant camp on this exact trail -- which states plainly:
-- "Mt Baker-Snoqualmie National Forest but OUTSIDE any wilderness -- no permit of any
-- kind to camp." (Glacier Peak Wilderness is a different, more southerly corridor
-- reached via the Suiattle River Road, which this route does not use -- its actual
-- access is the Mountain Loop Highway / FR-4065, already correctly described in this
-- row's own `road` field.) Corrected to match the row's own more specific evidence.
-- This mislabel is systemic (31 routes catalog-wide carry the same "Glacier Peak
-- Wilderness" text in access.land_manager, most on peaks nowhere near it) and is
-- flagged in the log for a dedicated reconciliation pass rather than swept here.
UPDATE routes
SET access = jsonb_set(
      access,
      '{land_manager}',
      '"Mt. Baker-Snoqualmie National Forest (Darrington Ranger District)"'
    )
WHERE id = 'wa_marvin_s_ear'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Darrington Ranger District) — Glacier Peak Wilderness';

UPDATE routes
SET access = jsonb_set(
      access,
      '{permitZone}',
      '"Not within a designated wilderness area -- camps along this Sunrise Mine Trail corridor sit on Mt. Baker-Snoqualmie NF land outside any wilderness boundary, per the bivy entry already on this row."'
    )
WHERE id = 'wa_marvin_s_ear'
  AND access->>'permitZone' = 'Adjacent to or within Glacier Peak Wilderness area';
