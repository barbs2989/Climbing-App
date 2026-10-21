# ARCHITECTURE — how data flows through ClimbMatch

CLAUDE.md describes the files and the screens. This page describes **where state lives, who
owns it, and how it reaches a component** — and records why there is deliberately no global
client store (no app-wide React Context, no Zustand). Measured 2026-10-15 against `696f1a19`.

## The three homes for state

| Home | What lives there | Who reads it | How a component gets it |
|---|---|---|---|
| **1. The react-query cache** (`QueryClientProvider` in `main.jsx`) | Everything the database holds: profile, crews, messages, logs, connections, groups, vouches, routes, areas, contributions, comments, trip reports, verification, trust counts | 112 `useQuery` call sites across `ClimbMatch.jsx`, `RouteDetail.jsx`, `ClimbMatchCore.jsx` and `lib/` | Calls the hook from `lib/db.js` **where it needs the data** — no props. A write calls `invalidateQueries` (11 sites) and every reader refreshes |
| **2. `App`'s `useState`** (`ClimbMatch.jsx`, `export default function App`) | 248 hooks of session/UI state: which tab, which route, which modal is open, form drafts, optimistic local copies, settings | Mostly the screen branch that renders inside `App` itself | Inline JSX inside `App` closes over it directly; extracted components receive it as props |
| **3. Module globals in `ClimbMatchCore.jsx`** | `ME`, `UNITS`, `DLOCALE`, `RESPONSE_RATES`, `DB_UID`, toast/celebration timers | Any helper or component, without props | Read the import. `App` writes them through the `__set_*` shims (ESM bindings are read-only) |

**Home 1 is already the global store.** Server state — the data that is genuinely shared across
screens — never drills: a screen that needs the climber's crews calls `useMyCrews()`; it does not
wait for `App` to hand them down. `App` also calls 84 data hooks of its own (`useMyCrews`,
`useFullProfile`, `useProfilesByIds`…), which is reading the shared cache, not owning a copy.

