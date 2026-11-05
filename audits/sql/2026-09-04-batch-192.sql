-- Batch 192 (pass 4): wa_gilbert_peak_meade_glacier .. wa_goat_mountain_south_ridge
-- Generated 2026-09-04. Each statement verified against the live row immediately before
-- this file was written. Re-verify before applying if time has passed.

-- ============================================================
-- wa_gilbert_peak_west_route: loss_ft was null. The route's own descent_text/bail say
-- "Reverse the Goat Ledges/Goat Ribs traverse ... back to Snowgrass Flats camp" -- an
-- out-and-back -- so loss_ft should equal the stored gain_ft (4000), matching this
-- catalog's established out-and-back convention.
-- ============================================================
UPDATE routes
SET loss_ft = 4000
WHERE id = 'wa_gilbert_peak_west_route'
  AND gain_ft = 4000
  AND loss_ft IS NULL;

-- ============================================================
-- wa_goat_mountain_south_ridge: gain_ft (4300) was below the trailhead-to-summit floor.
-- Trailhead waypoint elevation 2,500 ft; high_point_ft (true/east summit) 6,891 ft --
-- confirmed via web search (SummitPost/older-topo figure, distinct from Wikipedia's
-- NAVD88 remeasurement of 6,844 ft for the same summit; both are legitimate sourced
-- values and 6,891 is the one already on file and matches the route's own watch_out
-- text) -- giving a net rise of 4,391 ft, already above the stored 4,300 ft gain.
-- The route's own beta additionally describes a drop-and-regain between the West Peak
-- false summit and the true East summit (per corroborating trip-report accounts: ~3,200
-- ft to leave the trail, a ~300 ft drop, then a ~1,400 ft regain to the true summit --
-- i.e. more total climbing than the simple net figure). loss_ft (4800) already reflects
-- this larger cumulative profile and, for a reversed out-and-back descent, gain and loss
-- for the full day should match. Raising gain_ft to match the existing loss_ft resolves
-- both the floor violation and the day's gain/loss asymmetry.
-- ============================================================
UPDATE routes
SET gain_ft = 4800
WHERE id = 'wa_goat_mountain_south_ridge'
  AND gain_ft = 4300
  AND loss_ft = 4800
  AND high_point_ft = 6891;

-- ============================================================
-- wa_glacier_peak_cool_glacier_gerdine: bivy carried a 9-entry list, byte-identical to
-- the list also found (via `bivy=cs.` containment query) on wa_glacier_peak_kennedy_glacier
-- and on 10 unrelated routes covering Buck Mountain, Chalangin Peak, Clark Mountain,
-- Helmet Butte, Mount Berge, Luahna Peak (x2) and Tenpeak Mountain (x2) -- all genuinely
-- served by the Buck Creek Pass / Chiwawa River Road / Napeequa corridor this list
-- describes. This route's own approach/beta/pitch_detail/bail describe ONLY the North
-- Fork Sauk -> White Pass -> Glacier Gap approach (a different drainage entirely, on the
-- opposite side of the range from Buck Creek Pass/Trinity), matching 3 of the 9 shared
-- entries exactly. One list entry ("Buck Creek Pass and the High Pass camps") even states
-- outright that it is "the base for three peaks in this zone that have nothing to do with
-- Glacier Peak's own approaches." Trimmed to the 3 entries (Mackinaw Shelter, White Pass,
-- Glacier Gap) that match this route's own documented approach -- content re-homed
-- verbatim from the row's own existing bivy array, nothing invented or reworded.
-- ============================================================
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' IN (
    'Mackinaw Shelter camp, North Fork Sauk',
    'White Pass and the Foam Creek benches under White Mountain',
    'Glacier Gap'
  )
)
WHERE id = 'wa_glacier_peak_cool_glacier_gerdine'
  AND jsonb_array_length(bivy) = 9;

-- ============================================================
-- wa_glacier_peak_kennedy_glacier: same 9-entry corridor-wide bivy list as above. This
-- route's own approach is the White Chuck Trailhead -> Kennedy Ridge Trail -> Glacier
-- Creek line (a different, north-side approach from Cool Glacier/Gerdine's south-side
-- one), which matches exactly ONE of the 9 shared entries ("Kennedy Ridge and the
-- Glacier Creek camps, Suiattle side" -- its own text names this route and Frostbite
-- Ridge specifically). Trimmed to that single matching entry.
-- ============================================================
UPDATE routes
SET bivy = (
  SELECT jsonb_agg(elem ORDER BY ord)
  FROM jsonb_array_elements(bivy) WITH ORDINALITY AS t(elem, ord)
  WHERE elem->>'name' = 'Kennedy Ridge and the Glacier Creek camps, Suiattle side'
)
WHERE id = 'wa_glacier_peak_kennedy_glacier'
  AND jsonb_array_length(bivy) = 9;

-- ============================================================
-- wa_glacier_peak_kennedy_glacier: gain_ft (8200) was below even the route's own stated
-- computation basis. The row's own `corrections` field says gain_ft/dist_km were "derived
-- from the North Fork Sauk Trailhead elevation (2,070 ft, FS-sourced) and summit elevation
-- (10,541 ft)" -- i.e. 10,541 - 2,070 = 8,471 ft -- yet the stored value (8,200) is 271 ft
-- below that stated basis, and the same corrections field goes on to say "actual cumulative
-- gain is higher than the simple net figure given" (undulating PCT approach), so 8,471 is a
-- floor, not a ceiling. Raised to 8,471 ft to match the row's own declared arithmetic.
-- loss_ft was null; the route's own descent_text opens "Besides reversing the ascent line,
-- the standard alternate descent goes via Frostbite Ridge..." -- i.e. reversing the ascent
-- (out-and-back) is the STANDARD descent, with Frostbite Ridge as the alternate -- so
-- loss_ft is set to match the corrected gain_ft.
-- ============================================================
UPDATE routes
SET gain_ft = 8471,
    loss_ft = 8471
WHERE id = 'wa_glacier_peak_kennedy_glacier'
  AND gain_ft = 8200
  AND loss_ft IS NULL
  AND high_point_ft = 10541;
