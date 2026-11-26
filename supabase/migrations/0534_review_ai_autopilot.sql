-- 0534: the review autopilot records what it DID with each verdict (owner 2026-11-25: "ai will
-- automatically check that feedback and accept and decline … if you can't find the information
-- online, flag it on the admin page and I will review it myself").
--
-- scripts/review-autopilot.mjs researches each held edit, open flag and proposed climb/area, stores a
-- verdict here (as since 0436), then acts on the ones two independent sources settle, through the same
-- RPCs the owner's desk buttons call, signed in as the AI reviewer account. These four columns say what
-- it did, so the Review desk can show "Decided by AI" and, for everything it left alone, "Needs you"
-- with the reason. auto_hash is the item_hash the decision was made on: an item whose content changes
-- after that is decided again.
--
--   auto_action  'approve' | 'approve_ai_value' | 'turn_down' | 'fix_flag' | 'dismiss_flag' |
--                'approve_proposal' | 'reject_proposal' | 'needs_owner'
--   auto_note    one sentence for the owner
--   auto_at      when
--   auto_hash    the item_hash it acted on
--
-- Written with the service key only, like the rest of the row (0436 revoked client writes); read by
-- admins and reviewers through the existing policies.

begin;

alter table public.review_ai_verdicts
  add column if not exists auto_action text,
  add column if not exists auto_note   text,
  add column if not exists auto_at     timestamptz,
  add column if not exists auto_hash   text;

alter table public.review_ai_verdicts drop constraint if exists review_ai_verdicts_auto_action_check;
alter table public.review_ai_verdicts add constraint review_ai_verdicts_auto_action_check
  check (auto_action is null or auto_action in ('approve', 'approve_ai_value', 'turn_down', 'fix_flag', 'dismiss_flag', 'approve_proposal', 'reject_proposal', 'needs_owner'));
alter table public.review_ai_verdicts drop constraint if exists review_ai_verdicts_auto_note_len;
alter table public.review_ai_verdicts add constraint review_ai_verdicts_auto_note_len
  check (auto_note is null or char_length(auto_note) <= 600);

comment on column public.review_ai_verdicts.auto_action is
  'What the review autopilot (scripts/review-autopilot.mjs, 0534) did with this verdict; needs_owner = left on the Review desk for the owner.';

commit;
