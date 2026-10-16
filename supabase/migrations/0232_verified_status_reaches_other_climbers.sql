-- 0232: whether a climber is verified reaches OTHER climbers.
--
-- verification_records is owner-read only (0038: `using (auth.uid() = user_id)`), and profiles has
-- no verified column. So the only person who could ever see a climber's ✓ was the climber: to
-- everyone else a real account always read as unverified — the résumé's amber "Unverified" chip,
-- no ✓ on the profile avatar, no verified term in the match %, and partner search's "✓ Verified"
-- filter could match the example profiles only.
--
-- This exposes ONE bit per climber — "holds a current verified email record" — and nothing else
-- from the table (no type list, no dates, no pending/expired rows). It is a definer so the
-- owner-only policy stays exactly as it is for every other read. Signed-in only: partner browse is
-- signed-in only (#759), and a signed-out visitor has no surface that names a real climber.
--
-- The caller passes the ids it is about to render (one call per list, not per row) and gets back
-- the subset that is verified; an id absent from the answer is NOT verified, which is why the
-- client must treat a failed call as "unknown", never as "unverified".

create or replace function public.verified_user_ids(p_ids uuid[])
returns setof uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select distinct v.user_id
    from public.verification_records v
   where v.user_id = any(p_ids)
     and v.verification_type = 'email'
     and v.status = 'verified'
     and (v.expires_at is null or v.expires_at > now())
   limit 500;
$$;

comment on function public.verified_user_ids(uuid[]) is
  'Which of these climbers hold a current verified email record. One bit per id, signed-in only (0232).';

revoke execute on function public.verified_user_ids(uuid[]) from public, anon;
grant execute on function public.verified_user_ids(uuid[]) to authenticated;
