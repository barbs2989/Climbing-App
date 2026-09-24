-- 0186 — a custom list can carry a description.
--
-- A custom list had a name and nothing else, so "Summer projects" could not say which
-- summer, what the goal was, or who it was for. The create sheet now asks for an
-- optional description and the list card shows it.
--
-- NULLABLE with no default, deliberately: NULL means "the climber wrote none", which is
-- the honest state of every existing row. A default of '' would say nothing different
-- and would make "never asked" and "cleared it" the same value.
--
-- Capped at 500 characters in the database, not only in the app: user_lists rows are
-- written from the client under RLS, so a cap enforced only in the form is not a cap.
-- The existing insert/update policies (own rows only) cover the new column unchanged.

alter table public.user_lists
  add column if not exists description text;

alter table public.user_lists
  drop constraint if exists user_lists_description_len;
alter table public.user_lists
  add constraint user_lists_description_len
  check (description is null or char_length(description) <= 500);
