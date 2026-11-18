-- 0452: climbs and vouches for every partner card on screen, in ONE read.
--
-- Owner, 2026-11-18: "I want you to only have one partner card". Real climbers and the example
-- climbers now share one card, and the example card always showed "N climbs · N vouches". A real
-- profile row carries neither count, and counting rows in the browser would undercount a busy
-- climber at PostgREST's row cap, so the card would show a wrong number. This counts on the server.
--
--   climbs  = their climb_logs at trip_report_visibility = 'public' -- exactly what another climber
--             can read of their logbook (0037's policy), so the number matches the résumé it opens.
--   vouches = distinct climbers who vouched for them, not themselves -- the leaderboard's rule (0335).
--
-- Signed-in only, like partner_signals (0295/0335); at most 200 ids per call.

begin;

drop function if exists public.partner_counts(uuid[]);
create function public.partner_counts(p_ids uuid[])
returns table(id uuid, climbs integer, vouches integer)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id,
         (select count(*)::integer from climb_logs l
           where l.user_id = p.id and l.trip_report_visibility = 'public'),
         (select count(distinct vo.from_id)::integer from vouches vo
           where vo.to_id = p.id and vo.from_id <> p.id)
    from public.profiles p
   where p.id = any(p_ids[1:200]);
$$;
comment on function public.partner_counts(uuid[]) is
  'Public climb-log count and distinct-voucher count for each of these climbers (partner cards). Signed-in only (0452).';
revoke execute on function public.partner_counts(uuid[]) from public, anon;
grant execute on function public.partner_counts(uuid[]) to authenticated;

commit;
