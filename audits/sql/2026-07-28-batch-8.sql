-- WA alpine/mountaineering audit — batch 8 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-7
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Direct North Buttress (wa_direct_north_buttress, Bear Mountain): fa/pitches/length_m/
-- commitment/season all conflicted with the row's own overview/beta prose and with external
-- sources (AAC Publications, Steph Abegg, Mountain Project/CascadeClimbers), indicating this
-- row was populated with mismatched data from a different route/ascent record. The correct FA
-- is Alan Kearney and Bobby Knight (Sept 1980, later freed by Bryan Burdo/Yann Merrand 1985),
-- not the 2016 party stored (a repeat ascent, not the FA); the route is 21 pitches / ~670m at
-- Grade V, not 5 pitches / 274m at Grade IV; and it's a summer rock route (Jul-Sep), not a
-- winter/spring ice route.
update routes set fa = 'Alan Kearney and Bobby Knight, September 1980 (freed by Bryan Burdo and Yann Merrand, 1985)'
  where id = 'wa_direct_north_buttress';
update routes set pitches = 21, length_m = 670
  where id = 'wa_direct_north_buttress';
update routes set commitment = 'V'
  where id = 'wa_direct_north_buttress';
update routes set season = 'Jul-Sep (summer alpine rock conditions)'
  where id = 'wa_direct_north_buttress';

-- Direct North Buttress (wa_direct_north_buttress): access fields implied a North Cascades NP
-- entrance fee, but NPS charges no entrance fee for this park. The actual requirement is a
-- Northwest Forest Pass at the USFS-managed Hannegan Pass trailhead (nps.gov/noca/fees.htm).
update routes set access = jsonb_set(jsonb_set(jsonb_set(access,
  '{_raw,parking_pass_cost}', '"Northwest Forest Pass required at Hannegan Pass TH ($5/day or $30/yr); NCNP itself has no entrance fee"'),
  '{_raw,parking_pass_required}', '"Northwest Forest Pass (USFS trailhead, not an NPS fee)"'),
  '{passRequired}', '"Northwest Forest Pass at trailhead; North Cascades NP has no entrance fee"')
  where id = 'wa_direct_north_buttress';

-- Direct Southwest Buttress (wa_direct_southwest_buttress, Dorado Needle): top-level gain_ft/
-- loss_ft (7000/7000) disagreed with the row's own itinerary.days breakdown (5500+1700 /
-- 1700+5500 = 7200) and itinerary.totalNote ("~7,200 ft total gain") — an internal
-- self-contradiction, corrected to match the more granular day-by-day source of truth already
-- on the row.
update routes set gain_ft = 7200, loss_ft = 7200
  where id = 'wa_direct_southwest_buttress';

-- East Ridge / Inspiration Glacier (wa_dorado_needle_east_ridge, Dorado Needle): access.fees/
-- access.permit said the backcountry permit is free, which is now out of date — NPS
-- implemented a park-wide per-person backcountry permit fee ($10 + $6 non-refundable
-- reservation fee), already correctly reflected on the sibling wa_direct_southwest_buttress row
-- (same peak, same permit zone).
update routes set access = jsonb_set(
  jsonb_set(access, '{fees}', '"$10 per person + $6 non-refundable reservation fee for the required backcountry overnight permit, plus trailhead parking pass (Northwest Forest Pass or America the Beautiful Interagency Pass)"', true),
  '{permit}', '"Backcountry overnight permit ($10/person + $6 reservation fee, per NPS fee structure in effect 2024+)"', true
) where id = 'wa_dorado_needle_east_ridge';

-- Direct West Face (wa_direct_west_face, Pernod Spire): standalone commitment field said "III"
-- while the row's own overview text describes "an 8-pitch III/IV 5.10+ R line" — a
-- self-contradiction. The first-ascent report (AAJ, Bentley/Peritore 2006) also gives III/IV,
-- so the standalone field is corrected to match.
update routes set commitment = 'III/IV'
  where id = 'wa_direct_west_face';

-- Dolphin Chimney (wa_dolphin_chimney, South Early Winters Spire): top-level gain_ft (2100)
-- disagreed with the same row's own nested itinerary.days[0].gainFt (2200) for the identical
-- car-to-car day — a plain internal contradiction, aligned to the more specific nested figure.
-- (Note: even 2200 ft is below the ~2,607 ft implied by this row's own trailhead/summit
-- waypoints (5,200 ft -> 7,807 ft); flagged separately below for a human to re-derive from a
-- GPX/topo rather than guessed further here.)
update routes set gain_ft = 2200
  where id = 'wa_dolphin_chimney';

-- Dome Glacier (wa_dome_peak_dome_glacier, Dome Peak): seasonal_hazards.exposure named "Chelan
-- County" as the evacuation-distance context, but Dome Peak sits in Skagit County (confirmed
-- via Wikipedia, and this same row's own emergency.county field already correctly says
-- Skagit/Snohomish) — a copy-paste artifact from an unrelated location.
update routes set seasonal_hazards = jsonb_set(
  seasonal_hazards, '{exposure}',
  '"Moderate — Class 3 scrambling on the summit pyramid above sustained glacier travel; the main consequence is a crevasse fall or a scramble fall, and the remoteness (Skagit/Snohomish County, long multi-day evacuation from deep wilderness) substantially raises the stakes of any incident"'::jsonb
) where id = 'wa_dome_peak_dome_glacier';

-- Dome Glacier (wa_dome_peak_dome_glacier, Dome Peak): access.parking_pass named the "Mountain
-- Loop Highway" trailhead corridor, but this route's own access.fees field correctly names the
-- actual trailhead (Downey Creek, off Suiattle River Road/FR-26) — Mountain Loop Highway is a
-- different Darrington-RD corridor near Monte Cristo/Barlow Pass. Copy-paste artifact,
-- contradicting correct data already present elsewhere in the same row.
update routes set access = jsonb_set(
  access, '{parking_pass}',
  '"Northwest Forest Pass required at Downey Creek Trailhead — $5/day or $30/year."'::jsonb
) where id = 'wa_dome_peak_dome_glacier';

-- Gerber-Sink (wa_dragontail_peak_r2, Dragontail Peak): the row's own "Dragontail Peak summit"
-- waypoint recorded elev 8841, one foot off from this row's own high_point_ft (8840), the
-- parent area's elevation_ft (8840), and every sibling route's summit waypoint (also 8840) —
-- an internal self-contradiction rather than a sourcing dispute (guidebooks/Wikipedia uniformly
-- cite 8,840 ft). WHERE guard makes this a no-op if the waypoints array shape ever changes.
update routes
  set waypoints = jsonb_set(waypoints, '{5,elev}', '8840'::jsonb)
  where id = 'wa_dragontail_peak_r2'
    and waypoints->5->>'name' = 'Dragontail Peak summit'
    and (waypoints->5->>'elev')::int = 8841;
