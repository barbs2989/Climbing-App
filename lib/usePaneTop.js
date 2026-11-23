// A NEW PAGE OPENS AT THE TOP (owner, 2026-11-19).
//
// A popup is built fresh on every open, so it starts at the top by itself. What does not is a pane
// that STAYS MOUNTED while its content is swapped for another page: a sub-tab, the next step of a
// form, a second climber's profile in the same sheet. This hook sends such a pane back to the top
// when `dep` changes. It skips the first run, so a pane that opens at a chosen spot keeps it.
//
//   usePaneTop(ref, dep)   the element in `ref` scrolls (an overlay's own pane)
//   usePaneTop(null, dep)  the page scrolls (a view drawn in the app column)
//
// Deliberately NOT a `key=` remount: that would re-run the popup's page lock and focus handling.
import { useEffect, useRef } from "react";
import { scrollAppToTop } from "./climbsReturn.js";

/**
 * @param {{ current: HTMLElement | null } | null} ref
 * @param {unknown} dep
 */
export function usePaneTop(ref, dep) {
  const seen = useRef(dep);
  useEffect(() => {
    if (seen.current === dep) return;
    seen.current = dep;
    if (!ref) { scrollAppToTop(); return; }
    // Pass the popup's ROOT. On a desktop the root (or its own pane) scrolls; on a phone index.html
    // stretches the root's first child into the page and THAT scrolls. Reset both.
    try {
      const el = ref.current;
      if (!el) return;
      el.scrollTop = 0;
      if (el.firstElementChild) el.firstElementChild.scrollTop = 0;
    } catch (_e) { /* no DOM: nothing to scroll */ }
  }, [ref, dep]);
}
