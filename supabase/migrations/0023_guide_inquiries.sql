-- Hire-a-Guide Phase 1 (4/5) — real, persisted inquiries. Today the UI collects an
-- objective/dates/party/message and discards them on submit; this is what actually
-- stores them, plus the climber-facing liability disclaimer acceptance and the
-- minor-in-party flag decided in the design session.

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references guide_profiles(id) on delete cascade,
  -- Never client-supplied, same fix 0009 applied to contributions.contributor.
  climber_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  objective text, requested_dates text, message text,
  party_size int not null default 1,
  includes_minor boolean not null default false,
  -- Stamped at insert time -- acceptance and submission are the same action, so this
  -- IS the timestamped disclaimer record the design session called for.
  climber_disclaimer_accepted_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','accepted','declined')),
  guide_responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index inquiries_guide_idx on inquiries(guide_id, created_at);
create index inquiries_climber_idx on inquiries(climber_id, created_at);

alter table inquiries enable row level security;
create policy "inquiries read own side or admin" on inquiries for select
  using (climber_id = auth.uid() or guide_id = auth.uid() or is_admin(auth.uid()));
create policy "inquiries climber insert" on inquiries for insert
  with check (climber_id = auth.uid());
-- Append-only from the climber's side: the guide may only move `status` /
-- `guide_responded_at`, never edit what the climber actually submitted.
create policy "inquiries guide update status" on inquiries for update
  using (guide_id = auth.uid())
  with check (guide_id = auth.uid());

create or replace function guard_inquiry_immutable_fields() returns trigger
language plpgsql as $$
begin
  if new.objective is distinct from old.objective
    or new.requested_dates is distinct from old.requested_dates
    or new.message is distinct from old.message
    or new.party_size is distinct from old.party_size
    or new.includes_minor is distinct from old.includes_minor
    or new.climber_id is distinct from old.climber_id
    or new.climber_disclaimer_accepted_at is distinct from old.climber_disclaimer_accepted_at
    or new.guide_id is distinct from old.guide_id
  then
    raise exception 'inquiries: only status/guide_responded_at may be updated';
  end if;
  return new;
end; $$;
create trigger inquiries_guard_immutable before update on inquiries
  for each row execute function guard_inquiry_immutable_fields();
-- No delete policy on purpose -- append-only, matching the contributions convention.
