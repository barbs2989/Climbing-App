-- The ✓ Verified badge was enforced only by the client.
--
-- 0021 gates every *status transition* on guide_credentials behind is_admin(), but the
-- INSERT policy is `with check (guide_id = auth.uid())` and says nothing about `status`.
-- The stamping trigger is BEFORE UPDATE only, so an inserted row is never stamped and the
-- caller supplies verified_expires_at itself. sync_active_disciplines() fires AFTER INSERT,
-- so the discipline grant lands immediately.
--
-- The app's own form always sends status:'pending' (lib/DbGuideApply.jsx) — but the anon
-- key ships in the bundle, so the form is not the boundary. Any signed-up user could POST
-- guide_credentials {kind:'primary_track', cert_track:'IFMGA', status:'verified',
-- verified_expires_at:null} and isGuideVerified() would return true: ✓ Verified, plus every
-- IFMGA discipline, with no admin involvement.
--
-- Nothing is exploited today (guide_profiles/guide_credentials are both empty), so this is
-- a pre-launch fix, not an incident. It matters because #564 made the copy specific:
-- "A ✓ Verified badge means we checked a current, unexpired certification."

-- 1. A guide may only ever file a PENDING credential, carrying no review stamps.
drop policy if exists "guide_credentials self insert" on guide_credentials;
create policy "guide_credentials self insert pending" on guide_credentials for insert
  with check (
    guide_id = auth.uid()
    and status = 'pending'
    and verified_at is null
    and verified_expires_at is null
    and reviewed_by is null
  );

-- 2. Resubmit-after-rejection is a real button (lib/DbGuideDashboard.jsx) that RLS forbids.
-- 0021's comment says resubmission is "handled client-side by re-insert, so this policy
-- stays admin-only" — but resubmitGuideCredential() does an UPDATE, and no self-update
-- policy exists. Every click throws PGRST116 into an unhandled rejection: the button does
-- nothing and says nothing. Allow exactly that one transition, and only that one.
-- Note: this does not pin cert_track, so a guide may switch tracks while resubmitting.
-- That is deliberate and safe — the row lands in 'pending', which grants no badge and no
-- disciplines, and the admin re-checks it against the uploaded documents either way. It
-- does mean a reviewer must not assume the track is the one they rejected.
create policy "guide_credentials self resubmit" on guide_credentials for update
  using (guide_id = auth.uid() and status in ('rejected', 'lapsed'))
  with check (
    guide_id = auth.uid()
    and status = 'pending'
    and verified_at is null
    and verified_expires_at is null
  );

-- 3. Same shape on guide_profiles: `self insert` and `self or admin update` never constrain
-- `status`, so a user could list themselves as 'active' directly. The attestation CHECK
-- constraint is no obstacle — attestations are self-declared by design.
drop policy if exists "guide_profiles self insert" on guide_profiles;
create policy "guide_profiles self insert unlisted" on guide_profiles for insert
  with check (id = auth.uid() and status in ('draft', 'submitted'));

-- A guide legitimately updates their own row constantly (day rate, bio, regions), so the
-- update policy has to stay open on the columns and close only on `status`. RLS cannot
-- compare OLD to NEW in one expression, so the transition rule belongs in a trigger.
create or replace function guard_guide_status() returns trigger
language plpgsql security definer as $$
begin
  if new.status is distinct from old.status and not is_admin(auth.uid()) then
    -- A guide may submit a draft, withdraw an active listing, or re-submit a withdrawn or
    -- rejected one. Only an admin may ACTIVATE or REJECT — those are the review outcomes.
    if not (
         (old.status = 'draft'     and new.status = 'submitted')
      or (old.status = 'active'    and new.status = 'delisted')
      or (old.status = 'delisted'  and new.status = 'submitted')
      or (old.status = 'rejected'  and new.status = 'submitted')
    ) then
      raise exception 'only an admin can move a guide listing from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists guide_profiles_guard_status on guide_profiles;
create trigger guide_profiles_guard_status before update on guide_profiles
  for each row execute function guard_guide_status();
