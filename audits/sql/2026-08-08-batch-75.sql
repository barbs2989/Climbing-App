-- === wa_martin_peak_west_ridge ===

-- fa credited a joint ascent, "Everett Darr and Ida Zacher, July 1936," but the
-- documented 1936 first ascent of Martin Peak was a SOLO climb by Ida Zacher
-- (who later married Everett Darr and is credited in later sources as Ida Zacher
-- Darr), made while the couple was scouting the Bonanza Peak area -- Everett did
-- not summit that day. Corroborated by the Mazama Bulletin retrospective "She
-- Climbs High!" (2025) on Ida Zacher Darr's climbing record, and matches this
-- DB's own wa_martin_peak area row, whose blurb already says "First climbed in
-- July 1936 by Ida Zacher Darr" with no mention of Everett -- the route row was
-- the one out of step with the DB's own area row, not the other way around.
-- Also drops a stale data_quality.gaps entry flagging the on-file route name as
-- "Southeast Slopes" not matching sourced "West Ridge" beta -- the name field
-- already reads "West Ridge" (a prior pass fixed the name but never cleared this
-- now-obsolete gap note), so the entry is removed and lastVerified bumped to
-- reflect this pass.
UPDATE routes
SET fa = 'Ida Zacher, July 1936 (solo ascent while scouting the Bonanza Peak area, not a joint climb with Everett Darr, whom she later married)',
    data_quality = '{"gaps": ["No primary Beckey Cascade Alpine Guide text consulted for the official route name/grade/history", "Exact round-trip mileage and elevation gain from Holden Pass to Martin''s summit specifically (vs. Bonanza''s) not found in a reliable source", "Current FSR 8301/Holden Village reopening timeline is still evolving (2026) and should be reconfirmed before any trip", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file, not a researched or crowd-sourced rating. Users can blend in their own read via the UI."], "confidence": "MEDIUM", "lastVerified": "2026-08-08"}'::jsonb
WHERE id = 'wa_martin_peak_west_ridge';
