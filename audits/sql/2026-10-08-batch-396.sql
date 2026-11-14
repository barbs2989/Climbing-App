-- wa_dome_peak: elevation_ft (8926) and the blurb's "(8,926 ft)" disagree with three independent
-- sources (Wikipedia "8,920+ ft", WTA's Dome Peak hike guide "8,920 feet", SummitPost "8920 ft") and
-- with this app's own two route rows (wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer), which
-- both already store high_point_ft = 8920. Correcting the area row to 8920.
UPDATE areas SET elevation_ft = 8920,
  blurb = replace(blurb, '(8,926 ft)', '(8,920 ft)')
WHERE id = 'wa_dome_peak';

-- wa_dome_peak_indian_summer: pro_tips wrongly locates "Lily of the West" on Dome Peak's South Face.
-- The CascadeClimbers.com FA trip report ("Dome Peak - S. Face - Indian Summer... , Lily of the West -
-- FA 9/2/2011") and an AAC Cascades-summary citation of the same trip both place Lily of the West on
-- the West Face of South Gunsight Peak (a separate, nearby peak), not on Dome Peak. Correcting the
-- location in the second pro_tips entry.
UPDATE routes SET pro_tips = jsonb_set(
  pro_tips, '{1}',
  '"Lily of the West, a second new route from the same trip, went up on the West Face of South Gunsight Peak (a separate, nearby peak), not on Dome Peak itself, and no pitch or grade details for it are available"'::jsonb
)
WHERE id = 'wa_dome_peak_indian_summer';

-- wa_dome_peak_indian_summer: access.closures names the active 2026 fire closure "Miner's Fire," but
-- the Washington Trails Association's live Downey Creek trail page (updated 2026-08-15, the closure's
-- own start date) names it the "Miner's Creek Fire." Correcting the fire's name only; the cited order
-- number (06-05-26-17) and its Dec 31, 2026 end date could not be independently confirmed this pass.
UPDATE routes SET access = jsonb_set(
  access, '{closures}',
  to_jsonb(replace(access->>'closures', 'Miner''s Fire', 'Miner''s Creek Fire'))
)
WHERE id = 'wa_dome_peak_indian_summer';

-- wa_dorado_needle_east_ridge: the `fa` field appends "(attribution uncertain)" to the Firey/Hoesli/
-- Knudson/Renz 1971 credit, but no source hedges this -- Beckey's Cascade Alpine Guide (as quoted
-- verbatim by American Alpine Institute's route profile) states this exact party and date with no
-- caveat, and no other source disputes or qualifies it. Removing the unsupported hedge.
UPDATE routes SET fa = 'Joan and Joe Firey, Hans Hoesli, Dave Knudson, and Peter Renz, July 4, 1971'
WHERE id = 'wa_dorado_needle_east_ridge';
