# Real example accounts (the database examples)

The seed examples (`DEMO_FILLERS`, the seeded `useState` arrays in `App`) are what a **guest**
sees: module constants that never touch Supabase, so they show how a screen looks but prove nothing
about whether it works. A signed-in account never sees them (the sign-in reset clears them).

`scripts/manual-test-accounts.mjs` is the database counterpart: four real accounts (Avery, Blake,
Casey, Drew, on the reserved `climbmatch-manual.invalid` domain) with real rows behind every
signed-in screen — friends, messages, crews with proposed days, groups, events, logs, vouches,
catches, lists, guide listings, a block. Because they are real rows, replying, accepting, acking a
day or editing goes through the app's real write paths and RLS, and a reload shows whether it stuck.

```bash
node scripts/manual-test-accounts.mjs create                 # the accounts + their rows
node scripts/manual-test-accounts.mjs link you@example.com   # put the examples in YOUR account too
node scripts/manual-test-accounts.mjs status                 # still there? who is linked?
node scripts/manual-test-accounts.mjs unlink you@example.com # take them back out of your account
node scripts/manual-test-accounts.mjs delete                 # remove every row, then the accounts
```

- **`link`** gives a real account its own examples: Blake as a friend (with two messages, one
  unread), Casey's friend request, Blake's North Ridge crew with you confirmed and one day picked
  (pick it too and the crew is Ready), Casey's Colchuck crew invite, membership of the public test
  group plus an invite to the private one and an event invite, a vouch from Blake, and Blake's log
  tagging you (the confirm prompt). Every row is **authored by an example account**; nothing is
  written as the linked account — no logs, no profile edits, no catches on its record.
- **Upcoming crews and events are dated from the day `create`/`link` runs**, so they stay upcoming
  for a few weeks; re-run `unlink` + `link` (or `delete` + `create`) when they have passed.
- **The state file** (`manual-test-accounts.local` at the repo root, gitignored, mode 600) holds the
  passwords and every row id. From a worktree, point `MANUAL_ACCOUNTS_FILE` at the main checkout's
  copy, or `delete` cannot find the rows.
- **They are visible to real users while they exist** (discoverable profiles, a public group,
  public trip reports and a route comment thread on Coleman–Deming, all marked TEST).
- **Deleting the auth accounts by hand leaves rows behind**: contributions keep a dangling
  `contributor`, so three TEST contributions stayed on Coleman–Deming after the accounts went
  (found and removed 2026-10-28). Always remove them with `delete`.
- Writes are paced (1 s each) and a slow or failing database gets one minute's back-off and one
  retry, then the script stops — the owner's throttle rule.
- **Why not sign guests into an example account?** The guest button is on the public site: one
  shared account anyone can enter could message real climbers, join their crews and edit the
  example data for everyone, and its password would ship in the bundle. Guests keep the seed
  examples; the database examples are for signed-in testing.
