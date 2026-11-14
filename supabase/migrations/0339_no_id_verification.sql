-- ClimbMatch does not verify identity documents, and now the database cannot hold a record of one.
--
-- 0038 created verification_records with four kinds: email, id, member_club, guide_certified.
-- Nothing ever offered an ID check -- no screen, no upload, no storage bucket -- and the privacy
-- policy says "We do not collect or store identity documents". But the kind was still allowed, and
-- lib/db.js shipped an unused addVerification(userId, type) that a client could call with 'id'.
-- The owner asked (2026-10-21) for ID verification to go for data-safety reasons: a government ID
-- is the most damaging thing a climbing app could leak, and no partner decision here needs one.
-- The ✓ Verified badge is the emailed code (0306); guide credentials live in their own tables.
--
-- Measured before this ran: 2 rows in the table, both 'email'. No 'id' row exists to migrate.
begin;

alter table public.verification_records
  drop constraint if exists verification_records_verification_type_check;
alter table public.verification_records
  add constraint verification_records_verification_type_check
  check (verification_type in ('email', 'member_club', 'guide_certified'));

comment on column public.verification_records.verification_type is
  'email (the emailed-code ✓, 0306), member_club or guide_certified. No identity-document kind: ClimbMatch does not collect ID (0339).';

commit;
