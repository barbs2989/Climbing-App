// Swipe a page sideways to change its tab, as the Facebook and Mountain Project phone apps do
// (owner, 2026-11-14: "swiping screens to move left or right to change pages").
//
// Finger moves LEFT -> the next tab (the one to the right in the tab row); RIGHT -> the previous.
// Phone only: a mouse cannot swipe, and on the website the tab row is a click away.
//
// A swipe NEVER takes a gesture something else already owns. A touch that starts on any of these is
// left alone for its whole life:
//   * anything that sets its own touch-action (other than the global `manipulation` on buttons):
//     SwipeRow's archive/delete rows, RangeSlider, the chart scrubbers, TopoZoomPhoto, TopoDrawer;
//   * a map, a canvas, a form field, editable text, anything inside a dialog or marked data-swipe="off";
//   * a row that scrolls sideways (tab strips, photo strips, day pickers, chip rows) -- it keeps the drag;
//   * the outer 20px at each side of the screen, where iOS and Android put their own back gesture.
// The direction locks after 10px: a drag clearly more sideways than down (1.5x) is a swipe, anything
// else is a scroll and the swipe lets go. No touchmove is ever prevented, so scrolling is untouched.
//
// The page follows the finger at 60% (a stretch at the first and last tab, where there is nowhere to go),
// and changes tab on release past 30% of its width, or on a quick flick. The new tab slides in from the
// side the finger was heading to. The motion uses the Web Animations API with no fill, so no transform
// stays on the page at rest (a transform makes a containing block for position:fixed children -- see
// scripts/check-overlay-portals.mjs). Reduced motion: the tab changes without the slide.

import { useCallback, useRef, useState } from "react";
import { useWideScreen } from "./wideLayout.js";

export const SWIPE_LOCK_PX = 10;
export const SWIPE_RATIO = 1.5;
export const SWIPE_COMMIT = 0.3;
export const SWIPE_FLICK_PX = 40;
export const SWIPE_FLICK_V = 0.45; // px per ms
export const SWIPE_EDGE_PX = 20;

const OWN_GESTURE = '.leaflet-container, .maplibregl-map, canvas, input, textarea, select, [contenteditable="true"], [role="slider"], [data-swipe="off"]';

// Does the touch that started on `el` belong to something else? Walks up to (not past) `root`.
export function ownsGesture(el, root) {
  if (!el || !el.closest) return true;
  // React bubbles a touch on a portalled sheet up through the page that opened it; the sheet is not the page.
  if (root && !root.contains(el)) return true;
  if (el.closest(OWN_GESTURE)) return true;
  // A dialog drawn INSIDE the page (not one the page itself sits in, as another climber's profile does).
  const dlg = el.closest('[role="dialog"]');
  if (dlg && root && !dlg.contains(root)) return true;
  for (let n = el; n && n !== root && n !== document.body; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const ta = cs.touchAction;
    if (ta && ta !== "auto" && ta !== "manipulation") return true;
    const ox = cs.overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
  }
  return false;
}

// The tab a finished drag lands on, or null to stay. dx < 0 is a finger moving left.
export function swipeTarget(ids, cur, dx, width, ms) {
  const i = ids.indexOf(cur);
  if (i < 0 || !width) return null;
  const v = Math.abs(dx) / Math.max(ms, 1);
  const far = Math.abs(dx) >= width * SWIPE_COMMIT || (Math.abs(dx) >= SWIPE_FLICK_PX && v >= SWIPE_FLICK_V);
  if (!far) return null;
  const j = dx < 0 ? i + 1 : i - 1;
  return j >= 0 && j < ids.length ? ids[j] : null;
}

function reducedMotion() {
  try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; }
}

/**
 * useSwipeTabs({ ids, cur, onChange, enabled })
 *   ids      the tabs in row order, as shown (already filtered)
 *   cur      the tab showing now
 *   onChange called with the tab to show; the caller sets its own state
 * Returns { ref, bind, dragStyle }: put `ref` and `...bind` on the element that holds the tab's
 * content, and merge `dragStyle` (null at rest) into its style.
 */
