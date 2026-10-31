-- Batch 172, pass 3, 2026-09-02
-- wa_the_west_face (North Early Winters Spire, West Face III 5.11-): the first-ascent
-- partner's surname is misspelled "Beckstad" in both the `fa` and `overview` columns.
-- Confirmed via two independent sources: theCrag.com names the route "West Face
-- (Beckey-Beckstead)"; general climbing-history sources corroborate "Dave Beckstead"
-- as Fred Beckey's partner on the first ascent, June 17, 1965. Only a spelling fix --
-- the date (1965), grade, and FFA credit (Steve Risse and Dave Tower, 1985) are
-- unchanged and were not independently verifiable this run (route-beta sources such
-- as Mountain Project, SummitPost, and AAC Journal were blocked by network egress).
UPDATE routes
SET fa = 'Fred Beckey and Dave Beckstead, 1965 (FFA: Steve Risse and Dave Tower, 1985)'
WHERE id = 'wa_the_west_face'
  AND fa = 'Fred Beckey and Dave Beckstad, 1965 (FFA: Steve Risse and Dave Tower, 1985)';

UPDATE routes
SET overview = 'The West Face (III 5.11-) is a 6-pitch, roughly 500 ft (152 m) route first climbed (with aid) by Fred Beckey and Dave Beckstead in 1965, with Steve Risse and Dave Tower making the first free ascent in 1985.'
WHERE id = 'wa_the_west_face'
  AND overview = 'The West Face (III 5.11-) is a 6-pitch, roughly 500 ft (152 m) route first climbed (with aid) by Fred Beckey and Dave Beckstad in 1965, with Steve Risse and Dave Tower making the first free ascent in 1985.';
