-- ClimbMatch Phase 2 — auto-generated, ORIGINAL route prose (synthesized from the
-- factual fields, never copied). Flagged auto_generated so the UI shows "unverified".
-- Safety-critical specifics are never fabricated — see the pull prompt. Idempotent.
alter table routes
  add column if not exists overview       text,                    -- 1-2 sentence original summary
  add column if not exists beta           text,                    -- general approach/route summary from facts
  add column if not exists turnaround     text,                    -- GENERIC turnaround/safety reminder (not a fabricated time)
  add column if not exists auto_generated boolean default false;   -- true = AI-written, show as unverified
