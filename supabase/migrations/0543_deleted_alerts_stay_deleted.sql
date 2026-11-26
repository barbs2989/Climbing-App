-- 0543: a DELETED alert stays deleted (the owner's alerts audit, resumed 2026-11-25).
--
-- Swiping an alert LEFT deletes it: gone from the list and from Archived. A notice row (user_notices) is
-- deleted in the database, but most alerts are DERIVED from other reads (kudos, accepted requests,
-- vouches, crew joins, condition reports, Back in season, anniversaries...), and their deletion lived
-- only in React state, so every reload brought a deleted alert back, read. notification_state (0346)
-- already keeps the account's seen and archived ids; deleted_ids joins them, with the same bound.
begin;

alter table public.notification_state add column if not exists deleted_ids text[] not null default '{}'::text[];
alter table public.notification_state drop constraint if exists notification_state_deleted_ids_check;
alter table public.notification_state add constraint notification_state_deleted_ids_check
  check (cardinality(deleted_ids) <= 300 and pg_column_size(deleted_ids) < 40000);

commit;
