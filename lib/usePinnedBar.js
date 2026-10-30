import { useRef, useState, useEffect } from "react";

// PINS a bar under the app's own top bar once the page scrolls past it. Not CSS sticky: #appscroll
// is overflow:auto but grows to its content on a phone, where the DOCUMENT scrolls, and a sticky
// child of a scroll container that never scrolls never sticks. The pin line is the bottom of the
// app's sticky top bar (phone), or the top of #appscroll when that is what scrolls (desktop); both
// are measured, because the bar's height differs between the two shells.
// `endRef` (optional) marks where the list the bar searches ENDS: once that marker rises to the
// bar's bottom edge the bar lets go and scrolls away with the list, as CSS sticky would inside it.
/** @param {import("react").RefObject<HTMLElement | null>} [endRef] */
export function usePinnedBar(endRef) {
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null)), barRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [pin, setPin] = useState(/** @type {{ top: number, left: number, width: number, height: number } | null} */ (null)); // null, or { top, left, width, height } while pinned
  useEffect(() => {
    const lineY = () => {
      const w = wrapRef.current, sc = w && w.closest("#appscroll");
      if (sc && sc.scrollHeight > sc.clientHeight + 1) return sc.getBoundingClientRect().top;
      let bottom = 0;
      for (const e of document.elementsFromPoint(window.innerWidth / 2, 1)) {
        if (w && w.contains(e)) continue;
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          const pos = getComputedStyle(n).position;
          if (pos === "sticky" || pos === "fixed") { bottom = Math.max(bottom, n.getBoundingClientRect().bottom); break; }
        }
      }
      return bottom;
    };
    let line = lineY(), raf = 0;
    const check = () => {
      raf = 0;
      const w = wrapRef.current, b = barRef.current;
      if (!w || !b) return;
      const r = w.getBoundingClientRect(), end = endRef && endRef.current;
      const past = !!end && end.getBoundingClientRect().top < line + b.offsetHeight;
      const next = r.top < line && !past ? { top: Math.round(line), left: Math.round(r.left), width: Math.round(r.width), height: b.offsetHeight } : null;
      setPin(p => (!p && !next) || (p && next && p.top === next.top && p.left === next.left && p.width === next.width && p.height === next.height) ? p : next);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    const onResize = () => { line = lineY(); onScroll(); };
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    check();
    return () => { document.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onResize); if (raf) cancelAnimationFrame(raf); };
  }, [endRef]);
  return { wrapRef, barRef, pin };
}
