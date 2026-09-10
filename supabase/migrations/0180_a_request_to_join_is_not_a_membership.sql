-- A REQUEST TO JOIN IS NOT A MEMBERSHIP, AND IT MUST NOT READ THE FLOAT PLAN.
--
-- 0036 wrote the intended model down in its own comment, in as many words:
--
--     crews holds float_plan/meet_place/meet_time (sensitive - see docs/BACKEND.md:
--     "shared with your emergency contact... can call for help if you're overdue").
--     Base-table read is organizer-or-confirmed-member ONLY, never public. Public
--     "browse open crews" is served by the crew_listings view below, which exposes
--     only a safe column subset by construction.
--
-- 0068_crews_readable_by_invited_members widened that SELECT to ANY crew_members row,
-- whatever its status, so an INVITED climber could see the crew they were invited to.
-- That intent is right and is preserved here. What it also admitted is `pending` -- and a
-- pending row is the climber's OWN REQUEST, which anybody can create for themselves.
--
-- MEASURED WITH TWO REAL ACCOUNTS, not reasoned about
-- (scripts/oneoff/probe-a-stranger-can-read-your-float-plan.mjs). Before this migration:
--
--   control: a climber with no membership row reads 0 crews          (so the result is attributable)
--   self-insert status='pending'  -> 201 Created
--   read the crew row             -> float_plan, meet_place, meet_time ALL RETURNED
--   self-insert status='invited'  -> 201 Created   (0086's check is `status <> 'confirmed'`)
--   self-insert status='confirmed'-> 403           (which is why the CHAT never leaked)
--
-- So a signed-in climber could pick any crew id -- crew_members SELECT is `using (true)`, so
-- ids are enumerable -- seat themselves, and read that crew's float plan: vehicle, parking,
-- emergency contact, departure and hard-return times. The safety document, to a stranger.
--
-- TWO CHANGES, AND EACH ONE ALONE IS DEFEATED BY THE OTHER HOLE:
--   * narrowing only the SELECT leaves a stranger claiming status='invited';
--   * constraining only the INSERT leaves them reading as status='pending'.
--
-- SAFE AGAINST THE APP'S OWN PATHS, checked rather than assumed:
--   * the real request-to-join writes exactly "pending" (dbAddCrewMember(id, uid, "pending")),
--     which is the one status a self-insert may still use;
--   * an organiser inviting somebody takes the created_by branch, which is untouched;
--   * useMyCrewInvites filters status='invited' and embeds crews(*), so an invited climber
--     must keep reading the crew row -- and does.
--
-- What a requester loses is the crew row, which they were never meant to have. They still see
-- the crew in the finder, because that is served by crew_listings (a safe column subset by
-- construction, and not affected by this policy).

-- 1. A self-insert may only ever be a REQUEST.
--
-- 0086 is titled "crew membership requires a real invite" and added `invited_by = auth.uid()`
-- to enforce it. For a SELF-insert that clause is satisfied trivially -- you name yourself as
-- your own inviter -- so it constrained nothing on this branch, and `status <> 'confirmed'`
-- let a stranger award themselves `invited`. The status is what has to be pinned.
drop policy if exists "join or invite" on crew_members;
create policy "join or invite" on crew_members for insert
  with check (
    invited_by = auth.uid()
    and (
      -- the organizer may add anyone at any status (including themselves on creation)
      auth.uid() = (select created_by from crews where id = crew_id)
      -- anyone else may only ASK. Not 'invited': being invited is the organizer's act,
      -- and a climber who can write it for themselves has invited themselves.
      or (auth.uid() = user_id and status = 'pending')
    )
  );

-- 2. A pending request does not read the crew.
--
-- Keeps 0036's organizer and confirmed member, and keeps 0068's invited member -- everyone
-- the organizer has actually let in. Excludes the one status a climber can mint for
-- themselves. This is the same predicate the app now uses to answer "who is on this crew"
-- (crewInCrew, #1687): `status <> 'pending'`, so the database and the screen agree.
drop policy if exists "crew members can read" on crews;
create policy "crew members can read" on crews for select using (
  auth.uid() = created_by
  or exists (
    select 1 from crew_members m
     where m.crew_id = crews.id
       and m.user_id = auth.uid()
       and m.status <> 'pending'
  )
);
