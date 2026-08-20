-- Two identity columns were whatever the client said they were.
--
-- contributions.contributor and user_reports.reporter both carry "who did this". Both were
-- accepted verbatim from the request body: contributions' INSERT policy checked only
-- `auth.uid() is not null`, and user_reports' checked only `status = 'open'`.
--
-- A DEFAULT is not a constraint. contributions.contributor DEFAULTs to (auth.uid())::text, which
-- is why this looked safe — but a default applies only when the column is OMITTED, and a client
-- that sends an explicit value overrides it. Both stamps live in lib/db.js, so the honesty of
-- both columns rested entirely on the client being the one we shipped.
--
-- WHY IT MATTERS, measured (scripts/oneoff/probe-contributor-forgery.mjs):
--
--   1. CONSENSUS COULD BE MANUFACTURED BY ONE ACCOUNT. lib/db.js's own comment says consensus
--      ("3 climbers agree") counts DISTINCT contributors, and an agreed correction OUT-VOTES the
--      enrichment on a route — approach, descent, rappels, gear. One signed-in account posted
--      three contributions to one route+field under three invented contributor strings; all three
--      were accepted, and a distinct count over that field returned 3. That is the threshold, met
--      alone, on route safety text.
--
--   2. A REPORT COULD BE FILED AS SOMEBODY ELSE. A inserted a user_reports row with
--      reporter = B's uid: 201, and the row is in the table under B's name.
--
-- WHAT IS DELIBERATE AND STAYS: a NULL reporter. lib/db.js records why — "someone being harassed
-- must not be blocked from reporting by being logged out" — and a signed-out insert really does
-- succeed (verified, 201, row lands with reporter null and reporter_label kept). So the rule here
-- is null-or-self, NOT "must be authenticated". Closing that path would be a worse bug than the
-- one being fixed.
--
-- A TRAP THAT COST A WRONG DIAGNOSIS, recorded because it will recur: with
-- `Prefer: return=representation`, an INSERT also requires SELECT on the row it returns.
-- user_reports' SELECT policy is `reporter = auth.uid()`, so both the forged insert and the anon
-- insert came back 403/401 while the rows landed perfectly. The first probe read those as "the
-- write was refused" and reported the exact opposite of the truth in both directions. When
-- testing an INSERT policy, send no return preference and confirm with a service-key read.
--
-- contributions.contributor is text and auth.uid() is uuid, hence the cast; it is the same
-- comparison 0151's photo-delete policy already makes.
--
-- After this, lib/db.js's `|| "anon"` contributor fallback can no longer write a row. That is the
-- correct outcome, not a regression: the comment beside it says such a row "makes every
-- submission look like the same person", i.e. it was already breaking the threshold it exists to
-- protect. It now fails loudly instead of quietly corrupting consensus.

drop policy if exists "authed can contribute" on contributions;

create policy "authed can contribute" on contributions for insert with check (
  auth.uid() is not null
  and contributor = (auth.uid())::text
);

drop policy if exists "anyone can file a report open" on user_reports;

-- null-or-self: a signed-out report is intended, impersonating another account is not.
create policy "anyone can file a report open" on user_reports for insert with check (
  status = 'open'
  and (reporter is null or reporter = auth.uid())
);

comment on column contributions.contributor is
  'The contributor''s auth uid. RLS pins this to auth.uid() (0164) — consensus counts DISTINCT '
  'contributors, so a client-supplied value lets one account manufacture "3 climbers agree".';

comment on column user_reports.reporter is
  'The reporter''s auth uid, or NULL for a signed-out report (deliberate: being logged out must '
  'not block someone being harassed). RLS pins it to null-or-auth.uid() (0164) so a report '
  'cannot be filed under another account.';
