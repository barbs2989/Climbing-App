# The lib/*.jsx sweep is clean, and that is the result

2026-08-19. Third and final part of the silent-failure sweep. The first two —
`SILENT-NOOP-SWEEP` (lib/*.js) and `SILENT-FAILURE-SWEEP-APP` (the three big app files) — each
found real user-facing defects. **This one found none, and the gap it closes was mine:** both
earlier sweeps were scoped to files I had picked, and `lib/*.jsx` was never looked at. Twelve
components holding the auth modal, the area browser, both map surfaces, the GPS submission
flow, the guide dashboard and three moderation queues.

## Both questions, asked

**Empty catches** — a failure caught and never mentioned. **12 silent of 30 handlers**, and
eleven are Leaflet: `invalidateSize`, `fitBounds`, `getBounds`, `removeLayer`, `remove`. Those
are correctly best-effort; Leaflet is full of calls that are unsafe on a torn-down map, and a
`fitBounds` that throws on degenerate bounds should interrupt nothing.

The twelfth is not a map call and was read properly:
`DbGuideDashboard` fires `reconcileGuideVerification(uid).catch(() => {})` on mount. It calls an
RPC that recomputes the guide's verified status server-side. A silent failure leaves the
**previous server value** on screen rather than a wrong one, and the user did not ask for it —
it is a background sync, not an action. Defensible, and left alone.

**Unhandled rejections** — a network call with no handler at all, which in a click handler means
the button appears to do nothing. CLAUDE.md records exactly that shape shipping once before, in
this same guide dashboard. **2 of 23 call sites**, and both are false positives:

```js
const p = what === "down" ? deleteRoutePhoto(...) : dismissPhotoReport(r.id);
Promise.resolve(p).then(...).catch(...).finally(...);
```

Correctly handled. The `.catch` sits on `Promise.resolve(p)` rather than on the call, and
following that needs dataflow rather than an AST walk. **So the real finding is zero.**

## The detector needed three tightenings, which is the transferable part

Its first run reported **69 of 90** call sites as unhandled. That is not a finding, it is a
broken instrument, and it took three corrections to become useful:

1. a prefix heuristic (`create|remove|update|send|…`) matched `createElement`, `removeLayer`
   and `useQueryClient`;
2. React hooks were counted — `useX()` returns `{data, error}` and never rejects;
3. the db-export regex captured `export function` as well as `export async function`, so
   synchronous helpers (`areaSearchTotal`, `isGuideVerified`, `dbGuideToCamel`) counted as
   network calls.

**A proxy wide enough to match anything reports a defect either way.** This is the same fault
this sweep exists to find, committed by the sweep — and it is the fourth instance today, after
`slab` matching rock slabs, `error` matching a guard's own prose, and `Snow Lake` matching a
proper noun. The limitation and all three tightenings are recorded in the probe's header so the
next reader does not trust a first run.

## Why a clean result is worth recording

Because the alternative is that somebody asks this question again in six months and has no way
to know it was asked. The two probes take file arguments now, so re-running them over any file
set is one command:

```
node scripts/oneoff/probe-empty-catches.mjs <files...>
node scripts/oneoff/probe-unhandled-async-calls.mjs <files...>
```

The sweep is now complete across every source file that holds UI or data access: `lib/*.js`
(3 real defects, fixed in #1066), the three app files (6 false "Copied" messages, fixed in
#1087), and `lib/*.jsx` (none).

## Not extended to check:read-failures

`check:read-failures` still watches only `lib/db.js`. Widening it was considered and is not
justified yet: every read in the app goes through that file, and the twelve components here
contain **zero** direct PostgREST calls. A guard covering files with nothing to catch is
bookkeeping that rots. If a component ever queries directly, that is the moment.
