-- Close the gap 0085 left open on purpose.
--
-- 0085 stopped a non-organizer from inserting themselves straight in as 'confirmed'. It did
-- NOT stop them inserting as 'invited' and then flipping themselves to 'confirmed' via
-- "self or organizer can update membership", because nothing recorded WHO created the row:
-- an organizer's invite and a self-invite were indistinguishable.
--
-- This is not cosmetic. datesAgreed() counts confirmed members, and 0081's "view crew logs"
-- makes a crew's trip reports readable to confirmed members — so the gap was a read-privacy
-- path into other people's trip reports, not just an attendance nuisance.
--
-- The fix is one column plus the two policies that read it. `default auth.uid()` is what
-- makes it need no client change at all — the same trick already used by reviews.climber_id
-- and inquiries.climber_id in this schema. Whoever performs the INSERT is stamped as the
-- inviter, and the INSERT policy forbids claiming to be anyone else. So:
--
--   creator seeds themselves at creation -> invited_by = creator = crews.created_by  -> may confirm
--   organizer invites someone            -> invited_by = organizer = crews.created_by -> may confirm
--   a stranger inserts themselves        -> invited_by = themselves /= created_by     -> may NOT confirm
--
-- All four crew tables are empty as of 2026-08-06 (crews, crew_members, crew_email_invites,
-- climb_logs all count 0), so there is nothing to backfill and no membership to break. If
-- that ever stops being true, backfill invited_by = crews.created_by for rows that were
-- genuine invites BEFORE applying the update policies below, or existing members will be
-- unable to accept.

alter table crew_members add column if not exists invited_by uuid references profiles(id);
alter table crew_members alter column invited_by set default auth.uid();

-- INSERT: you are always stamped as yourself. An organizer may add anyone at any status;
-- everyone else may only put themselves in as not-yet-confirmed.
drop policy if exists "join or invite" on crew_members;
create policy "join or invite" on crew_members for insert
  with check (
    invited_by = auth.uid()
    and (
      auth.uid() = (select created_by from crews where id = crew_id)
      or (auth.uid() = user_id and status <> 'confirmed')
    )
  );

-- UPDATE: split the old combined policy so the member branch can carry the extra condition
-- the organizer branch must not have.
drop policy if exists "self or organizer can update membership" on crew_members;

create policy "organizer updates membership" on crew_members for update
  using      (auth.uid() = (select created_by from crews where id = crew_id))
  with check (auth.uid() = (select created_by from crews where id = crew_id));

-- A member may change their own row — but may only reach 'confirmed' if the row was created
-- by the crew's organizer. Accepting a real invite still works; self-promotion does not.
create policy "member updates own membership" on crew_members for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      status <> 'confirmed'
      or invited_by = (select created_by from crews where id = crew_id)
    )
  );

-- Confirm -- expect invited_by present with default auth.uid(), and three policies:
--   select column_name, column_default from information_schema.columns
--    where table_name = 'crew_members' and column_name = 'invited_by';
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'crew_members' order by policyname;
