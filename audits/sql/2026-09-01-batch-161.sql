-- WA alpine audit, pass 3, batch 161: wa_ridge_traverse_from_east_fury
--
-- (1) access._raw.special_requirements and access._raw.seasonal_closure_dates /
-- access.closures contained sentences about "Limited permits for Elk Lake and Glacier
-- Meadows basecamp" and "No camping between Glacier Meadows and Blue Glacier." Elk Lake
-- (mile 14.8) and Glacier Meadows (mile 17.1) are Hoh River Trail campsites below Blue
-- Glacier on Mount Olympus, in Olympic National Park -- confirmed via NPS/WTA/Mountaineers
-- sources on the Hoh River Trail. This route is on Mount Fury in the Picket Range, North
-- Cascades National Park, ~150 miles away in an unrelated park with no Elk Lake or Glacier
-- Meadows anywhere near it (its own waypoints/approach describe Ross Lake, Big Beaver Trail,
-- Access Creek and Luna Camp/Luna Col instead). Same cross-region prose-contamination shape
-- already caught once on wa_ruth_mountain_south_slopes's access.notes (see that row's own
-- `corrections` field, which trimmed an identical stray "Mount Tom area" Olympics clause).
-- Trimmed to the sentences that are actually about North Cascades NP / Picket Range travel.
--
-- (2) access.fees was "N/A". This is a multi-day route with an overnight camp at Luna Camp
-- inside North Cascades National Park, which requires an NPS backcountry permit. Per NPS's
-- own "Backcountry permit fee structure change" notice (nps.gov/noca), North Cascades NP has
-- charged $10/person plus a $6 non-refundable reservation fee for summer-season (mid-May to
-- early October) backcountry permits since March 2024, with no charge the rest of the year.
-- "N/A" is stale/incorrect for a route whose own itinerary requires an overnight NCNP permit.

UPDATE routes
SET access = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            access,
            '{_raw,special_requirements}',
            '"Experienced mountaineers only. Glacier travel expertise and crevasse rescue required. Ice axe and crampons often necessary. Groups exceeding 6 people need designated group sites. Bear canisters mandatory."'::jsonb
          ),
          '{_raw,seasonal_closure_dates}',
          '"Best June-August, winter snow closure typical Nov-May."'::jsonb
        ),
        '{closures}',
        '"Best June-August, winter snow closure typical Nov-May."'::jsonb
      ),
      '{fees}',
      '"Overnight backcountry permit required for the Luna Camp stay: summer season (mid-May-early Oct) $10/person plus a $6 non-refundable reservation fee, no charge outside that window."'::jsonb
    ),
    corrections = coalesce(corrections || E'\n', '') || '2026-09-01: access._raw.special_requirements/seasonal_closure_dates and access.closures trimmed to remove sentences naming "Elk Lake and Glacier Meadows" permits and "Glacier Meadows and Blue Glacier," which describe the Hoh River Trail/Mount Olympus approach in Olympic National Park, not this North Cascades NP Picket Range route. access.fees corrected from "N/A" to the current NCNP backcountry-permit fee ($10/person + $6 reservation fee, summer season), confirmed against NPS''s backcountry permit fee structure change notice.'
WHERE id = 'wa_ridge_traverse_from_east_fury';
