-- WA alpine audit, pass 2, batch 70 (2026-08-07)
-- Routes: Jack Mountain (x3), Johannesburg Mountain (x2), Kimtah Peak, Mount Stuart (King
-- Kong), Klawatti Peak (x2), Kangaroo Temple (Koala Krack). Each statement's comment
-- explains the source basis. Researched via 6 parallel agents grouped by peak.

-- wa_jack_mountain_nohokomeen_headwall: access.fees says backcountry permits are simply
-- "free", which was true before NPS's March 2024 fee-structure change (nps.gov news
-- release "Backcountry Permit Fee Structure Change"): $10/person/night plus a $6
-- non-refundable reservation fee, charged mid-May-early Oct, free the rest of the year.
-- This route's own season field ("Apr-early Jun") falls partly inside the fee window.
UPDATE routes SET access = jsonb_set(access, '{fees}', '"NPS backcountry camping fee applies for permits on the East Bank Trail (May Creek), mid-May through early October: $10 per person per night plus a $6 non-refundable reservation fee if booked in advance; free the rest of the year. No fee for the Pasayten Wilderness self-issued permit higher on the mountain. No parking fee at the East Bank Trailhead."') WHERE id = 'wa_jack_mountain_nohokomeen_headwall';

-- wa_jack_mountain_northeast_glacier: access.notes says "No permits required", directly
-- contradicting this same row's own permit field ("all overnight backcountry stays
-- require a backcountry permit"), and recommends "August-September (least snow)" --
-- backwards for a glacier/bergschrund route, which is normally climbed early season
-- before the glacier opens up (consistent with the FA's own July 19 date and this
-- route's sibling Nohokomeen Headwall route's "Apr-early Jun" season on the same peak).
UPDATE routes SET access = jsonb_set(access, '{notes}', '"Access via high-speed boat shuttle up Ross Lake to May Creek (Ross Lake Resort), or via the East Bank Trail. All overnight backcountry stays require an NPS backcountry permit (see permit field). Early-season snow/glacier climb -- typically attempted before the bergschrund and crevasses open up later in summer. Mountain rarely climbed due to alpine difficulty and remoteness."') WHERE id = 'wa_jack_mountain_northeast_glacier';

-- wa_jack_mountain_south_face: approach_logistics.trailhead/trailheadLat/trailheadLng
-- point to the Rainy Pass PCT North Trailhead, ~16 miles/30 km from this route's actual
-- trailhead. This same row's own approach text, road fields, and waypoints[0] all
-- correctly describe the Canyon Creek Trailhead (48.7065, -120.9183, ~1,900 ft) --
-- confirmed via USFS's Canyon Creek Trailhead recreation page and this row's own
-- road.driveNote ("55.1 mi from Winthrop", matching the Canyon Creek TH, not Rainy Pass).
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(jsonb_set(approach_logistics, '{trailhead}', '"Canyon Creek Trailhead"'), '{trailheadLat}', '48.7065'), '{trailheadLng}', '-120.9183'), '{trailheadDirection}', '"From the Canyon Creek Trailhead on SR-20 near Granite Creek (~1,900 ft), 16 miles west of Rainy Pass"') WHERE id = 'wa_jack_mountain_south_face';

-- wa_jack_mountain_south_face: access.land_manager (snake_case) says this is entirely
-- NPS/Stephen Mather Wilderness, directly contradicting this same row's own
-- access.landManager (camelCase) field, which correctly describes split USFS/NPS
-- management -- and matches this route's own approach trails (Canyon Creek TH/Jackita
-- Ridge Trail, confirmed USFS Pasayten Wilderness per the USFS's own site pages).
UPDATE routes SET access = jsonb_set(access, '{land_manager}', '"Approach trails (Canyon Creek TH, Jackita Ridge Trail #738/#746, Crater Lake) are in Okanogan-Wenatchee National Forest, Methow Valley Ranger District, within the Pasayten Wilderness; the peak and upper basins sit on/near the boundary with the Ross Lake National Recreation Area (North Cascades National Park Complex, NPS)."') WHERE id = 'wa_jack_mountain_south_face';

