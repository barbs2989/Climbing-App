-- Batch 417 (Pass 7) -- Liberty Bell (Overexposure, Serpentine Crack, Sidewinder, Thin Red
-- Line, Liberty Crack, Liberty Crack (Free), Liberty Traverse), Liberty Cap (via Liberty Ridge,
-- via Ptarmigan Ridge), Lichtenberg Mountain (Southeast Slopes Scramble).
-- Run `npm run check:sql -- fix.sql` against this file before applying, per
-- docs/codebase/hand-written-sql.md.

-- 1. wa_liberty_crack: high_point_ft stores 7746 ft, 26 ft ABOVE Liberty Bell's actual summit.
-- Wikipedia, SummitPost and a local news piece all give Liberty Bell's summit as 7,720 ft (already
-- confirmed clean in batch 416, which checked this same figure on four sibling routes), the area's
-- own row (wa_liberty_bell) stores 7720, and this route's own free sibling (Liberty Crack (Free),
-- same line, same approach distance and gain) already stores 7720. Liberty Crack (aid) is the lone
-- outlier among 8 Liberty Bell-area routes checked this pass and the two prior ones.
UPDATE routes
SET high_point_ft = 7720
WHERE id = 'wa_liberty_crack'
  AND high_point_ft = 7746;

-- 2 & 3. wa_liberty_cap_liberty_ridge_finish, wa_liberty_cap_ptarmigan_ridge_finish: both store
-- high_point_ft 14112 (the old, pre-glacier-melt figure that appears in an older Wikimedia Commons
-- caption), contradicting Liberty Cap's own area row (wa_liberty_cap.elevation_ft = 14097), which
-- is close to the Aug 2025 Gilbertson-team resurvey (14,094.9 ft NAVD88) that measured Liberty Cap
-- has melted down roughly 26 ft since 2007. Bringing both routes in line with the peak's own
-- already-current area row, the same fix already applied to Rainier's main-summit routes in an
-- earlier pass for the analogous Columbia Crest/SW Rim resurvey.
UPDATE routes
SET high_point_ft = 14097
WHERE id IN ('wa_liberty_cap_liberty_ridge_finish', 'wa_liberty_cap_ptarmigan_ridge_finish')
  AND high_point_ft = 14112;

-- 4. wa_liberty_crack_free: the `fa` field dates the current bolted free variation (Mikey
-- Schaefer, Shanjean Lee, Blake Herrington & Nathan Hadley) to 2016, but Mountain Project dates
-- that specific four-person variation to 2017 -- and the row's OWN `data_quality.gaps` field
-- already distinguishes a separate 2016 Herrington/Hadley redpoint of the original line (no
-- Schaefer/Lee) from the 2017 Schaefer/Lee/Herrington/Hadley team that reworked the deteriorated
-- slab pitch into the new bolted variation. The `fa` field combined the 2017 four-person team with
-- the 2016 date; this corrects the year only, changing nothing else in the string.
UPDATE routes
SET fa = replace(
  fa,
  'current free variation FFA: Mikey Schaefer, Shanjean Lee, Blake Herrington & Nathan Hadley, 2016',
  'current free variation FFA: Mikey Schaefer, Shanjean Lee, Blake Herrington & Nathan Hadley, 2017'
)
WHERE id = 'wa_liberty_crack_free'
  AND fa LIKE '%current free variation FFA: Mikey Schaefer, Shanjean Lee, Blake Herrington & Nathan Hadley, 2016%';

-- 5. wa_liberty_bell_thin_red_line: the `fa` field credits the Sept 2008 FFA to "Kate Rutherford &
-- Mikey Schaefer", but Mountain Project and SummitPost both credit this FFA solely to Mikey
-- Schaefer, with no second climber named. Rutherford's real, well-documented FA with Schaefer is
-- an unrelated 2011 Patagonia climb -- the "Washington Route" on Fitz Roy -- a plausible source of
-- a name/string collision ("Washington" + "Schaefer") during research. Removes the unsupported
-- name only.
UPDATE routes
SET fa = replace(fa, 'Kate Rutherford & Mikey Schaefer, September 2008', 'Mikey Schaefer, September 2008')
WHERE id = 'wa_liberty_bell_thin_red_line'
  AND fa LIKE '%Kate Rutherford & Mikey Schaefer, September 2008%';
