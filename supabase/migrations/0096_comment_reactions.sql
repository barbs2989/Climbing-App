-- Emoji reactions on comments.
--
-- The 21-emoji picker (REACTIONS + ReactionPicker in ClimbMatchCore.jsx) has only ever
-- been wired to group posts, where the reaction map is a useState object and vanishes on
-- refresh. Every other discussion surface -- route Overview/Conditions/Plan/Partners/Safety,
-- area discussion, and trip reports -- had a bare "Like" and nothing else. This table backs
-- the picker everywhere, so a reaction is worth the same on every surface.
--
-- WHY A JOIN TABLE AND NOT A COUNTER. `comments.likes` is a plain int (see the NOTE ON
-- LIKES at the bottom of 0069): it cannot say who liked what, cannot stop one climber
-- incrementing it repeatedly, and forces the UI to keep the viewer's own like in local
-- state where it disagrees with the server the moment anyone else clicks. 0069 called that
-- out as the wrong shape and deliberately did not build the fix. This is the fix, for
-- reactions: the primary key IS (comment_id, user_id), so one climber holds at most one
-- reaction per comment and the count is derived by counting rows, never by trusting a
-- number a client sent.

create table if not exists comment_reactions (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Shape, not vocabulary. Pinning the 21 current keys here would mean a DB migration
  -- every time the picker gains an emoji, and a silent write failure until it was applied.
  -- The UI resolves a key through REACTIONS and renders nothing for one it does not know,
  -- so an unrecognised key is inert rather than dangerous -- and the primary key below
  -- caps each climber at one row per comment, so junk cannot accumulate.
  reaction text not null check (reaction ~ '^[a-z0-9]{1,24}$'),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Every read is "all reactions for these comments" and arrives as a PostgREST embed on
-- comments, which resolves through the foreign key on comment_id -- the primary key's
-- leading column already indexes that. No second index is needed.

alter table comment_reactions enable row level security;

-- Comments are public (0069), so their reactions are too. A signed-out climber reading
-- route beta sees the same counts as a member.
drop policy if exists "comment reactions public read" on comment_reactions;
create policy "comment reactions public read" on comment_reactions
  for select using (true);

-- Constrain WHAT as well as WHO (0082/0085): user_id is pinned to the caller so a client
-- cannot attribute a reaction to someone else, and the key must match the shape above.
drop policy if exists "comment reactions insert own" on comment_reactions;
create policy "comment reactions insert own" on comment_reactions
  for insert with check (auth.uid() = user_id and reaction ~ '^[a-z0-9]{1,24}$');

-- Changing your reaction is an update on the (comment_id, user_id) key. USING pins which
-- rows you may touch; WITH CHECK pins what they may become -- without the second half an
-- update could hand your row to another user_id.
drop policy if exists "comment reactions update own" on comment_reactions;
create policy "comment reactions update own" on comment_reactions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and reaction ~ '^[a-z0-9]{1,24}$');

-- Tapping the reaction you already gave removes it. That is a delete rather than a third
-- state so a count never has to guess what a present-but-empty row means.
drop policy if exists "comment reactions delete own" on comment_reactions;
create policy "comment reactions delete own" on comment_reactions
  for delete using (auth.uid() = user_id);

-- Confirm -- expect the table and 4 policies:
--   select policyname, cmd from pg_policies where tablename = 'comment_reactions' order by cmd;
--   select count(*) from comment_reactions;
