// The phone's Back button (Android's back gesture/key, Safari's edge swipe) steps back INSIDE the app
// (owner, 2026-11-14: step 3 of the swipe plan, "do what you recommend"). Before this the app pushed no
// history at all, so Back closed it from anywhere -- mid-climb, mid-chat, with Settings open.
//
// How, without a route per screen:
//   * While there is somewhere to go back to, ONE extra history entry sits on top ("armed"), with the
//     same URL (a reload or the service worker sees nothing new; the deep-link ?route= cleanup is kept).
//   * Back pops that entry. On popstate the app does its own back: the top layer's ✕ / ← Back, tapped for
//     you (findBackControl in lib/dialogA11y.js -- the same control and the same handler a climber taps),
//     or, on a section's main screen other than Home, Home -- the usual Android order.
//   * Right after, it re-arms if there is still somewhere to go back to (so a quick double Back walks two
//     steps rather than leaving), and DISARMS (removes the entry) when there is not: on Home with nothing
//     open, Back leaves the app on the first press, not the second.
// Tabs are not history: switching section never pushes an entry.
// Phone only (below lib/wideLayout.js WIDE_MIN): on the website the browser's own Back is the browser's.
// Back on a half-written form does what tapping its ✕ does -- the sheets that ask before discarding
// (TopoDrawer, Suggest a fix) still ask.

import { useEffect, useRef } from "react";
import { findBackControl } from "./dialogA11y.js";

const MARK = "cmBack";
// Nothing is pushed until the boot-time deep-link cleanup (ClimbMatch.jsx, a replaceState that strips
// ?route= and friends) has run: pushed first, our entry would be the one it rewrote.
const BOOT_MS = 1500;

export function useBackButton({ enabled, isHome, goHome }) {
  const live = useRef({ isHome, goHome });
  live.current = { isHome, goHome };
  const st = useRef({ armed: false, ignore: 0, timer: 0, booted: false, sync: null, soon: null, stuck: null });

  useEffect(function () {
    if (!enabled || typeof window === "undefined" || !window.history || !window.history.pushState) return undefined;
    const s = st.current;
    s.ignore = 0;
    s.stuck = null;
    // A dialog whose backdrop did not close when Back tapped it is not tried again (review): Back then
    // behaves as if it were not there, rather than doing nothing for as long as it stays open.
    const target = function () {
      const b = findBackControl();
      return b && b.how === "backdrop" && b.el === s.stuck ? null : b;
    };
    const canGoBack = function () { return !!target() || !live.current.isHome; };
    const arm = function () {
      if (s.armed) return;
      try { window.history.pushState({ [MARK]: 1 }, "", window.location.href); s.armed = true; } catch (e) { /* a sandboxed frame */ }
    };
    const disarm = function () {
      if (!s.armed) return;
      s.armed = false;
      s.ignore++; // the popstate history.back() fires is ours, not the climber's
      try { window.history.back(); } catch (e) { s.ignore--; }
    };
    s.sync = function () { if (!s.booted) return; if (canGoBack()) arm(); else disarm(); };
    // A THROTTLE, not a debounce (review): an App that re-renders every few hundred ms must not keep
    // putting the check off.
    s.soon = function (ms) { if (s.timer) return; s.timer = setTimeout(function () { s.timer = 0; if (s.sync) s.sync(); }, ms); };
    // Reloaded with our entry on top: the entry under it belongs to the page before the reload, and going
    // to it would load the app again rather than close a screen. Start clean and re-arm normally.
    try { if (window.history.state && window.history.state[MARK]) window.history.replaceState(null, "", window.location.href); } catch (e) { /* ignore */ }
    s.armed = false;
    const onPop = function (e) {
      if (s.ignore) { s.ignore--; return; }
      // FORWARD onto our own entry (it stays in forward history after a disarm): nothing to do but note it.
      if (e && e.state && e.state[MARK]) { s.armed = true; return; }
      s.armed = false; // Back took our entry
      const b = target();
      if (b && b.how === "none") { /* a cover with no way out: Back waits for it */ }
      else if (b) { b.el.click(); if (b.how === "backdrop" && findBackControl() && findBackControl().el === b.el) s.stuck = b.el; }
      else if (!live.current.isHome && live.current.goHome) live.current.goHome();
      // The click ran its handler synchronously (React flushes a click at once): re-arm NOW if there is
      // still somewhere to go back to, so a second Back right after walks one more step.
      if (s.booted && canGoBack()) arm();
      s.soon(350);
    };
    // Screens that change without App re-rendering (the area browser's own crumbs) are caught after a tap.
    const onTap = function () { s.soon(400); };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onTap, true);
    const boot = setTimeout(function () { s.booted = true; s.sync(); }, BOOT_MS);
    return function () {
      clearTimeout(boot);
      clearTimeout(s.timer);
      s.timer = 0;
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onTap, true);
      // Take our entry off WITHOUT the ignore counter (review): the listener that would consume that
      // popstate is already gone, and a counter left at 1 swallowed the next real Back.
      if (s.armed) { s.armed = false; try { window.history.back(); } catch (e) { /* ignore */ } }
      s.ignore = 0;
      s.sync = null;
      s.soon = null;
      s.booted = false;
    };
  }, [enabled]);

  // Every App render may have opened or closed something: look again shortly after it paints.
  useEffect(function () {
    const s = st.current;
    if (enabled && s.soon && s.booted) s.soon(300);
  });
}
