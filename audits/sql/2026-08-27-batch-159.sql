-- WA alpine audit, pass 3, batch 159
-- Routes checked: wa_olympus_traverse (Mount Olympus), wa_open_book_2 (Unicorn
-- Peak), wa_ottohorn_southeast_route / wa_ottohorn_west_ridge (Ottohorn),
-- wa_overcoat_peak_southeast_route (Overcoat Peak), wa_pernod_spire_standard
-- (Pernod Spire), wa_phantom_peak_south_route / wa_phantom_peak_west_ridge
-- (Phantom Peak).
-- Each statement is guarded on the exact current stored value so it is a
-- no-op (0 rows) rather than a silent overwrite if the row has since changed.

-- wa_phantom_peak_south_route (Phantom Peak): approach_logistics.trailhead
-- ("Hannegan Pass Trailhead ... via Hannegan Pass, Chilliwack River Trail,
-- Whatcom Pass and Perfect Pass") and the row's own Trailhead waypoint (elev
-- 3120 ft at 48.9101,-121.5927) both correctly identify Hannegan Pass
-- Trailhead -- but the same blob's trailheadDirection sub-field still names
-- a DIFFERENT, wrong trailhead: "Nooksack Cirque Trailhead at the end of
-- FR-34 off Hannegan Pass Road (FR-32)". Nooksack Cirque Trailhead is a real
-- but unrelated trailhead -- FR-34 splits off FR-32 only ~1 mile in and dead-
-- ends at a separate parking area serving the Nooksack Cirque Trail (#750)
-- toward the base of Mount Shuksan, not toward Whatcom Pass/the Pickets
-- (confirmed via USFS Nooksack Cirque Trail #750 page). The correct
-- Hannegan Pass Trailhead sits 5.4 more miles up FR-32 at road's end
-- (confirmed via USFS Hannegan Pass Road 32 recreation page, elevation
-- 3,120 ft -- matches this row's own pin and trailheadLat/Lng exactly).
-- This is the residue of the trailhead-agreement fix CLAUDE.md documents for
-- this row (the `trailhead` field and pin were corrected; `trailheadDirection`
-- was not carried along). Corrected to match the row's own trailhead/pin.
UPDATE routes
SET approach_logistics = jsonb_set(
      approach_logistics,
      '{trailheadDirection}',
      '"From Mt. Baker Highway (SR-542), follow Hannegan Pass Road (FR-32) past the Nooksack Cirque Road (FR-34) junction to its end at Hannegan Campground/Trailhead (3,120 ft)"'
    )
WHERE id = 'wa_phantom_peak_south_route'
  AND approach_logistics->>'trailheadDirection' = 'From the Nooksack Cirque Trailhead at the end of FR-34 off Hannegan Pass Road (FR-32)';

-- wa_ottohorn_west_ridge (Ottohorn): loss_ft (400) is grossly inconsistent
-- with this same row's own gain_ft (7240) and descent narrative. gain_ft
-- correctly matches the net rise from this row's own Trailhead waypoint
-- (Goodell Creek / Upper Goodell Group Camp, ~600 ft per this row's own
-- itinerary field) to the summit (7,840 ft, matching high_point_ft and the
-- area row's elevation): 7840-600=7240. But the route's own descent_text
-- says the party downclimbs the east ridge back to the Otto-Himmel col, then
-- "descend[s] the snow south into Crescent Creek Basin and reverse[s] the
-- approach over the Barrier" -- i.e. a full out-and-back to the same
-- trailhead, exactly like every other round-trip route in this same batch
-- (wa_open_book_2, wa_pernod_spire_standard, wa_overcoat_peak_southeast_route
-- all store gain_ft == loss_ft for an out-and-back). A round trip back to a
-- 600 ft trailhead from a 7,840 ft summit cannot lose only 400 ft. Corrected
-- to match gain_ft, consistent with the round-trip return this row's own
-- descent narrative describes.
UPDATE routes
SET loss_ft = 7240
WHERE id = 'wa_ottohorn_west_ridge'
  AND gain_ft = 7240
  AND loss_ft = 400;
