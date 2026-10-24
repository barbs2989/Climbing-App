-- 0359 — A climber can say their gender, or not.
--
-- First-run onboarding (lib/Onboarding.jsx) and the profile editor (lib/EditProfileScreen.jsx)
-- ask it as an OPTIONAL question: Woman, Man, Non-binary, or Prefer not to say. It renders on the
-- climber's own profile and on the profile other climbers open, beside the home area, and nowhere
-- else (no partner filter reads it yet).
--
-- Why these four: survey practice (SmartSurvey's demographic guidance) and the partner apps that
-- ask at all (RockBase, GoWith) offer non-binary beside woman and man, and an explicit way not to
-- answer. "Prefer not to say" is stored as NULL rather than as a value: a default would manufacture
-- a statement the climber never made, and NULL is what an account that skipped the question holds.
--
-- `profiles` is public-read, so this is PUBLIC the moment it is set -- which is what the question
-- says, and why it is optional with not-saying as the starting answer.

alter table profiles add column if not exists gender text;

alter table profiles drop constraint if exists profiles_gender_known;
alter table profiles add constraint profiles_gender_known check (gender is null or gender in ('woman', 'man', 'non_binary'));

comment on column profiles.gender is 'Optional, climber-stated: woman | man | non_binary. NULL = prefer not to say / never asked. Public, like the rest of profiles.';
