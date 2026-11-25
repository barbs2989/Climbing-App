-- 0505: a proposed climb or area answers to the same rules as a field edit.
--
-- Owner question 2026-11-23: "How are we doing quality control on people that add a climb or
-- area/crag?" Proposals (kind new_route / new_area) were already held for the owner (0127, 0360)
-- and the proposer was told the outcome (0367), but three of the field-edit rules (0308, 0309)
-- stopped at kind = 'field':
--
--   1. A RESTRICTED or BANNED contributor could still propose climbs and areas. The restrictive
--      policy "contribution standing allows field edits" read `kind <> 'field' or ...`.
--   2. There was NO daily cap. guard_field_contribution() returned at once for any other kind.
--   3. A turned-down proposal was never a STRIKE. reject_new_route() (0127) only flipped status.
--
-- Now:
--   - guard_field_contribution() refuses a proposal from a contributor who cannot contribute
--     (restricted / banned, can_contribute_fields) with a sentence the form can show, and caps
--     proposals at 5 a day (2 for an account under 7 days old), new climbs and areas counted
--     together. The field branch is unchanged.
--   - The restrictive policy covers new_route / new_area too, as a backstop to the trigger.
--   - reject_new_route(id, note, strike default true) requires the reason the proposer is shown
--     (>= 10 characters, as reject_field_contribution does), only rejects new_route / new_area
--     (it never checked the kind), logs to moderation_actions, and adds a strike unless the owner
--     calls it an honest mistake. The 2-argument signature is dropped so a 2-argument call is not
--     ambiguous between two overloads; the default keeps every existing caller working.
--   - trg_contribution_result (0367) still sends the "turned down" notice with the reason.

-- ---------------------------------------------------------------------------------------------
-- 1. The insert guard.
-- ---------------------------------------------------------------------------------------------
create or replace function public.guard_field_contribution() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid   uuid := auth.uid();
  n     int;
  cap   int;
  young boolean;
begin
  if new.kind in ('new_route', 'new_area') then
    if uid is null or is_admin(uid) then return new; end if;
    if not coalesce(can_contribute_fields(uid), false) then
      raise exception 'Adding climbs and areas is paused on your account. You can appeal from the form.';
    end if;
    select created_at > now() - interval '7 days' into young from profiles where id = uid;
    cap := case when coalesce(young, true) then 2 else 5 end;
    select count(*) into n from contributions
     where contributor = uid::text and kind in ('new_route', 'new_area') and created_at > now() - interval '24 hours';
    if n >= cap then
      raise exception 'You’ve added a lot of climbs and areas today — try again tomorrow.';
    end if;
    return new;
  end if;

  if new.kind <> 'field' then return new; end if;
  -- The submitter never sets the applied value; only an approval does (0309).
  new.applied_value := null;

  if new.route_id is not null and new.field is not null and not is_admin(uid)
     and route_field_level(new.route_id, new.field) = 'high' then
    raise exception 'This detail is locked at high confidence; flag it instead if it has changed.';
  end if;

  if not is_admin(uid) then
    select created_at > now() - interval '7 days' into young from profiles where id = uid;
    cap := case when coalesce(young, true) then 5 else 20 end;
    select count(*) into n from contributions
     where contributor = uid::text and kind = 'field' and created_at > now() - interval '24 hours';
    if n >= cap then
      raise exception 'You’ve suggested a lot of edits today — try again tomorrow.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_field_contribution() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. The standing policy (restrictive, AND-ed onto "authed can contribute" and 0264's).
-- ---------------------------------------------------------------------------------------------
drop policy if exists "contribution standing allows field edits" on contributions;
create policy "contribution standing allows field edits" on contributions as restrictive for insert
  with check (kind not in ('field', 'new_route', 'new_area') or can_contribute_fields(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 3. Turning a proposal down.
-- ---------------------------------------------------------------------------------------------
drop function if exists public.reject_new_route(uuid, text);
create or replace function public.reject_new_route(p_contribution_id uuid, p_note text default null, p_strike boolean default true)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  c   contributions%rowtype;
  who uuid;
  v_reason text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not is_admin(uid) then
    raise exception 'only an admin can reject a route proposal' using errcode = '42501';
  end if;
  if v_reason is null or length(v_reason) < 10 then
    raise exception 'give the reason the climber will be shown (at least 10 characters)';
  end if;
  select * into c from contributions where id = p_contribution_id for update;
  if not found then
    raise exception 'no contribution with id %', p_contribution_id;
  end if;
  if c.kind not in ('new_route', 'new_area') then
    raise exception 'contribution % is kind %, not a proposed climb or area', p_contribution_id, c.kind;
  end if;
  if c.status <> 'pending' then
    raise exception 'contribution % is already %', p_contribution_id, c.status;
  end if;

  update contributions
     set status = 'rejected', reviewed_by = uid, reviewed_at = now(), review_note = left(v_reason, 2000)
   where id = p_contribution_id;

  who := _contributor_uuid(c.contributor);
  insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
  values (uid, 'reject_contribution', 'contribution', c.id::text, who,
          c.kind || ' ' || coalesce(c.value->>'name', '') || ': ' || v_reason || case when p_strike then '' else ' (no strike)' end);
  if p_strike and who is not null then
    perform _add_contribution_strike(who, v_reason, c.id);
  end if;
end;
$$;
revoke all on function public.reject_new_route(uuid, text, boolean) from public, anon;
grant execute on function public.reject_new_route(uuid, text, boolean) to authenticated;

comment on function public.reject_new_route(uuid, text, boolean) is
  'Admin-only. Turns down a pending new_route or new_area contribution with the reason the proposer is shown (>= 10 characters); a strike unless p_strike is false (0505). trg_contribution_result sends the notice.';

-- Confirm (each on its own):
--   select pg_get_function_identity_arguments('public.reject_new_route'::regproc);  -- p_contribution_id uuid, p_note text, p_strike boolean
--   select pg_get_expr(polwithcheck, polrelid) from pg_policy where polname = 'contribution standing allows field edits';
