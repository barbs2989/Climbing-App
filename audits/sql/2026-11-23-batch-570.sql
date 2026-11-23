-- WA alpine audit, batch 570 (pass 9)

-- routes.wa_dome_peak_indian_summer: stored pitches is 7. The only source found for this
-- rarely-repeated route is the first-ascent party's own 2011 Cascade Climbers trip report
-- (cascadeclimbers.com/forum/topic/82679), which states plainly "III, 5.10, 8 pitches,
-- ~1000ft" -- no hedging language, no second source to conflict with it, and no counter-
-- evidence found for 7. Correcting to match the FA party's own account.
UPDATE routes SET pitches = 8
WHERE id = 'wa_dome_peak_indian_summer' AND pitches = 7;
