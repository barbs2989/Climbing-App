-- Comments and group posts go live (lib/live.js). useComments and useGroupFeed now subscribe to
-- Postgres Changes on these four tables and refetch when a row they hold changes, so a climber
-- reading a route's discussion or a group's feed sees what someone else just wrote without a
-- reload. A table outside the supabase_realtime publication lets the channel reach SUBSCRIBED
-- and then deliver nothing (0071 found that for chat), so each is added here.
--
-- Delivery stays gated by the existing SELECT policies: Realtime checks the subscriber's RLS for
-- INSERT and UPDATE ("comments read where the target is readable" + the moderation restrictive
-- policy; "group posts read by members"; "post reactions read by members"; comment reactions are
-- public read). DELETE is not RLS-filtered and carries only the primary key, so the client checks
-- it against the rows it already holds. Replica identity stays DEFAULT: nothing reads the old row.

do $$
declare t text;
begin
  foreach t in array array['comments', 'comment_reactions', 'group_posts', 'group_post_reactions'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
