-- Fix a real RLS gap in 0032_crews.sql: crew_day_acks' insert policy only checked
-- auth.uid() = user_id, never that the user is actually a confirmed member of that
-- crew_id. Any authenticated user could insert an ack row against a crew they have
-- no relationship to (they couldn't read it back, since select is member-only, but
-- could still pollute another crew's date-planning data). Caught on re-review while
-- writing the live RLS test for #231, before this table saw any real writes.

drop policy "members ack their own day" on crew_day_acks;
create policy "members ack their own day" on crew_day_acks for insert with check (
  auth.uid() = user_id
  and exists (select 1 from crew_members m where m.crew_id = crew_day_acks.crew_id and m.user_id = auth.uid() and m.status = 'confirmed')
);
