-- Route discussion + per-pitch comments. The last feature still living only in
-- React state: `useState(COMMENTS)` in App, seeded from a module constant, so a
-- climber writes route beta, refreshes, and it is gone. The Comments component is
-- mounted in six places (route Overview, Conditions, Planner, Partners, Safety,
-- and per-pitch inside PitchTable), all of which look durable and are not.
--
-- target_id is the app's existing addressing scheme, kept verbatim so no UI
-- changes are needed to decide what a comment is attached to:
--     <route_id>                  route discussion (Overview)
--     <route_id>__conditions      Conditions tab
--     <route_id>__planner         Plan tab
--     <route_id>__partners        Partners tab
--     <route_id>__safety          Safety tab
--     <route_id>_pitch_<n>        a single pitch, n from PitchTable's normalised _n
--
-- It is deliberately text and NOT a foreign key to routes(id): the suffixed forms
-- above are not route ids, and route ids themselves are still being migrated to a
-- peak-scoped scheme (see 0062-0064). A hard FK would break on both counts.

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  target_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade, -- reply threading; null = top level
  text text not null,
  edited boolean not null default false,
  deleted boolean not null default false, -- tombstone: kept so replies below it survive
  likes int not null default 0 check (likes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every read is "all comments for this target, oldest first".
create index if not exists comments_target_created_idx
  on comments (target_id, created_at);

-- Reply lookups walk down from a parent.
create index if not exists comments_parent_idx
  on comments (parent_id) where parent_id is not null;

alter table comments enable row level security;

-- Route beta is public, same as the route it describes.
create policy "comments public read" on comments
  for select using (true);

-- Authenticated users post as themselves. The with check pins user_id to the
-- caller so a client cannot attribute a comment to someone else -- the same spoof
-- hole 0009 closed on contributions.
create policy "authed can comment" on comments
  for insert with check (auth.uid() = user_id);

-- Authors edit and delete only their own. Deliberately NOT "for all": that would
-- also grant insert and let a client bypass the pinning above.
create policy "edit own comment" on comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own comment" on comments
  for delete using (auth.uid() = user_id);

-- Keep updated_at honest rather than trusting the client to send it.
create or replace function comments_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists comments_set_updated_at on comments;
create trigger comments_set_updated_at before update on comments
  for each row execute function comments_touch_updated_at();

-- NOTE ON LIKES: `likes` is a plain counter, so it cannot tell who liked what and
-- offers no protection against one user incrementing repeatedly. The UI shows the
-- viewer's own like from local state only. A real implementation needs a
-- comment_likes(comment_id, user_id) join table with a unique constraint; that is
-- intentionally not built here rather than shipping a number that looks
-- authoritative and is not.
