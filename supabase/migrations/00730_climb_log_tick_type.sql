-- climb_logs.tick_type — the tick vocabulary the app already collects
-- (Onsight / Flash / Redpoint / Top-rope / Summit / Attempt / Turned around / ...).
--
-- Audit finding L3 (audits/BUG-AUDIT-2026-07-30.md): tickType was collected by the
-- log form and drives routeCompleted(), objectives checkmarks, onsight and peak
-- stats — but was never persisted, so every one of those reset on refresh.
--
-- APPLY THIS BEFORE deploying the code that writes tick_type: PostgREST rejects
-- an INSERT naming a column that does not exist, which would break climb-log
-- persistence entirely (the write error is swallowed client-side).

alter table public.climb_logs add column if not exists tick_type text;
