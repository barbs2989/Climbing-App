-- STEP 1 of 5 — drop the old view.
-- If this fails with "cannot drop ... because other objects depend on it", stop and send
-- me the dependency list; do NOT add cascade blindly, it would drop the dependents too.

drop view if exists route_duplicate_names;

-- VERIFY: expect ZERO rows.
select relname, relkind from pg_class where relname = 'route_duplicate_names';
