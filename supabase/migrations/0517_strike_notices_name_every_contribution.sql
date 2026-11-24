-- 0517: two things the end-to-end QA run of 2026-11-23 found (owner: "do tests to make sure it works by
-- creating test accounts and do all the actions"; then "Fix all three").
--
-- 1. The strike notices spoke only of ROUTE EDITS. Since 0505 a turned-down proposed climb or area is a strike
--    too, and test climber B, whose duplicate climb was turned down, was told "A route edit of yours was turned
--    down" — and "Reason: QA test: this climb is already in the catalog.. Edits that are…": the reason the owner
--    typed ended in a full stop and the template added another. _add_contribution_strike now says
--    "contribution" (an edit, or a climb or area you added), and drops the reason's own trailing full stop.
--
-- 2. A restricted or banned climber's field edit was refused by the RLS policy "contribution standing allows
--    field edits", so the edit sheet's toast read "new row violates row-level security policy …". The insert
--    guard now refuses it first with a sentence, as 0505 already did for a proposal. The policy stays as the
--    backstop. Only the standing check is new in guard_field_contribution; the rest is 0505's body unchanged.

create or replace function public._add_contribution_strike(p_user uuid, p_reason text, p_contribution uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  s   contribution_standing%rowtype;
  n   int;
  new_status text;
  v_until timestamptz;
  v_reason text := rtrim(btrim(coalesce(p_reason, '')), '.');
begin
  if p_user is null or is_admin(p_user) then return; end if;
  insert into contribution_standing (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into s from contribution_standing where user_id = p_user for update;
  n := s.strikes + 1;
  -- A standing the owner raised by hand is never lowered by a strike count.
  new_status := case
    when n >= 5 or s.status = 'banned' then 'banned'
    when n >= 3 or s.status = 'restricted' then 'restricted'
    else 'warned' end;
  v_until := case when new_status = 'restricted' then greatest(coalesce(s.until, now()), now() + interval '90 days') else null end;
  update contribution_standing
     set strikes = n, status = new_status, until = v_until, reason = p_reason, last_strike_at = now(),
         set_by = uid, set_at = now()
   where user_id = p_user;

  if new_status <> s.status then
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (uid, case new_status when 'banned' then 'contrib_ban' when 'restricted' then 'contrib_restrict' else 'contrib_warn' end,
            'contributor', p_user::text, p_user, 'strike ' || n || ': ' || p_reason);
    if new_status = 'warned' then
      perform _notify(p_user, 'contribution_warning', 'One of your contributions was turned down',
        case when v_reason <> '' then 'Reason: ' || v_reason || '. ' else '' end ||
        'Edits, climbs and areas that are checked and turned down count against your account; after three, contributing is paused for 90 days.',
        jsonb_build_object('contribution', p_contribution));
    elsif new_status = 'restricted' then
      perform _notify(p_user, 'contribution_restricted', 'Contributing is paused for 90 days',
        'Three of your contributions were checked and turned down, so you can''t suggest edits or add climbs and areas for now. You can still flag something that looks wrong, and you can appeal.',
        jsonb_build_object('contribution', p_contribution));
    else
      perform _notify(p_user, 'contribution_banned', 'Contributing is closed for your account',
        'Five of your contributions were checked and turned down. You can appeal.',
        jsonb_build_object('contribution', p_contribution));
    end if;
  end if;
end;
$$;
revoke all on function public._add_contribution_strike(uuid, text, uuid) from public, anon, authenticated;

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

  -- 0517: say why, before the RLS policy refuses it with Postgres's own sentence.
  if uid is not null and not is_admin(uid) and not coalesce(can_contribute_fields(uid), false) then
    raise exception 'Editing is paused on your account. You can still flag something that looks wrong, and you can appeal from the edit sheet.';
  end if;

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
