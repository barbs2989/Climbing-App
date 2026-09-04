# Sample content — TEMPORARY, remove before launch

The app is currently showing **one example of every surface that would otherwise be empty**,
so each screen can be seen populated and clicked through while the app is still being built.

Everything below is client-side only: module constants and `useState` seeds. **Nothing here is
ever written to Supabase.** A signed-in account's real rows are untouched, and no sample row can
reach the database.

---

## How to remove it

One line:

```
ClimbMatchCore.jsx    const DEMO_FILLERS=true;   ->   const DEMO_FILLERS=false;
```

That is the whole switch. Every sample listed below disappears with it, the app returns to the
honest empty-first-run state, and `npm run check:dead-flag-gates` re-arms itself automatically
(while the flag is true that guard prints a note saying which three constants it cannot check).

Optionally delete this file and the comment block above the flag at the same time.

---

## What the flag turns on

| Where in the app | What you now see | Comes from |
|---|---|---|
| **Crew → Groups** | 3 groups — Wasatch Trad Collective, SLC Bouldering Collective, Alpine Start · Big Cottonwood — with members, moderators and an owner | `GROUPS` |
| **Crew → Groups → a group** | Posts in the group feed | `groupPosts` (already seeded; only becomes reachable once a group exists) |
| **Crew → Groups** | One group you have joined, plus a pending join request | `joinedGroups`, `groupReqs` |
| **Calendar** | A group event, so "+ Create an event" is no longer the only thing on the screen | `events` |
| **Route page → comments** | Sample comments to reply to and react to | `COMMENTS` |
| **Partners browse, Leaderboards** | Extra climbers, so the board and browse list are not 5 people | `FILLER_CLIMBERS` |
| **Logbook → Challenges** | 4 extra tick-list cards (`classics`, `summits`, `winter`, `crag_lcc`) | `SEED_ONLY_CARDS` filter |
| **Profile → Recent catches** | 2 belay catches, one each direction | `catches` (added 2026-09-03) |
| **Logbook / route consensus** | 2 condition reports, so `conditionsReported` is not 0 | `condReports` (added 2026-09-03) |

The last two are new. Everything above them already existed behind this flag and was simply
switched off — the flag has been an unconditional `false` since well before this change.

## What was already populated, and needed nothing

These surfaces already ship with seed examples and were not touched: a crew with proposed dates,
two logged climbs, two connections, a given vouch, an incoming and an outgoing friend request, a
crew join request, notifications, a direct-message thread, a blocked climber, and the catch-ledger
summary on the profile (47 catches / 12 high-factor).

## Why the sample data is not labelled "example"

It is written to look like real content on purpose — the point is to see how the screens look and
behave with plausible data in them. That means it is *not* self-evidently fake when you are inside
the app. The flag, this file, and the comment block in `ClimbMatchCore.jsx` are the record of what
is sample and what is not.

## One thing to know about signing in

The sign-in reset clears local seed state when a real Supabase session appears, so the two new
samples (`catches`, `condReports`) show in the demo/no-account path and clear for a real signed-in
account. That is deliberate and matches how the existing seed `logs` behave — a real account must
never be shown somebody else's climbing history.
