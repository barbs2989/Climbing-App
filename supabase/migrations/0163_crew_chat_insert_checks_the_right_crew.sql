-- Any confirmed member of ANY crew could post into ANY crew's chat.
--
-- 0042 wrote the INSERT policy on crews_messages as:
--
--   exists (select 1 from crew_members m where m.crew_id = crew_id and m.user_id = auth.uid() ...)
--
-- The bare `crew_id` was meant to be the row being inserted, i.e. crews_messages.crew_id. But the
-- subquery selects FROM crew_members, so an unqualified column name binds to the INNER table
-- first — Postgres resolved it as `m.crew_id = m.crew_id`, which is true for every row. The
-- membership test therefore collapsed from "a confirmed member of THIS crew" to "a confirmed
-- member of ANY crew", which is a condition almost every real user satisfies.
--
-- The SELECT policy immediately above it in the same file writes `crews_messages.crew_id` and is
-- correct. That asymmetry is the whole bug: reads were scoped, writes were not, so an intruder
-- could write into a conversation they could not read. Nobody could see it from the app, because
-- the client only ever posts to a crew it is already showing you.
--
-- The second branch (`c.id = crew_id`, against `crews`) was correct BY ACCIDENT: `crews` has no
-- column called crew_id, so the name fell through to the outer table. It is qualified here too
-- rather than left to luck — adding a crew_id column to `crews` later would silently break it the
-- same way.
--
-- MEASURED on the live project before and after, with three accounts
-- (scripts/oneoff/probe-crew-message-insert-rls.mjs):
--
--                                      before      after
--   A posts in A's own crew            201         201     <- must keep working
--   B (member of another crew) into A  201  <-BUG  403
--   C (member of no crew) into A       403         403     <- proves the check RAN and compared wrong
--   B reads A's crew messages          0 rows      0 rows  <- SELECT was always correctly scoped
--
-- The C row is why this is a diagnosis and not a guess: had C also been let in, there would have
-- been no membership check at all and this fix would be aimed at the wrong thing.
--
-- Found by asking which write paths have never been exercised. crews_messages holds zero rows, so
-- this policy had never once refused anything. 21 of the 32 tables lib/db.js writes are in that
-- state; a sweep of all 116 policies in the database found this self-comparison exactly once.

drop policy if exists "crew members can send messages" on crews_messages;

create policy "crew members can send messages" on crews_messages for insert with check (
  auth.uid() = user_id
  and (
    exists (
      select 1 from crew_members m
       where m.crew_id = crews_messages.crew_id
         and m.user_id = auth.uid()
         and m.status = 'confirmed'
    )
    or exists (
      select 1 from crews c
       where c.id = crews_messages.crew_id
         and c.created_by = auth.uid()
    )
  )
);

comment on table crews_messages is
  'Crew chat. The INSERT policy must qualify crews_messages.crew_id: an unqualified crew_id inside '
  'its subquery binds to crew_members.crew_id and silently becomes a self-comparison, letting any '
  'confirmed member of any crew post here (0163).';
