# "Suggested climbs" cannot render on the real catalog

You asked how Suggested climbs is operated and what its UI/UX should be. The answer to the first
question makes the second one moot for now: **on a DB-backed area it renders nothing, and it never
has.** Not a styling problem — the section is absent.

**Not fixed here.** Reviving it needs a DB-backed candidate pool and the database is currently
unreachable, so nothing written now could be verified. It is also closer to a feature than to
polish, which needs your say-so.

## Two independent reasons, either one sufficient

It is mounted once, in `ClimbMatch.jsx`:

```
<SuggestedClimbs area={selArea} profile={climberProfile} completedIds={…} wishlist={…} onOpen={…}/>
```

**1. `area` is always null on the real catalog.** The Climbs tab renders
`{USE_DB ? <DbAreaBrowser/> : <AreaBrowse/>}`. Only the *seed* browser calls `setSelArea` — every
one of its call sites is a seed component (`AreaBrowse`, `AreaCrags`, `OverviewMap`, `SearchSplit`,
the saved-area buttons). `DbAreaBrowser` reports its position through `onAreaContext` →
`setDbAreaCtx` instead, which is a different piece of state entirely. So with `USE_DB` on,
`selArea` is never assigned and the component's first line, `if(!area) return null`, ends it.

**2. Even given an area, the pool is the seed array.** The component scopes with
`ROUTES.filter(r => inArea(r.mountainId, area.id))`, where `ROUTES` and the `MOUNTAINS` tree that
`inArea` walks are the in-memory seed data — **14 routes across 29 areas**. A real area id such as
`wa_mount_stuart` matches none of them, so `inScope` is empty, `total` is 0, and it returns `null`
again.

This is the same shape as `selArea` being seed-only elsewhere in the app, and the same family as
the Year in Climbing modal: a feature that is mounted, correct-looking, and never happens.

## Measured, not argued

Rendered with `react-dom/server`, three cases, with a control:

```
seed area (kings)                  html=  385 chars  "Suggested climbs · 1 ▸"
area=null (the USE_DB case)        html=    0 chars  (RENDERS NOTHING)
DB-shaped area id                  html=    0 chars  (RENDERS NOTHING)
```

The seed control is what makes this worth anything: it proves the component works and the harness
is wired correctly, so the two zeros are a finding rather than a broken test.

## Why no guard caught it

- `check:field-renders` asks whether a **routes column** reaches a screen. This is a component fed
  by React state, so it is out of scope by construction.
- `check:dead-flag-gates` finds UI fed only by a constant a false flag empties. `selArea` is not
  such a constant — it is legitimately written, just never on this path.
- `check:ui` and `check:overflow` walk the **seed** demo, where `selArea` *is* set and the section
  renders correctly. Every browser guard sees the one configuration in which this works.
- `check:dead-props` sees a prop that is passed and destructured. It is.

The gap is the one `check:signed-in` exists for one level up: *real data under a DB id is a third
configuration*, and nothing walks the Climbs tab in it.

## What it does when it works

Three groups, in order, with a collapsed header showing a count:

1. **From your objectives** — wishlisted routes in this area, not yet completed.
2. **Because you've been climbing `<discipline>`** — `rankSimilarRoutes(pool, profile, {limit:5})`.
3. **Popular in this area** — a fallback shown *only* when the first two are empty, sorted by
   trip-report count.

The design is sound. Groups 1 and 3 are straightforward to port: both are ordinary queries against
the routes subtree the DB browser already knows how to ask for. Group 2 needs `rankSimilarRoutes`
to run over DB rows, which is where the real work is.

## If you want it fixed

The minimum honest fix is to feed it the DB area context (`dbAreaCtx`) and a DB-backed pool rather
than `selArea` and `ROUTES`. Worth deciding first whether it belongs on the area page at all, or
whether "View all N routes" already covers the same intent — that is the browse-vs-query question
this app has answered once before.