-- wa_jack_mountain_south_face: emergency.nearestHospital conflates two different
-- hospitals -- "Skagit Valley Hospital, Sedro-Woolley" -- but Skagit Valley Hospital is
-- actually in Mount Vernon, WA; the real Sedro-Woolley facility is PeaceHealth United
-- General Medical Center, which this route's own sibling rows (Nohokomeen Headwall,
-- Northeast Glacier) already correctly list at 2000 Hospital Dr, (360) 856-6021.
UPDATE routes SET emergency = jsonb_set(emergency, '{nearestHospital}', '"PeaceHealth United General Medical Center, 2000 Hospital Dr, Sedro-Woolley, WA 98284 - (360) 856-6021, 24-hour emergency department. Roughly 90 minutes'' drive from the Marblemount/Newhalem area via SR-20."') WHERE id = 'wa_jack_mountain_south_face';

-- wa_jack_mountain_south_face: beta cites "Beckey's Cascade Alpine Guide, Vol. 2 (Stevens
-- Pass to Rainy Pass)". Jack Mountain sits well north of Rainy Pass (per this row's own
-- approach text: trailhead "16 miles west of Rainy Pass", peak itself further north near
-- Ross Lake/Pasayten Wilderness). Beckey's 3-volume set divides geographically, and
-- publisher descriptions of Vol. 3 (Rainy Pass to Fraser River) explicitly cover the Ross
-- Lake/Pasayten area -- this route belongs in Vol. 3, not Vol. 2.
UPDATE routes SET beta = replace(beta, 'Vol. 2 (Stevens Pass to Rainy Pass)', 'Vol. 3 (Rainy Pass to Fraser River)') WHERE id = 'wa_jack_mountain_south_face';

-- wa_jack_mountain_south_face: dist_km (35) conflicts with this route's own waypoints
-- (final "Jack Mountain summit" waypoint distMi 11.5, one-way) and its own
-- itinerary.totalNote ("~22-24 mile round trip", i.e. ~11-12 mi one-way, matching
-- 11.5 mi x2 = 23 mi). Per this app's documented dist_km convention (one-way, doubled by
-- the UI for round trip), the stored value should be 11.5 mi in km, not the round-trip
-- mileage stored directly.
UPDATE routes SET dist_km = 18.5 WHERE id = 'wa_jack_mountain_south_face';

-- wa_johannesburg_mountain_cj_couloir / wa_johannesburg_mountain_northeast_buttress:
-- comms mischaracterizes NPS's actual "Climb Safely" guidance (nps.gov/noca), which
-- distinguishes cell phones (unreliable, don't rely on) from personal locator
-- beacons/satellite communicators (recommended as a backup) -- these rows wrongly lump
-- PLBs in with cell phones as things not to rely on, self-contradicting their own
-- what_to_bring field, which recommends a "satellite communicator".
UPDATE routes SET comms = 'No reliable cell coverage on-route or at the trailhead; NPS''s Climb Safely guidance for North Cascades NP advises against relying on cell phones (unreliable coverage) but recommends carrying a personal locator beacon or satellite communicator as a backup for calling for help.' WHERE id = 'wa_johannesburg_mountain_cj_couloir';
UPDATE routes SET comms = 'No reliable cell coverage on the face or at the trailhead; NPS''s Climb Safely guidance for North Cascades NP advises against relying on cell phones (unreliable coverage) but recommends carrying a personal locator beacon or satellite communicator as a backup for calling for help.' WHERE id = 'wa_johannesburg_mountain_northeast_buttress';

-- wa_johannesburg_mountain_northeast_buttress: waypoints[0] elevFt (3200) for "Cascade
-- Pass Road (near trailhead)" contradicts this same route's own approach text ("~3,600
-- ft"), its own approach_logistics.trailheadDirection ("~3,600 ft"), and the identical
-- waypoint (same name/coords) on the sibling CJ Couloir route, which correctly reads 3600.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '3600') WHERE id = 'wa_johannesburg_mountain_northeast_buttress';

