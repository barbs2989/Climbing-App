-- 0295: partner search's EXPERIENCE and MIN TRUST filters reach real climbers.
--
-- Both filters read fields only the example profiles carry (c.level, vScore(c)), so on a real account
-- they narrowed the example list and left every real climber through. The level is a public profile
-- column (0237) that partners_near and partners_by_objective do not return, and the trust score is
-- compute_trust_score(uuid), one call per climber. This answers both for a whole list in ONE call, so
-- the client never makes one trust read per row.
--
-- Nothing new is exposed: profiles.level is already public-read, and compute_trust_score is already
-- executable by anon and authenticated (0203). Signed-in only all the same, like partner browse (#759).

create or replace function public.partner_signals(p_ids uuid[])
returns table(id uuid, level text, trust_score integer)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id, p.level, public.compute_trust_score(p.id)
    from public.profiles p
   where p.id = any(p_ids)
   limit 200;
$$;

comment on function public.partner_signals(uuid[]) is
  'Level and server trust score for each of these climbers, for partner-search filters. Signed-in only (0295).';

revoke execute on function public.partner_signals(uuid[]) from public, anon;
grant execute on function public.partner_signals(uuid[]) to authenticated;
