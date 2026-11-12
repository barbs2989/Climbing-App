// WHERE THE CLIMBS TAB STOOD WHEN YOU LEFT IT (owner 2026-11-11: "every time you navigate away from
// the climbs page, I would like you to be able to go straight back to the page on the climbs that you
// were just looking at ... so you can go back and forth easily and not have to search for it again").
//
// The Climbs tab unmounts when another tab is picked (App renders `tab==="routes"?<RoutesTab/>:null`),
// so DbAreaBrowser's own useState — the state, the drill path, the Map / Route finder sub-screen —
// was lost and the tab reopened on the region picker. Its position lives here instead, at module
// scope: it outlives the unmount for the rest of the session (a reload starts fresh, as before).
// The open climb page is App's `selRoute`; App keeps that half itself (`lastClimbsRef`, `goTab`).

let areaPos = null;

/** DbAreaBrowser's last position: { stateNode, stack, screen, finderDisc, finderInit }. */
export function getClimbsAreaPos() { return areaPos; }
export function setClimbsAreaPos(p) { areaPos = p; }

// App's jump requests (jumpToStateReq, jumpToAreaReq, jumpToFinderReq, jumpToNearReq) stay set after
// they are handled, so a remount would re-run the last one over the restored position. The browser
// marks each id here as it handles it; this object is mutated in place and lives as long as areaPos.
const handledJumps = { state: null, area: null, finder: null, near: null };
export function climbsHandledJumps() { return handledJumps; }

// A jump still loading when the tab is left (jumpToArea awaits the full row, then the breadcrumb).
// Its request is already marked handled, so without this it would be lost half-done: the area drawn
// as if it were a state root, or a header search dropped before the Route finder opened.
// { area, finder: the finder request or null } while in flight; null once it lands or is replaced.
let pendingJump = null;
export function getClimbsPendingJump() { return pendingJump; }
export function setClimbsPendingJump(j) { pendingJump = j; }

// The app scrolls inside #appscroll on a phone and the window on the website; read whichever moved.
function scroller() {
  try { return typeof document !== "undefined" ? document.getElementById("appscroll") : null; } catch (_e) { return null; }
}

/** How far down the Climbs page you were, in px (0 when unknown). */
export function readAppScroll() {
  try {
    const el = scroller();
    const inner = el ? el.scrollTop : 0;
    const win = typeof window !== "undefined" ? (window.scrollY || 0) : 0;
    return Math.max(inner, win);
  } catch (_e) { return 0; }
}

// Only one restore runs at a time: a new one, or any tab change (goTab calls cancelScrollRestore),
// ends the last, so a loop started for Climbs can never keep scrolling the next screen.
let restoreRun = 0;
export function cancelScrollRestore() { restoreRun++; }

/**
 * Scroll back to `y` once the page has drawn. App resets the scroll to the top on every tab change
 * (an effect, after render) and an area page fills in from its queries over a few frames, so one
 * scrollTo would land at the top or short. Retry each frame for up to ~2 s until the page is tall
 * enough. It stops at once if the climber scrolls, taps or types (the same events as App's
 * scrollToWhenMounted), if the page moves without growing (a scrollbar drag fires none of those), or
 * while a dialog has <body> pinned (lib/dialogA11y.js), where a scroll would be replayed on unpin.
 */
export function restoreAppScroll(y) {
  const run = ++restoreRun;
  if (!y || typeof window === "undefined" || !window.requestAnimationFrame) return;
  let stop = false;
  const quit = () => { stop = true; };
  const evs = ["wheel", "touchstart", "pointerdown", "keydown"];
  evs.forEach(e => window.addEventListener(e, quit, { passive: true, capture: true }));
  const done = () => { evs.forEach(e => window.removeEventListener(e, quit, { capture: true })); };
  const t0 = Date.now();
  let settled = 0, lastAt = null, lastH = null;
  const step = () => {
    if (stop || run !== restoreRun) return done();
    try {
      if (document.body && document.body.style.position === "fixed") return done();
      const el = scroller();
      const inner = !!el && el.scrollHeight > el.clientHeight + 1;
      const h = inner ? el.scrollHeight : document.documentElement.scrollHeight;
      const now = inner ? el.scrollTop : (window.scrollY || 0);
      // Moved since our last write while the page kept its height: someone else scrolled it. A move
      // to exactly 0 is App's own scroll-to-top on a tab or route change (scrollAppTop), not the climber.
      if (lastAt != null && h === lastH && now !== 0 && Math.abs(now - lastAt) > 2) return done();
      if (inner) el.scrollTop = y; else window.scrollTo(0, y);
      lastAt = inner ? el.scrollTop : (window.scrollY || 0);
      lastH = h;
      settled = Math.abs(lastAt - y) < 2 ? settled + 1 : 0;
    } catch (_e) { return done(); }
    if (settled >= 5 || Date.now() - t0 > 2000) return done();
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}