-- wa_johannesburg_mountain_northeast_buttress: loss_ft (5000) is exactly 8200-3200,
-- derived from the erroneous 3200 ft trailhead above; with the corrected 3600 ft
-- trailhead it should be 4600 -- which also exactly matches this row's own
-- itinerary.days[1].lossFt (4600) and the sibling CJ Couloir route's parallel
-- loss_ft/itinerary computation (both 4600, from the same 8200/3600 pair).
UPDATE routes SET loss_ft = 4600 WHERE id = 'wa_johannesburg_mountain_northeast_buttress';

-- wa_johannesburg_mountain_northeast_buttress: dist_km (1.6) is inconsistent with this
-- route's own itinerary.days mileage (3.5 mi + 5.3 mi = 8.8 mi one-way/total route
-- distance). The sibling CJ Couloir route shows the field's intended convention exactly:
-- its dist_km (10.46) equals its own itinerary total (3 + 3.5 = 6.5 mi = 10.46 km).
-- 8.8 mi = 14.16 km.
UPDATE routes SET dist_km = 14.2 WHERE id = 'wa_johannesburg_mountain_northeast_buttress';

-- wa_kimtah_peak_scramble: road.driveNote says Easy Pass Trailhead is "about 20 miles
-- east of Marblemount"; Marblemount sits at approximately SR-20 milepost 107 (USFS,
-- Seattle Times milepost guide) and the trailhead is at milepost 151-152 -- 151.5-107 =
-- ~44.5 mi, matching USFS's own Easy Pass Trailhead page and WTA ("from Marblemount,
-- drive Highway 20 east for 45 miles").
UPDATE routes SET road = jsonb_set(road, '{driveNote}', '"Easy Pass Trailhead is on the south side of SR 20 near milepost 151, about 45 miles east of Marblemount, WA."') WHERE id = 'wa_kimtah_peak_scramble';

-- wa_kimtah_peak_scramble: access.rules' group-size example is backwards and irrelevant
-- to this route. Per NPS's cross-country zones page, the 12-person limit (same as
-- on-trail corridors) is the exception, applying specifically to Boston Basin, Eldorado,
-- and Sulphide Glacier; the 6-person limit applies to the remaining cross-country zones,
-- which is where Ragged Ridge/Kimtah actually sits -- the stored example cites the
-- unrelated 12-person exception zone as if it were the 6-person default.
UPDATE routes SET access = jsonb_set(access, '{rules}', '"Group size capped at 6 in most off-trail cross-country zones, including Ragged Ridge; Boston Basin, Eldorado, and Sulphide Glacier are the cross-country-zone exceptions with a 12-person cap (same as on-trail corridors). Bear canisters required in some zones -- free loaners at permit offices."') WHERE id = 'wa_kimtah_peak_scramble';

-- wa_kimtah_peak_scramble: itinerary.days[0].miles and days[2].miles (7.5 each, summing
-- to 20 mi total with day 2's 5 mi) contradict this same row's own waypoints (trailhead
-- to camp = 5.3 mi, per waypoints[3].distMi) and its own itinerary.totalNote ("roughly
-- 15 miles... round-trip... overall"). Corrected to match the row's own waypoint
-- distances: day 1 and day 3 each 5.3 mi (trailhead<->camp), day 2 3.8 mi (camp<->summit
-- round trip, 2x(7.2-5.3) per waypoints[3]/[7].distMi), totaling 14.4 mi -- matching the
-- itinerary's own "roughly 15 miles" round-trip note.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,miles}', '5.3') WHERE id = 'wa_kimtah_peak_scramble';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,1,miles}', '3.8') WHERE id = 'wa_kimtah_peak_scramble';
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,2,miles}', '5.3') WHERE id = 'wa_kimtah_peak_scramble';

