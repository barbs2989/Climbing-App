-- 0445: THE GUIDE FEATURE IS GONE, AND SO ARE ITS TABLES (owner, 2026-11-14: "remove all guide
-- tables and anything related to guiding" — after PR #3366 removed every screen, hook and write).
--
-- What this drops, all of it created by 0021-0024, 0082, 0085 and 0226 and read by nothing else
-- (probed on production before writing this: no foreign key from outside the set points in, no view
-- depends on it, and the only functions whose bodies name these tables are the ones dropped below):
--   tables     guide_profiles, guide_credentials, guide_documents, inquiries, reviews,
--              cert_track_disciplines (the guide cert-track -> discipline lookup)
--   functions  reconcile_guide_verification, withdraw_inquiry, sync_active_disciplines,
--              stamp_credential_verification, guard_guide_status, guard_inquiry_immutable_fields,
--              guard_review_reply_only, guard_review_content_immutable, touch_updated_at
--              (touch_updated_at's only trigger was guide_profiles_touch)
--   storage    the four guide_documents policies on storage.objects
-- Their triggers, indexes and table policies go with the tables.
--
-- The rows lost are the manual-test accounts' seed (one guide profile, one credential, two
-- inquiries, one review); no real climber ever had a listing.
--
-- KEPT, deliberately: profiles.is_admin, is_admin() and the self-admin guard (0020 created them for
-- guide review, but every admin queue uses them now), and profiles.certifications (0181) — the
-- climber's own self-reported résumé, which includes guiding certifications and stays (owner).
--
-- NOT HERE: the guide-documents storage BUCKET and its two probe files. Supabase refuses direct
-- SQL deletes on storage tables, so the bucket is emptied and deleted through the Storage API
-- after this applies (and after delete-account stopped listing it). A fresh replay still creates
-- the bucket in 0022; an empty private bucket with no policies is inert.

begin;

drop policy if exists "guide_documents storage read own or admin" on storage.objects;
drop policy if exists "guide_documents storage insert own" on storage.objects;
drop policy if exists "guide_documents storage admin write" on storage.objects;
drop policy if exists "guide_documents storage admin delete" on storage.objects;

-- Children first, so no CASCADE is needed and nothing unlisted can be swept away with it.
drop table if exists reviews;
drop table if exists inquiries;
drop table if exists guide_documents;
drop table if exists guide_credentials;
drop table if exists guide_profiles;
drop table if exists cert_track_disciplines;

drop function if exists reconcile_guide_verification(uuid);
drop function if exists withdraw_inquiry(uuid);
drop function if exists sync_active_disciplines();
drop function if exists stamp_credential_verification();
drop function if exists guard_guide_status();
drop function if exists guard_inquiry_immutable_fields();
drop function if exists guard_review_reply_only();
drop function if exists guard_review_content_immutable();
drop function if exists touch_updated_at();

commit;
