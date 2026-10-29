-- Every route field edit waits for the owner again (owner, 2026-10-28: "i don't want this cancel …
-- all of it"), withdrawing 0325's two exits:
--
--   * an edit to an EMPTY field no longer goes live on its own, and
--   * a second climber sending the same value no longer puts an edit live.
--
-- What stays: 0351's removal marking (a removal is stamped with REMOVAL_NOTE so the owner's queue
-- shows it in red and the edit sheet asks why), the high-field lock, rate limit, standing and
-- strikes (0307–0309), and area edits held as before (0319). Rows 0325 already approved are left
-- as they are — this changes what happens to the next edit, not to edits already on the page.

-- ── 1. The insert trigger only marks removals now ───────────────────────────────────────────
-- Same name and trigger as 0325/0351, so the owner's queue keeps reading the removal note.
create or replace function public.contribution_consensus() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind <> 'field' or new.field is null or new.route_id is null or new.area_id is not null then
    return new;
  end if;
  if _edit_removes(route_field_page_value(new.route_id, new.field), new.value) then
    new.review_note := 'Removes something from the page — waits for ClimbMatch to check it';
  end if;
  return new;
end;
$$;
revoke all on function public.contribution_consensus() from public, anon, authenticated;

-- ── 2. Only an admin moves a status — 0319's body, without 0325's consensus exit ──────────
create or replace function public.guard_contribution_status() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    -- The submitter does not get to choose any of this, whatever they post.
    new.status      := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;
  if new.status is distinct from old.status and not is_admin(auth.uid()) then
    raise exception 'only an admin can change a contribution''s review status (% -> %)',
      old.status, new.status;
  end if;
  return new;
end $$;

-- ── 3. Nothing is born approved, so 0325's insert-time grade write-back goes ───────────────
-- (0309's write-back on the owner's approval, an UPDATE OF status, is untouched.)
drop trigger if exists trg_contribution_applies_agreed_grade_on_insert on public.contributions;
drop function if exists public.trg_apply_agreed_grade_on_insert();

comment on column contributions.status is
  'pending | approved | rejected. Forced to ''pending'' on INSERT by trg_contribution_status; only an admin can move it (0382 withdrew 0325''s empty-field and two-climber approvals).';

-- Confirm (each on its own):
--   select tgname from pg_trigger where tgrelid = 'contributions'::regclass and not tgisinternal order by 1;
--   select prosrc ~ 'approved' from pg_proc where proname = 'contribution_consensus';   -- false
