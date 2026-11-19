-- 0475 — More genders a climber can state, and pronouns.
--
-- Owner, 2026-11-18: "check online for other genders, pronouns etc that we need to add in the app".
--
-- GENDER (0359) offered Woman, Man, Non-binary. The apps that ask (Hinge, Bumble) keep those three as
-- the main choices and add more specific identities beside them, so four join the list: genderqueer,
-- genderfluid, agender and Two-Spirit. Still ONE value, still optional, NULL still "prefer not to
-- say". There is deliberately no "transgender" value: it is not a gender of its own, and a trans
-- woman who picks Woman must be found by a search for women.
--
-- PRONOUNS are new: an optional list of up to four sets (the cap Hinge, Tinder and Instagram use),
-- because many people use more than one (she/they). Stored as slugs from a fixed list, never free
-- text, so nothing typed has to be screened. NULL = not stated. Shown on the profile beside gender;
-- nothing filters on it.
--
-- `profiles` is read through column grants since 0435, and a column added after that is readable by
-- nobody until granted. Pronouns get the same reach as gender: signed-in climbers, not signed-out
-- visitors. The owner reads their own through my_profile() (select *), and UPDATE is table-level.

alter table profiles drop constraint if exists profiles_gender_known;
alter table profiles add constraint profiles_gender_known check (
  gender is null or gender in ('woman', 'man', 'non_binary', 'genderqueer', 'genderfluid', 'agender', 'two_spirit')
);

alter table profiles add column if not exists pronouns text[];

alter table profiles drop constraint if exists profiles_pronouns_known;
alter table profiles add constraint profiles_pronouns_known check (
  pronouns is null or (
    cardinality(pronouns) between 1 and 4
    and pronouns <@ array['she_her', 'he_him', 'they_them', 'ze_hir', 'ze_zir', 'xe_xem', 'ey_em', 'fae_faer', 'any']::text[]
  )
);

grant select (pronouns) on public.profiles to authenticated;

comment on column profiles.gender is 'Optional, climber-stated: woman | man | non_binary | genderqueer | genderfluid | agender | two_spirit. NULL = prefer not to say / never asked. Readable by signed-in climbers.';
comment on column profiles.pronouns is 'Optional, climber-stated, up to four of: she_her | he_him | they_them | ze_hir | ze_zir | xe_xem | ey_em | fae_faer | any. NULL = not stated. Readable by signed-in climbers.';
