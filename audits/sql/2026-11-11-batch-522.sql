-- WA alpine audit batch 522 (pass 8)
-- Routes: wa_mount_lawson_standard, wa_mount_logan_fremont_glacier, wa_mount_logan_r1,
--         wa_mount_logan_r2, wa_mount_mathias_scramble, wa_mount_maude_r1, wa_mount_maude_r2,
--         wa_mount_mccausland_n_route, wa_mount_meany_standard, wa_mount_mystery_standard

-- =========================================================================
-- Mount Maude, North Face -- wa_mount_maude_r1
-- =========================================================================
-- Both access.closures and road.status cite the Little Giant Fire closure as
-- "order 06-17-07-2026-40, in effect September 3 through October 31, 2026 unless
-- lifted sooner." The live Okanogan-Wenatchee NF alert page shows that order was
-- superseded twice since: order -46 (signed 10/14/2026, through 10/31/2026), then
-- order -48 (effective 11/1/2026 through 4/30/2027) -- the closure was extended for
-- winter, not lifted. As of this audit (2026-11-11) the road/trail closure described
-- here is still active, under a different order number and through a later date than
-- stated. Corrected both fields to the current order and dates.
UPDATE routes
SET access = jsonb_set(
  access,
  '{closures}',
  to_jsonb(replace(
    access->>'closures',
    '06-17-07-2026-40, in effect September 3 through October 31, 2026 unless lifted sooner',
    '06-17-07-2026-48, in effect November 1, 2026 through April 30, 2027 unless rescinded sooner (superseding earlier orders -40 and -46)'
  ))
)
WHERE id = 'wa_mount_maude_r1'
  AND access->>'closures' LIKE '%06-17-07-2026-40, in effect September 3 through October 31, 2026 unless lifted sooner%';

UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  to_jsonb(replace(
    road->>'status',
    'The Little Giant Fire closure (order 06-17-07-2026-40) also closes the Chiwawa River Road and Phelps Creek Road through October 31, 2026 unless lifted sooner.',
    'The Little Giant Fire closure (order 06-17-07-2026-48, effective November 1, 2026, superseding earlier orders -40 and -46) also closes the Chiwawa River Road and Phelps Creek Road through April 30, 2027 unless rescinded sooner.'
  ))
)
WHERE id = 'wa_mount_maude_r1'
  AND road->>'status' LIKE '%Little Giant Fire closure (order 06-17-07-2026-40) also closes the Chiwawa River Road and Phelps Creek Road through October 31, 2026 unless lifted sooner.%';

-- =========================================================================
-- Mount Maude, Entiat Ice Fall -- wa_mount_maude_r2
-- =========================================================================
-- Same stale closure-order problem as the North Face row above, different wording.
UPDATE routes
SET access = jsonb_set(
  access,
  '{closures}',
  to_jsonb(replace(
    access->>'closures',
    'The Little Giant Fire closure (order 06-17-07-2026-40), in effect September 3 through October 31, 2026 unless lifted sooner, also closes FR 6200, Phelps Creek Road (FR 6211) and the Phelps Creek and Leroy Creek trails.',
    'The Little Giant Fire closure (order 06-17-07-2026-48, effective November 1, 2026 through April 30, 2027 unless rescinded sooner, superseding earlier orders -40 and -46) also closes FR 6200, Phelps Creek Road (FR 6211) and the Phelps Creek and Leroy Creek trails.'
  ))
)
WHERE id = 'wa_mount_maude_r2'
  AND access->>'closures' LIKE '%The Little Giant Fire closure (order 06-17-07-2026-40), in effect September 3 through October 31, 2026 unless lifted sooner, also closes FR 6200, Phelps Creek Road (FR 6211) and the Phelps Creek and Leroy Creek trails.%';

UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  to_jsonb(replace(
    road->>'status',
    'The Little Giant Fire closure (order 06-17-07-2026-40) also closes the Chiwawa River Road and Phelps Creek Road through October 31, 2026 unless lifted sooner.',
    'The Little Giant Fire closure (order 06-17-07-2026-48, effective November 1, 2026, superseding earlier orders -40 and -46) also closes the Chiwawa River Road and Phelps Creek Road through April 30, 2027 unless rescinded sooner.'
  ))
)
WHERE id = 'wa_mount_maude_r2'
  AND road->>'status' LIKE '%Little Giant Fire closure (order 06-17-07-2026-40) also closes the Chiwawa River Road and Phelps Creek Road through October 31, 2026 unless lifted sooner.%';

-- =========================================================================
-- NOT fixed here (flagged for human review -- see audit log for detail):
-- =========================================================================
-- wa_mount_logan_fremont_glacier: `fa` ("Lage Wernstedt, 1926") matches Wikipedia, but
-- a specialist WA-100-highest first-ascent chronology (citing Harry Majors 1973,
-- confirmed by Roger Jung 2005) places Wernstedt's Logan climb in 1925, calling 1926
-- only a surmise from Beckey's Cascade Alpine Guide vol. 3, and the same chronology
-- notes Wernstedt's partner on this climb is itself uncertain ("and one other?"). Two
-- plausible years from two different reputable lineages, no way to pick one with
-- confidence -- flagging rather than guessing.
