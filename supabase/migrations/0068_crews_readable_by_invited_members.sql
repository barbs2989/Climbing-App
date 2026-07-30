-- Fix: an invited-but-not-yet-confirmed member cannot read the crews row they
-- were invited to. 0036's "crew members can read" policy requires
-- m.status = 'confirmed', so the invite screen's crews(*) embed comes back
-- null for the invitee — the card renders "A climber wants you on their crew
-- for a climb" with no inviter name and no route. You cannot evaluate an
-- invite you cannot see. Found by the first two-real-account end-to-end test
-- (2026-07-30, users A/B, verified against the live crew_members rows).
--
-- Replace the SELECT policy so ANY membership row (invited, pending or
-- confirmed) grants read; float_plan/meet_place exposure to an invitee is the
-- same trust boundary as being asked to join the trip at all.

drop policy "crew members can read" on crews;
create policy "crew members can read" on crews for select using (
  auth.uid() = created_by
  or exists (select 1 from crew_members m where m.crew_id = crews.id and m.user_id = auth.uid())
);
