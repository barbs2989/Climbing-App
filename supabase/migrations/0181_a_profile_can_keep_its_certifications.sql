-- A climber could type their certifications and skills and never keep them.
--
-- The profile editor has collected both since the profile screen existed: it offers
-- "No certifications added yet" and "No skills added yet", openEdit seeds the draft from live
-- state, the Profile renders them under CERTIFICATIONS & SKILLS, and trustFactors pays 3 points
-- per certification up to 10. Everything except storage.
--
-- `saveEdit`'s DB payload carried bio, location, disciplines, three grades, avatar and show_name
-- and NEITHER of these, because there was nowhere to put them -- `profiles` had no column for
-- either, under any spelling. So a real signed-in climber added a belay cert, watched it render,
-- watched their trust score rise, and lost the lot on the next load. Silently: the save itself
-- succeeds, since every other field in the payload is real.
--
-- The sign-in reset clears both to [], so a real account cannot inherit the seed values and the
-- loss is reachable rather than theoretical.
--
-- WHY text[] AND NOT jsonb. Both are flat lists of short strings the app renders as chips --
-- `ME.certifications.map(c => <span>{c}</span>)`. `disciplines` is already text[] on this table
-- and is the closest existing neighbour, so this follows it rather than introducing a second
-- convention for the same shape.
--
-- NULLABLE, NO DEFAULT, deliberately. A default of '{}' would rewrite every existing row to say
-- "this climber has no certifications", which is a claim; NULL says nobody has been asked yet.
-- The app already reads both through `|| []`, so an absent value renders as empty either way --
-- checked rather than assumed.
--
-- NO RLS CHANGE. `profiles` policies are row-level and column-agnostic: the public read policy
-- (0009, refined by 0095) and the owner-update policy already cover whatever columns the row
-- carries. Adding a column grants no new access, and a certification a climber typed onto their
-- own public profile is exactly as public as the bio beside it.
--
-- THIS IS NOT THE GUIDE CREDENTIAL SYSTEM, and the two must not be conflated. `guide_documents`
-- plus `verification_records` hold uploaded, reviewed, expiring professional credentials, and
-- `compute_trust_score` (0038) pays for those only when status = 'verified'. These two columns
-- are SELF-REPORTED profile content, like the bio -- they carry no verification and must never be
-- rendered with a verified mark.

alter table public.profiles
  add column if not exists certifications text[],
  add column if not exists skills text[];

comment on column public.profiles.certifications is
  'Self-reported certifications shown on the profile (e.g. "Belay certified"). NOT verified -- the reviewed, expiring guide credentials live in guide_documents/verification_records and are what compute_trust_score pays for.';

comment on column public.profiles.skills is
  'Self-reported skills shown on the profile (e.g. "Sport lead"). Self-reported, like the bio.';
