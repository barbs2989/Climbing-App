-- A climber can take back a guide inquiry they have not had an answer to.
--
-- 0023 made inquiries append-only on purpose: the row IS the timestamped record that the climber
-- accepted the liability disclaimer, so it is never deleted. Withdrawing is therefore a STATUS,
-- not a delete -- the record survives, the guide's inbox shows it as withdrawn and offers no
-- Accept/Decline, and nothing about what the climber submitted changes.
--
-- 1. `withdrawn` joins the status check.
-- 2. withdraw_inquiry(): the only way to reach it. A definer because the table's one UPDATE
--    policy is the guide's; widening that to the climber would let them set 'accepted' on their
--    own inquiry. The function moves exactly new -> withdrawn, for the caller's own row.
-- 3. The immutability trigger also freezes a withdrawn row, so the guide cannot accept it later.
-- 4. A withdrawn inquiry no longer unlocks a review of the guide -- a review is for a guide you
--    actually dealt with.

alter table inquiries drop constraint if exists inquiries_status_check;
alter table inquiries add constraint inquiries_status_check
  check (status in ('new','accepted','declined','withdrawn'));

create or replace function withdraw_inquiry(p_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update inquiries set status = 'withdrawn'
   where id = p_id and climber_id = auth.uid() and status = 'new';
  if not found then
    raise exception 'That inquiry is no longer open — the guide may already have answered it.';
  end if;
end; $$;
revoke all on function withdraw_inquiry(uuid) from public;
revoke all on function withdraw_inquiry(uuid) from anon;
grant execute on function withdraw_inquiry(uuid) to authenticated;
comment on function withdraw_inquiry(uuid) is
  'Climber withdraws their own unanswered inquiry (new -> withdrawn). The row is kept: it is the disclaimer record.';

create or replace function guard_inquiry_immutable_fields() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.objective is distinct from old.objective
    or new.requested_dates is distinct from old.requested_dates
    or new.message is distinct from old.message
    or new.party_size is distinct from old.party_size
    or new.includes_minor is distinct from old.includes_minor
    or new.climber_id is distinct from old.climber_id
    or new.climber_disclaimer_accepted_at is distinct from old.climber_disclaimer_accepted_at
    or new.guide_id is distinct from old.guide_id
  then
    raise exception 'inquiries: only status/guide_responded_at may be updated';
  end if;
  if old.status = 'withdrawn' and new.status is distinct from old.status then
    raise exception 'inquiries: a withdrawn inquiry cannot be answered';
  end if;
  return new;
end; $$;

drop policy if exists "reviews climber insert with real inquiry" on reviews;
create policy "reviews climber insert with real inquiry" on reviews for insert
  with check (
    climber_id = auth.uid()
    and exists (
      select 1 from inquiries i
      where i.id = reviews.inquiry_id
        and i.climber_id = auth.uid()
        and i.guide_id = reviews.guide_id
        and i.status <> 'withdrawn'
    )
  );
