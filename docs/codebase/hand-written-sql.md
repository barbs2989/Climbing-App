# Hand-written SQL pasted into the Supabase SQL Editor

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.

`patchRow` only guards writes that go through a script. Structural changes here are
routinely handed to the user as copy-paste SQL, and that path has no such guard: the
SQL Editor reports **success for an UPDATE or DELETE that matched zero rows**. Success
means the statement parsed, not that anything changed.

**Run `npm run check:sql -- fix.sql` before handing any .sql file over.** It reads the
live DB and fails on:

- target ids that do not exist — the statement would report success and do nothing
- a `DELETE` removing the last row with that name on its peak — the only copy
- files or statements large enough to be truncated on paste

Pass `--table areas` for an area file. It **fails closed** if the file writes to a table it
was not checked against, so a structural edit cannot be silently verified as "nothing to
check" — the `areas` mode had never once worked before that, since it asked PostgREST for
`areas.area_id`.

**Dissolving an emptied container is a distinct operation from a dedup**, and the only-copy
rule could not express it. `0119` moves 15 peaks out of a region and then deletes the
region: there is no twin, because the row is a grouping node being retired, not half of a
duplicate pair. Before this the delete could only pass by naming some unrelated row as its
"twin" — a false claim the script would then print as though verified, and *a rule you can
only satisfy by lying is worse than no rule*. Such a `DELETE` is now allowed **only when the
statement proves the row is empty in SQL**: a `NOT EXISTS` guard on child areas *and* one on
routes, both naming the row being deleted. That cannot be checked against the live DB — the
row still has its children until the transaction runs — so it is matched in the statement
text, and it makes the delete fail-safe by construction: if any move above it matched
nothing, the guard holds and zero rows go. Both guards are required and each is tested
separately; half a proof is not a proof, since an area with no children can still hold
routes directly and one with no direct routes can still have a populated subtree. The rule
is scoped to `--table areas` — deleting a *climb* always needs its twin.

On 2026-07-28 five fixes were reported applied that had matched nothing, because their
ids were composed from route display names instead of looked up. One of them caused data
loss: `wa_dragontail_peak_r4` and `wa_dragontail_peak_triple_couloirs` were flagged as a
duplicate pair, so the plan was "keep r4, delete triple_couloirs" — but r4 was not in the
live DB, so triple_couloirs was the only copy, and Triple Couloirs was destroyed. It was
rebuilt from `catalog/wa-alpine/routes.json`.

Two habits that follow from it: a duplicate flag is a hypothesis, so confirm **both** ids
return rows before deleting either half; and when anything may be writing concurrently,
write `col = coalesce(col, <value>)` so a restore can only fill blanks — a plain
assignment overwrote a richer `hazards` enrichment during that recovery.
