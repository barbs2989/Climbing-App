-- wa_liberty_crack: high_point_ft stored as 7746, but Liberty Bell Mountain's summit is
-- 7,720 ft per Mountain Project, Wikipedia (7,720+ ft, NGVD 29) and SummitPost alike, and
-- this audit (batch 506, 2026-11-05) already confirmed 7,720 ft as correct for the Beckey
-- Route on this same peak. Liberty Crack (Free) and Thin Red Line, both also on Liberty
-- Bell's East Face, already store 7720 in this table -- 7746 on the aid line alone was the
-- outlier.
UPDATE routes
SET high_point_ft = 7720
WHERE id = 'wa_liberty_crack';
