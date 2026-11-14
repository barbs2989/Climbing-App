-- Route quality control, part 1 of 3: the tables. (0308 = the confidence rule and the insert guards;
-- 0309 = the owner's review functions.)
--
-- THE DECISION (owner, 2026-10-15). Route data is safety data, and the catalog's fields are open to
-- every signed-in climber. Until now a field edit went live IN THE BROWSER the moment the field was
-- empty, or once three climbers agreed, and nobody ever looked at it: `contributions.status` stayed
-- 'pending' forever, the merge never read it, and a rejected row counted like any other. From here:
--
--   * every field edit is HELD until the owner approves it (nothing new shows on a route page
--     unreviewed), and an approval makes that field HIGH confidence;
--   * every field has a confidence level — high / medium / low — shown to climbers, and a HIGH field
--     cannot be edited, only FLAGGED;
--   * a rejection with a reason is a strike; strikes drive a contribution-scoped standing
--     (ok -> warned -> restricted -> banned) that the database enforces;
--   * a climber who sees something wrong but does not know the right value can FLAG the section
--     with a note, and the owner fixes it.
--
-- Contribution standing is deliberately SEPARATE from account_standing (0264). A climber banned from
-- editing route data can still log climbs, message and join crews; the two ladders answer different
-- questions and are enforced at different writes.
--
-- Every table here is empty on an empty preview database and references no catalog row, so the
-- file replays (README-numbering.md). `contribution_fields` holds static rows: the form's field keys
-- and the `routes` column each one edits. The build guard check:contrib-field-columns keeps that list
-- equal to RouteDetail's FIELDS and the schema snapshot, so the two cannot drift apart.

-- ---------------------------------------------------------------------------------------------
-- 1. contributions: the owner may approve an EDITED value; a whole pitch or rappel table fits.
-- ---------------------------------------------------------------------------------------------
-- `applied_value` is what the owner approved when it differs from what was submitted (null = as
-- submitted). The submitted `value` is never rewritten, so the ledger stays honest about who said
-- what; readers take coalesce(applied_value, value).
alter table contributions add column if not exists applied_value jsonb;

-- 0008 capped value at 4000 characters when the table was anonymous-writable. It is signed-in only
-- (0080, 0165), restricted-account-proof (0264) and rate-limited (0308) now, and a pitch-by-pitch
-- table for a 12-pitch route serialises past 4000. 20000 still refuses a pasted guidebook chapter.
alter table contributions drop constraint if exists contributions_value_len_ck;
alter table contributions add constraint contributions_value_len_ck
  check (value is null or length(value::text) <= 20000);
alter table contributions drop constraint if exists contributions_applied_value_len_ck;
alter table contributions add constraint contributions_applied_value_len_ck
  check (applied_value is null or length(applied_value::text) <= 20000);

-- The rate limit (0308) counts a contributor's field edits in the last day; the review queue reads
-- pending field rows oldest-first.
create index if not exists contributions_contributor_kind_idx on contributions (contributor, kind, created_at desc);
create index if not exists contributions_field_pending_idx on contributions (status, created_at) where kind = 'field';

-- ---------------------------------------------------------------------------------------------
-- 2. contribution_fields: the form key a climber edits -> the routes column it lands in.
-- ---------------------------------------------------------------------------------------------
-- The confidence rule needs the column to test "is this field empty on this route", and the form
-- keys are not column names (`rap` -> rappels, `gain` -> gain_ft, `pitchCount` -> pitches). The
-- app's own rename map (`M` in ClimbMatch.jsx) maps to the camelCase route PROPERTY, and
-- dbRouteToCamel renames again from the column, so neither can be reused in SQL; this is the one
-- table that states the column outright. `column_name` is null for the few keys the form offers
-- that have no column (they still get a level: medium until the owner approves something).
create table if not exists contribution_fields (
  form_key    text primary key,
  column_name text,
  is_prose    boolean not null default false,  -- free text an automated fill could have written
  is_gear     boolean not null default false,  -- covered by routes.gear_confidence
  label       text not null
);
alter table contribution_fields enable row level security;
drop policy if exists "contribution fields public read" on contribution_fields;
create policy "contribution fields public read" on contribution_fields for select using (true);

insert into contribution_fields (form_key, column_name, is_prose, is_gear, label) values
  ('name',               'name',                 false, false, 'Route name'),
  ('grade',              'grade',                false, false, 'Grade'),
  ('fa',                 'fa',                   false, false, 'First ascent'),
  ('rock',               'rock',                 false, false, 'Rock type'),
  ('aspect',             'aspect',               false, false, 'Aspect'),
  ('season',             'season',               false, false, 'Best season'),
  ('bestSeason',         'best_season',          true,  false, 'When to go'),
  ('protRating',         'prot_rating',          false, false, 'Protection rating'),
  ('draws',              null,                   false, true,  'Quickdraws'),
  ('screws',             null,                   false, true,  'Ice screws'),
  ('aidGrade',           'aid_grade',            false, false, 'Aid grade'),
  ('ropeLen',            'rope_length_m',        false, true,  'Rope length'),
  ('ropeType',           'rope_type',            false, true,  'Rope type'),
  ('ropeNote',           'rope_note',            true,  true,  'Ropework note'),
  ('alpineDraws',        'alpine_draws',         false, true,  'Alpine draws'),
  ('ascender',           'ascender',             false, true,  'Ascender'),
  ('pitchCount',         'pitches',              false, false, 'Pitches'),
  ('rack',               'rack',                 false, true,  'Rack'),
  ('gear',               'gear',                 false, true,  'Gear'),
  ('whatToBring',        'what_to_bring',        true,  true,  'Route-specific essentials'),
  ('haz',                'hazards',              false, false, 'Hazards'),
  ('objHaz',             'obj_haz',              false, false, 'Objective hazards'),
  ('watchOut',           'watch_out',            true,  false, 'Watch out for'),
  ('style',              'features',             false, false, 'Style'),
  ('landing',            'landing',              false, false, 'Landing'),
  ('pads',               'pads',                 false, false, 'Crash pads'),
  ('startType',          'start_type',           false, false, 'Start'),
  ('location',           'location',             false, false, 'Location on the wall'),
  ('bolts',              'bolts',                false, false, 'Bolts'),
  ('anchor',             'anchor',               false, false, 'Anchor'),
  ('fixedGear',          'fixed_gear',           false, false, 'Fixed gear'),
  ('rockQuality',        'rock_quality',         false, false, 'Rock quality'),
  ('wet',                'wet',                  false, false, 'Wet / seepage'),
  ('length',             'length_m',             false, false, 'Height / length'),
  ('crux',               'crux',                 false, false, 'Crux grade'),
  ('rockGrade',          'rock_grade',           false, false, 'Rock grade'),
  ('iceGrade',           'ice_grade',            false, false, 'Ice grade'),
  ('face',               'face',                 false, false, 'Face'),
  ('alpineGrade',        'alpine_grade',         false, false, 'Alpine grade'),
  ('commit',             'commitment',           false, false, 'Commitment grade'),
  ('condWindow',         null,                   false, false, 'Conditions window'),
  ('dist',               'dist_km',              false, false, 'Distance'),
  ('gain',               'gain_ft',              false, false, 'Elevation gain'),
  ('loss',               'loss_ft',              false, false, 'Elevation loss'),
  ('angle',              'max_angle',            false, false, 'Max angle'),
  ('rap',                'rappels',              false, false, 'Rappels'),
  ('rappelDetail',       'rappel_detail',        false, false, 'Rappels, station by station'),
  ('rappelCountNote',    'rappel_count_note',    true,  false, 'Rappel count note'),
  ('outingShape',        'outing_shape',         false, false, 'Trip shape'),
  ('permit',             'permit',               false, false, 'Permits'),
  ('permitUrl',          null,                   false, false, 'Permit link'),
  ('road',               'road',                 false, false, 'Road & driving'),
  ('access',             'access',               false, false, 'Access & permits'),
  ('timing',             'timing',               false, false, 'Published times'),
  ('approachLogistics',  'approach_logistics',   false, false, 'Trailhead & directions'),
  ('climate',            'climate',              false, false, 'Climate & forecast zone'),
  ('seasonalHazards',    'seasonal_hazards',     false, false, 'Seasonal hazards'),
  ('crowds',             'crowds',               false, false, 'Crowds & solitude'),
  ('partnerRequirements','partner_requirements', false, false, 'What a partner needs'),
  ('seasonalGuidance',   'seasonal_guidance',    false, false, 'Best window'),
  ('emergency',          'emergency',            false, false, 'Emergency contacts'),
  ('approach',           'approach',             true,  false, 'Approach'),
  ('descentText',        'descent_text',         true,  false, 'Descent'),
  ('overview',           'overview',             true,  false, 'Route description'),
  ('beta',               'beta',                 true,  false, 'Beta & pro tips'),
  ('comms',              'comms',                false, false, 'Cell / sat coverage'),
  ('approachVariants',   'approach_variants',    false, false, 'Ways in'),
  ('climbingRoute',      'climbing_route',       false, false, 'Climbing route sections'),
  ('pitchDetail',        'pitch_detail',         false, false, 'Pitch-by-pitch'),
  ('waypoints',          'waypoints',            false, false, 'Key waypoints'),
  ('bivy',               'bivy',                 false, false, 'Camping & bivy'),
  ('itinerary',          'itinerary',            false, false, 'Day-by-day plan'),
  -- Set by other flows than the edit sheet (discipline chips, the GPX uploader, topos); in `SS`.
  ('discipline',         'discipline',           false, false, 'Discipline'),
  ('rockStyle',          'discipline',           false, false, 'Rock style'),
  ('gpxPts',             'gpx',                  false, false, 'GPS track'),
  ('topo',               null,                   false, false, 'Topo')
on conflict (form_key) do update
  set column_name = excluded.column_name, is_prose = excluded.is_prose,
      is_gear = excluded.is_gear, label = excluded.label;

-- ---------------------------------------------------------------------------------------------
-- 3. route_field_confidence: ONLY the exceptions. The level of every other (route, field) is
--    computed from the routes row by route_field_level() in 0308, so nothing is materialised for
--    206,000 routes x 70 fields. A row lands here when the owner approves an edit (-> high) or
--    locks / unlocks a field by hand. Public read; written only by the 0309 functions.
-- ---------------------------------------------------------------------------------------------
create table if not exists route_field_confidence (
  route_id text not null references routes(id) on delete cascade,
  field    text not null references contribution_fields(form_key),
  level    text not null check (level in ('high', 'medium', 'low')),
  reason   text,
  set_by   uuid references auth.users(id) on delete set null,
  set_at   timestamptz not null default now(),
  primary key (route_id, field)
);
alter table route_field_confidence enable row level security;
drop policy if exists "field confidence public read" on route_field_confidence;
create policy "field confidence public read" on route_field_confidence for select using (true);

-- ---------------------------------------------------------------------------------------------
-- 4. contribution_standing: one row per climber whose route edits have ever been rejected (or whom
--    the owner restricted by hand). Read by its subject and by an admin; written only by 0309.
--      ok         - no consequence yet
--      warned     - 1+ strikes; told, still editing
--      restricted - 3+ strikes; cannot submit field edits until `until` (90 days); can still flag
--      banned     - 5+ strikes; cannot submit field edits or flags; may appeal
-- ---------------------------------------------------------------------------------------------
create table if not exists contribution_standing (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  status        text not null default 'ok' check (status in ('ok', 'warned', 'restricted', 'banned')),
  strikes       int  not null default 0 check (strikes >= 0),
  until         timestamptz,
  reason        text,
  last_strike_at timestamptz,
  set_by        uuid references auth.users(id) on delete set null,
  set_at        timestamptz not null default now(),
  constraint contribution_standing_until_only_when_restricted check (status = 'restricted' or until is null)
);
alter table contribution_standing enable row level security;
drop policy if exists "contribution standing read own or admin" on contribution_standing;
create policy "contribution standing read own or admin" on contribution_standing for select
  using (user_id = auth.uid() or is_admin(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 5. route_flags: "this is wrong" without the right value. `field` null = the whole route. One
--    open flag per reporter per target (re-flagging updates the note). Read by the reporter and by
--    an admin; written only through file_route_flag / resolve_route_flag (0309).
--    NOT user_reports/report_content (0263): those snapshot a piece of content with an author, hold
--    it at three reporters and hide it from the reader; a catalog field has no author, must never be
--    hidden by a flag, and the reporter must be able to see the outcome.
-- ---------------------------------------------------------------------------------------------
create table if not exists route_flags (
  id              uuid primary key default gen_random_uuid(),
  route_id        text not null references routes(id) on delete cascade,
  field           text references contribution_fields(form_key),
  note            text not null check (char_length(note) between 1 and 1000),
  reporter        uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references auth.users(id) on delete set null,
  resolution_note text
);
create unique index if not exists route_flags_one_open_per_target
  on route_flags (reporter, route_id, coalesce(field, '')) where status = 'open';
create index if not exists route_flags_open_idx on route_flags (status, created_at desc);
create index if not exists route_flags_route_field_idx on route_flags (route_id, field) where status = 'open';
create index if not exists route_flags_reporter_idx on route_flags (reporter, created_at desc);
alter table route_flags enable row level security;
drop policy if exists "flags read own or admin" on route_flags;
create policy "flags read own or admin" on route_flags for select
  using (reporter = auth.uid() or is_admin(auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- 6. user_notices: the first in-app notification TABLE. Until now every bell item was derived on
--    the client from other reads; a rejection reason, a warning or a flag outcome has no row to be
--    derived from, so it needs one. Read / mark-read / delete by its owner; inserted only by the
--    definer functions in 0309 (no insert policy, so a client cannot write somebody a "notice").
-- ---------------------------------------------------------------------------------------------
create table if not exists user_notices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('contribution_approved', 'contribution_rejected', 'contribution_warning',
                                           'contribution_restricted', 'contribution_banned', 'contribution_reinstated',
                                           'flag_resolved')),
  title      text not null check (char_length(title) between 1 and 200),
  body       text check (body is null or char_length(body) <= 2000),
  link       jsonb,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists user_notices_user_idx on user_notices (user_id, created_at desc);
alter table user_notices enable row level security;
drop policy if exists "notices read own" on user_notices;
create policy "notices read own" on user_notices for select using (user_id = auth.uid());
drop policy if exists "notices mark own read" on user_notices;
create policy "notices mark own read" on user_notices for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notices delete own" on user_notices;
create policy "notices delete own" on user_notices for delete using (user_id = auth.uid());

-- The owner may only flip read_at; the words of a notice are not theirs to rewrite (0263's
-- guard_message_update shape).
create or replace function guard_notice_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.user_id is distinct from old.user_id
     or new.kind  is distinct from old.kind
     or new.title is distinct from old.title
     or new.body  is distinct from old.body
     or new.link  is distinct from old.link
     or new.created_at is distinct from old.created_at then
    raise exception 'a notice cannot be rewritten';
  end if;
  return new;
end;
$$;
drop trigger if exists user_notices_guard_update on user_notices;
create trigger user_notices_guard_update before update on user_notices
  for each row execute function guard_notice_update();

-- ---------------------------------------------------------------------------------------------
-- 7. The audit log learns the route-data actions (one ledger for everything the owner does).
-- ---------------------------------------------------------------------------------------------
alter table moderation_actions drop constraint if exists moderation_actions_action_check;
alter table moderation_actions add constraint moderation_actions_action_check
  check (action in ('remove', 'hold', 'restore', 'auto_hold', 'suspend', 'ban', 'reinstate', 'remove_all',
                    'approve_contribution', 'reject_contribution',
                    'contrib_warn', 'contrib_restrict', 'contrib_ban', 'contrib_reinstate',
                    'lock_field', 'unlock_field', 'flag_fixed', 'flag_dismissed'));

-- Confirm (each on its own):
--   select count(*) from contribution_fields;                      -- 76
--   select conname from pg_constraint where conname like 'contributions_%len_ck';  -- 2 rows
--   select relname from pg_class where relname in ('route_field_confidence','contribution_standing','route_flags','user_notices');
