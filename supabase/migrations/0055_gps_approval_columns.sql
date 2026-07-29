-- GPS crowdsource: columns needed by the admin approval flow.
-- Verified against the live schema before writing:
--   gps_submissions (0042) has no admin_notes; routes (0001/0003) has gpx but no contributor credit.

alter table public.gps_submissions
  add column if not exists admin_notes text;

alter table public.routes
  add column if not exists gps_contributor_name text;
