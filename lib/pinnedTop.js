// What is pinned at the top of the screen, and how to scroll something into view BELOW it.
//
// The app bar (Menu, star, bell…) is fixed, and on a route page the sub-tab bar (Overview · Plan ·
// Conditions…) pins under it: 117px together on a 390px phone (measured 2026-11-18). A plain
// `scrollIntoView({block:"start"})` puts its target at y=0, BEHIND both bars, so the heading it was sent to
// is the one thing the climber cannot see. Two places did exactly that:
//   - a route section's "Show less" scrolled the section's own heading under the bars (reported on the
//     trip plan, 2026-11-18: "after it collapses it gets hidden");
//   - the route page's jump chips ("Month by month →", "N trip reports →", "Route breakdown") landed
//     their heading at y=40, under the sub-tab bar — a fixed 80px scroll-margin cleared the app bar only.
// SectionJumps already measured the bars at tap time (owner, 2026-10-21); this is that measurement, shared.

/** The bottom edge, in viewport px, of whatever is pinned (fixed or sticky) at the top of the screen —
 *  probed twice, so a bar pinned under another bar is counted. `exclude` is never counted (a target that
 *  is itself inside a pinned box). 0 when nothing is pinned or layout is not ready.
 *  The route page's sub-tab bar ([data-cm-route-tabs]) is pinned by JS only once the page has scrolled past
 *  it, so from the top of a route it is still in the flow and the probe misses it — yet a scroll to anything
 *  BELOW it will pin it. So for a target below that bar, the bar's height is counted under the app bar
 *  whether or not it is pinned yet (measured: 59px read at the top, 117px once stuck).
 *  @param {Element|null} [exclude]
 *  @returns {number} */
export function pinnedTopBottom(exclude) {
  let bar = 0;
  try {
    const vh = window.innerHeight || 0;
    for (let pass = 0; pass < 2; pass++) {
      let found = 0;
      for (let el = document.elementFromPoint((window.innerWidth || 0) / 2, bar + 1); el && el !== document.body; el = el.parentElement) {
        const pos = getComputedStyle(el).position;
        if ((pos === "sticky" || pos === "fixed") && !(exclude && el.contains(exclude))) { const b = el.getBoundingClientRect().bottom; if (b > bar && b < vh / 2) found = b; break; }
      }
      if (!found) break;
      bar = found;
    }
    const rt = exclude ? document.querySelector("[data-cm-route-tabs]") : null;
    if (rt && !rt.contains(exclude) && (rt.compareDocumentPosition(exclude) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      const pinned = rt.hasAttribute("data-cm-pinned");
      const h = rt.getBoundingClientRect().height;
      if (!pinned && h > 0) bar += h; /* it pins right under the app bar, which `bar` already measured */
    }
  } catch { /* elementFromPoint before layout: nothing measured */ }
  return Math.round(bar);
}

/** Scroll `el` so its top sits `gap` px below the pinned bars, not under them.
 *  @param {Element|null|undefined} el
 *  @param {{behavior?: ScrollBehavior, gap?: number}} [opts] */
export function scrollBelowPinned(el, opts) {
  if (!el || !el.isConnected || !el.scrollIntoView) return;
  const o = opts || {};
  const want = pinnedTopBottom(el) + (o.gap == null ? 12 : o.gap);
  /** @type {HTMLElement} */ (el).style.scrollMarginTop = want + "px";
  el.scrollIntoView({ behavior: o.behavior || "auto", block: "start" });
  /* FOLLOW the target until the page stops moving under it. A jump that also switches tab fires while that
     tab is still loading: the Conditions tab's forecast arrived ~1,800px ABOVE "Month by month" after the
     scroll had finished, so the heading it jumped to ended up two screens down (measured 2026-11-18 on
     Crooked Thumb). Each 150ms: once the target has held still for two readings (a smooth scroll still
     running is not still) and is not where it should be, scroll again, instantly. Done when it holds still
     in place, after 3s, or the moment the climber touches, scrolls or types — their scroll always wins. */
  if (typeof window === "undefined" || !window.setTimeout) return;
  let last = NaN, still = 0, polls = 0, stopped = false;
  const stop = () => { stopped = true; for (const ev of ["touchstart", "wheel", "keydown", "pointerdown"]) window.removeEventListener(ev, stop, true); };
  for (const ev of ["touchstart", "wheel", "keydown", "pointerdown"]) window.addEventListener(ev, stop, { capture: true, passive: true });
  const tick = () => {
    if (stopped) return;
    if (!el.isConnected || ++polls > 20) { stop(); return; }
    const top = el.getBoundingClientRect().top;
    still = Math.abs(top - last) < 2 ? still + 1 : 0; last = top;
    if (still >= 2) {
      if (Math.abs(top - want) <= 6) { stop(); return; }
      el.scrollIntoView({ behavior: "auto", block: "start" }); still = 0; last = NaN;
    }
    window.setTimeout(tick, 150);
  };
  window.setTimeout(tick, 150);
}

/** Put the page at its very TOP and hold it there until it stops moving: for a link that opens another tab
 *  of the same page, which must start at that tab's top (owner, 2026-11-18, "View all reports & conditions").
 *  The route page already scrolls to the top once on every tab change, and in desktop and emulated-phone
 *  Chrome that one scroll was enough (measured 2026-11-18: 0 from ~2,300px down, on three routes). It was
 *  reported as not enough and not reproduced, so this is the cautious version, not a measured fix: a page
 *  still coasting from a flick, or one that changes height as the new tab loads, can move after a single
 *  scroll. Every 100ms the page is put back at 0 until it has read 0 twice running, for at most 1s, or until
 *  the climber touches, scrolls or types — their scroll always wins, as in scrollBelowPinned.
 *  NOT for a tab change in general: other links switch tab and then scroll to a section on purpose. */
export function scrollPageTop() {
  if (typeof window === "undefined" || typeof document === "undefined" || !window.setTimeout) return;
  const box = () => document.getElementById("appscroll");
  const offset = () => { const sc = box(); return Math.abs(window.scrollY || 0) + (sc ? sc.scrollTop : 0); };
  const go = () => { try { const sc = box(); if (sc && sc.scrollTop) sc.scrollTop = 0; window.scrollTo(0, 0); } catch { /* no window scroll here: nothing to move */ } };
  let held = 0, polls = 0, stopped = false;
  const stop = () => { stopped = true; for (const ev of ["touchstart", "wheel", "keydown", "pointerdown"]) window.removeEventListener(ev, stop, true); };
  for (const ev of ["touchstart", "wheel", "keydown", "pointerdown"]) window.addEventListener(ev, stop, { capture: true, passive: true });
  const tick = () => {
    if (stopped) return;
    if (++polls > 10) { stop(); return; }
    if (offset() < 1) { if (++held >= 2) { stop(); return; } } else { held = 0; go(); }
    window.setTimeout(tick, 100);
  };
  go();
  window.setTimeout(tick, 100);
}
