# The writes check:writes cannot see — enumerated, and all of them are fine

2026-08-19. `check:writes` forbids a success message in front of a write whose failure is
unobservable, and it derives its vocabulary at runtime from `export async function` in
`lib/db.js`. That is good design: a new db write is covered without editing the guard. It also
means **a write that never goes near `lib/db.js` is invisible to it by construction**.

Not hypothetical — the six false *"Copied"* messages fixed in #1087 were exactly that shape.
`navigator.clipboard.writeText` is a write, it fails routinely, every call site announced
success anyway, and `check:writes` could not have seen one of them. So: what else is out there?

## Ten surfaces, 26 sites, zero defects

| surface | sites | claim success | unguarded |
|---|---|---|---|
| clipboard | 11 | 9 | **0** |
| Web Share | 4 | 0 | 0 |
| geolocation | 4 | 0 | 0 |
| localStorage | 4 | 0 | 0 |
| supabase.rpc (direct) | 2 | 0 | 0 |
| IndexedDB | 1 | 0 | 0 |

sessionStorage, supabase storage, service worker registration and `Notification.requestPermission`
have **no direct call sites** in the app at all.

The clipboard row is #1087 holding: nine sites still announce success and every one now waits
for the promise first.

Two are worth naming as read rather than assumed:

- **geolocation, all four sites.** Each supplies an error callback *and* distinguishes
  `err.code === 1` (permission denied) from a general failure, with its own wording:
  *"Location permission denied — enable it to see where you are on the route."* Each clears its
  `setLocating(false)`, so a denied permission cannot leave the button stuck on "Locating…".
- **`lib/offline.js`'s `indexedDB.open`.** `req.onerror` rejects **and clears the memoised
  promise**, so a failure does not poison every later caller — and there is an explicit `blocked`
  handler with a comment noting that neither `onsuccess` nor `onerror` follows that event.
  Somebody had already thought about this one properly.

## The detector was wrong three times, in three different ways

This matters more than the clean result, because it is the same fault the sweep exists to find:

1. **First run:** tested for `.then` / `.catch` / `await` / `try` and reported **3 of 4**
   geolocation calls unguarded. geolocation is **callback-style** — its error handler is the
   *second argument*.
2. **After teaching it argument counting:** it reported **4 of 4** unguarded, i.e. worse. The
   regex for that surface does not capture the `(`, so the offset was pointing into the middle
   of `getCurrentPosition` rather than at its parenthesis.
3. **IndexedDB** is a third shape again: the handler is an **event property** (`req.onerror`),
   neither an argument nor a rejection.

**"Is this guarded?" has a different answer per API**, and a single test applied to all of them
manufactures findings. That is the fifth too-narrow proxy this session, after `slab` matching
rock slabs, `error` matching a guard's own explanatory prose, `Snow Lake` matching a proper
noun, and a prefix heuristic matching `createElement`. Every one produced a confident count that
was wrong, and every one was caught by reading rows rather than by trusting the total.

## Why record a clean result

So the question is not re-asked from scratch. The surface list is the durable part: it names
what `check:writes` structurally cannot cover, so the next person adding a `sessionStorage.setItem`
or a direct `supabase.storage.from(...).upload()` has somewhere to look. Re-run with:

```
node scripts/oneoff/probe-writes-outside-db.mjs
```

## Not made a guard

Deliberately. The rule that matters — *no success message in front of an unobservable failure* —
is already enforced for the db path, and outside it there is currently **nothing to catch**. A
build gate over 26 correct call sites is bookkeeping that rots, and its stale-entry problem would
be worse than the hole. The probe exists so the question can be re-asked cheaply; that is the
right weight for a surface with no live defects.
