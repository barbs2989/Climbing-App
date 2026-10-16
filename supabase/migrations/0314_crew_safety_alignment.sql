-- 0314: a real crew's safety check can be completed, and stays as private as it promises.
--
-- The crew Safety screen's "Team Alignment" asks each member a pre-climb questionnaire (risk tolerance,
-- fitness, gear, experience, communication) and shows the group whether it is aligned. It lived in
-- React state only: your answers vanished on reload and no other member's ever arrived, so a real crew
-- sat on "Waiting for All Members to Complete Questionnaire" forever. "Mark me safety-ready" was the same.
--
-- The questionnaire PROMISES: "Your answers are shared anonymously with the group … No one sees your
-- exact answers — only group-level flags." So the answers are stored where ONLY THEIR OWNER can read
-- them, and the group sees what crew_alignment() computes from them: counts, never rows.
--   * crew_safety_answers -- one row per (crew, member): risk tolerance, the answers, when they marked
--     themselves safety-ready. Owner-only, every verb; writes only while a CONFIRMED member of the crew.
--   * crew_alignment(crew) -- for a confirmed member: how many members, who has completed it and who is
--     ready (completion is not an answer), a count per risk level, and ANONYMOUS counts per flag.
--   * crew_ready_ids(crews[]) -- who is safety-ready, per crew, so the crew card's per-member mark works.
-- Members who block, or are blocked by, the caller are left out of both, as everywhere else (0298).
-- Known limit, inherent to group-level flags: in a crew of two, a count can be read back by elimination.

create table if not exists public.crew_safety_answers (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  risk_tolerance text check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
  answers jsonb not null default '{}'::jsonb,
  ready_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
alter table public.crew_safety_answers enable row level security;

drop policy if exists "own safety answers read" on public.crew_safety_answers;
create policy "own safety answers read" on public.crew_safety_answers for select
  using (user_id = auth.uid());
drop policy if exists "own safety answers insert" on public.crew_safety_answers;
create policy "own safety answers insert" on public.crew_safety_answers for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.crew_members m
     where m.crew_id = crew_safety_answers.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));
drop policy if exists "own safety answers update" on public.crew_safety_answers;
create policy "own safety answers update" on public.crew_safety_answers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.crew_members m
     where m.crew_id = crew_safety_answers.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));
drop policy if exists "own safety answers delete" on public.crew_safety_answers;
create policy "own safety answers delete" on public.crew_safety_answers for delete
  using (user_id = auth.uid());

-- A non-numeric answer counts as no flag rather than raising.
create or replace function public.crew_alignment(p_crew uuid)
returns table(member_count integer, done_ids uuid[], ready_ids uuid[],
              risk_conservative integer, risk_moderate integer, risk_aggressive integer,
              flag_fitness integer, flag_gear integer, flag_experience integer, flag_communication integer)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (
       select 1 from crew_members where crew_id = p_crew and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'not a confirmed member of this crew';
  end if;
  return query
  with m as (
    select cm.user_id from crew_members cm
     where cm.crew_id = p_crew and cm.status = 'confirmed'
       and not exists (select 1 from blocked_users b
                        where (b.blocker = cm.user_id and b.blocked = auth.uid())
                           or (b.blocker = auth.uid() and b.blocked = cm.user_id))),
  a as (
    select s.user_id, s.risk_tolerance, s.answers, s.ready_at
      from crew_safety_answers s join m on m.user_id = s.user_id
     where s.crew_id = p_crew),
  n as (
    select a.*,
           case when a.answers->>'physical' ~ '^[0-9]+$' then (a.answers->>'physical')::int end as q_physical,
           case when a.answers->>'gear' ~ '^[0-9]+$' then (a.answers->>'gear')::int end as q_gear,
           case when a.answers->>'experience' ~ '^[0-9]+$' then (a.answers->>'experience')::int end as q_experience,
           case when a.answers->>'communication' ~ '^[0-9]+$' then (a.answers->>'communication')::int end as q_communication
      from a)
  select (select count(*)::int from m),
         coalesce((select array_agg(n.user_id order by n.user_id) from n where n.risk_tolerance is not null), '{}'::uuid[]),
         coalesce((select array_agg(n.user_id order by n.user_id) from n where n.ready_at is not null), '{}'::uuid[]),
         (select count(*)::int from n where n.risk_tolerance = 'conservative'),
         (select count(*)::int from n where n.risk_tolerance = 'moderate'),
         (select count(*)::int from n where n.risk_tolerance = 'aggressive'),
         (select count(*)::int from n where n.q_physical >= 2),
         (select count(*)::int from n where n.q_gear >= 2),
         (select count(*)::int from n where n.q_experience >= 2),
         (select count(*)::int from n where n.q_communication >= 2);
end; $$;
revoke execute on function public.crew_alignment(uuid) from public, anon;
grant execute on function public.crew_alignment(uuid) to authenticated;

create or replace function public.crew_ready_ids(p_crews uuid[])
returns table(crew_id uuid, ready_ids uuid[])
language sql stable security definer set search_path = public, pg_temp as $$
  select c.crew_id,
         coalesce((select array_agg(s.user_id order by s.user_id)
                     from crew_safety_answers s
                     join crew_members cm on cm.crew_id = s.crew_id and cm.user_id = s.user_id and cm.status = 'confirmed'
                    where s.crew_id = c.crew_id and s.ready_at is not null
                      and not exists (select 1 from blocked_users b
                                       where (b.blocker = s.user_id and b.blocked = auth.uid())
                                          or (b.blocker = auth.uid() and b.blocked = s.user_id))),
                  '{}'::uuid[])
    from (select distinct unnest(p_crews[1:200]) as crew_id) c
   where auth.uid() is not null
     and exists (select 1 from crew_members me
                  where me.crew_id = c.crew_id and me.user_id = auth.uid() and me.status = 'confirmed');
$$;
revoke execute on function public.crew_ready_ids(uuid[]) from public, anon;
grant execute on function public.crew_ready_ids(uuid[]) to authenticated;
