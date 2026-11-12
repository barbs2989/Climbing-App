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

/** DbAreaBrowser's last position: { stateNode, stack, screen, finderDisc, finderInit, handled }. */
export function getClimbsAreaPos() { return areaPos; }
export function setClimbsAreaPos(p) { areaPos = p; }

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

/**
 * Scroll back to `y` once the page has drawn. App resets the scroll to the top on every tab change
 * (an effect, after render) and an area page fills in from its queries over a few frames, so one
 * scrollTo would land at the top or short. Retry each frame for up to ~2 s until the page is tall
 * enough, and stop at once if the climber scrolls, taps or types — never fight their own scroll.
 */
export function restoreAppScroll(y) {
  if (!y || typeof window === "undefined" || !window.requestAnimationFrame) return;
  let stop = false;
  const quit = () => { stop = true; };
  const evs = ["wheel", "touchstart", "keydown", "mousedown"];
  evs.forEach(e => window.addEventListener(e, quit, { passive: true, capture: true, once: true }));
  const done = () => { stop = true; evs.forEach(e => window.removeEventListener(e, quit, { capture: true })); };
  const t0 = Date.now();
  let settled = 0;
  const step = () => {
    if (stop) return done();
    try {
      const el = scroller();
      const inner = el && el.scrollHeight > el.clientHeight + 1;
      if (inner) el.scrollTop = y; else window.scrollTo(0, y);
      const at = inner ? el.scrollTop : (window.scrollY || 0);
      settled = Math.abs(at - y) < 2 ? settled + 1 : 0;
    } catch (_e) { return done(); }
    if (settled >= 5 || Date.now() - t0 > 2000) return done();
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}
