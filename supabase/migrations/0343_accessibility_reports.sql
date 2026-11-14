-- An accessibility problem a climber reports reaches somebody.
--
-- The Accessibility statement (lib/LegalView.jsx) said "tell us with the Feedback button ... We read
-- every report", and the Feedback sheet copies its text to the clipboard and says "nothing was sent"
-- (the owner asked for no email address until a real inbox exists). So the one channel the statement
-- offered went nowhere -- the lawyer packet's F17. W3C's model statement, and every accessibility-
-- statement guide, make a WORKING feedback route the core of the statement; this is that route.
--
-- Shaped like data_requests (0145): you file as yourself and read your own; nobody edits or
-- withdraws a filed report; the owner reads and triages them in the Supabase dashboard
-- (service key, or is_admin). Signed-in only: this project's anon role cannot write (see 0078).

begin;

create table if not exists accessibility_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  screen     text check (screen is null or char_length(screen) <= 200),
  problem    text not null check (char_length(btrim(problem)) between 1 and 4000),
  assistive  text check (assistive is null or char_length(assistive) <= 200),
  status     text not null default 'open' check (status in ('open','in_progress','done')),
  created_at timestamptz not null default now()
);

comment on table accessibility_reports is
  'Accessibility problems filed from Settings -> Legal -> Accessibility. The owner reads these in the '
  'Supabase dashboard and replies to the account email; there is no mailbox. on delete cascade, as '
  'data_requests: a deleted account takes its reports with it.';

create index if not exists accessibility_reports_open_idx on accessibility_reports (created_at desc) where status = 'open';

alter table accessibility_reports enable row level security;

-- status = 'open' in the with-check: an insert must not arrive already marked done (0085's sweep).
drop policy if exists "file own accessibility report" on accessibility_reports;
create policy "file own accessibility report" on accessibility_reports for insert
  with check (user_id = auth.uid() and status = 'open');

drop policy if exists "read own accessibility reports" on accessibility_reports;
create policy "read own accessibility reports" on accessibility_reports for select
  using (user_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists "admin manages accessibility reports" on accessibility_reports;
create policy "admin manages accessibility reports" on accessibility_reports for update
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

commit;

-- Verify after applying, as separate statements:
--   select polname, cmd from pg_policies where tablename = 'accessibility_reports';  -- expect 3
