# A database error told three chat screens that nothing was there

2026-08-19. Deliberate sweep for the defect class found three times by accident earlier the same
day — see `WAYPOINT-ORDER-TRIAGE-2026-08-19.md` for the third and the pattern.

## The method

The three earlier findings shared one mechanism: **a helper whose precondition fails silently,
returning a value the caller cannot distinguish from a clean result.** `orderWaypoints` returns
the list untouched unless every pin has a `distMi`, so a diff-based audit sees no change and
reports "0 out of order". `corpus()` simply did not name two columns, so evidence in them could
not move a verdict.

Grep cannot find this — every identifier is bound and each function is correct read in
isolation. `scripts/oneoff/probe-silent-noop-preconditions.mjs` walks the AST of `lib/*.js` and
reports every **conditional return inside an exported function** whose value is
indistinguishable from "nothing is wrong": the input returned unchanged, an empty array or
object, `""`, `0`, or `false`.

**205 conditional returns across 24 files; 59 of that shape.** Most are correct guard clauses —
a `return []` for a null argument is defensive, not a hazard. The output is a list to read, and
the question for each entry is the only one that matters: *could a caller tell this apart from a
clean result, and does anything downstream draw a conclusion from it?*

For three, the answer was no.

## What was found

`lib/db.js` had three message reads that answered a **database error** with `[]`:

| function | what `[]` means to the caller |
|---|---|
| `fetchOlderCrewMessages` | you have reached the start of the conversation |
| `fetchOlderDirectMessages` | same, for a DM thread |
| `fetchMyDirectMessages` | you have no conversations at all |

### The pagers: an unreachable error handler with the right wording

`ClimbMatch.jsx` paging (crew at :396, DM at :397) does this on `[]`:

```js
if (older.length < MSG_PAGE) setCrewMsgMore(… false);   // hide "load older" for good
…
else showToast("No earlier messages");                   // a claim it has no evidence for
}).catch(function(){ showToast("Couldn't load earlier messages"); });
```

So a transient failure **permanently hid the "load older" control** for that chat and told the
user there was nothing more — while the `.catch`, carrying exactly the right wording, was
**unreachable** because the fetch swallowed the error. An error handler nobody can reach,
already phrased correctly, is the tell that the distinction was intended and lost.

### The inbox: the worst of the three

`fetchMyDirectMessages` feeds the Inbox, and `[]` is what produces **"No friend chats yet"** —
the empty state whose explanatory copy then invites the user to go message a partner. So a
database blip told a climber with an active conversation that they had none, and suggested they
start one.

Worse, the caller sets its hydration guard **before** fetching:

```js
if (msgHydratedRef.current._threads) return;
msgHydratedRef.current._threads = true;      // latched, then fetch
```

so the wrong answer stood for the **whole session**. It never retried.

## The fix

All three now `throw`. Each call site already had a `.catch`, so the honest branch is reachable
for the first time, and the inbox hydration additionally **releases its guard** on failure
(`msgHydratedRef.current._threads = false`) so the next open retries instead of latching a
falsehood.

**The old comment said returning `[]` was deliberate** — *"so a failed page-load can never blank
the chat"* — and reversing a documented decision needs evidence, not preference. That property
is preserved, and the return value was never what provided it: **no caller clears message state
on rejection.** Both pagers catch, toast, and reset their in-flight flag; both hydration callers
catch and do nothing. Checked at all four sites before changing anything. The fear recorded in
that comment is not what the code did.

## Verified

`scripts/oneoff/probe-message-reads-surface-failure.mjs` asserts the swallow is gone, that all
five call sites can receive a rejection, and that the honest wording survives. **Comments are
stripped before the scan**, because all three functions now *explain* this rule in prose that
names the old shape — the false pass `check:correction-readers` and `check:ci-cancel` both
record, where a guard passes on the strength of an explanation.

Injection-tested: restoring one swallow fails 2 assertions; restoring the fix goes green. The
probe's expected output is "ok", which is also what a broken probe prints, so it had to be shown
able to fail.

**What it does not prove**, stated rather than implied: that the screens behave correctly during
a real outage. That needs the database to fail on demand. This proves the distinction exists in
the code and reaches a handler.

## Not swept

The other 56 candidates are left alone and most are correct. Two worth recording as read and
judged rather than missed:

- **`trackIsJustTheWaypoints()` returns `false` when `line.length > 40`** — i.e. "this is a
  genuine track" — so a synthetic track with 41+ points is declared genuine unchecked. Benign in
  practice today (synthetic tracks carry one point per waypoint, median four), but it is a cap,
  and caps of this kind are exactly what `a-capped-query-ordered-wrong-hides-the-answer` records.
- **`claimMyCrewEmailInvites()` returns `0` on `PGRST202`** — a missing RPC reads as "no invites
  claimed". Deliberate degradation for an unapplied migration, but it means a broken deploy and
  an empty inbox are the same number.
