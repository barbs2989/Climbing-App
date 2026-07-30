-- Invite-by-email: hold a crew spot for someone who has no account yet, and
-- convert it into a real crew_members invite the moment they sign up with
-- that email. crew_members.user_id references profiles(id), so a non-user
-- cannot appear there — this table is the holding pen.
--
-- Trigger ordering note: crew_members.user_id -> profiles(id), and profiles
-- rows are created by handle_new_user() in trigger "on_auth_user_created"
-- (AFTER INSERT ON auth.users). Postgres fires same-event triggers in name
-- order, and "on_auth_user_created" < "on_auth_user_created_claim_invites",
-- so the profile exists before the claim runs. Both are security definer
-- with an explicit search_path — the unqualified-name/search_path bug in the
-- original handle_new_user broke ALL signups for a day; don't repeat it.

create table if not exists crew_email_invites (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  unique (crew_id, email)
);
create index if not exists crew_email_invites_email_idx on crew_email_invites (lower(email));

alter table crew_email_invites enable row level security;

-- Crew members see their crew's outstanding email invites; the invited person
-- (matched by their signed-in email) can see invites addressed to them.
create policy "crew or invitee can read email invites" on crew_email_invites for select using (
  invited_by = auth.uid()
  or exists (select 1 from crew_members m where m.crew_id = crew_email_invites.crew_id and m.user_id = auth.uid())
  or lower(email) = lower(coalesce(auth.jwt()->>'email',''))
);

-- Same trust boundary as crew_members' "join or invite": the organizer invites.
create policy "organizer can invite by email" on crew_email_invites for insert with check (
  auth.uid() = (select created_by from crews where id = crew_id)
);

create policy "inviter or organizer can withdraw" on crew_email_invites for delete using (
  invited_by = auth.uid()
  or auth.uid() = (select created_by from crews where id = crew_id)
);

-- On signup, convert matching email invites into real crew_members rows so the
-- invite is waiting in the new user's Requests on first open.
create or replace function public.claim_crew_email_invites() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.crew_members (crew_id, user_id, status, note)
  select i.crew_id, new.id, 'invited', coalesce(i.note, '')
  from public.crew_email_invites i
  where lower(i.email) = lower(new.email) and i.claimed_by is null
  on conflict (crew_id, user_id) do nothing;

  update public.crew_email_invites
  set claimed_by = new.id, claimed_at = now()
  where lower(email) = lower(new.email) and claimed_by is null;

  return new;
end; $$;

drop trigger if exists on_auth_user_created_claim_invites on auth.users;
create trigger on_auth_user_created_claim_invites after insert on auth.users
  for each row execute function public.claim_crew_email_invites();
