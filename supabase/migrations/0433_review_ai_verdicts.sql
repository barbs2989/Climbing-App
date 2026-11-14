-- 0433: review_ai_verdicts — what the nightly AI checker concluded about each held route edit and
-- each open "this is wrong" flag, for the owner's standalone Review desk (review.html).
--
-- Owner decision 2026-11-14: flags (route_flags) and held field edits (contributions, kind 'field',
-- status 'pending') are reviewed on their OWN page, as a table, with an AI that has already checked
-- each one — not one card at a time from the app Menu. A nightly Claude agent researches every
-- item and writes ONE row here per item; the page shows it beside the climber's suggestion.
--
--   * The AI never approves, rejects or resolves anything. This table is advice only; every write
--     to the catalog still goes through approve_field_contribution / reject_field_contribution /
--     resolve_route_flag (0309), which re-check is_admin().
--   * Read: admins only (a flag's note is private to its reporter and the owner, 0307, and a
--     verdict quotes it back). No insert/update/delete policy: only the service key writes
--     (scripts/review-verdicts-write.mjs), so a client cannot plant a verdict.
--   * `item_hash` is a fingerprint of what was checked (the edit's value, or the flag's note — a
--     re-flag rewrites the note in place and route_flags has no updated_at). The exporter re-queues
--     an item whose current fingerprint differs.
--   * Verdict rules mirror the research verification ledger: 'agree'/'disagree' at confidence
--     '2-source' only when two INDEPENDENT sources say so (sites copying one guidebook count once);
--     an official-only fact (permit, closure, fee) may reach '2-source' from one land-manager page.

begin;

create table if not exists public.review_ai_verdicts (
  id              uuid primary key default gen_random_uuid(),
  item_kind       text not null check (item_kind in ('contribution', 'flag')),
  item_id         uuid not null,
  route_id        text references public.routes(id) on delete cascade,
  area_id         text references public.areas(id) on delete cascade,
  field           text,
  item_hash       text not null,
  current_value   jsonb,
  suggested_value jsonb,
  ai_value        jsonb,
  verdict         text not null check (verdict in ('agree', 'disagree', 'partly', 'unsure')),
  confidence      text not null check (confidence in ('2-source', '1-source', 'none')),
  sources         jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  reasoning       text not null check (char_length(reasoning) between 1 and 1200),
  model           text,
  checked_at      timestamptz not null default now(),
  unique (item_kind, item_id)
);
create index if not exists review_ai_verdicts_route_idx on public.review_ai_verdicts (route_id);

comment on table public.review_ai_verdicts is
  'Nightly AI checker''s verdict on each held field edit / open route flag (0433). Advice only: the owner acts in review.html through the 0309 RPCs. Admin read; service key writes.';

alter table public.review_ai_verdicts enable row level security;
drop policy if exists "ai verdicts read by admin" on public.review_ai_verdicts;
create policy "ai verdicts read by admin" on public.review_ai_verdicts for select
  using (public.is_admin(auth.uid()));

revoke all on public.review_ai_verdicts from anon;
revoke insert, update, delete on public.review_ai_verdicts from authenticated;

commit;

-- VERIFY:
--   select count(*) from public.review_ai_verdicts;                              -- 0 until the first run
--   select policyname, cmd from pg_policies where tablename = 'review_ai_verdicts'; -- one select policy
