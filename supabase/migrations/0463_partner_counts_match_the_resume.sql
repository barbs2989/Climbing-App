-- 0463: the partner card's "N climbs" counts what the résumé it opens counts.
--
-- 0460's partner_counts counted every public climb_logs row. The résumé that the climbs chip opens
-- (ClimbMatch.jsx resumeLogs) leaves out a CONDITIONS-ONLY report -- a row with no stars, or with
-- tick_type 'Conditions' -- because a report is not a climb. So Avery Tester's card said 7 climbs and
-- her résumé said 5 (live check, 2026-11-18). This applies the same rule on the server.
--
-- Vouches are unchanged. Hidden résumé rows (climber_resumes.hidden_logs, 0375) still count here, as
-- they do in Sends by grade: hiding a row takes it off the Experience list, not out of the logbook.

begin;

create or replace function public.partner_counts(p_ids uuid[])
returns table(id uuid, climbs integer, vouches integer)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id,
         (select count(*)::integer from climb_logs l
           where l.user_id = p.id and l.trip_report_visibility = 'public'
             and l.stars is not null and l.tick_type is distinct from 'Conditions'),
         (select count(distinct vo.from_id)::integer from vouches vo
           where vo.to_id = p.id and vo.from_id <> p.id)
    from public.profiles p
   where p.id = any(p_ids[1:200]);
$$;
comment on function public.partner_counts(uuid[]) is
  'Public climbs (not conditions-only reports, as the résumé counts them) and distinct vouchers for each of these climbers (partner cards). Signed-in only (0460, 0463).';
revoke execute on function public.partner_counts(uuid[]) from public, anon;
grant execute on function public.partner_counts(uuid[]) to authenticated;

commit;
