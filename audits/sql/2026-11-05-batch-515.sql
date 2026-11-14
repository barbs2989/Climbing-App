-- wa_mount_baker_easton_glacier: alpine_grade stored as "Grade II", which is not a valid value on
-- this column's French adjectival scale (F/PD/AD/D/TD/ED, per supabase/migrations/0006_composite_grades.sql)
-- -- it is a duplicate of this same row's own commitment grade ("II"), mistakenly copied into the
-- wrong column (the same bug pattern this audit fixed on wa_dragontail_peak_triple_couloirs in batch
-- 9). This route's own overview text says it "rivals the Coleman-Deming in popularity" as one of
-- Baker's two easiest standard routes; wa_mount_baker_coleman_deming is Baker's established
-- comparable Class 2 / commitment-II glacier route and correctly carries alpine_grade = 'PD'.
UPDATE routes
SET alpine_grade = 'PD'
WHERE id = 'wa_mount_baker_easton_glacier';

-- wa_mount_baker_squak_glacier: same bug as above -- alpine_grade stored as "Grade III", a duplicate
-- of this row's own commitment grade ("III") rather than a French adjectival value. Squak Glacier's
-- own overview describes it as a technically-equivalent Class 2 alternative to the Easton Glacier
-- (joining the Easton route near the summit, no added technical hazards), so it is set to the same
-- 'PD' value as Easton and Coleman-Deming rather than a harder grade.
UPDATE routes
SET alpine_grade = 'PD'
WHERE id = 'wa_mount_baker_squak_glacier';
