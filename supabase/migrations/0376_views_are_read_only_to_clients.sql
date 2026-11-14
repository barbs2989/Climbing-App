-- 0376: the three public views are READ-ONLY to the app's keys.
--
-- Found reviewing RLS live (owner's to-do, 2026-10-28). Every table has row level security, but a
-- VIEW runs as its owner (postgres) unless it says security_invoker, and postgres is not held by
-- RLS. Supabase's default privileges give anon and authenticated EVERY privilege on a new object
-- in `public`, and the migrations that made these views only ever GRANTed select — they never
-- revoked the rest. catalog_directory (over areas) and crew_listings (over crews) are simple
-- enough for Postgres to write THROUGH (information_schema.views: is_updatable YES), so the anon
-- key that ships in the bundle could update or delete any area or crew, past every policy:
--
--   begin; set local role anon; explain delete from public.crew_listings where id is null;
--   -> "Delete on crews c" — planned, no permission error (measured 2026-10-28).
--
-- An area delete cascades to its routes and to climbers' contributions, topos and saves.
--
-- Fix: take every privilege but SELECT away from the client roles. catalog_directory and
-- catalog_routes also become security_invoker, so they read areas/routes under the caller's own
-- policies (both are public-read, so nothing a caller sees changes); this is what Supabase's
-- linter asks of a view (0010 security_definer_view). crew_listings stays owner-rights ON PURPOSE
-- (0036: it reads the private crews table and re-exposes only listing columns) — read-only is
-- what makes that safe.
--
-- check:rls rule 5 now fails the build on any view the client roles can still write.

revoke insert, update, delete, truncate, references, trigger
  on public.catalog_directory, public.catalog_routes, public.crew_listings
  from anon, authenticated;

alter view public.catalog_directory set (security_invoker = on);
alter view public.catalog_routes set (security_invoker = on);
