-- Batch 536 (pass 8, 2026-11-13)
-- Routes: Prusik Peak's Taylor-Wood Route and West Ridge; Ptarmigan Peak's Standard Scramble;
-- Ragged Edge (Vesper Peak); Rapple Grapple (Liberty Bell); Raven Ridge's Southeast Ridge
-- (Crater Lake Approach); Red Mountain (Snoqualmie)'s East Face, East Ridge, Southeast Face
-- and West Ridge.

-- wa_prusik_peak_taylor_wood_route: overview calls this a "ten-section route", but the row's
-- own pitches column is 8, and length_m is 204 (= 670 ft, matching Mountain Project's route
-- header for the Taylor-Wood Route exactly: "8 pitches, 670 ft (204 m), Grade III"). Mountain
-- Project's route TEXT separately mentions Wood adding two more pitches to reach the true
-- summit a year later, which is likely where "ten-section" came from, but that is a variation,
-- not this row's own stored pitch count. Correcting the overview's section count to match the
-- row's own pitches field and the verified MP header stat.
UPDATE routes SET overview = 'A long, 5.9+ eight-section route up the south face established by David Wood and Fletcher Taylor in 2023, combining crack, chimney, and short scrambling sections en route to the summit.'
WHERE id = 'wa_prusik_peak_taylor_wood_route' AND pitches = 8
  AND overview = 'A long, 5.9+ ten-section route up the south face established by David Wood and Fletcher Taylor in 2023, combining crack, chimney, and short scrambling sections en route to the summit.';

-- No other confirmed errors this batch. See audits/wa-alpine-audit-log.md for the one
-- flagged-for-human-review item (wa_red_mountain_snoqualmie_west_ridge's truncated fa field),
-- which is not fixed here because the missing text can't be guessed without fabricating a name.
