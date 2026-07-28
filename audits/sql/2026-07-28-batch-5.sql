-- WA alpine/mountaineering audit — batch 5 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-4
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Chianti Spire East Face / Rebel Yell (wa_chianti_spire_east_face): data_quality.gaps still
-- lists the 'fa' field and the 'rock_grade' field as unresolved/unfixable discrepancies ("not
-- editable via this schema"), but both fields on this same row already carry the corrected
-- values (fa: "Mark Bebie and Jim Nelson, 1986" — confirmed via Mountain Project/SummitPost/
-- StephAbegg; rock_grade: "5.10b"). The two gap entries are stale leftovers from before those
-- fields were fixed; removing them so data_quality doesn't contradict the row's own data.
update routes set data_quality = jsonb_set(
  data_quality, '{gaps}',
  '["This catalog entry and ''wa_east_face_rebel_yell'' both describe the same named Mountain Project route (''East Face / Rebel Yell'') — worth merging or clearly differentiating.", "Pitch count is reported as 6 (Mountain Project, direct start only) or 7 (Steph Abegg trip report, NC Mountain Guides, counting the left-start variation) — used 7 here as the more detailed count.", "No public GPS track found for this route as of this research pass.", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]'::jsonb
) where id = 'wa_chianti_spire_east_face';

-- Chianti Spire East Face (wa_chianti_spire_east_face): comms field names "Marblemount or North
-- Bend" as the closest services — both are on the wrong side of the state (Marblemount is the
-- North Cascades NP west-side gateway, ~60 road miles away; North Bend is the Snoqualmie Pass/
-- I-90 corridor, a different mountain range entirely). This route's own emergency section
-- (same row) correctly names Winthrop/Mazama via the Methow Valley Ranger District and Three
-- Rivers Hospital in Brewster — the comms field contradicts the row's own, better-sourced data.
update routes set comms = 'No cell service at Washington Pass or on the Burgundy Col approach; a satellite messenger (inReach/SPOT) is strongly recommended. Closest services are in Winthrop or Mazama, WA (Methow Valley).'
  where id = 'wa_chianti_spire_east_face';

-- Chianti Spire East Face (wa_chianti_spire_east_face): dist_km stored as 2.4, but this row's
-- own itinerary gives day-by-day mileage of 3.9 mi in and 3.9 mi out (7.8 mi round trip =
-- ~12.55 km) — the 2.4 km figure is off by roughly 5x from the row's own numbers.
update routes set dist_km = 12.55 where id = 'wa_chianti_spire_east_face';

-- Chianti Spire East Face (wa_chianti_spire_east_face): the Burgundy Col waypoint has no
-- elevation recorded, but this row's own itinerary explicitly states "establish camp at
-- Burgundy Col (~7,900 ft)" — filling in the gap from the row's own text.
update routes set waypoints = jsonb_set(
  waypoints, '{0,elevFt}', '7900'::jsonb
) where id = 'wa_chianti_spire_east_face';

-- Chiwawa Mountain Southwest Route (wa_chiwawa_mountain_southwest): access.land_manager names a
-- nonexistent "Chiwawa/Entiat Ranger Districts" — the same error already found and fixed for
-- Bonanza Peak in batch 4. This row's own emergency.rangerStation and access.landManager fields
-- (and the real USFS alert page for this exact road closure) all correctly name the Wenatchee
-- River Ranger District; there is no "Chiwawa" ranger district.
update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District) — Glacier Peak Wilderness"'::jsonb
) where id = 'wa_chiwawa_mountain_southwest';

-- Chimney Rock West Face / South Summit (wa_chimney_rock_west_face): descent_text still
-- includes the claim that the Rappel Chimney bolts "were reportedly replaced for safety in
-- 2001" — but this row's own rappel_detail and rappel_count_note fields already flag this exact
-- claim as unsupported for the Washington peak and apparently misattributed from an unrelated,
-- same-named Chimney Rock crag in North Idaho, and say it "should be dropped." Removing it from
-- descent_text so the row is no longer internally contradictory.
update routes set descent_text = replace(
  descent_text,
  ' — the bolts here were reportedly replaced for safety in 2001 — which',
  ' — which'
) where id = 'wa_chimney_rock_west_face';