-- wa_kimtah_peak_scramble: top-level gain_ft (4950) doesn't reconcile with this row's own
-- itinerary.days[].gainFt (2600+2050+0=4650), which does match the already-correct
-- loss_ft (4650) -- an out-and-back route on the same path should have gain roughly
-- equal to loss, as the itinerary's own day-by-day figures already show.
UPDATE routes SET gain_ft = 4650 WHERE id = 'wa_kimtah_peak_scramble';

-- wa_kimtah_peak_scramble: data_quality.gaps lists two items directly contradicted by
-- this same row's own populated fields: "No confirmed GPS waypoints for the
-- gully/gendarme sections" (the row's own waypoints array names and coordinates exactly
-- those features -- "Grotesque Gendarmes cliff band", "Water-filled summit gully") and
-- "No verified first-ascent date or party found" (the row's own fa field states a
-- specific, externally-corroborated FA: John Roper and Jerry Swanson, June 1970).
UPDATE routes SET data_quality = jsonb_set(data_quality, '{gaps}', '["Route description drawn from trip reports rather than a directly consulted guidebook (e.g., Beckey''s Cascade Alpine Guide)", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]') WHERE id = 'wa_kimtah_peak_scramble';

-- wa_king_kong_gorillas_direct_direct: fa/beta had an unresolved FA-vs-FFA mixup flagged
-- by a prior audit pass. AAC Publications ("Mt. Stuart, King Kong") and Alpinist
-- Newswire's "Mount Stuart Activity" both corroborate: Sol Wertkin and Tyree Johnson made
-- the first ascent (with a fall on the headwall crack) in early September 2016; Wertkin
-- returned about a week later with Jon Gleason and led it clean on Sept 9, 2016 for the
-- first free ascent. beta's "First ascent...by Sol Wertkin and Jon Gleason" was the field
-- describing the wrong event -- that pairing/date is the FFA, not the FA.
UPDATE routes SET fa = 'Sol Wertkin & Tyree Johnson, early Sept 2016 (FA, with a fall on the headwall crack); FFA by Sol Wertkin & Jon Gleason, Sept 9, 2016' WHERE id = 'wa_king_kong_gorillas_direct_direct';
UPDATE routes SET beta = replace(beta, 'First ascent: September 9, 2016 by Sol Wertkin and Jon Gleason.', 'First free ascent: September 9, 2016 by Sol Wertkin and Jon Gleason (the first ascent, with a fall on the headwall crack, was made about a week earlier by Sol Wertkin and Tyree Johnson).') WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_king_kong_gorillas_direct_direct: commitment ("III") contradicts this same row's
-- own beta field ("Grade: IV 5.11+ alpine rock climb"), and both AAC Publications and
-- Alpinist Newswire independently describe King Kong as "IV 5.11+".
UPDATE routes SET commitment = 'IV' WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_king_kong_gorillas_direct_direct: approach names "Longs Pass" at mile 2.5, but the
-- Ingalls Way Trail from the Esmeralda trailhead leads to Ingalls Pass, not Longs Pass (a
-- separate trail, #1229, that does not pass Ingalls Lake at all) -- contradicted by this
-- same row's own waypoints entry ("Ingalls Pass", elev 6457, distMi 2.5), whose
-- coordinates/elevation independently match Lake Ingalls-area figures almost exactly.
UPDATE routes SET approach = replace(approach, 'Longs Pass (6,200 ft)', 'Ingalls Pass (~6,450-6,500 ft)') WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_king_kong_gorillas_direct_direct: approach_logistics describes the wrong (north-side
-- Stuart Lake Trailhead/Icicle Creek Road/FR 7601) approach, confirmed via USFS/
-- Mountaineers sources as the approach for north-side routes like the North Ridge, not
-- for King Kong/the West Face Wall -- which this same row's own approach, road, and
-- emergency.county ("Kittitas County (south approach)") fields already correctly place
-- on the south side, via Teanaway River Road (FS-9737)/Esmeralda Basin. Trailhead
-- coordinates match this project's own prior audited fix for the same trailhead on the
-- Ingalls Peak South Ridge route (batch 69).
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(jsonb_set(jsonb_set(approach_logistics, '{trailhead}', '"Esmeralda / Ingalls Way Trailhead"'), '{trailheadLat}', '47.4367'), '{trailheadLng}', '-120.9369'), '{trailheadDirection}', '"South via FS-9737 (Teanaway River Road) to the Esmeralda/Ingalls Way Trailhead (~4,269 ft); hike the Ingalls Way Trail past Ingalls Pass (~6,450-6,500 ft) and Ingalls Lake toward Stuart Pass, then follow the climbers'' trail across talus to Goat Pass (7,600 ft) and contour to the West Face Wall where King Kong begins"') WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_king_kong_gorillas_direct_direct: access.notes carries the same north-side
-- contamination as approach_logistics (FR 7601, Stuart Lake trailhead parking/dogs
-- rules), which belongs to the Icicle Creek/north-side access point, not the
-- Teanaway/Esmeralda side this route actually uses.
UPDATE routes SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass or America the Beautiful interagency pass required to park at the Esmeralda/Ingalls Way Trailhead (FS-9737). Free self-issue Alpine Lakes Wilderness permit required at the trailhead for day and overnight use -- this approach is outside the quota-permit Enchantment Permit Area. Road access: FS-9737 (Teanaway River Road) typically closes/becomes impassable in winter. Bear-resistant food storage mandatory forest-wide."') WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_king_kong_gorillas_direct_direct: top-level permit field wrongly places this route
-- inside the Enchantment Permit Area (quota lottery, May 15-Oct 31). The Esmeralda
-- Basin/Ingalls Way trail system this route actually uses lies outside the Enchantment
-- Permit Area boundary and uses the standard free, non-quota, self-issued Alpine Lakes
-- Wilderness permit -- same pattern/fix as this project's prior Ingalls Peak South Ridge
-- correction (batch 69).
UPDATE routes SET permit = 'Free self-issue Alpine Lakes Wilderness permit at the Esmeralda/Ingalls Way trailhead for both day and overnight use -- this approach lies outside the quota-permit Enchantment Permit Area, so no Recreation.gov lottery is required.' WHERE id = 'wa_king_kong_gorillas_direct_direct';

