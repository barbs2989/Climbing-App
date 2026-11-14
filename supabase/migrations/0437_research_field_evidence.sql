-- 0437 — route_field_evidence: one evidence record per researched route field, so a field that two
-- independent sources confirmed LOCKS and no later research pass re-researches or overwrites it.
--
-- Why (owner, 2026-11-14): research batches kept writing wrong values and the next agent "fixed" them
-- differently, because nothing recorded what had been confirmed or by which sources. The rules are in
-- .claude/skills/route-research/SKILL.md; the writer that enforces them is enrich:apply
-- (scripts/enrich-approach-rappel-bivy.mjs) through scripts/lib/research-ledger.mjs.
--
--   field   a routes column name ("approach", "gain_ft", "fa"), or "waypoints/<pin name>" for one pin.
--   value   the value as stored (jsonb), compared by the writer before any overwrite.
--   method  agree-2 (2 independent sources) · official-1 (one land-manager/agency page, expires)
--           · measured (official data: USGS place names / elevation model, a vetted track, mapped trail)
--           · single-source (blocked/paywalled alternatives; lower tier) · owner.
--   level   locked · locked-1src · unconfirmed · disputed.
--   evidence  [{url, publisher, retrieved_at, fact, official?, measurement?}] — facts, never sentences.
--   history   every earlier {value, method, level, evidence, replaced_at}.
--
-- WHO CAN READ IT: nobody through the API. RLS is on with no policy, so anon and authenticated read
-- nothing; the research pipeline uses the service key. Evidence URLs must never reach a screen
-- (check:no-sources), and a public table would be one.
--
-- MIRROR: a locked row makes the matching route_field_confidence form key HIGH (climbers can then only
-- flag it), through contribution_fields.column_name. A level the owner set by hand, or an owner-approved
-- edit (both carry set_by), is never touched. Unlocking removes only a mirror row this trigger wrote.
-- The mirror does not expire with an official-1 lock; the next research pass refreshes or drops it.

create table if not exists route_field_evidence (
  route_id   text        not null references routes(id) on delete cascade,
  field      text        not null check (length(field) between 1 and 200),
  value      jsonb,
  method     text        not null check (method in ('agree-2', 'official-1', 'measured', 'single-source', 'owner')),
  level      text        not null check (level in ('locked', 'locked-1src', 'unconfirmed', 'disputed')),
  evidence   jsonb       not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  expires_at timestamptz,
  history    jsonb       not null default '[]'::jsonb check (jsonb_typeof(history) = 'array'),
  batch      text,
  set_at     timestamptz not null default now(),
  primary key (route_id, field)
);
alter table route_field_evidence enable row level security;
comment on table route_field_evidence is
  'Research evidence per route field; locked rows are never re-researched (0437). Service key only: RLS on, no policies.';

create index if not exists route_field_evidence_level_idx on route_field_evidence (level, expires_at);

create or replace function _route_field_evidence_mirror()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r route_field_evidence;
  col text;
begin
  r := coalesce(new, old);
  col := split_part(r.field, '/', 1);
  if tg_op <> 'DELETE' and new.level in ('locked', 'locked-1src') then
    insert into route_field_confidence (route_id, field, level, reason, set_by, set_at)
    select r.route_id, cf.form_key, 'high', 'research: ' || new.method, null, now()
      from contribution_fields cf
     where cf.column_name = col
    on conflict (route_id, field) do update
       set level = 'high', reason = excluded.reason, set_at = now()
     where route_field_confidence.set_by is null;
  else
    -- unlocked or deleted: drop only the mirror rows this trigger wrote, and only when no other
    -- locked evidence row (another pin of the same column) still holds the field.
    if not exists (
      select 1 from route_field_evidence e
       where e.route_id = r.route_id and split_part(e.field, '/', 1) = col
         and e.level in ('locked', 'locked-1src')
         and (tg_op = 'DELETE' or e.field <> r.field)
    ) then
      delete from route_field_confidence c
       using contribution_fields cf
       where c.route_id = r.route_id and c.field = cf.form_key and cf.column_name = col
         and c.set_by is null and c.reason like 'research:%';
    end if;
  end if;
  return null;
end $$;

revoke all on function _route_field_evidence_mirror() from public, anon, authenticated;

drop trigger if exists trg_route_field_evidence_mirror on route_field_evidence;
create trigger trg_route_field_evidence_mirror
  after insert or update or delete on route_field_evidence
  for each row execute function _route_field_evidence_mirror();