-- Chimney Rock West Face / South Summit (wa_chimney_rock_west_face): high_point_ft is stored as
-- 7,727 ft, which is Chimney Rock's main/central-spire summit — the elevation this route's own
-- sibling East Face route climbs (per its matching high_point_ft). But this route's own name,
-- waypoints, and approach text ("working toward the toe of the south peak rather than the
-- main-summit gully used by the East Face") all describe climbing the separate, lower South
-- Summit, confirmed via Wikipedia at 7,440 ft (matching this row's own summit waypoint exactly).
update routes set high_point_ft = 7440 where id = 'wa_chimney_rock_west_face';

-- Chimney Rock West Face / South Summit (wa_chimney_rock_west_face): the itinerary's summit
-- schedule entry calls it "Main/South Summit at 7,727 ft", conflating the two distinct summits
-- above (main/central spire 7,727 ft vs. this route's actual South Summit objective at 7,440
-- ft) — correcting to match the fix above.
update routes set itinerary = jsonb_set(
  itinerary, '{days,1,schedule,3,detail}', '"South Summit, 7,440 ft — not Chimney Rock's main/central summit (7,727 ft), which the East Face route climbs."'::jsonb
) where id = 'wa_chimney_rock_west_face';

-- Chimney Rock West Face / South Summit (wa_chimney_rock_west_face): climate.forecastZone says
-- "NWAC Snoqualmie Pass zone", contradicting this same row's own seasonal_hazards.avalanche.zone
-- ("Approximate Stevens Pass / East Slopes Central NWAC zone boundary area ... no NWAC zone
-- precisely covers this peak") — aligning the two fields on the row's own more careful language.
update routes set climate = jsonb_set(
  climate, '{forecastZone}',
  '"No dedicated NWAC zone covers this peak; nearest approximate coverage is the Stevens Pass / East Slopes Central zone boundary (Alpine Lakes crest near Cooper Lake)."'::jsonb
) where id = 'wa_chimney_rock_west_face';

-- Unicorn Peak Classic Route (wa_classic_route_2): the summit waypoint's elev (6,867 ft)
-- contradicts this row's own high_point_ft (6,971 ft), Wikipedia's confirmed Unicorn Peak
-- elevation (6,971 ft), and every other route on the same peak in this catalog (wa_unicorn_peak_r1,
-- wa_the_roof, wa_open_book_2 all correctly use 6,971 ft for the same summit waypoint) — this
-- route is the sole outlier.
update routes set waypoints = jsonb_set(
  waypoints, '{1,elev}', '6971'::jsonb
) where id = 'wa_classic_route_2';

-- Unicorn Peak Classic Route (wa_classic_route_2): corrections/rope_note flag a "grade
-- discrepancy" claiming sources grade this route 5.6 while the DB lists 5.4. Checked against
-- Mountain Project directly: the Classic Route is graded 5.4, matching this row's own top-level
-- grade field. The flagged discrepancy doesn't hold up, so it's being cleared rather than left
-- to imply an unresolved conflict.
update routes set corrections = 'Verified against Mountain Project: the Classic Route is graded 5.4, matching this row''s own grade field. An earlier note flagging a possible 5.6 grading did not hold up against the primary source and has been cleared.'
  where id = 'wa_classic_route_2';

update routes set rope_note = 'One of ~4 established lines on Unicorn Peak''s ~50ft south summit-block face, graded 5.4 per Mountain Project (matching this row). Short face means a single 30m rope is more than sufficient.'
  where id = 'wa_classic_route_2';

-- Lane Peak Classic Route (wa_classic_route_3): the itinerary's day-1 note describes the
-- approach reaching "the saddle between Lane and Pinnacle", but this row's own overview,
-- approach text, and waypoint ("Lane-Denman saddle") all consistently describe the saddle
-- between Lane and Denman Peaks — Pinnacle Peak is a different, unrelated Tatoosh summit near
-- Reflection Lakes. Fixing the stray reference to match the row's own consistent naming.
update routes set itinerary = jsonb_set(
  itinerary, '{days,0,note}',
  '"From the Reflection Lakes pullout on Stevens Canyon Road, road-walk roughly a half mile to the 90-degree bend, then pick up the climbers'' path up gentle open slopes toward the saddle between Lane and Denman. From the saddle head west/up into the obvious weakness in the southeast face; the last 50 feet is easy Class 3 scrambling to the summit. Reverse the same line to descend."'::jsonb
) where id = 'wa_classic_route_3';

-- Lane Peak Classic Route (wa_classic_route_3): approach text claims "roughly 2,000-2,400 ft of
-- gain" round trip, contradicting this row's own gain_ft (1,400), itinerary.days[0].gainFt
-- (1,400), and the route's own waypoint elevations (Narada Falls 4,564 ft -> dip to Tatoosh
-- Creek crossing 4,500 ft -> summit 6,012 ft, netting to roughly 1,400-1,500 ft of cumulative
-- gain, not 2,000-2,400).
update routes set approach = replace(
  approach,
  'roughly 2,000-2,400 ft of gain',
  'roughly 1,400-1,500 ft of gain'
) where id = 'wa_classic_route_3';

-- =========================================================================
-- NOT fixed here (flagged for human review only — see audit log for detail):
--  - Chianti Spire East Face (wa_chianti_spire_east_face): a "Chianti Spire / East Face (Rebel
--    Yell) area" campsite/base waypoint shares byte-identical coordinates with the "Chianti
--    Spire Summit" waypoint (48.55186, -120.59014 for both) — clearly wrong (a route's base
--    can't sit at its own summit), but no independent source was found for the true separate
--    coordinates of the base/camp area, so left for a human with a GPS track or topo to fix
--    rather than guessing new numbers.
--  - Chimney Rock West Face / South Summit (wa_chimney_rock_west_face): access.notes states
--    "avalanche control closures on I-90 affect access" — identical boilerplate to the Chair
--    Peak/Alpental routes (I-90 Exit 52), but this route's actual access is Cle Elum/Salmon La
--    Sac Road/FR-46 (Pete Lake Trailhead), well east of the Snoqualmie Pass avalanche-control
--    corridor. Likely template contamination, but not fixed here since the drive does pass
--    through the I-90 corridor at Cle Elum and a human with local knowledge should confirm
--    before rewording.
--  - Chair Peak North Face (wa_chair_peak_north_face): fa field credits a 4-person 1975 FA
--    party (Kit Lewis, Charlie Hampson, Rob Harris, Greg Jacobson); available secondary sources
--    (search snippets only, primary pages blocked from direct fetch this session) corroborate
--    Kit Lewis and Robert Harris but do not mention Hampson or Jacobson — could not confirm or
--    refute the full party without a primary source.
--  - Cathedral Peak Southeast Buttress, Chair Peak Northeast Buttress, Chelan Butte Trail,
--    Chockstone Route: checked against available sources (Wikipedia, Mountain Project search
--    snippets, prior enrichment corrections already on file) — no further errors found this
--    pass; these rows already carry well-hedged, internally consistent data.
-- =========================================================================

-- Verify afterward:
select id, data_quality, comms, dist_km, waypoints from routes where id = 'wa_chianti_spire_east_face';
select id, access from routes where id = 'wa_chiwawa_mountain_southwest';
select id, descent_text, high_point_ft, itinerary, climate from routes where id = 'wa_chimney_rock_west_face';
select id, waypoints, corrections, rope_note from routes where id = 'wa_classic_route_2';
select id, itinerary, approach from routes where id = 'wa_classic_route_3';
