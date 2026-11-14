-- A take-down reaches every open screen at once, not at its next refetch.
--
-- 0326 made comments and group feeds live (lib/live.js). It left one hole, written down in
-- docs/features/route-page.md: moderate_content() takes a row down with an UPDATE of
-- `moderation`, and Realtime applies RLS to an UPDATE, so the restrictive "moderation hides
-- taken-down content" policy (0263) stops the change from being SENT to anyone but its author and
-- an admin. Everyone else reading that thread kept the removed comment or post on screen until a
-- refocus, a reload or a write of their own refetched it. For abuse that ClimbMatch Safety just
-- removed, that is the wrong way round.
--
-- So when `moderation` leaves 'visible' on comments or group_posts, this trigger broadcasts the
-- bare row id on the public Realtime topic `moderation` (realtime.send, private = false). The
-- payload is { table, id } and nothing else: the same thing an unfiltered DELETE already tells
-- every subscriber (0326), and never the words. lib/live.js treats it as a DELETE of that id,
-- checked against the rows each query already holds, so only a screen that shows the row
-- refetches, and the refetch goes back through RLS.
--
-- A restore ('held'/'removed' -> 'visible') needs nothing here: the row becomes readable again,
-- so its UPDATE passes RLS and reaches readers through Postgres Changes as before.
-- A failed broadcast never blocks the take-down: realtime.send is wrapped, and the row is already
-- hidden from every read either way.

create or replace function broadcast_moderation_takedown() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if old.moderation = 'visible' and new.moderation <> 'visible' then
    begin
      perform realtime.send(jsonb_build_object('table', tg_table_name, 'id', new.id), 'taken_down', 'moderation', false);
    exception when others then
      raise warning 'moderation broadcast failed for %.%: %', tg_table_name, new.id, sqlerrm;
    end;
  end if;
  return null;
end;
$$;
revoke all on function broadcast_moderation_takedown() from public, anon, authenticated;

drop trigger if exists comments_broadcast_takedown on comments;
create trigger comments_broadcast_takedown after update of moderation on comments
  for each row execute function broadcast_moderation_takedown();
drop trigger if exists group_posts_broadcast_takedown on group_posts;
create trigger group_posts_broadcast_takedown after update of moderation on group_posts
  for each row execute function broadcast_moderation_takedown();
