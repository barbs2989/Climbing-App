-- 0474 — a crew's organizer can hand the crew to another member (owner, 2026-11-18).
--
-- Until now the organizer was whoever created the crew, for good: crews.created_by is set by the
-- insert and nothing in the app could change it. The "organizer can update own crew" policy has no
-- WITH CHECK, so its USING (auth.uid() = created_by) is applied to the NEW row too and a direct
-- update of created_by to anyone else is refused. An organizer who could no longer go had one
-- move, Leave, which deletes the crew for everyone.
--
-- crew_hand_over(crew, to) is that one change and nothing else:
--   * only the current organizer may call it;
--   * `to` must be a CONFIRMED member of the crew, and an account in good standing (a restricted
--     account cannot create a crew, so it cannot be handed one);
--   * crews.created_by moves to `to` (the 0408/0415 trigger crews_creator_joins keeps their row
--     confirmed, which it already is);
--   * every crew_members row the old organizer invited is re-pointed to the new one. The
--     "member updates own membership" policy lets a member write a confirmed row only when
--     invited_by = crews.created_by, so without this an outstanding invite could never be accepted
--     after the hand-over and a confirmed member could no longer update their own row. The same
--     for crew_email_invites, whose invited_by is carried onto the member row at sign-up.
-- The old organizer keeps their confirmed row: they stay in the crew as a member and can leave
-- like any other, without disbanding it.

begin;

create or replace function public.crew_hand_over(p_crew uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_crew public.crews%rowtype;
begin
  if v_uid is null then
    raise exception 'sign in to hand over a crew' using errcode = '42501';
  end if;
  select * into v_crew from public.crews where id = p_crew for update;
  if not found then
    raise exception 'crew not found' using errcode = 'P0002';
  end if;
  if v_crew.created_by is distinct from v_uid then
    raise exception 'only the crew''s organizer can hand it over' using errcode = '42501';
  end if;
  if p_to is null or p_to = v_uid then
    raise exception 'pick another member of the crew' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.crew_members m
    where m.crew_id = p_crew and m.user_id = p_to and m.status = 'confirmed'
  ) then
    raise exception 'only a confirmed member of the crew can become its organizer' using errcode = '22023';
  end if;
  if not public.is_active_user(p_to) then
    raise exception 'that climber cannot organize a crew right now' using errcode = '22023';
  end if;

  update public.crews set created_by = p_to where id = p_crew;
  update public.crew_members set invited_by = p_to where crew_id = p_crew and invited_by = v_uid;
  update public.crew_email_invites set invited_by = p_to where crew_id = p_crew and invited_by = v_uid;
end;
$$;

comment on function public.crew_hand_over(uuid, uuid) is
  'The organizer hands a crew to one of its confirmed members: moves crews.created_by and re-points the invites the old organizer sent (0474).';

revoke all on function public.crew_hand_over(uuid, uuid) from public, anon;
grant execute on function public.crew_hand_over(uuid, uuid) to authenticated;

commit;