**Home 3 is a legacy sync, not a pattern.** `ME.* = …` at the top of `App` copies hook state
onto the global each render so helpers can read it. Never extend it (CLAUDE.md, "Do not write to
`ME` directly").

## The state schema in `App`

Grouped by domain; names are the `useState` variables. A new piece of UI state goes in the
group it belongs to, as a `useState` in `App`, per CLAUDE.md's "add a `useState` in `App`" rule.

- **Navigation** — `tab`, `selRoute`, `routeFrom`, `routeStack`, `routeSubTab`, `pendingSubTab`, `routeView`, `selArea`, `dbAreaCtx`, `dbAreaJump`, `stateJumpReq`, `crewView`, `logbookTab`, `partnersMode`, `msgBack`, `chatFromInbox`
- **Route browsing** — `filters`, `search`, `discSel`, `cragSort`, `cragFilter`, `areaTreeOpen`, `savedSearches`, `bookmarks`, `rankDisc`, `rankBoard`
- **Route-page local copies of contributions** — `localComments`, `hzVotes`, `diffRatings`, `myStars`, `routeRev`, `contribs`, `routeEdits`, `startLocEdits`, `waypointEdits`, `topoAnnotations`, `sunReports`, `condReports`, `cmLikes`, `cmReacts`
- **The climber** — `profile`, `editDraft`, `myAvail`, `mySpeedFtHr`, `verified`, `profileLoaded`, `profileReadFailed`, `profilePhotos`, `profilePhotoAlts`, `onboarded`, `authed`
- **The climber's climbs** — `logs`, `myItineraries`, `userLists`, `objDates`, `catches`, `givenVouches`, `kudosGiven`, `relLedger`
- **Social** — `connections`, `blocked`, `friendReqIn`, `friendReqOut`, `crewReqIn`, `notifs`, `notifSeen`, `dismissedNotifs`
- **Crews and messages** — `crews`, `openCrewId`, `crewMsgs`, `crewUnread`, `dmUnread`, `msgs`, `chatWith`, `chatCrew`, `crewJoinReqs`, `crewTyping`, `safetyCrew`, `floatFocus`, `msgPaging`, `crewMsgMore`, `dmMore`
- **Groups and events** — `joinedGroups`, `createdGroups`, `openGroupId`, `groupPosts`, `groupMembers`, `groupMods`, `groupReqs`, `events`, `openEvent`, and their `group*` / `event*` drafts
- **Settings and privacy** — `units`, `dateFmt`, `notifPrefs`, `profileVis`, `showOnRanks`, `showRealName`, `showOnline`, `locPrecise`, `mutualsVisible`, `visibleWhileBrowsing`, `msgFrom`, `crewInviteFrom`, `resumePublic`
- **Offline packs** — `offline`, `downloadedStates`, `pinnedStates`, `pinsFor`, `dlLoaded`, `dlBusy`, `dlTimes`, `packBusy`, `packProg`
- **Overlays** (≈80 booleans and targets) — every `…Open`, `…Modal`, `…For`, `…Target`, `…Busy` flag: `menuOpen`, `settingsOpen`, `logModal`, `contribOpen`, `addRouteOpen`, `reportUser`, `appealTarget`, …
- **Feedback** — `toast`, `celebrate`

Most of these are read by exactly one screen. That is why they live in `App` and not in a store:
a store would give each of them a second address without giving any of them a second reader.

## Prop drilling: measured, and where it is

Method: parse every component in `ClimbMatch.jsx`, `ClimbMatchCore.jsx`, `RouteDetail.jsx`,
`EnrichmentPanels.jsx` and `lib/*.jsx` with `@babel/parser`, take each destructured prop, and
flag one the component **only forwards** to a child component, never reads itself. Follow those
forwards to get the depth of each chain.

- 237 components take destructured props; **27 forward one they never read**, 83 such props in all.
- **13 chains run two or more pass-through layers; the deepest is three.**
- The calls from `App` are **wide, not deep**: `RouteDetail` takes 63 props, `CrewCard` 36,
  `FullProfile` 34. Each is read by the component it is passed to, and width is not drilling.

The one real drilling cluster is the Climbs tab browser:

```
App → DbAreaBrowser → AreaPage → DbSuggestedClimbs / RouteRow
      onOpenRoute, wishlist, profile, completedIds, rankSuggested, discSlots, uDistMi
```

`DbAreaBrowser` and `AreaPage` (`lib/DbAreaBrowser.jsx`) carried these seven props for their
grandchildren. The rest were single-hop forwards of a callback group: the six `onComment*`
handlers through `RouteDetail` and `TripReport` to `Comments`. Both were fixed in proportion,
without an app-wide store:

- **`ClimberCtx`**, a context local to `lib/DbAreaBrowser.jsx`. `DbAreaBrowser` provides
  `{ wishlist, profile, completedIds, rankSuggested, discSlots }`; `DbSuggestedClimbs` and
  `ObjectivesPanel` read it with `useContext`. `AreaPage` no longer carries five props it never
  read. `onOpenRoute` and `uDistMi` stay props: `AreaPage` itself hands them to five children.
- **`commentApi`**, one object prop `{ onAdd, onEdit, onDelete, onLike, onReply }` (plus
  `onReact` for trip reports) built at `App`'s two call sites and handed to `RouteDetail` and
  `TripReport`, which spread it onto `Comments` / `RouteBreakdown`. `Comments` keeps its own
  separate `onAdd`/`onEdit`/… props, because groups and other screens render it directly.

A new value for those panels goes into `ClimberCtx`; a new comment action goes into `commentApi`.

## Why there is no global client store

- **The shared data already has one.** Moving server state out of react-query into Context or
  Zustand would duplicate the cache and lose `invalidateQueries`, which `check:write-readers`
  relies on.
- **The UI state has one reader each.** A store saves nothing for state read in one place.
- **The cost is the whole app.** Migrating 248 hooks rewrites most of `App`'s render tree, and
  the guards that parse `App`'s source (`check:hooks`, `check:dead-props`, `check:refs`, and
  others) along with it. Nobody using the app would see a difference.
- **A context re-renders every consumer on every change of its value.** Today an `App` render
  already re-renders its subtree, so a store would not make anything faster.
- **A local context is the ceiling.** When a cluster of values drills through components that
  never read them, give that subtree its own context, as `ClimberCtx` does, rather than promoting
  the values to an app-wide store.
