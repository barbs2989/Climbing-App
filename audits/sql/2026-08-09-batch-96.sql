-- WA alpine audit batch 96 (pass 2) -- 2026-08-09
-- Routes: South Ridge / PCT approach (Old Snowy Mountain), Blue Glacier / Snow Dome East Face
-- Ramps Finish + Summit Block NW Edge Finish + Traverse (Mount Olympus), Open Book (Unicorn Peak),
-- Southeast Route + West Ridge (Ottohorn), Southeast Route (Overcoat Peak)

-- 1. Ottohorn / West Ridge (wa_ottohorn_west_ridge): `fa` credited the peak's 1961 first-ascent
-- party (Cooper, Denny, Firey, Firey, Whitmore) directly to THIS route, stating "This route IS
-- the first-ascent line." Multiple independent sources -- the AAC Publications article "First
-- Ascents in the Southern Pickets" (the primary source for that 1961 climb) and other secondary
-- accounts -- agree the 1961 ascent went up Ottohorn's EAST ridge from the Otto-Himmel col, which
-- is this SAME peak's own wa_ottohorn_southeast_route (whose fa field already attributes it there,
-- correctly hedged). A CascadeClimbers.com trip report titled "FAs of Beep, Honk, and the West
-- Ridge of Ottohorn 7/25/2017" independently confirms the West Ridge was a separate, much later
-- first ascent -- the exact 2017 party was not confirmed in this pass (page inaccessible), so the
-- false 1961 attribution is removed rather than replaced with an unverified specific claim.
UPDATE routes SET fa = 'Not the 1961 peak first ascent (Cooper, Denny, Firey, Firey, Whitmore), which climbed Ottohorn''s east ridge from the Otto-Himmel col (see wa_ottohorn_southeast_route). A CascadeClimbers.com trip report ("FAs of Beep, Honk, and the West Ridge of Ottohorn," 7/25/2017) indicates this west ridge line was a separate, later first ascent, with exact party and date needing human verification.' WHERE id = 'wa_ottohorn_west_ridge';

-- No other errors confirmed in this batch: Old Snowy Mountain, Mount Olympus (three routes),
-- Unicorn Peak, and Overcoat Peak elevations, coordinates, land managers, permits, and first-
-- ascent parties (where stored) all cross-checked clean against Wikipedia, USFS/NPS pages, and
-- peak-database sources (PeakVisor, Peakbagger, ListsOfJohn).
