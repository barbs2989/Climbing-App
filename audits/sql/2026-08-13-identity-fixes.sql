-- Two IDENTITY/CLASSIFICATION corrections. Deliberately not done by script: `name` and
-- `discipline` feed search, dedup, route_duplicate_names and the discipline filter chips, so they
-- go through SQL a human runs. The prose halves of both defects are already repaired.
--
-- 1. Little Annapurna's scramble is named for the wrong side of the peak.
--    Its own `aspect` (N/NW) and `face` ("the peak's north/west-facing slopes, ascending near the
--    northeast ridge") are CORRECT. Its own waypoint for the "base of south slopes" sits NORTH of
--    the summit. The peer row wa_little_annapurna_south_face is the peak's genuine south side — a
--    5.6 technical face reached from Ingalls Creek, a different valley. And it is published as
--    "Little Annapurna North Slope".
--
--    The prose was corrected in place on 2026-08-13, including five fields that told a party to
--    keep back from the NORTH edge of the summit plateau when the abrupt drop is on the SOUTH.
--    Only the name is left. Renaming also removes the collision with the real South Face row.
--
--    NOTE the id keeps "south_slopes". Ids here are name-derived but not authoritative, and
--    rewriting one is how routes get lost — leave it.
UPDATE routes SET name = 'North Slopes'
WHERE id = 'wa_little_annapurna_south_slopes' AND name = 'South Slopes';

-- 2. Index Upper Town Wall's Lovin' Arms is filed as an aid route while being a free climb.
--    It is graded 5.10b/c and is the standard FREE continuation of Davis-Holland, which sits in
--    the same area correctly filed as `trad` at 5.10c. `discipline` drives the filter chips and
--    the per-discipline safety advice, so an aid label hides it from the people who climb it.
UPDATE routes SET discipline = 'trad'
WHERE id = 'wa_lovin_arms' AND discipline = 'aid';

-- Both guarded on the current value, so re-running is a no-op rather than a surprise, and neither
-- fires if another session got there first.
--
-- Afterwards, nothing to re-check: no area moves, so route_count is untouched.
