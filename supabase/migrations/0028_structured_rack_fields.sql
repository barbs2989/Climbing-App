-- Structured rack detail: cams/nuts already have per-size granularity via the
-- generic `gear` jsonb array, but sling sizes/counts, alpine-draw count, rope
-- strategy (single vs half/twin), and mechanical ascenders had no dedicated
-- field anywhere — routes either omitted them or buried them in free-text
-- `detailed_rack` prose that the contribution form couldn't structure or edit.
-- See AUDIT_REPORT_NC_HIERARCHY.md-style gear audit: only 2/764 curated WA
-- alpine/mountaineering/scrambling routes named a specific sling size, and 470
-- carried auto_generated placeholder rack text (e.g. "double rope" asserted
-- without verifying against real trip reports).

alter table routes
  add column if not exists sling_rack     jsonb,   -- [{sizeCm: 60, qty: 4}, ...] — slings actually carried, by size
  add column if not exists alpine_draws   integer, -- count of pre-rigged alpine quickdraws (distinct from generic slings)
  add column if not exists rope_type      text,    -- 'single' | 'half_twin' | 'static'
  add column if not exists rope_length_m  integer,
  add column if not exists rope_note      text,    -- why: e.g. "raps are ~30m, single 70m is standard; older beta calling for doubles is outdated"
  add column if not exists ascender       text,    -- e.g. 'Micro Traxion', 'Tibloc', 'Prusik cords only', 'Not needed' — null when not researched
  add column if not exists corrections    text;    -- provenance note when a gear-audit pass corrected prior (often auto_generated) data
