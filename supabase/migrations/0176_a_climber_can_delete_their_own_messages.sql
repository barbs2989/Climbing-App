-- A climber could not delete a message they sent or received. Ever.
--
-- 0042 gave `messages` a select policy (sender or recipient), an insert policy (you must be the
-- sender) and an update policy (mark your own received messages as read). It gave no DELETE policy
-- at all, so every row written to that table was permanent for both parties.
--
-- HOW IT SURFACED, which is worth recording because the symptom was a lie rather than an error:
-- check:message-delivery inserts a message and deletes it in teardown, and the delete was refused
-- by RLS. PostgREST answers a zero-row DELETE with 204, `res.ok` is true, and the guard printed
-- "removed the message: ok" while the row sat there. Measured -- insert, delete, re-read: HTTP
-- 204, res.ok true, one row still present. That is the same class as a hand-written DELETE in the
-- SQL editor reporting success on zero rows, and the reason patchRow exists.
--
-- BOTH PARTIES, not just the sender. The tempting version is sender-only "unsend", and it is the
-- wrong shape for this table: a climber who receives an abusive or unwanted message has the
-- stronger claim to remove it from their own inbox, and giving that power only to the person who
-- sent it would mean the recipient can block someone (0044) and still be unable to clear what they
-- wrote. The select policy already treats the two symmetrically; so does this.
--
-- What it does NOT do is hide a deletion from the other party: a row is a row, so removing it
-- removes it for both. That is a real property to know rather than a hidden one -- an "unsend"
-- that leaves the recipient's copy intact needs per-side state this table does not have, and
-- inventing it here would be a bigger change than the gap being closed.

drop policy if exists "users can delete their own messages" on messages;
create policy "users can delete their own messages" on messages for delete using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
