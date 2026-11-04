-- Drop user_reports_open_idx: an exact copy of user_reports_status_idx.
--
-- 0077 created user_reports_status_idx on (status, created_at desc); 0158 later added
-- user_reports_open_idx on the same columns in the same order under a new name. Supabase's
-- performance advisor (duplicate_index) flagged the pair on 2026-10-28. Neither backs a constraint,
-- so the planner uses either one identically; the copy only costs a second write per report.

drop index if exists public.user_reports_open_idx;