-- wa_klawatti_peak_southeast_face: waypoints[0]/gpx[0] trailhead coordinate
-- (48.5136,-121.1964) is ~3.9 mi from the real Eldorado Creek trailhead. The correct
-- coordinate, 48.49261,-121.11761, is an exact match to this same row's own
-- approach_logistics.trailheadLat/trailheadLng and to WTA/multiple trip-report
-- convergence on the real Cascade River Road mile-20 trailhead.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,lat}', '48.49261') WHERE id = 'wa_klawatti_peak_southeast_face';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,lng}', '-121.11761') WHERE id = 'wa_klawatti_peak_southeast_face';
UPDATE routes SET gpx = jsonb_set(gpx, '{0}', '[48.49261,-121.11761]') WHERE id = 'wa_klawatti_peak_southeast_face';

-- wa_klawatti_peak_southeast_face: access.notes ends with a stray "Mount Tom area, North
-- Cascades." clause with no relation to Klawatti Peak/Eldorado Creek/NCNP -- the same
-- boilerplate-bleed string this project has previously found and stripped from 2 other
-- routes DB-wide (batch 15).
UPDATE routes SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."') WHERE id = 'wa_klawatti_peak_southeast_face';

-- wa_klawatti_peak_southeast_face: rock_grade ("Class 3-4 (scrambling)") undersells the
-- crux documented elsewhere in this same row -- grade ("Grade III, Class 4 / low 5th"),
-- pitch_detail[0].grade ("5.2 (Class 4-5)"), and beta ("2 pitches of Class 4-5 rock
-- climbing") all agree on Class 4/low-5th, not just Class 3-4 scrambling.
UPDATE routes SET rock_grade = 'Class 4 / low 5th (2 pitches)' WHERE id = 'wa_klawatti_peak_southeast_face';

-- wa_klawatti_peak_southeast_face: beta says "45-50 degree snow slopes", contradicted by
-- this same row's own pitch_detail[1].grade ("Snow 40-55°"), descent_text, and summit
-- waypoint note, which all consistently say 40-55°.
UPDATE routes SET beta = replace(beta, '45-50 degree snow slopes', '40-55 degree snow slopes') WHERE id = 'wa_klawatti_peak_southeast_face';

-- wa_klawatti_peak_southeast_face: climate.forecastZone says "East Slopes Northern
-- Cascades", contradicted by this same row's own seasonal_hazards.avalanche.zone ("West
-- Slopes North forecast zone") and the sibling SW Buttress route's climate.forecastZone
-- ("NWS Zone WAZ567, West Slopes North Cascades and Passes") -- Cascade River
-- Rd/Eldorado/Klawatti is on the west side of the Cascade crest.
UPDATE routes SET climate = jsonb_set(climate, '{forecastZone}', '"West Slopes North Cascades and Passes / North Cascades National Park backcountry"') WHERE id = 'wa_klawatti_peak_southeast_face';

-- wa_klawatti_peak_sw_buttress: waypoints[2] (the trailhead entry) carries the same wrong
-- coordinate as the SE Face route's fix above (48.5136,-121.1964), plus an embedded
-- self-correction note claiming the opposite -- that the correct value
-- (48.4926,-121.1176, matching this row's own approach_logistics field) is "likely
-- wrong". That note has the fix backwards; corrected to the real trailhead location and
-- an accurate note.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,lat}', '48.49261') WHERE id = 'wa_klawatti_peak_sw_buttress';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,lng}', '-121.11761') WHERE id = 'wa_klawatti_peak_sw_buttress';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{2,note}', '"Eldorado Creek Trailhead, Cascade River Road at mile 20 (elev ~2,100 ft); matches approach_logistics.trailheadLat/trailheadLng."') WHERE id = 'wa_klawatti_peak_sw_buttress';
UPDATE routes SET gpx = jsonb_set(gpx, '{2}', '[48.49261,-121.11761]') WHERE id = 'wa_klawatti_peak_sw_buttress';

