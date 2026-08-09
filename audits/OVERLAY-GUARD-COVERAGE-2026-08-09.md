# Half the modal surface is invisible to the overlay guards — 2026-08-09

> **RESOLVED the same day.** Discovery in `scripts/lib/overlay-scaffold.mjs` is now
> **behavioural** — a state whose JSX renders a dialog, whatever it is called — and all three
> guards walk **50** overlays instead of 28. The recommendation at the bottom of this document
> is what was implemented; see `check:overlay-discovery` in CLAUDE.md for the two precision
> rules it needed and the traps that took two drafts to find. Two corrections to the table
> below, both found by building it: **`openGroupId` is not an overlay** (its `role="dialog"`
> is a *nested* ReactionPicker 24,227 chars into a full-screen group view), and
> **`postMenuFor`/`reactPickerFor` cannot be opened by any flag** — they render inside that
> view and the `posts` they read is a local of its IIFE. The `Resume` suspicion recorded below
> was confirmed and fixed separately in **#735**.

**This is a coverage finding, not a defect list.** Nothing below is claimed to be broken.
What is established is that these screens have never been *looked at* by any of the three browser
guards, and were never in the 2026-07-30 audit either — so nobody knows.

## How this was found

The guide-directory gap was found by grepping the audit for a word it never contained.
Same method, applied to the guards instead of the audit:

`check:zero`, `check:signed-in` and `check:overlay-scroll` all share
`scripts/lib/overlay-scaffold.mjs`, and CLAUDE.md
says overlays are *"discovered from the source, not listed in the script"*. True — but only
for one name shape. The discovery regex is:

```
\[([a-zA-Z][\w$]*Open),(set[A-Z][\w$]*)\]=useState\(false\)
```

It requires **both** `useState(false)` **and** a name ending in `Open`. Anything else is
never opened by **any of the three**, and nothing reports the omission — the summary counts overlays *opened*, so a
modal the regex cannot see is not a missing row, it is not a row at all.

## The count

| | overlays |
|---|---|
| discovered and walked by the guards | **28** |
| carry `role="dialog"` and cannot be reached by any of the three | **24** |
| …of those, also absent from `BUG-AUDIT-2026-07-30.md` | **20** |

## What is unreachable, by size of the component behind it

| state | `useState` | renders | chars | in 07-30 audit? |
|---|---|---|---|---|
| `logModal` | `null` | `LogAscent` | 34,022 | NO |
| `profileModal` | `null` | `FullProfile` | 26,604 | NO |
| `report` | `null` | `TripReport` | 18,415 | yes |
| `resumeFor` | `null` | `Resume` | 15,296 | NO |
| `giveVouchWith` | `null` | `GiveVouch` | 6,897 | NO |
| `reactPickerFor` | `null` | `ReactionPicker` | 5,463 | NO |
| `logCatchWith` | `null` | `LogCatch` | 4,718 | NO |
| `selArea` | `null` | `Contributions` | 4,688 | NO |
| `quickLogFor` | `null` | `QuickLog` | 4,200 | NO |
| `crewInvite` | `null` | `CrewInviteModal` | 3,848 | yes |
| `connectModal` | `null` | `ConnectModal` | 3,825 | NO |
| `reportUser` | `null` | `ReportModal` | 3,380 | NO |
| `sunCorrectFor` | `null` | `SunCorrect` | 2,841 | NO |

Plus eleven inline dialogs: `confirmDelete`, `eventForm`, `eventInvite`, `groupForm`,
`groupInvite`, `invitePrompt`, `mutualModal`, `pastExpand`, `postMenuFor`, `recapId`,
`toast`. (`toast` is a transient banner and not worth walking; it is listed for completeness.)

## Two things worth calling out

**The guards stop one step short of the log-a-climb modal.** `logPickOpen` *is* discovered,
and `check:ui` has a passing `log-a-climb-picker-opens` flow. The picker's `onPick` then does
`setLogPickOpen(false); setLogModal(r)` — and `LogAscent`, at 34,022 characters the largest
component in the app, is where a climber actually records a climb. The guard opens the door
and stops in the doorway.

**It is not only object-valued state.** `confirmDelete` and `pastExpand` are both
`useState(false)`; they are missed purely because their names do not end in `Open`. The rule
in `new-overlays-must-be-named-xopen` is stricter than it sounds: the *name* carries the
contract, not the initial value.

## Trust-and-safety surfaces are over-represented

`GiveVouch`, `LogCatch`, `ReportModal`, `ConnectModal` and `FullProfile` are all unreachable.
Trust and safety is this app's stated first-class theme, and vouches plus belay-catch records
are what `trustScore` is built from. The three bug classes `check:signed-in` exists to catch —
seed-id logic meeting a uuid (#569, #680, #688) — are exactly the kind that live in a modal
that resolves *another climber* against seed arrays.

`Resume` is a concrete example of why that matters. Its history falls back to
`ticksFor(climber.name)`, which scans seed `ROUTES[].activity` for entries whose `user` string
equals that name. There are 11 such names in the seed, one of which is **"Nathan Barber"**.
For a DB-backed climber `climber.ticks` is undefined, so the fallback is what runs. A real
account whose display name collides with a seed reporter would show that person's climbs as
its own. Not confirmed against a live account — which is the point of this document.

## Recommended next step

Extend the shared discovery in `scripts/lib/overlay-scaffold.mjs` to a second shape
(object-valued state whose JSX renders a `role="dialog"` component), open each with a
representative payload, and let all three guards walk them. One change widens all three,
which is exactly why the scaffold was factored out. Expect the first walk to find
something: every previous widening of these guards did — #637, #654, #662, #674 for
`check:zero`, the `undefined · 0` friends row on `check:signed-in`'s first overlay run, and
11 findings on `check:overlay-scroll`'s (#720).

Do **not** treat the table above as a bug list until they have actually been walked.

## Verification note

Produced by static analysis only. The machine was carrying a load average of 271-328 from
parallel sessions at the time, which makes local browser runs unreliable
([[browser-checks-fail-on-load-not-code]]), so no overlay was opened to confirm behaviour.
Production itself was verified healthy the same hour: `check:drift` clean (main `7ad5b56` =
published) and `check:ui --url` 17/17 against the live site.
