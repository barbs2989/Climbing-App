-- A voucher can EDIT their own vouch.
--
-- The one-tap vouch (posted from the log form) carries no stars and no skills, and the
-- table had no UPDATE policy, so the only way to add them later was to withdraw and
-- re-post. Editing is the voucher's own words about someone else, so it is held to the
-- same rule as giving and withdrawing: only the author.
--
-- Only `reason` is writable. from_id and to_id stay fixed, so a vouch cannot be moved to a
-- different climber, and created_at stays fixed, so an edit cannot backdate or refresh one.
-- The column grant replaces the table-wide UPDATE grant that anon and authenticated held by
-- default (RLS denied it, but the grant is narrowed too so the policy is not the only gate).

create policy "edit own vouches" on public.vouches
  for update
  using (auth.uid() = from_id)
  with check (auth.uid() = from_id);

revoke update on public.vouches from anon, authenticated;
grant update (reason) on public.vouches to authenticated;
