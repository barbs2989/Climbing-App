-- wa_mount_olympus_blue_glacier: road.status says Upper Hoh Road "storm damage shut it from
-- December 2024 until repairs reopened it in May 2026" -- the year is wrong. Multiple news
-- reports (Washington State Standard, The Herald, The Spokesman-Review, Forks Forum, FOX
-- Weather) confirm the Dec 2024 washout closure and a reopening on May 8, 2025, not 2026. This
-- catalog's own sibling row for the same peak, wa_mount_olympus_west_ridge, already states the
-- correct "restored as of May 8, 2025" for the identical closure -- this row just has the wrong
-- year copied in.
UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  to_jsonb(replace(
    road->>'status',
    'storm damage shut it from December 2024 until repairs reopened it in May 2026',
    'storm damage shut it from December 2024 until repairs reopened it on May 8, 2025'
  ))
)
WHERE id = 'wa_mount_olympus_blue_glacier'
  AND road->>'status' LIKE '%reopened it in May 2026%';
