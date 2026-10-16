-- WA alpine/mountaineering audit, pass 3 (final batch) + pass 4 (opening batch)
-- Batch 176: wa_whitehorse_mountain_r1, wa_windy_peak_iron_gate_trail,
-- wa_windy_peak_windy_creek_trail, wa_witches_tower_south_face (closes pass 3),
-- wa_a_servant_to_liberty, wa_abernathy_peak_south_ridge, wa_action_potential,
-- wa_agnes_mountain_west_route (opens pass 4).

-- wa_agnes_mountain_west_route: gain_ft (4000) is below the physical floor set by the
-- route's own other fields. Trailhead waypoint "High Bridge / Agnes Creek (Stehekin
-- access)" elev 1650 ft to Summit waypoint elev 8131 ft is a net rise of 6,481 ft --
-- already more than 2,000 ft above the stored gain_ft even before adding a single foot
-- for the roped class 4-5 climbing (5 pitches). The route's own `itinerary` field
-- independently corroborates this from a different angle: day-by-day gainFt values sum
-- to 6,700 ft (3400+3200+100+0), and itinerary.totalNote states in prose "~6,500 ft gain
-- to the 8,131 ft summit". Three fields already on this row (waypoints, itinerary
-- per-day figures, itinerary's own summary sentence) independently agree on ~6,500-6,700
-- ft; only the standalone gain_ft column disagrees, understating the true approach+climb
-- gain by well over 2,000 ft -- this is the CLAUDE.md-documented "audit:gain" /
-- "check:gain-floor-stated" defect class (a stored gain_ft below what the route's own
-- pins/itinerary prove is possible), which the app's Planner tab uses to compute
-- Est. summit / Est. return / the "after dark" warning. No external source was needed;
-- this is an internal contradiction within the row's own recorded data. Using 6500 ft,
-- the value the row's own itinerary.totalNote already states in prose.
UPDATE routes
SET gain_ft = 6500
WHERE id = 'wa_agnes_mountain_west_route'
  AND gain_ft = 4000;

-- wa_a_servant_to_liberty: the row's own data_quality.gaps entry already flags this as
-- an open question -- "FA (Mikey Schaefer, Aug 2016) is corroborated by Mountain
-- Project's route history, which also credits Shanjean Lee as his partner on the
-- successful redpoint push -- the on-file FA credit lists Schaefer only; worth a
-- follow-up review if a more complete credit is wanted." Followed up: per Climbing
-- magazine ("The Dark Side of Liberty: Shanjean Lee and Mikey Schaefer's First Ascent on
-- Washington's Liberty Bell") and the AAC Publications report "Liberty Bell: A Slave to
-- Liberty", Schaefer rope-soloed and equipped the route in 2015, then made the completing
-- one-day free ascent on August 6, 2016, leading every pitch with Shanjean Lee belaying.
-- Updating the fa credit to reflect this rather than leaving the gap open, since the
-- row itself invited exactly this follow-up and it's now been done. Not touching
-- data_quality (leaving the historical gap note as a record of the research trail).
UPDATE routes
SET fa = 'Mikey Schaefer, rope-soloed and equipped in 2015; completed as a one-day free ascent on August 6, 2016 with Shanjean Lee belaying (originally documented as ''A Slave to Liberty'')'
WHERE id = 'wa_a_servant_to_liberty'
  AND fa = 'Mikey Schaefer, August 2016 (rope-solo; originally documented as ''A Slave to Liberty'')';
