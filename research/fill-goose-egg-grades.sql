-- Goose Egg Mountain: fill display grades that are NULL.
-- These rows already carry grade_num, so the ordering/filtering works, but `grade`
-- is null and the app therefore shows no grade at all. The first-ascensionist's own
-- published ascent log supplies each one, and every FA on that list already matches
-- this area's rows by name and pitch count.
--
-- Blanks only: guarded on `grade is null`, so nothing existing is overwritten.

-- Bowl Packer (grade_num 11 already present)
update routes set grade='5.11c' where id='wa_bowl_packer' and area_id='wa_goose_egg_mountain' and grade is null;

-- Ignorant Bliss (grade_num 10 already present)
update routes set grade='5.10c' where id='wa_ignorant_bliss' and area_id='wa_goose_egg_mountain' and grade is null;

-- Southeast Arête (grade_num 10 already present)
update routes set grade='5.10d' where id='wa_southeast_arete' and area_id='wa_goose_egg_mountain' and grade is null;

-- Spoil Ill (grade_num 10 already present)
update routes set grade='5.10c' where id='wa_spoil_ill' and area_id='wa_goose_egg_mountain' and grade is null;

-- The Commandho Pillar (grade_num 11 already present)
update routes set grade='5.11b' where id='wa_commandho_pillar' and area_id='wa_goose_egg_mountain' and grade is null;

select id, name, grade, grade_num, pitches from routes
 where area_id='wa_goose_egg_mountain' order by name;
