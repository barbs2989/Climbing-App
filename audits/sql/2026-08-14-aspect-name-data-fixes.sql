-- Two SETTLED data corrections from the name-vs-aspect research
-- (research-data/ASPECT-NAME-RESOLUTIONS-2026-08-14.md).
--
-- These are the two rows where the published evidence is decisive AND the repair is small and
-- reversible. The other ten are deliberately NOT here: three have no published name to rename to,
-- two are duplicate rows needing a merge decision, four would be DAMAGED by matching their name,
-- and five need prose re-homed rather than a column set.
--
-- Neither statement touches a route NAME. Renaming is a separate decision per row.

-- 1. wa_luahna_peak_east_slopes — the NAME is right and the DATA is wrong. This is the one row in
--    the set that runs that direction, which is exactly why the audit is report-only.
--
--    `face` describes a DIFFERENT PUBLISHED ROUTE. The Pilz and Butterfly Glaciers are on Luahna's
--    north side and belong to the Mountaineers' separate "Luahna Peak/Pilz Glacier" climb, reached
--    from Little Giant Pass and the Napeequa. THIS row's own approach prose is the other line:
--    White River → Boulder Pass → the col west of Clark → the upper Richardson Glacier → the East
--    Ridge, which is the Mountaineers' "Luahna Peak/Richardson Glacier". Wikipedia/USGS put the
--    Richardson Glacier southeast of the summit and the Pilz/Butterfly across the northern slope.
--
--    So `aspect` N is wrong for the route this row documents. E is chosen over SE because the
--    published line gains and follows the EAST RIDGE; SE is defensible for the glacier basin below
--    it, and if a later source settles it that way this is a one-word change.
--
--    aspect drives the sun/shade readout, so this is a user-visible correction, not tidying.
UPDATE routes SET aspect = 'E', face = 'Upper Richardson Glacier to the East Ridge'
WHERE id = 'wa_luahna_peak_east_slopes' AND aspect = 'N';

-- 2. wa_spire_point_southwest_face — the grade and pitch count were grafted from a DIFFERENT route
--    on the same peak.
--
--    SummitPost (quoting Beckey, Cascade Alpine Guide 2) gives Spire Point exactly two routes: the
--    East Face, Class 4, the standard line; and the South Face, 5.6, five pitches, Grade III, first
--    climbed 1967 and approached from the Chickamin Glacier. This row stores `Grade II-III, 5.6`
--    and `pitches 5` — the SOUTH FACE's numbers — while its approach and descent prose are the East
--    Face standard route almost word for word (the 30 ft class-4 chimney, the loose talus, two 60 m
--    rappels back to Spire Col).
--
--    The catalog has no row for the South Face, so nothing is lost by removing its numbers from
--    here. A climber reading 5.6 and five pitches would rack for a route this row does not describe.
--
--    `aspect` E and `face` "East Face" are CORRECT and deliberately untouched — the row's NAME
--    ("Southwest Face") is the wrong half, and renaming it is a separate decision.
UPDATE routes SET grade = 'Class 4', pitches = NULL
WHERE id = 'wa_spire_point_southwest_face' AND grade = 'Grade II-III, 5.6';

-- Both guarded on the current value, so re-running is a no-op and neither fires if another session
-- got there first. No area moves, so route_count is untouched.
