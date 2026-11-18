-- WA alpine audit — batch 122 (2026-08-19, pass 3)
-- Routes: wa_cutthroat_peak_cauthorn_wilson_couloir, wa_cutthroat_peak_northeast_face,
-- wa_cutthroat_peak_southeast_buttress (Cutthroat Peak), wa_dark_peak_dark_glacier_route
-- (Dark Peak). wa_cutthroat_south_buttress, wa_cutthroat_west_ridge, wa_dark_side_of_liberty
-- (Liberty Bell) and wa_diamond_in_the_rough (Sloan Peak) were also checked -- clean, see log.
-- All WHERE clauses include the current (wrong) value as a safety check per project convention.

-- =========================================================================
-- Cutthroat Peak (wa_cutthroat_peak) — commitment field holding a duration
-- instead of an NCCS commitment grade
-- =========================================================================
-- routes.commitment is rendered on the route page's TECHNICAL STATS "Composite Grade" panel
-- as a "Commitment" badge (RouteDetail.jsx's cm=route.commitment, P.push(["Commitment",cm]))
-- and looked up against COMMITMENT_EXPLAINERS (a bare-numeral I-VI keyed map) for an
-- explainer sentence; the contribute-form editor's own FIELDS list labels it "Commitment
-- grade (I-VI)" with only I-VI as options. Across the WA catalog, 279+218+79+56+... rows
-- correctly hold a bare (or +/- modified) Roman numeral there; the exceptions are almost all
-- Class 2-4 SCRAMBLE routes for which a duration ("2-4 day backpack") stands in reasonably
-- for an NCCS grade that doesn't really apply to non-technical routes. These three are not
-- scrambles -- all three are pitched, roped alpine rock/ice routes with their own rock_grade
-- and pitch_detail -- so they belong with the numeral-grade majority, not the scramble-prose
-- minority, and each already carries a correct-shaped grade in its own `grade` column.

-- wa_cutthroat_peak_cauthorn_wilson_couloir: commitment stored "13 hrs" (a route duration,
-- copied from this row's own `timing.totalHrs` field, 9.5 hrs re-summed to a car-to-car
-- estimate elsewhere in the row -- not even internally consistent with itself). This row's
-- own `grade` field already holds "III+", a valid catalog value (2 other WA routes use it
-- verbatim). Set commitment to match.
UPDATE routes SET commitment = 'III+'
WHERE id = 'wa_cutthroat_peak_cauthorn_wilson_couloir' AND commitment = '13 hrs';

-- wa_cutthroat_peak_northeast_face: commitment stored "12.5 hrs". This row's own `grade`
-- field already holds "III", externally confirmed via AAC Publications' "Cutthroat Peak,
-- East Face, The Swarm" article, which describes this exact 1976 Bard/Chouinard/Cunningham
-- line as "East Face (6 pitches, III 5.10)" -- matching this row's own pitches=6 and
-- rock_grade=5.7 (grade text rounds/quotes 5.10 for the route overall; the two documented
-- 5.10 pitches are this row's own crux per pitch_detail). Set commitment to match.
UPDATE routes SET commitment = 'III'
WHERE id = 'wa_cutthroat_peak_northeast_face' AND commitment = '12.5 hrs';

-- wa_cutthroat_peak_southeast_buttress: commitment stored "12 hrs". This row's own `grade`
-- field already holds "III". Set commitment to match, same defect and same fix shape as its
-- two siblings above.
UPDATE routes SET commitment = 'III'
WHERE id = 'wa_cutthroat_peak_southeast_buttress' AND commitment = '12 hrs';

-- =========================================================================
-- Dark Peak (wa_dark_peak) — wa_dark_peak_dark_glacier_route
-- =========================================================================
-- The route's approach uses designated NPS campsites (Fivemile Camp, Swamp Creek Camp)
-- along the Agnes Creek corridor inside North Cascades National Park Complex (Lake Chelan
-- National Recreation Area) before reaching the Glacier Peak Wilderness (USFS) portion of
-- the climb itself -- this row's own access.landManager field already correctly splits the
-- two jurisdictions. But three fields describing the COST of that NPS permit are wrong: NPS's
-- own current backcountry-permits page (nps.gov/noca, "Backcountry Permit Fee Structure
-- Change") and a corroborating Washington's National Park Fund / WTA writeup both confirm a
-- $10/person recreation fee plus a $6 non-refundable reservation fee applies to backcountry
-- permits in the park complex, charged mid-May through early October (this route's own
-- best_season is Jun-Jul, squarely inside that window) -- not free, and not the "Glacier Peak
-- Wilderness" self-issue permit the top-level `permit` field names (that free self-issue
-- permit covers the Forest Service portion around the peak itself, not the NPS-administered
-- approach camps, and the two must not be conflated).
UPDATE routes SET permit = 'NPS backcountry permit required for the overnight camps along the Agnes Creek corridor (Fivemile Camp, Swamp Creek Camp) inside North Cascades National Park Complex -- $10/person plus a $6 non-refundable reservation fee via Recreation.gov, charged mid-May through early October (free outside that window). No separate permit is needed once past the park boundary into the Glacier Peak Wilderness (Forest Service) portion of the route around the peak itself.'
WHERE id = 'wa_dark_peak_dark_glacier_route'
  AND permit = 'Free self-issue Glacier Peak Wilderness permit at the trailhead; no quota. Northwest Forest Pass at many trailheads.';

UPDATE routes SET access = jsonb_set(access, '{permit}',
    '"An NPS backcountry permit is required for overnight stays at the designated campsites along the Agnes Creek corridor (Fivemile Camp, Swamp Creek Camp) inside North Cascades National Park Complex -- $10/person plus a $6 non-refundable reservation fee, charged mid-May through early October, reservable via Recreation.gov (email noca_wilderness@nps.gov within 3 days of the trip start for last-minute permits). Permits have historically been issued in Stehekin at the Golden West Visitor Center, which has had reduced/no seasonal ranger staffing in recent years -- confirm the current process with North Cascades National Park before the trip. No permit is required once past the park boundary into the Glacier Peak Wilderness (Forest Service) portion of the route."'
  )
WHERE id = 'wa_dark_peak_dark_glacier_route'
  AND access->>'permit' = 'A free NPS backcountry/wilderness camping permit is required for designated campsites along the Agnes Creek corridor (Fivemile Camp, Swamp Creek Camp); permits have historically been issued in Stehekin at the Golden West Visitor Center, which has had reduced/no seasonal ranger staffing in recent years -- confirm the current permit process with North Cascades National Park before the trip';

UPDATE routes SET access = jsonb_set(access, '{fees}',
    '"NPS backcountry permit fee applies for the overnight camps along the Agnes Creek corridor inside North Cascades National Park Complex: $10/person plus a $6 non-refundable reservation fee, charged mid-May through early October (no charge outside that window). No additional fee once past the park boundary into the Glacier Peak Wilderness (Forest Service) portion of the route. Separately, the Stehekin Valley shuttle bus fare is roughly $10/adult each way, and the Lake Chelan ferry/floatplane fare is separate and not free."'
  )
WHERE id = 'wa_dark_peak_dark_glacier_route'
  AND access->>'fees' = 'No fee for wilderness travel or camping itself; the Stehekin Valley shuttle bus fare is roughly $10/adult each way, and the Lake Chelan ferry/floatplane fare is separate and not free';
