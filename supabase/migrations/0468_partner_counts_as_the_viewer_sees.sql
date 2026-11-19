-- 0468: the partner card's "N climbs" is what the VIEWER's résumé shows -- run as the caller.
--
-- 0460/0463 ran partner_counts as SECURITY DEFINER and counted public logs only. The résumé the climbs
-- chip opens reads climb_logs as the viewer, through 0037's policies: public logs, plus crew-visible
-- logs from crews the viewer is confirmed on. So Blake (on a crew with Avery) saw "5 climbs" on her
-- card and 6 on her résumé (polish walk, 2026-11-18).
--
-- SECURITY INVOKER lets those same policies decide: the count is exactly the rows this caller can read,
-- minus conditions-only reports (0463). vouches is select-using-true and profiles' id is readable by
-- authenticated, so nothing else changes. It also stops reading past RLS, so check:rls no longer needs
-- the PUBLIC_DEFINER exemption.

begin;

create or replace function public.partner_counts(p_ids uuid[])
returns table(id uuid, climbs integer, vouches integer)
language sql stable security invoker
set search_path = public, pg_temp
as $$
  select p.id,
         (select count(*)::integer from climb_logs l
           where l.user_id = p.id
             and l.stars is not null and l.tick_type is distinct from 'Conditions'),
         (select count(distinct vo.from_id)::integer from vouches vo
           where vo.to_id = p.id and vo.from_id <> p.id)
    from public.profiles p
   where p.id = any(p_ids[1:200]);
$$;
comment on function public.partner_counts(uuid[]) is
  'Climbs the CALLER can read (RLS decides; not conditions-only reports) and distinct vouchers, for each of these climbers (partner cards). Signed-in only (0460, 0463, 0468).';
revoke execute on function public.partner_counts(uuid[]) from public, anon;
grant execute on function public.partner_counts(uuid[]) to authenticated;

commit;