export function useSwipeTabs({ ids, cur, onChange, enabled = true }) {
  const wide = useWideScreen();
  const on = enabled && !wide && ids && ids.length > 1;
  const elRef = useRef(null);
  const g = useRef(null); // { x, y, t, lock: null | "x" | "off" }
  const [dx, setDx] = useState(0);
  const latest = useRef({ ids, cur, onChange });
  latest.current = { ids, cur, onChange };

  // touchmove/end/cancel are NATIVE listeners, put on the touched element itself when a touch starts:
  //  * React's are passive, and once a drag is a swipe it must preventDefault, or Chrome reads the same
  //    drag as "back a page" and leaves the app (measured: a right swipe landed on about:blank, and
  //    overscroll-behavior-x alone did not stop it). It cancels nothing until the drag is locked
  //    sideways, so taps and vertical scrolls go to the browser exactly as before.
  //  * The browser keeps sending a touch to the element it started on even after React removes that
  //    element (a tab's forecast loading under the finger). Events on a detached node reach neither the
  //    page nor React's root, so a listener anywhere else dropped the swipe half-way (measured on the
  //    route page's Conditions tab, its first visit).
  const moveRef = useRef(null), endRef = useRef(null), cancelRef = useRef(null);
  const h = useRef(null);
  if (!h.current) h.current = {
    move: function (e) { if (moveRef.current) moveRef.current(e); },
    end: function (e) { if (endRef.current) endRef.current(e); },
    cancel: function (e) { if (cancelRef.current) cancelRef.current(e); },
  };
  const listen = function (t, add) {
    if (!t) return;
    const f = add ? "addEventListener" : "removeEventListener";
    t[f]("touchmove", h.current.move, add ? { passive: false } : undefined);
    t[f]("touchend", h.current.end);
    t[f]("touchcancel", h.current.cancel);
  };
  const ref = useCallback(function (el) { elRef.current = el; }, []);

  const shown = function (raw) {
    const { ids: list, cur: c } = latest.current;
    const i = list.indexOf(c);
    const stuck = (raw < 0 && i >= list.length - 1) || (raw > 0 && i <= 0);
    // At either end there is no tab to go to: a short, firm stretch says so.
    return stuck ? Math.max(-48, Math.min(48, raw * 0.2)) : raw * 0.6;
  };

  const start = function (e) {
    if (g.current) listen(g.current.tgt, false);
    g.current = null;
    if (!on || e.touches.length !== 1) return;
    // Nested swipes (a page's tab row inside the app's sections): the innermost one that takes a touch
    // owns it. React bubbles inner to outer, so an outer swipe sees the mark the inner one left.
    const ne = e.nativeEvent || e;
    if (ne.__cmSwipeTaken) return;
    const p = e.touches[0];
    const w = window.innerWidth || 0;
    if (p.clientX < SWIPE_EDGE_PX || p.clientX > w - SWIPE_EDGE_PX) return;
    try { const s = window.getSelection && window.getSelection(); if (s && !s.isCollapsed) return; } catch (err) { /* no selection API */ }
    if (ownsGesture(e.target, elRef.current)) return;
    g.current = { x: p.clientX, y: p.clientY, t: Date.now(), lock: null, tgt: e.target };
    ne.__cmSwipeTaken = true;
    listen(e.target, true);
  };
  const move = function (e) {
    const s = g.current;
    if (!s || s.lock === "off") return;
    if (e.touches.length !== 1) { s.lock = "off"; setDx(0); return; }
    const p = e.touches[0];
    const ddx = p.clientX - s.x, ddy = p.clientY - s.y;
    if (!s.lock) {
      if (Math.abs(ddx) < SWIPE_LOCK_PX && Math.abs(ddy) < SWIPE_LOCK_PX) return;
      s.lock = Math.abs(ddx) > Math.abs(ddy) * SWIPE_RATIO ? "x" : "off";
      if (s.lock === "off") return;
    }
    // A drag that turns into a scroll part-way lets go too.
    if (Math.abs(ddy) > Math.abs(ddx)) { s.lock = "off"; setDx(0); return; }
    if (e.cancelable) e.preventDefault();
    s.dx = ddx;
    setDx(shown(ddx));
  };
  moveRef.current = on ? move : null;
  const end = function () {
    const s = g.current;
    g.current = null;
    if (s) listen(s.tgt, false);
    if (!s || s.lock !== "x") { setDx(0); return; }
    const { ids: list, cur: c, onChange: go } = latest.current;
    const el = elRef.current;
    const width = (el && el.clientWidth) || window.innerWidth || 0;
    const to = swipeTarget(list, c, s.dx || 0, width, Date.now() - s.t);
    setDx(0);
    if (!to) return;
    go(to);
    if (reducedMotion()) return;
    const from = (s.dx < 0 ? 1 : -1) * Math.round(width * 0.35);
    // Next frame, on whatever element holds the content THEN: a section change remounts it (#appscroll is
    // keyed by tab), and animating the old one would slide a node that is already gone.
    requestAnimationFrame(function () {
      const now = elRef.current;
      if (!now || !now.animate) return;
      try { now.animate([{ transform: "translateX(" + from + "px)", opacity: 0.35 }, { transform: "translateX(0)", opacity: 1 }], { duration: 190, easing: "cubic-bezier(.2,.7,.3,1)" }); } catch (err) { /* old engine: the tab still changes */ }
    });
  };
  const cancel = function () { if (g.current) listen(g.current.tgt, false); g.current = null; setDx(0); };
  endRef.current = end;
  cancelRef.current = cancel;

  if (!on) return { ref, bind: {}, dragStyle: null };
  return {
    ref,
    bind: { onTouchStart: start },
    dragStyle: dx ? { transform: "translateX(" + dx + "px)" } : null,
  };
}

// After a swipe, bring the newly current tab button into view inside its own scrolling row WITHOUT
// scrolling the page (scrollIntoView's block:"nearest" can move the page when the row is off-screen).
export function revealCurrentTab(row) {
  if (!row) return;
  const b = row.querySelector('[aria-current="true"], [aria-current="page"], [aria-pressed="true"]');
  if (!b) return;
  const r = row.getBoundingClientRect(), br = b.getBoundingClientRect();
  if (br.left < r.left + 8) row.scrollLeft -= r.left + 8 - br.left;
  else if (br.right > r.right - 8) row.scrollLeft += br.right - (r.right - 8);
}