-- wa_klawatti_peak_sw_buttress: approach text names "the 8,868-foot summit" as this
-- route's climbing objective -- 8,868 ft is Eldorado Peak's elevation (Wikipedia:
-- ~8,873 ft), not Klawatti's (8,485 ft, this row's own area.elevation_ft). The row's own
-- later disclaimer already says the route is "NOT on Eldorado Peak itself", so the
-- earlier clause describing climbing toward Eldorado's summit contradicts its own text;
-- corrected to describe the actual objective (Klawatti Col / SW Buttress).
UPDATE routes SET approach = replace(approach, 'climbing toward Eldorado''s famous narrow snow ridge and the 8,868-foot summit, typically another 3-5 hours', 'traversing the Eldorado/Inspiration Glacier ice cap toward Klawatti Col and the base of Klawatti Peak''s SW Buttress (not the Eldorado Peak summit -- see note below), typically another 3-5 hours') WHERE id = 'wa_klawatti_peak_sw_buttress';

-- wa_koala_krack: road.seasonalGate says the 2025-26 SR-20/Washington Pass winter
-- closure began "Dec 12, 2025" -- WSDOT's own announcement ("SR 20 North Cascades
-- Highway closes for season Thursday, Dec. 4 at 6 p.m.", Dec 2025, corroborated by KPQ/
-- KOMO/KXLY/Hoodline) puts the actual gate closure at Dec 4, 2025, 6:00 PM. Dec 12, 2025
-- was a separate rainfall/washout event (mileposts 142-148) that later extended repairs
-- into 2026, not the initial gate date. The June 14, 2026 reopening date is correct.
UPDATE routes SET road = jsonb_set(road, '{seasonalGate}', '"SR-20 closes seasonally over Washington Pass due to avalanche danger (closed Dec 4, 2025-June 14, 2026 in the 2025-26 season, with exact dates varying by year)."') WHERE id = 'wa_koala_krack';
