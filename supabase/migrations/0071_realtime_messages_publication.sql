-- Chat realtime never worked: ClimbMatch.jsx subscribes to postgres_changes on
-- crews_messages and messages (crew chat / DMs), but neither table was ever added
-- to the supabase_realtime publication, so the subscription reaches SUBSCRIBED and
-- then delivers nothing — verified 2026-07-30 with a two-account probe (SUBSCRIBED,
-- insert 201, no event). Realtime checks the subscriber's SELECT policies, so the
-- existing RLS (confirmed crew members / sender-or-recipient) still gates delivery.

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crews_messages') then
    alter publication supabase_realtime add table public.crews_messages;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
