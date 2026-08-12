-- Batch 83 (pass 2, 2026-08-08)
-- Routes: Mount Index (Northeast Buttress), Mount Johnson (Standard), Mount Lago (South
-- Slope - South Face), Mount Larrabee (South Ridge), Mount Logan (Fremont Glacier, Banded
-- Glacier, Douglas Glacier), Mount Mathias (Bailey Range Scramble).
-- Researched via 6 parallel agents grouped by peak.

-- wa_mount_lago (area): prominence_ft (3280) did not match any source found -- Wikipedia and
-- PeakVisor both consistently give 3,268 ft (996 m). The row's own `corrections` field had
-- already re-verified elevation and coordinates in a prior pass but never checked prominence,
-- so this error survived that pass.
UPDATE areas
SET prominence_ft = 3268
WHERE id = 'wa_mount_lago' AND prominence_ft = 3280;
