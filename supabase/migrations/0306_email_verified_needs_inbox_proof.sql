-- 0306: ✓ Verified means the climber proved they can read their inbox.
--
-- Until now verify_my_email() (0085) accepted auth.users.email_confirmed_at. With mailer_autoconfirm
-- on, Supabase stamps that at sign-up without sending anything, so every account was "verified" the
-- moment it existed and the ✓ other climbers see proved nothing.
--
-- Now the function asks the SESSION how it was signed in. Supabase records that in the access token's
-- `amr` claim ([{method, timestamp}]), signed by the server, so the client cannot forge it. A session
-- that came from the inbox within the last 30 minutes carries one of:
--   otp           the 6-digit code from the email, typed into the app
--   magiclink     the sign-in link in that same email
--   recovery      a password-reset link
--   email/signup  a sign-up confirmation link (only once autoconfirm is off)
-- A password or Google sign-in does not prove the inbox, and an old session does not either.
--
-- Every existing 'email' record was written under the old rule, so none of them proves anything. The
-- owner decided (2026-10-15) they go back to 'pending'; each climber re-earns the ✓ by entering a code.
-- compute_trust_score reads only status = 'verified', so those accounts lose the email points until then.

create or replace function public.verify_my_email() returns public.verification_records
language plpgsql security definer set search_path = public, pg_temp as $$
declare rec public.verification_records; proof timestamptz;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select to_timestamp(max((a->>'timestamp')::bigint)) into proof
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) a
   where a->>'method' in ('otp', 'magiclink', 'recovery', 'email/signup')
     and (a->>'timestamp') ~ '^[0-9]+$';
  if proof is null or proof < now() - interval '30 minutes' then
    raise exception 'email_not_proven' using hint = 'Sign in with the code or link from your email first.';
  end if;
  insert into public.verification_records (user_id, verification_type, status, verified_at)
       values (auth.uid(), 'email', 'verified', proof)
  on conflict (user_id, verification_type)
       do update set status = 'verified', verified_at = proof
    returning * into rec;
  return rec;
end; $$;

revoke execute on function public.verify_my_email() from public, anon;
grant execute on function public.verify_my_email() to authenticated;

update public.verification_records
   set status = 'pending', verified_at = null
 where verification_type = 'email' and status = 'verified';
