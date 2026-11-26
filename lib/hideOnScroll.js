// THE PHONE TAB BAR STEPS ASIDE WHILE YOU READ (owner's note, 2026-11-26: "when people are scrolling
// downwards it hides like the app Hinge"). Scrolling DOWN past the top slides the bar away; any scroll
// UP brings it back at once, as do the top of the page, the end of the page (so the last row is never
// left under it, and the bar is where you finish), a tab change, and keyboard focus reaching the bar.
// The same rule as Material's "hide on scroll" bottom navigation and iOS 26's tab bar minimise.
//
// The WINDOW is the phone's scroller (the app column is minHeight:100vh), but a capture-phase listener
// also hears #appscroll, so a layout that makes it the scroller again keeps working. Scrolls inside any
// other pane (a chip row, a sheet, a map) are ignored: they are not the page moving.
import { useCallback, useEffect, useRef, useState } from "react";

const TOP = 64;      // within this of the top the bar always shows
const END = 24;      // within this of the end it shows too
const STEP = 8;      // a scroll smaller than this (a finger settling) changes nothing

function pageScroller(target) {
  if (target === document || target === document.documentElement || target === document.body || target === window) {
    const el = document.scrollingElement || document.documentElement;
    return { top: el.scrollTop, room: el.scrollHeight - el.clientHeight };
  }
  if (target && target.id === "appscroll") return { top: target.scrollTop, room: target.scrollHeight - target.clientHeight };
  return null;
}

/** @param {boolean} enabled  false keeps the bar shown (desktop, an open chat, the policy notice)
 *  @param {unknown} resetKey  a change (the tab) shows the bar again
 *  @returns {[boolean, (hidden:boolean)=>void]} hidden, and a setter for focus handlers */
export function useHideOnScroll(enabled, resetKey) {
  // hidden belongs to the tab it was set on: a new tab starts shown, with no effect resetting it
  const [st, setSt] = useState({ key: resetKey, hidden: false });
  const keyRef = useRef(resetKey);
  const last = useRef(-1);
  useEffect(() => { keyRef.current = resetKey; last.current = -1; }, [resetKey]);
  const setHidden = useCallback((h) => setSt(p => (p.key === keyRef.current && p.hidden === h ? p : { key: keyRef.current, hidden: h })), []);
  useEffect(() => {
    if (!enabled) return undefined;
    let frame = 0, pendingTarget = null;
    const read = () => {
      frame = 0;
      const s = pageScroller(pendingTarget);
      if (!s) return;
      const top = Math.max(0, s.top);
      if (last.current < 0) { last.current = top; return; }
      const d = top - last.current;
      if (top <= TOP || s.room - top <= END) { setHidden(false); last.current = top; return; }
      if (Math.abs(d) < STEP) return;
      // never slide away from under KEYBOARD focus (focusing a hidden tab scrolls the page down to it); a tap leaves focus on the tab too, but not :focus-visible, so it still hides
      if (d > 0 && document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-cm-tabbar]") && document.activeElement.matches(":focus-visible")) { last.current = top; return; }
      setHidden(d > 0);
      last.current = top;
    };
    const onScroll = (e) => { pendingTarget = e.target; if (!frame) frame = requestAnimationFrame(read); };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => { document.removeEventListener("scroll", onScroll, { capture: true }); if (frame) cancelAnimationFrame(frame); };
  }, [enabled, setHidden]);
  return [enabled && st.key === resetKey && st.hidden, setHidden];
}
