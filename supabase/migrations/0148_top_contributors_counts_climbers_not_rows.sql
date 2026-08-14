-- 0148 — make the Top Contributors number mean "things this climber contributed"
-- rather than "rows they filed", and put the live function back under the migration chain.
--
-- THE DRIFT, WHICH IS THE MORE IMPORTANT HALF. The checked-in 0005 body is:
--
--     select c.contributor, count(*) as n ... where ca.path <@ pa.path
--
-- The body actually running in production (read 2026-08-14 from pg_proc.prosrc) is:
--
--     ... where ca.path <@ pa.path and c.contributor is distinct from 'anon'
--
-- No migration in this repo contains that clause. It was applied by hand, outside the chain,
-- so anyone rebuilding the database from `supabase/migrations` gets a function that silently
-- reintroduces the anon bucket. This file is the checked-in definition again: after it, the
-- repo reproduces the live behaviour instead of an older one. Same class as
-- [[migration-files-are-not-applied-state]], with the arrow pointing the other way — here the
-- FILE is the stale artifact, not the database.
--
-- WHAT THE NUMBER COUNTED, AND WHY THAT WAS WRONG. `count(*)` over the ledger, which means:
--
--   1. An anonymous submission scored. `submitContribution` stamps the session uid and falls
--      back to the string "anon"; the live INSERT policy also accepts a genuinely anonymous
--      insert that lands with `contributor` NULL (0127's header records measuring exactly
--      that: 201, contributor null). The hand-patch above catches the string and NOT the
--      null, because `NULL is distinct from 'anon'` is TRUE — so the null rows still group
--      into one bucket that ranks by the sum of everyone who was signed out, and renders as
--      "Climber" because no profile resolves. A leaderboard row that nobody can be is noise
--      at best and a false accusation of authorship at worst. Both spellings are excluded
--      here, plus the empty string.
--
--   2. Correcting the same field twice scored twice. The ledger is append-only by design
--      (0002: "consensus is computed from the rows"), so a climber refining one value, or
--      re-submitting after a typo, files several rows about ONE fact. Counting them
--      individually rewards volume over contribution. Field corrections now collapse per
--      (route, field); everything else still counts per row, because ten photos really are
--      ten contributions and two trip reports really are two.
--
-- WHAT THIS DELIBERATELY DOES **NOT** DO, both because they are decisions rather than
-- arithmetic:
--
--   * It does not filter on `status`. That column arrived in 0127 for the add-a-route review
--     flow and defaults to 'pending' for EVERY kind, with a BEFORE trigger forcing it — no
--     one ever marks a field correction 'approved', because field consensus is computed in
--     the client from the rows ("3 climbers agree"). So `status = 'approved'` would not
--     filter unaccepted work; it would return an empty leaderboard. Ranking by whether a
--     contribution was ACCEPTED needs the consensus computation to move server-side first.
--
--   * It does not count trip reports. They live in `climb_logs`, so on this path the most
--     valuable thing a climber files scores nothing — but `climb_logs` is author-only under
--     RLS (0081: readable by a non-author only where trip_report_visibility = 'public', and
--     nothing in the client writes that column). This function is `stable`, not SECURITY
--     DEFINER, so it reads with the caller's privileges and would silently count only the
--     viewer's OWN logs — a per-viewer leaderboard that looks authoritative. Making it count
--     them means reading private rows through a definer function, which is a privacy call,
--     not a ranking tweak. Left alone on purpose.
--
-- No data migration: `contributions` holds 0 rows today (checked with the service key), so
-- this changes what future rows will mean, not any number currently on screen.

create or replace function area_top_contributors(aid text, lim int default 3)
returns table(contributor text, n bigint) language sql stable as $$
  select c.contributor,
         count(distinct case
           -- one point per (route, field) a climber corrected, however many times they filed it
           when c.kind = 'field'
             then 'f|' || coalesce(c.route_id, c.area_id, '') || '|' || coalesce(c.field, '')
           -- every other kind is a distinct artifact: count the row
           else 'r|' || c.id::text
         end) as n
  from contributions c
  left join routes r on r.id = c.route_id
  join areas ca on ca.id = coalesce(c.area_id, r.area_id)
  join areas pa on pa.id = aid
  where ca.path <@ pa.path
    and c.contributor is not null
    and c.contributor not in ('anon', '')
  group by c.contributor
  order by n desc, c.contributor
  limit lim;
$$;

-- Confirm — expect the body below to contain both `count(distinct` and `not in ('anon', '')`:
--   select prosrc from pg_proc where proname = 'area_top_contributors';
