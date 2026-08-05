-- W17: an invite-by-email addressed to someone who ALREADY has an account was
-- unclaimable, forever.
--
-- 0070's claim runs from `on_auth_user_created_claim_invites`, an AFTER INSERT
-- trigger on auth.users, so it only ever fires at SIGNUP. Invite an email that
-- already belongs to a registered user and the row just sits in
-- crew_email_invites: no crew_members row is created, and nothing in the app
-- reads crew_email_invites on the invitee's behalf, so the invite is invisible
-- to them and the organizer sees a pending invite that can never be accepted.
--
-- This adds the missing half: a claim the signed-in user can run for themselves.
-- The app calls it once per sign-in.
--
-- Trust boundary: the email is read from auth.users for the CALLING uid, never
-- taken from an argument, so a caller can only ever claim invites addressed to
-- their own account's email. The function is security definer purely to reach
-- auth.users and to insert the crew_members row (whose "join or invite" policy
-- would otherwise reject an invitee inserting themselves); it takes no
-- parameters, so there is nothing to inject.
--
-- Idempotent: `claimed_by is null` plus `on conflict do nothing` mean running it
-- on every sign-in is a no-op once there is nothing left to claim.

create or replace function public.claim_my_crew_email_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_n     integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  -- Authoritative: the account's own email, not the JWT claim (which can be
  -- absent depending on how the session was minted).
  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is null or v_email = '' then
    return 0;
  end if;

  insert into public.crew_members (crew_id, user_id, status, note)
  select i.crew_id, v_uid, 'invited', coalesce(i.note, '')
    from public.crew_email_invites i
   where lower(i.email) = v_email
     and i.claimed_by is null
  on conflict (crew_id, user_id) do nothing;

  update public.crew_email_invites
     set claimed_by = v_uid, claimed_at = now()
   where lower(email) = v_email
     and claimed_by is null;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.claim_my_crew_email_invites() from public;
grant execute on function public.claim_my_crew_email_invites() to authenticated;

-- Verify: should return 0 for an account with no outstanding email invites, and
-- must NOT error.
--   select public.claim_my_crew_email_invites();
