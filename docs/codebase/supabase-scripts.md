# One-off scripts that touch Supabase

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.


**THE `--linked` GUARDS CANNOT RUN FROM A WORKTREE UNTIL YOU SYMLINK THE LINK STATE, and they
fail in a way that reads like a broken guard rather than a missing file.** `check:function-drift`
and `check:function-columns` shell out to `npx supabase db query --linked`, whose project ref lives
in `supabase/.temp/` — gitignored, so a worktree does not have it. The CLI answers
`LegacyProjectNotLinkedError: Cannot find project ref`, and the guard correctly refuses (*"cannot
report on a database it did not reach. Not a pass."*). Fix it the way `.env` and `.env.local`
already are:

    ln -s /ABSOLUTE/PATH/TO/Climbing-App/supabase/.temp supabase/.temp

That directory holds a project ref, a pooler host and component versions — no credentials; the
access token lives in the CLI's own config. The ignore pattern is `supabase/.temp` with **no
trailing slash** on purpose: the slashed form matches a DIRECTORY only, so the symlink showed up as
untracked and was one `git add .` away from committing one developer's linked project. Verified
that the slashless form still ignores the real directory in the main checkout.

Both guards were run this way on 2026-09-02 and both are clean — 45 of 46 live functions match
their newest migration (1 declared benign), and every column the 11 writing functions touch exists.
`check:column-drift` needs **no link** — it does not shell out to the CLI — but it is **not**
anon-safe: it fetches PostgREST's OpenAPI root, which answers the anon key **401**, so it needs
the **service key**, exactly as its own `EXCLUDED` reason in `check:guard-wiring` says. This
file carried *"needs no link (anon key)"* from 2026-09-02 until 2026-09-04 — half right, which
is the most misleading shape, and it sat in the paragraph telling you how to run the three
hand-run guards, two sentences after the rule that CI must never hold that credential. Section 5
of `check:guard-wiring` now reads this document against those reasons, because **a stated
credential is a hand-copy wherever it lives** — the argument section 4 of `check:screen-lists`
already makes for a stated vocabulary. Injection-tested **4/4**
(`scripts/oneoff/inject-credential-claim-cases.mjs`), each case proving its edit landed **by
checksum** and restoring the file byte-identically; the first case is the real sentence restored
verbatim, and **two must stay SILENT** — citing `check:signed-in`'s anon-key accounts as the
PRECEDENT for an exemption is correct prose, and so is saying `check:counts` is anon-key, which
it genuinely is. The harness also refuses any expectation matching the HEALTHY run, because a
case written against the text an assertion prints when it PASSES reports MISSED against a guard
firing correctly — a mistake I made twice in one day before making it structural. Re-run
2026-09-04 with the key: **41 tables / 484
columns** (0174 and 0175 account for the growth from 480), all three sections clean, snapshot
current.

**ALL THREE RE-RUN 2026-09-10, AFTER 0176-0180 LANDED — CLEAN, and the point of recording it is
that the numbers above had gone stale.** Five migrations merged since that run, four of them RLS
and policy work, and `check:rls` is **static** — it replays the migration FILES and never asks the
live database — so these three are the only things that compare the two. Results:
`check:column-drift` **41 tables / 485 columns**, all three sections clean and the committed
snapshot matching; `check:function-columns` **11 writing functions, 6 insert lists, 9 update
lists**, every column exists; `check:function-drift` **47 live functions, 46 agreeing** plus the
one declared `handle_new_user`. A negative result, which is what these exist to produce — and it
is worth writing down, because otherwise the next session either re-derives it or quotes 484.

**A worktree has no `.env` either, and that is the same trap one file over.** The instruction
above says to fix the link *"the way `.env` and `.env.local` already are"* — which presumes they
are symlinked, and in a fresh worktree they are not, so every DB-touching guard and audit dies on
`SUPABASE_SERVICE_KEY missing`. Symlink all three:

    ln -s /ABSOLUTE/PATH/TO/Climbing-App/.env       .env
    ln -s /ABSOLUTE/PATH/TO/Climbing-App/.env.local .env.local

Both patterns are in `.gitignore` and a symlink is not a directory to git, so neither shows up as
untracked.

**No script carries a project URL or a key as a literal.** A script in `scripts/oneoff/` reads
`process.env.VITE_SUPABASE_URL` and `process.env.VITE_SUPABASE_ANON_KEY`, and a writer calls
`requireServiceKey()`. Start it with a side-effect import of `scripts/lib/load-env.mjs`, which copies
the values from `.env` and `.env.local` into `process.env`. The relative import path depends on depth:
one level down (`scripts/oneoff/`) is `../lib/`, and the top of `scripts/` is `./lib/`.
`.env.example` lists the names. `npm run check:no-secrets` fails the build if a literal comes back.

**The throttle rule is enforced in `supabase-env.mjs` (2026-10-28).** `patchRow` spaces writes at
least 1000 ms apart across the process; `selectAll` pauses 200 ms between pages and backs off a
minute after a page slower than 10 s; both time a request out at 30 s and, on a timeout or 5xx,
back off a minute and retry ONCE, then throw "STOPPED … the database is not answering". Do not
catch that and loop: it is the owner's stop-when-reads-slow rule. Overrides
(`SUPABASE_WRITE_PACE_MS`, `SUPABASE_PAGE_PACE_MS`) are for a measured reason on a quiet database
only. Added after a one-row read took 105 s while several sessions audited at once.

Import `scripts/lib/supabase-env.mjs` — do not hand-roll env loading. The
credentials are split across two gitignored files (`SUPABASE_SERVICE_KEY` in
`.env`, the `VITE_*` url/anon key in `.env.local`), so a script that reads only
one file gets `undefined` for the other half. That fails silently in the worst
way: PostgREST accepts a PATCH sent with the anon key and returns **200 with an
empty array**, because RLS rejected every row. The write reports success and
changes nothing.

**The same trap runs on the READ side, and there it corrupts DECISIONS rather than writes.**
An anon `count=exact` on an RLS-protected table returns **0 with a 200** whatever the table
holds, indistinguishable from a genuinely empty table. Measured 2026-08-20: `climb_logs` reads
**0 to anon and 2 to the service key**, while `guide_documents`, `guide_profiles`,
`user_reports`, `contributions` and `vouches` are genuinely empty on both (`belay_catches` was too, and was dropped in 0417).

That distinction is load-bearing here, because several decisions rest on a table being empty —
the guide application review queue was deliberately **not built** because `guide_documents` had
"0 rows live". That call is *verified correct* by the numbers above and should not be
re-litigated; it was also one RLS policy away from being a decision made on nothing. So **when a
row count is going to decide something, read it with `requireServiceKey()` and print the anon
number beside it**, rather than assuming they agree.
`scripts/oneoff/probe-latent-claims-anon-vs-service.mjs` does that for the tables whose
emptiness is load-bearing; extend its list rather than writing another one-off.

Pass `{ pageSize: 1000 }` to `selectAll` for anything scanning the whole `routes`
table — the default 60 means ~3,400 round trips and takes over ten minutes.

- `requireServiceKey()` throws instead of degrading to the anon key. Use it for anything that writes.
- `patchRow(table, id, body)` throws unless exactly one row came back, so a wrong id or an RLS rejection can't read as success.
- `selectAll(table, select, filter)` paginates by keyset. Offset paging over a filtered, unindexed column times out on the 200k-row `routes` table, and an unordered `.range()` silently skips/duplicates rows.
- `stateIdFilter("wa")` is the filter for one state's ids. Use it, not `id=like.wa_*`. A LIKE
  prefix cannot use the id index under this collation, so with a wide column in the select (waypoints,
  prose) page 1 is a 205k-row scan that the anon role's ~3 s timeout cancels: HTTP 500 `57014` on a
  healthy database. The same holds for a wide select filtered on an unindexed column (`bivy=not.is.null`).
  Read the ids alone, then the wide columns by `id=in.(…)` in chunks of about 100.

After any batch write, re-read the affected ids and reconcile counts. A 200 is not evidence the data changed.

## The schema document: `SUPABASE_SCHEMA.sql`

`SUPABASE_SCHEMA.sql` at the repo root is the live `public` schema: every table's `CREATE TABLE`
(types, NOT NULL, defaults, identity, primary/unique/check/foreign keys), the foreign-key index,
RLS flags and every `CREATE POLICY`. It is **generated**, not written by hand, from the catalog
through the linked CLI (one read-only SELECT):

    npm run gen:schema                # rewrite the file from the live database
    npm run gen:schema -- --check     # exit 1 if the committed file has drifted from live

Run `npm run gen:schema` after ANY change to the database structure (a migration, a DDL run in
the SQL Editor, a policy edit) and commit the result in the same PR. It needs the link state
(`supabase/.temp`) and so, like the function guards, cannot run in a fresh worktree until that is
symlinked. It is deliberately not part of `npm run build`: the build must never reach the live
database. Views, functions, triggers and standalone indexes are not in it; the migrations are.

## When EVERY read times out: three causes, told apart in minutes

Learned in the 2026-11-11 outage (three hours of timeouts on every app and CI read). Run these
read-only, from a worktree with `supabase/.temp` symlinked (`--read-only` needs no confirmation):

1. **Is the project up at all?** `GET <url>/auth/v1/health` answers without touching Postgres. If
   it answers and a one-row REST read (`/rest/v1/areas?select=id&limit=1`) hangs, the API layer or
   the database is the problem, not the project. Supabase's status page being green rules out a
   platform incident.
2. **Is PostgREST's pool full of stuck transactions?** Count `pg_stat_activity` rows for
   `application_name like 'PostgREST%'` by `state`. Many `idle in transaction` rows (17 on the day)
   mean requests queue for a connection that never frees. `pg_terminate_backend(pid)` on those
   rows frees them at once (a write on production: ask the owner). Migration 0416 now makes
   Postgres end any such session after 60 s by itself, but only on connections opened AFTER it was
   applied: a role setting is read at login. Check that every PostgREST row's `backend_start` is
   later than the apply. A second episode (2026-11-12, 00:16–06:45 UTC: the database ~11% busy,
   the API timing out) ended the moment the whole pool reconnected at 06:59, on 0416's setting.
3. **Is the disk I/O budget spent?** Reads that come back `500 57014 canceling statement due to
   statement timeout` (anon's limit is ~3 s) or `503 PGRST002 Could not query the database for the
   schema cache` while nothing is blocked (`pg_blocking_pids` empty) and no query is long-running
   point here. Smaller compute sizes get a daily disk I/O burst budget; once it is spent the disk
   runs at baseline and everything crawls. Only the dashboard shows it (Observability → Database
   Health). The fixes are the owner's: wait for the daily refill, or raise the compute size. What
   spends it here: bulk writes (route throttled writes through `~/dev/db-throttle/dbslot.mjs`, one
   session at a time) and the browser walks every PR and merge runs against production.

`pg_stat_user_tables` showing `n_live_tup = 0` and no `last_analyze` on a 100+ MB table means its
statistics were reset (typically by a restart). The planner then picks poor plans until autovacuum
re-analyzes it; `analyze public.areas; analyze public.routes;` does it at once, but cannot run while
the database is too saturated to accept a connection.
