-- Saved searches are gone (owner, 2026-11-05: "Remove saved searches features and everything
-- related to that"). The Route finder's Save search, the Climbs tab's Save this search, the
-- Logbook > Saved > Searches card and the Menu tile were removed in the same PR, and lib/db.js no
-- longer reads or writes this table, so the table (0091) goes with them. Nothing else referenced
-- it: no function, view, trigger or policy outside its own four.
--
-- Rows held here were private filter sets; there is no reader left to miss them.

drop table if exists public.saved_searches;

-- Confirm -- expect 0 rows:
--   select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saved_searches';
