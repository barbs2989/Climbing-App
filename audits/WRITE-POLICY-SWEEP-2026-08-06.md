# Write-policy sweep — who may write the row vs. what they may put in it

Read against `main` on 2026-08-06, after #590. Prompted by the guide-credential hole 0082
closed: an INSERT policy that gates **who** may write a row and says nothing about **what**
they may put in a column that confers privilege, reputation, or a review outcome.

Method: every `create policy` in `supabase/migrations/` parsed to its final state (a later
file's drop+create wins), then the INSERT/UPDATE/ALL ones cross-checked against the **live**
column list — read from the running database's PostgREST OpenAPI schema, not from the `.sql`
files, because [[migration-files-are-not-applied-state]].

**83 live policies over 29 tables; 42 of them write.** Five more instances of the shape,
plus one residual gap that needs a schema change.

---

## Not a finding — recorded so it is not re-flagged

Six UPDATE policies declare `using (...)` with no `with check`: `climb_logs`, `objectives`,
`crews`, `messages`, `account_links`, `crew_reads`. This is **safe**. Postgres reuses the
USING expression as the WITH CHECK for UPDATE, so ownership is still enforced on the new row.
It looks like a hole and is not one.

---

## Findings

### 1. `reviews` — a guide could rewrite the rating they were given. **High**

`"reviews guide reply"` is `for update using (guide_id = auth.uid())`, meant so a guide can
answer a review. It constrains no columns, so the same statement can set `rating = 5` and
replace `text`. The climber who wrote the review has **no** UPDATE policy — so the only
person who can edit a review is the guide it judges.

On a hire-a-guide surface the rating is the trust signal. `postGuideReply()` writes only
`guide_reply`/`guide_reply_at`, so the app is well-behaved — but the anon key ships in the
bundle, so the app was never the boundary.

Fixed by a trigger: on UPDATE only `guide_reply`/`guide_reply_at` may change. Admins pass
through; a service-role script does not (`auth.uid()` is null), so out-of-band moderation
should disable the trigger for the statement, as 0083 does.

Worth noting what was already right: `reviews.inquiry_id` is `unique` and the insert policy
requires a matching inquiry owned by the climber, so reviews cannot be stuffed.

### 2. `verification_records` — any user could mark their own verification 'verified'. **High**

`"add own verification"` and `"update own verification"` gate only `user_id = auth.uid()`,
and the table carries `status` + `verified_at`. `lib/db.js` shipped `verifyRecord()`, which
set `status:'verified'` straight from the client.

The shipped flow is honest — the app calls it only after Supabase's own
`session.user.email_confirmed_at` is set — but nothing in the database enforced that, and
the badge feeds the trust score.

Fixed: insert pinned to `pending`, self-update forbidden from reaching `verified`, and the
one verification the server can actually attest moved into `verify_my_email()`, a
SECURITY DEFINER function that reads `auth.users.email_confirmed_at` itself. `verifyRecord()`
is deleted; `verifyMyEmail()` replaces it at both call sites.

### 3. `crew_members` — a user could insert themselves straight in as 'confirmed'. **Medium**

`"join or invite"` allowed `auth.uid() = user_id` with any status. Confirmed membership is
not cosmetic: `datesAgreed()` counts confirmed members, and 0081's `"view crew logs"` policy
makes a crew's trip reports readable to confirmed members — so this is a read-privacy path,
not only a nuisance.

Fixed for the direct case: a non-organizer may only insert themselves as not-yet-confirmed.

> **Residual gap, deliberately left open.** A user may still self-insert as `'invited'` and
> then flip themselves to `'confirmed'` via `"self or organizer can update membership"` —
> because nothing records *who* created the row, so an organizer's invite and a self-invite
> are indistinguishable. Closing it needs an `invited_by uuid` column defaulted to
> `auth.uid()` and checked against `crews.created_by`: a schema change plus a client change,
> not a policy tweak. **Not closed in 0085.**

### 4. `gps_submissions` — anyone could insert an already-approved submission. **Medium**

0042's `"anyone_can_submit_gps"` is `with check (true)`, and the table carries `status`,
`quality_score`, `approved_at`, `approved_by`, `admin_notes`. Approval is meant to come from
the `approve-gps-submission` edge function behind its admin guard.

Fixed: insert pinned to `status='pending'` with the approval columns null. `quality_score` is
deliberately **not** pinned — the `validate-gps` function inserts the score it just computed
using the service key, which bypasses RLS anyway.

### 5. `inquiries` — a climber could file one already marked 'accepted'. **Low**

`"inquiries climber insert"` checks only `climber_id = auth.uid()`. `status` defaults to
`'new'` but is client-writable, and the guide dashboard counts `status='new'` — that count is
the Me-tab badge from #579, so a pre-'accepted' inquiry would be invisible in it.

Fixed: insert pinned to `status='new'`, `guide_responded_at` null.

### 6. `user_reports` — a reporter could file a report pre-marked 'resolved'. **Low**

0078 grants INSERT `to public with check (true)`, deliberately, so a signed-out user can
report. That stays; only `status` is pinned to `'open'` so a report cannot enter the queue
already closed.

---

## Checked and clean

`contributions`, `belay_catches`, `vouches`, `comments`, `objectives`, `topos`, `topo_lines`,
`crews`, `messages` — no privilege-bearing column a client can set. `profiles.is_admin` is
already guarded by 0020's `guard_self_admin` trigger (and see
[[admin-bootstrap-deadlock]] for the consequence of that guard).

## Applying

`0085_write_policies_constrain_privileged_columns.sql` must be run by hand. It ships with
the client change that depends on it (`verifyMyEmail`), so **run the SQL before or with the
deploy** — merging the client alone would leave the Verify-email button calling an RPC that
does not exist yet. It fails loudly rather than silently: the button already has a catch that
shows "Couldn't verify right now".
