-- WA alpine audit, batch 577 (pass 9)

-- routes.wa_garfield_mountain_leaning_spire_west_route: stored high_point_ft is
-- 5169. SummitPost's Leaning Spire entry (citing Beckey's Cascade Alpine Guide)
-- gives "5040+F, 120P" -- i.e. 5,040 ft with 120 ft of prominence -- a specific,
-- sourced figure with no counter-source found anywhere for 5169. The Garfield
-- massif's own main-peak elevation (5519 ft, matching routes.wa_garfield_mountain_
-- south_route already on file) corroborates that SummitPost's page is tracking
-- these sub-summits correctly, not confusing Leaning Spire with the main peak.
UPDATE routes SET high_point_ft = 5040
WHERE id = 'wa_garfield_mountain_leaning_spire_west_route' AND high_point_ft = 5169;

-- routes.wa_garfield_mountain_north_route: stored fa credits "Richard Berge and
-- Pete Schoening in 1950 or 1951". A 1961 AAC/Mountaineer article by Beckey and
-- Cooper ("The North Face of Mount Baring") documents these exact two climbers'
-- only joint climbing of that era: two 1951 attempts on Mount Baring's north
-- face -- a different mountain entirely, about 15 mi from Garfield. Richard
-- Berge died on that same Baring face in 1952. No source ties either climber to
-- a Garfield ascent. This looks like a research-pass mix-up between the two
-- peaks' histories rather than a real Garfield first ascent; nulling rather than
-- guessing a replacement FA, since no source gives one for Garfield's own North
-- Route.
UPDATE routes SET fa = NULL
WHERE id = 'wa_garfield_mountain_north_route'
  AND fa = 'Richard Berge and Pete Schoening in 1950 or 1951';

-- verify
--   expect: Leaning Spire West Route at 5040; North Route's fa column empty
select id, high_point_ft from routes where id = 'wa_garfield_mountain_leaning_spire_west_route';
select id, fa from routes where id = 'wa_garfield_mountain_north_route';
