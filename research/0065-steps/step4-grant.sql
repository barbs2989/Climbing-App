-- STEP 4 of 5 — let the app read it. Without this, anon gets a permissions error rather
-- than the timeout it used to get, which would look like a regression.

grant select on route_duplicate_names to anon, authenticated;

-- VERIFY: expect two rows, anon and authenticated.
select grantee, privilege_type from information_schema.role_table_grants
where table_name = 'route_duplicate_names' and grantee in ('anon','authenticated');
