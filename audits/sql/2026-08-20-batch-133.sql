-- WA alpine audit — batch 133 (pass 3)
-- Route: wa_inner_constance_standard (Inner Constance, Standard Route via Crystal Pass)
-- Issue: the `road` jsonb's `status` field claims the Dosewallips Road washout that
-- closed vehicle access sits "roughly 5.5-6.5 miles from Hwy 101". That contradicts
-- this SAME route's own waypoint list, whose "Dosewallips Road washout parking
-- (FR-2610)" trailhead entry independently states the washout is "~9 mi from Hwy
-- 101" — and matches external sources: the 2002 Dosewallips Road washout is
-- consistently described (USFS EIS summary, WTA trip reports) as roughly 9-10
-- miles from Brinnon/Hwy 101, while 5.5-6.5 miles is actually the distance of
-- closed roadbed BEYOND the washout to the former Dosewallips Campground/Ranger
-- Station — a different quantity that had been mislabeled as measured from the
-- highway. Corrected to describe both distances accurately rather than dropping
-- the 5.5-6.5 figure, since it is real information about the campground leg.
UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  '"Washed out roughly 9-10 miles from Hwy 101 near Brinnon (since the early 2000s), closed to vehicles indefinitely. The washout itself sits about 5.5-6.5 miles of closed roadbed short of the former Dosewallips Campground/Ranger Station further up the valley."'::jsonb
)
WHERE id = 'wa_inner_constance_standard';
