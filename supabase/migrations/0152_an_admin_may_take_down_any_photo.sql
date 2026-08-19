-- 0152 — an admin may take down any route photo.
--
-- #971 put a photo upload on every route in a public bucket; 0151 let the uploader withdraw
-- their own. Neither gave anybody the ability to remove somebody ELSE'S photo, which means
-- that today the only way to take down an inappropriate image is to run SQL by hand. That is
-- the enforcement half of moderation and it needs no policy decision to be obviously right:
-- whatever review process eventually exists, it has to end in someone being able to act.
--
-- WHAT THIS DELIBERATELY IS NOT. There is still no report-a-photo path, and this migration
-- does not invent one. Reporting is where the real decisions live — who reviews, what the
-- reporter is told, whether a report is visible to anyone, what happens if nobody looks — and
-- `user_reports` cannot absorb it as it stands: it is shaped around reporting a PERSON
-- (reported_id, reported_name) and its SELECT policy is reporter-only, so filing a photo
-- report there would put it in a queue no reviewer can read. Shipping a "Report" button over
-- that would be a success message in front of a write nobody receives, which is the exact
-- shape check:writes exists to prevent. Left for a decision rather than guessed at.
--
-- is_admin() already exists (0127 uses it to gate approve_new_route) and is SECURITY DEFINER
-- over the admins table, so this adds no new trust surface: it reuses the one the route
-- approval flow already depends on.
--
-- The policy is REPLACED rather than added alongside, because Postgres ORs multiple permissive
-- policies for the same command and two policies would make the effective rule harder to read
-- than the one it enforces. Both paths stay visible in a single predicate:
--   your own photo   -> kind='photo' AND contributor = auth.uid()
--   an admin         -> any contribution row
--
-- An admin can delete any KIND here, not only photos, and that is intentional: moderation of a
-- fabricated field contribution is the same problem, and the append-only rule 0002 describes is
-- about ordinary climbers not being able to retract evidence, not about the project being
-- unable to remove abuse. Ordinary climbers are still held to photo-only.

drop policy if exists "contributors may delete their own photo" on contributions;
create policy "own photo, or an admin" on contributions
  for delete using (
    (kind = 'photo' and contributor is not null and contributor = (auth.uid())::text)
    or is_admin(auth.uid())
  );

-- Confirm — expect one DELETE policy named "own photo, or an admin":
--   select policyname, cmd from pg_policies where tablename = 'contributions' order by cmd;
