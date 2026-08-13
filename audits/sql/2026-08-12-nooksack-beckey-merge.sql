-- Merge the duplicate Beckey-Schmidtke and delete the copy filed on the wrong peak.
-- Full reasoning: research-data/NOOKSACK-BECKEY-DUPLICATE-2026-08-12.md
--
-- The 1946 Beckey-Schmidtke is on NOOKSACK TOWER's north face (AAC first-ascent report). The
-- database holds it twice; wa_mount_shuksan_beckey_schmidtke is a Mountain Project ingest filed
-- one breadcrumb level too high. Mount Shuksan has no route by that name in any source checked.
--
-- Values are COPIED BY SUBQUERY, never retyped, so this cannot introduce a transcription error.
-- Run the whole file as ONE transaction: the UPDATE must read the Shuksan row before the DELETE.

BEGIN;

-- Carry across only what the Shuksan row holds and the Nooksack row does not: the full descent
-- (ten 60 m rappels, lower couloir often downclimbed, ~21 hr day, no car shuttle) against one
-- sentence; max_angle 70 against a 50 that understates the couloir-to-rock step; MP's AI1-2
-- against an unsourced AI2; and the provenance the Nooksack row lacks entirely.
UPDATE routes SET
  descent_text = (SELECT descent_text FROM routes WHERE id = 'wa_mount_shuksan_beckey_schmidtke'),
  max_angle    = (SELECT max_angle    FROM routes WHERE id = 'wa_mount_shuksan_beckey_schmidtke'),
  ice_grade    = (SELECT ice_grade    FROM routes WHERE id = 'wa_mount_shuksan_beckey_schmidtke'),
  stars        = coalesce(stars,  (SELECT stars  FROM routes WHERE id = 'wa_mount_shuksan_beckey_schmidtke')),
  source       = coalesce(source, (SELECT source FROM routes WHERE id = 'wa_mount_shuksan_beckey_schmidtke'))
WHERE id = 'wa_nooksack_tower_beckey_route';

-- Guarded so it is a no-op if the surviving twin is gone at run time. A duplicate pair was
-- "resolved" here once by deleting a half whose twin was not in the live DB, and Triple Couloirs
-- was destroyed.
DELETE FROM routes
WHERE id = 'wa_mount_shuksan_beckey_schmidtke'
  AND EXISTS (SELECT 1 FROM routes WHERE id = 'wa_nooksack_tower_beckey_route');

COMMIT;

-- Afterwards: npm run check:counts  (Shuksan 11 -> 10; Nooksack Tower stays 2)
