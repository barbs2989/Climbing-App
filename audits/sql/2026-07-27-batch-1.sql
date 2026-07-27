-- WA alpine/mountaineering audit — batch 1 (pass 1)
-- Reviewed 2026-07-27. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary; full source citations were
-- produced by the auditing agents and are available on request).
-- These are PROPOSED fixes for a human to review and run — not yet applied.

-- Amphitheater Mountain (wa_amphitheater_mountain): prominence stored as 807 ft;
-- Wikipedia (citing USGS-derived data) consistently gives 758 ft.
update areas set prominence_ft = 758 where id = 'wa_amphitheater_mountain';

-- Agnes Mountain (wa_agnes_mountain): prominence stored as 1394 ft; Peakbagger.com and
-- Wikipedia independently agree on 1355 ft.
update areas set prominence_ft = 1355 where id = 'wa_agnes_mountain';

-- Burgundy Spire / Action Potential (wa_action_potential): route's own `face` column says
-- "North Face", but Action Potential is an East Face route (CascadeClimbers.com FA trip
-- report title, SuperTopo description) — the route's own `overview` text already says East
-- Face, so `face` contradicted the row's own prose. "North Face" is Burgundy's separate,
-- standard route, referenced only as this route's shared descent line.
update routes set face = 'East Face' where id = 'wa_action_potential';

-- Apex Mountain, Pasayten (wa_apex_mountain_pasayten): elevation stored as 8307 ft and
-- prominence as 1013 ft; Wikipedia/SummitPost/PeakVisor/Mountainzone all independently give
-- 8302 ft / 982 ft. Note the route row wa_apex_buttress already stores 8302 ft in its own
-- high_point_ft and waypoints fields, i.e. the area row was the outlier.
update areas set elevation_ft = 8302, prominence_ft = 982 where id = 'wa_apex_mountain_pasayten';

-- Liberty Bell / A Servant To Liberty (wa_a_servant_to_liberty): stored crowds/data_quality
-- text claims the route is "essentially unrepeated" with "no documented repeat ascents".
-- Per the route's own primary source (Climbing.com FA account, Schaefer/Lee, Aug 2016), the
-- route "has had only one repeat — by Alex Honnold." Correcting the repeat-ascent claim.
update routes set
  crowds = jsonb_set(
    jsonb_set(crowds, '{peakTraffic}', '"Extremely rare — one documented repeat ascent (Alex Honnold) since the Aug 2016 FA"'::jsonb),
    '{estimatePerSeason}', '"One documented repeat ascent (Alex Honnold, per the FA account); no other repeats documented"'::jsonb
  ),
  data_quality = jsonb_set(
    data_quality, '{gaps,0}',
    '"One documented repeat ascent has occurred (Alex Honnold, per the FA account); Mountain Project still shows only ~2 quality votes and minimal engagement, so crowds/partner-requirements above reflect general route character rather than dense route-specific trip-report data."'::jsonb
  )
where id = 'wa_a_servant_to_liberty';

-- Liberty Bell / A Servant To Liberty (wa_a_servant_to_liberty): access.passRequired,
-- access._raw.parking_pass_required, and partner_requirements.approachTime all reference the
-- Blue Lake Trailhead / Northwest Forest Pass, but that trailhead/pass serves the separate
-- Beckey (SW face) route. This route's own `approach`/`road` fields correctly describe a free
-- roadside pullout on SR-20 east of Washington Pass (the East Face climbers' trail), which
-- does not require a Northwest Forest Pass. A prior 2026-07-18 fix corrected the waypoint but
-- missed these fields.
update routes set
  access = jsonb_set(
    jsonb_set(access, '{passRequired}',
      '"No parking pass required — this route''s approach starts at a free roadside pullout on SR-20 east of Washington Pass (East Face climbers'' trail), not the Blue Lake Trailhead used by the separate Beckey (SW face) route"'::jsonb),
    '{_raw,parking_pass_required}',
    '"No pass required at the SR-20 hairpin pullout (East Face climbers'' trail) used by this route; this is not the Blue Lake Trailhead"'::jsonb
  ),
  partner_requirements = jsonb_set(
    partner_requirements, '{approachTime}',
    '"~1.5–2.5 hrs from the SR-20 hairpin pullout (East Face climbers'' trail) to the East Face base (shares approach and first 3 pitches with Freedom or Death)"'::jsonb
  )
where id = 'wa_a_servant_to_liberty';
