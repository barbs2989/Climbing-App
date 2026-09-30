# Migration numbers and the Supabase GitHub integration — read this before adding one

## Since 2026-09-26 this folder is REPLAYED, not just read

The Supabase GitHub integration is on (a decision the owner confirmed on 2026-09-30). Two things follow:

- **Every PR that touches `supabase/migrations/` gets a preview branch**: an empty database that
  runs every file here in filename order, keyed by its number prefix, then `supabase/seed.sql`.
  That is the "Supabase Preview" check. A shared number, a statement that only works on the
  loaded catalog, or a column created by hand in the SQL editor fails it.
- **A merge to `main` applies every migration production has not RECORDED** in
  `supabase_migrations.schema_migrations` (the integration's tracking table). Nothing else is
  deployed: auth, API and seed settings are ignored for production.

## The rule that follows: record what you apply by hand

Migrations here are applied by hand (`npx supabase db query --linked -f <file>`) and probed before
the PR merges. **Record the version in the same step**, or the merge will apply the file a second
time — harmless for `create or replace` / `if not exists`, not for a `create policy`, an `insert`,
or a data update that a later session has since corrected:

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('0225', 'declare_four_hand_built_indexes')   -- number, and the file name after it
on conflict (version) do nothing;
```

`npx supabase migration list --linked` shows local and recorded versions side by side; every file
on `main` should have both columns filled.

**Expect one harmless window.** Between recording a version and its PR merging, production lists a
version `main` does not have, and any production deploy in that window stops with "remote migration
versions not found in local migrations directory", applying nothing. It clears when the PR merges.
That is the safe side of the trade: recording AFTER the merge instead would let the merge re-apply
the file.

## Numbering

1. `ls supabase/migrations/ | tail -20` and take the next free **four-digit** number, then check
   open PRs (`npm run check:migration-claims`) — parallel sessions collide here constantly.
2. `npm run check:migrations` refuses two files sharing a number. Its baseline is **empty** and must
   stay that way.

The 28 FIVE-digit files (`00250_…` to `00871_…`) are the 13 numbers that used to be shared, each
group renumbered NNNN0, NNNN1, … in filename order on 2026-09-30 so a preview could replay them.
Their content ran long ago; production's history was re-recorded under the new versions.

## A migration must replay on an EMPTY database too

A preview starts empty — no catalog. So:

- **Catalog data** (areas and routes that only exist because an import loaded them) must not raise
  when its parent is absent. Guard it: `insert … select … where exists (parent)`, or wrap the file
  in `do $$ begin if not exists (…) then return; end if; … end $$;` (0137 shows the shape).
- **Never write a column or index the migrations never created.** If one was made by hand in the
  SQL editor, declare it in a migration first (0168, 0225).
- `CREATE INDEX CONCURRENTLY` cannot run in a migration's transaction. Put a plain
  `create index if not exists` in the file; build the concurrent one by hand on production first,
  and the migration then finds it and does nothing.

To check before pushing, the owner's session keeps a PGlite replay harness (it stands in for the
`auth`/`storage` schemas, the roles and the realtime publication); see the
`supabase-github-integration-replay-hazard` memory.

## Before changing something an older migration touched

1. Search for it: `grep -rn "<function or table>" supabase/migrations/`. If a recent migration
   already touches it, read that file first — it may already do what you are planning, or
   explain why it wasn't done. (The same function was once rewritten twice in one afternoon:
   `00651_widen_route_name_placeholder.sql`, then `0066`, with `0067` as the repair.)
2. If you replace a function used in an index predicate, the index must be **DROP + CREATE**.
   `REINDEX` is a no-op: the predicate is stored inlined in `pg_index.indpred`, and REINDEX
   rebuilds from that stored copy. See `0067` for the detail and the verified evidence.

## Related habit

`CLAUDE.md` covers the bigger version of this: a migration file is not applied state, and
"success" in the SQL editor means the statement parsed, not that anything changed. Run
`npm run check:sql -- file.sql` before handing SQL over.
