-- 0553: a removal is re-checked when it is APPROVED, against the page as it is then.
--
-- Owner's note (2026-10-22): "People shouldn't be able to delete waypoints when editing? How do we put guards
-- and checks and balances on this which someone reckless could do to try and harm the app correctness".
-- 0351 marks an edit that takes something off the page (a field cleared, fewer rows, fewer map pins) and the
-- owner's queue shows it in red. But it asks once, when the edit is SENT. Since then two things changed:
--   * 0530 made a second role, the REVIEWER, who can approve field edits; and the review autopilot (0534)
--     approves as the account review-bot@climbmatch.app, which is an admin.
--   * an edit waits for review for days, and the page can gain rows meanwhile. A climber sends 3 waypoints
--     while the page holds 2 (an addition, no red mark); another edit adds 2 more; approving the first now
--     replaces 4 waypoints with 3 — a removal nobody was told about.
-- So, at approval time, re-ask _edit_removes() against route_field_page_value() / _area_field_value() — the
-- same page value trg_capture_prior_value records — and refuse the approval unless the person approving is
-- the owner (an admin) and NOT the autopilot's account. A removal stays approvable; only by a human admin.
-- The desk and the autopilot (lib/editRemoves.js) ask the same question first, so this is the backstop.
--
-- guard_contribution_status() below is 0530's body (the latest definition; nothing after 0530 re-creates it)
-- with only the marked block added. Trigger order is unchanged: trg_contribution_status runs before
-- trg_contribution_prior_value, so a refused approval never records a prior value.

begin;

create or replace function public._is_review_bot(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select uid is not null and exists (select 1 from auth.users u where u.id = uid and lower(u.email) = 'review-bot@climbmatch.app');
$$;
revoke all on function public._is_review_bot(uuid) from public, anon, authenticated;

create or replace function public.guard_contribution_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare page jsonb;
begin
  if tg_op = 'INSERT' then
    new.status      := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    new.prior_value := null;                                   -- 0530: never the submitter's to set
    return new;
  end if;
  -- 0530: a reviewer moves field edits; everything else still needs an admin.
  if new.status is distinct from old.status
     and not (is_admin(auth.uid()) or (old.kind = 'field' and can_review(auth.uid()))) then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  -- 0553: an approval that would take something off the page AS IT IS NOW is the owner's alone.
  if new.kind = 'field' and new.field is not null
     and new.status = 'approved' and old.status is distinct from 'approved'
     and (not is_admin(auth.uid()) or _is_review_bot(auth.uid())) then
    if new.route_id is not null then
      page := route_field_page_value(new.route_id, new.field);
    elsif new.area_id is not null then
      page := _area_field_value(new.area_id, new.field);
    end if;
    if _edit_removes(page, coalesce(new.applied_value, new.value)) then
      raise exception 'this edit would take something off the page as it is now (a field cleared, fewer rows or fewer map pins); only the owner approves a removal'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

commit;

-- Confirm (each on its own):
--   select prosrc ~ '_edit_removes' from pg_proc where proname = 'guard_contribution_status';   -- true
--   select public._is_review_bot(null);                                                         -- false
