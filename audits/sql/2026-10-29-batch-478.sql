-- WA alpine route audit -- batch 478 (pass 8)
-- Routes: wa_chianti_spire_lichen_bouquet, wa_chianti_spire_north_face,
-- wa_chimney_peak_the_chimney, wa_chimney_rock_east_face_direct,
-- wa_chimney_rock_north_ridge, wa_chimney_rock_northeast_ridge,
-- wa_chimney_rock_northwest_ridge, wa_chimney_rock_southeast_ridge
-- All values below were re-read from the live DB immediately before this file was
-- written; each UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_chimney_peak_the_chimney: approach/road/pro_tips all still describe
-- Quinault South Shore Road as closed by a washout about 8 miles in, routing
-- Graves Creek access via the North Shore Road instead. That closure has
-- ended: WTA's "Hiker Headlines" post dated 2026-10-15 ("South Shore Road
-- reopens") and a visitor-guide update dated ~2026-10-20 both report the
-- road reopened October 8, 2026, after repairs to the December 2024
-- washout -- closing out the near-two-year closure this row's approach/road
-- text was written against. Graves Creek Road itself (the final leg to the
-- trailhead) was already correctly described as open in all three fields
-- and is left as-is; only the South-Shore-Road-closed / North-Shore-detour
-- language is corrected, in all three places it appears.
update routes set
  approach = replace(
    approach,
    'Note the detour: South Shore Road has been closed by a washout about 8 miles from US 101, with Graves Creek Road reachable via the North Shore Road instead — check park road conditions or the road hotline at 360-565-3131 before you drive, and note that RVs and trailers are prohibited on Graves Creek Road.',
    'South Shore Road reopened in October 2026 after a long washout-driven closure that had required reaching Graves Creek Road via the North Shore Road instead — check park road conditions or the road hotline at 360-565-3131 before you drive, since this corridor''s status still changes seasonally, and note that RVs and trailers are prohibited on Graves Creek Road.'
  )
where id = 'wa_chimney_peak_the_chimney'
  and approach like '%Note the detour: South Shore Road has been closed by a washout about 8 miles from US 101%';

update routes set
  road = jsonb_set(
    road, '{status}',
    to_jsonb(replace(
      road #>> '{status}',
      'Graves Creek Road is open to all traffic and reaches the Graves Creek Trailhead, but South Shore Road is closed at mile 8 due to a washout, so current access is via the Lake Quinault North Shore Road.',
      'Graves Creek Road is open to all traffic and reaches the Graves Creek Trailhead. South Shore Road itself reopened in October 2026 after a long washout-driven closure, so the North Shore Road detour is no longer required — confirm current status before driving, since conditions on this corridor change with the season.'
    ))
  )
where id = 'wa_chimney_peak_the_chimney'
  and road #>> '{status}' like '%South Shore Road is closed at mile 8 due to a washout%';

update routes set
  pro_tips = jsonb_set(
    pro_tips, '{4}',
    to_jsonb(replace(
      pro_tips #>> '{4}',
      'Check the road first. South Shore Road has been closed by a washout about 8 miles in, so Graves Creek Road is reached via the North Shore Road — call 360-565-3131 rather than trusting an old map.',
      'Check the road first. South Shore Road reopened in October 2026 after a long washout-driven closure, so the North Shore Road detour is no longer needed — but call 360-565-3131 rather than trusting an old map, since conditions here still change.'
    ))
  )
where id = 'wa_chimney_peak_the_chimney'
  and pro_tips #>> '{4}' like '%South Shore Road has been closed by a washout about 8 miles in%';

-- verify: should return the 3 new sentences above, with no remaining
-- "closed ... washout" / "North Shore Road" detour language for this route
select id, approach, road -> 'status' as road_status, pro_tips -> 4 as tip_5
from routes where id = 'wa_chimney_peak_the_chimney';
