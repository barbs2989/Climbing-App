-- wa_lake_mountain_pasayten_scramble: overview and approach prose both say "8,377 ft" /
-- "8,377'", but the row's own high_point_ft stores 8371, and the only authoritative
-- elevation found (SummitPost: 8,371 ft / 2,551 m) matches high_point_ft, not the prose.
-- Fix the prose to match the verified figure; high_point_ft is left unchanged.
UPDATE routes
SET overview = replace(overview, '8,377 ft', '8,371 ft'),
    approach = replace(approach, '8,377''', '8,371''')
WHERE id = 'wa_lake_mountain_pasayten_scramble';
