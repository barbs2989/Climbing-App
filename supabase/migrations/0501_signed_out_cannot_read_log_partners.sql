-- 0501: a signed-out reader cannot see WHO a climber climbed with.
--
-- Owner, 2026-11-23: "dont have names for signed out". Everyone-visible trip reports stay readable
-- signed out (0272/0273), but climb_logs.partners -- the account ids of the people a climber logged
-- the climb with -- came back to the anon key on every one of them (probed: 28 public logs, ids
-- included). The app never draws them for anyone but the climber (the résumé leaves them out, trip
-- report reads never ask for them), and the typed names live in climb_log_partner_names, which anon
-- cannot read at all. So the column is taken away from anon only:
--   * the table-level SELECT is revoked from anon, and every OTHER column is granted back by name, as
--     0435 did for profiles. RLS still decides WHICH rows (0273's public reports); this decides which
--     columns. Signed-in readers are unchanged.
--   * select * on climb_logs is refused signed out. The client's one `*` read of someone else's logs
--     (useUserLogs, the résumé) now names its columns.
--
-- A climb_logs COLUMN ADDED AFTER THIS is invisible to signed-out readers until its migration grants
-- it to anon; check:profile-privacy fails when one is not (and when partners is readable).

begin;

revoke select on public.climb_logs from anon;

do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'climb_logs' and column_name <> 'partners';
  execute format('grant select (%s) on public.climb_logs to anon', cols);
end $$;

comment on column public.climb_logs.partners is
  'Account ids of the people this climb was logged with. Not readable signed out (0501): every other column is granted to anon by name.';

commit;
