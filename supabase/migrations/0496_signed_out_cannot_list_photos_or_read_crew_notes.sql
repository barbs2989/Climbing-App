-- 0496: a signed-out visitor (or any stranger) can no longer LIST every uploaded photo, or read
-- another crew's member notes and gear.
--
-- Owner, 2026-11-23: "I don't want peoples data getting leaked … if you aren't signed in". Probed
-- with the public anon key against production the same day:
--
--   1. storage.objects, bucket topo-photos: "topo_photos storage public read" (0026) was
--      `using (bucket_id = 'topo-photos')` for every role, so POST /storage/v1/object/list/topo-photos
--      with the anon key returned every account's folder and every file in it — profile photos
--      included, even for a climber who hides their photos (0434 hides the URL on the profile row,
--      not the file). The bucket stays PUBLIC: /object/public/... is served without consulting RLS,
--      so every image the app draws by getPublicUrl() keeps loading. What goes is the ability to
--      enumerate. The SELECT policy now answers only the file's owner (first path segment = uid,
--      the convention every upload follows) and admins — the two callers that DELETE (Storage's
--      remove() needs to see a row to delete it: "own delete" 0026, "admins remove reported
--      photos" 0263). The app never calls list() on this bucket; delete-account lists with the
--      service key, which bypasses RLS.
--
--   2. crew_members: 0426 made a PRIVATE crew's roster readable only by its own people, and left a
--      listed crew's rows public "exactly as it was" (0036) — so anon read 40 of 47 rows, each with
--      the member's `note`, gear claims/extras/counts/wanted, and invited/pending status. Nothing
--      needs that: Join a crew reads crew_listings and the share link crew_share_preview (both
--      SECURITY DEFINER, both still return the confirmed member ids), and the client reads
--      crew_members only for crews the caller is on (useMyCrews) and invites addressed to them
--      (useMyCrewInvites). Every other reader is SECURITY DEFINER (checked live in pg_proc: no
--      invoker function reads crew_members). crew_visible_to_me() — used only by this policy — now
--      answers the organiser and anyone with a row on the crew, listed or private.
--
-- Verify offline: node scripts/oneoff/verify-0426-private-crew-pglite.mjs (updated for this rule).

begin;

-- 1. Photos: owner or admin may read the storage row (needed to delete); nobody may list others'.
drop policy if exists "topo_photos storage public read" on storage.objects;
drop policy if exists "topo_photos storage own or admin read" on storage.objects;
create policy "topo_photos storage own or admin read" on storage.objects for select
  using (
    bucket_id = 'topo-photos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin(auth.uid()))
  );

-- 2. Crew rosters: only the organiser and the people on the crew read its rows.
create or replace function public.crew_visible_to_me(p_crew uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from crews c
     where c.id = p_crew
       and (c.created_by = auth.uid()
            or exists (select 1 from crew_members m where m.crew_id = c.id and m.user_id = auth.uid()))
  );
$$;
revoke all on function public.crew_visible_to_me(uuid) from public;
grant execute on function public.crew_visible_to_me(uuid) to anon, authenticated;

comment on function public.crew_visible_to_me(uuid) is
  'True when the caller organises the crew or has a crew_members row on it (0496; 0426 also let anyone read a listed crew). Join a crew reads crew_listings and crew_share_preview instead.';

drop policy if exists "crew membership readable unless the crew is private" on public.crew_members;
drop policy if exists "crew membership readable by its own people" on public.crew_members;
create policy "crew membership readable by its own people" on public.crew_members
  for select using (public.crew_visible_to_me(crew_id));

commit;
