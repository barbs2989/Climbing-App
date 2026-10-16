-- An account can actually be deleted, from inside the app (Apple 5.1.1(v); Google Play account-deletion
-- policy). Phase 4 of docs/SAFETY-AND-MODERATION-PLAN.md.
--
-- Before this, Settings → "Delete my account & data" wrote a `data_requests` row that nothing
-- processed, and a hand delete would have FAILED: nine foreign keys onto profiles were ON DELETE
-- NO ACTION (measured live 2026-10-08), so any account that had ever created a crew or a topo,
-- invited someone, reported a photo or reviewed anything could not be removed at all.
--
-- What deleting an account now does (the delete-account edge function, signed in as that climber):
--   * their storage files go first (photos they uploaded), because a row delete leaves files public;
--   * their contributions (photos, corrections, proposals) go: `contributor` is text, not a foreign
--     key, so nothing would cascade to them;
--   * then the auth user is deleted, and everything keyed to it cascades: profile, logs, messages,
--     comments, crews they organised, topos, connections, blocks, standing, appeals.
-- What is KEPT, without them in it: reports other people filed about them (reported_id is text, so a
-- moderator's record survives), and the reviewer columns on things other people submitted.

alter table topos          drop constraint if exists topos_created_by_fkey;
alter table topos          add  constraint topos_created_by_fkey          foreign key (created_by) references profiles(id) on delete cascade;
alter table topo_lines     drop constraint if exists topo_lines_created_by_fkey;
alter table topo_lines     add  constraint topo_lines_created_by_fkey     foreign key (created_by) references profiles(id) on delete cascade;
alter table crews          drop constraint if exists crews_created_by_fkey;
alter table crews          add  constraint crews_created_by_fkey          foreign key (created_by) references profiles(id) on delete cascade;
alter table crew_members   drop constraint if exists crew_members_invited_by_fkey;
alter table crew_members   add  constraint crew_members_invited_by_fkey   foreign key (invited_by) references profiles(id) on delete set null;
alter table content_reports drop constraint if exists content_reports_reporter_fkey;
alter table content_reports add  constraint content_reports_reporter_fkey foreign key (reporter) references profiles(id) on delete set null;
alter table content_reports drop constraint if exists content_reports_reviewed_by_fkey;
alter table content_reports add  constraint content_reports_reviewed_by_fkey foreign key (reviewed_by) references profiles(id) on delete set null;
alter table user_reports   drop constraint if exists user_reports_reviewed_by_fkey;
alter table user_reports   add  constraint user_reports_reviewed_by_fkey  foreign key (reviewed_by) references profiles(id) on delete set null;
alter table contributions  drop constraint if exists contributions_reviewed_by_fkey;
alter table contributions  add  constraint contributions_reviewed_by_fkey foreign key (reviewed_by) references profiles(id) on delete set null;
alter table guide_credentials drop constraint if exists guide_credentials_reviewed_by_fkey;
alter table guide_credentials add  constraint guide_credentials_reviewed_by_fkey foreign key (reviewed_by) references profiles(id) on delete set null;

-- Confirm (expect zero rows):
--   select conrelid::regclass, conname from pg_constraint
--    where contype = 'f' and confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
--      and confdeltype in ('a', 'r');
