# Six "Copied" messages for a copy that may never have happened

2026-08-19. Second half of the silent-failure sweep — the `lib/` half is
`SILENT-NOOP-SWEEP-2026-08-19.md`.

## The app-layer analogue

The `lib/` sweep looked for reads that answer a failure with an empty value. In the three app
files the equivalent shape is an **empty catch**: the failure is caught, so nothing crashes and
no guard fires, and the user is told nothing at all.

`scripts/oneoff/probe-empty-catches.mjs` walks the AST of `ClimbMatch.jsx`,
`ClimbMatchCore.jsx` and `RouteDetail.jsx` and reports every handler — `.catch(fn)` and
`try/catch` alike — whose body does nothing a user could notice. A lone `console.*` counts as
silent; nobody has the console open on a phone.

**149 handlers, 65 silent.** Most are correct and stay: `map.fitBounds`, `map.invalidateSize`,
`navigator.vibrate`, `scrollIntoView`, `setPointerCapture` — best-effort UI where failing
quietly is the right behaviour. The output is a list to read, not a defect count.

One class was not.

## The clipboard

`navigator.clipboard.writeText` returns a **promise**. Six call sites wrapped it in a
`try/catch` and then announced success unconditionally — so the `try` caught nothing on the
path that actually fails, and the promise rejection went unhandled:

```js
// RouteDetail, copy the route's coordinates
try{ navigator.clipboard.writeText(lat+", "+lng); setCopied(true); … }catch(e){}

// RouteDetail, copy the share link — setLinkCopied is outside the try entirely
try{ navigator.clipboard.writeText(shareLink); }catch(e){} setLinkCopied(true);

// ClimbMatchCore, share sheet
try{ …writeText(shareUrl); }catch(e){} onShare && onShare("Link copied");
try{ …writeText(cap);      }catch(e){} onShare && onShare("Report copied");
try{ …writeText(cap);      }catch(e){} onShare && onShare("Caption copied …");
```

So the user taps **Copy link**, reads **"Link copied"**, pastes, and gets nothing. Clipboard
writes fail routinely — an insecure context, a permissions policy, Safari outside a
user-gesture chain.

A sixth was subtler. The profile-share copy *did* `await` inside its try, so it caught the
rejection correctly — and then called `setCopied(what)` **outside** the try, claiming success
anyway.

## This is `check:writes`' rule, on a write that never touches the database

`check:writes` forbids a success message in front of a write whose failure is unobservable, and
it derives its vocabulary from `lib/db.js` exports. A clipboard write is not one, so that guard
was structurally incapable of seeing this — the same shape as `check:zindex` and
`check:overlay-portals` both asking whether a *mounted* toast is visible while neither asks
whether it is mounted.

## The fix was already in the codebase

One clipboard site was written correctly, one function away from two of the broken ones:

```js
var _p = navigator.clipboard.writeText(planText);
if (_p && _p.then) _p.then(function(){ setCopyState("ok"); })
                     .catch(function(){ setCopyState("err"); });
else setCopyState("ok");
```

All six were brought into line with that rather than with a new invention. Where a message
channel exists (`onShare`), failure now says so — *"Couldn't copy the link"*. Where the only
feedback is a transient **Copied** label, failure shows **nothing**: no lie, and inventing a
new error surface would be a bigger change than the defect warrants.

Verified by `scripts/oneoff/probe-clipboard-claims-success-honestly.mjs` — 11 write sites, all
of which either claim nothing or wait for the promise. Injection-tested: restoring the share-link
defect fails it; restoring the fix goes green.

## Not swept

The other 59 silent handlers are left, and two are worth recording as read rather than missed:

- **`writeText(txt)` on the tick-list export** has no success claim *and* no feedback channel in
  scope. It cannot lie, but a failed copy is indistinguishable from a successful one to the user.
  Fixing it means adding a feedback surface, which is a design change rather than a repair.
- The **map** handlers (~20) are genuinely best-effort: a `fitBounds` that throws on a degenerate
  bounds should not interrupt anything, and Leaflet is full of operations that are unsafe to call
  on a torn-down map.
