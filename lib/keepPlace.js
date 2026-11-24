// A "Show fewer" / "Show less" keeps the climber WHERE THEY WERE (owner, 2026-11-23: "it directs me to the bottom
// of the page, fix that it should be where you left off"; then "yes fix the rest").
//
// A fold removes rows or text that sit ABOVE its own button. The page gets shorter above the reader while the scroll
// offset stays the same number, so everything slides up and the reader lands far below what they were reading
// (Safari has no scroll anchoring at all, and Chrome's only sometimes holds it). foldKeepingPlace notes where the
// tapped control is on screen, applies the fold at once (flushSync), and moves the nearest scroll box back by however
// far the control moved: the control stays under the finger.
//
// A control that is itself REMOVED by the fold (a "Show fewer" drawn only while open) cannot be its own anchor; the
// element just before it, which a fold that drops rows from the top leaves standing, anchors instead. If what lands is
// behind the pinned bars or off the screen, it is brought in below the bars (lib/pinnedTop.js).
import { flushSync } from "react-dom";
import { pinnedTopBottom, scrollBelowPinned } from "./pinnedTop.js";

/** The box that scrolls `el`: the nearest ancestor that scrolls, else the page.
 *  @param {Element} el
 *  @returns {Element|null} */
function scrollBoxOf(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement;
}

/** Run `change` (the state update that folds) so that the tapped control does not move on screen.
 *  Pass `keep: false` when this tap OPENS rather than folds: opening adds rows below what the reader sees, so it
 *  runs as a plain update.
 *  @param {{currentTarget: EventTarget|null}|Element|null|undefined} from the click event, or the control itself
 *  @param {() => void} change
 *  @param {boolean} [keep] */
export function foldKeepingPlace(from, change, keep) {
  const el = from && "currentTarget" in from ? from.currentTarget : from;
  if (keep === false || typeof window === "undefined" || !(el instanceof Element) || !el.isConnected) { change(); return; }
  const anchors = [el, el.previousElementSibling].filter((a) => a instanceof Element);
  const before = anchors.map((a) => a.getBoundingClientRect().top);
  flushSync(change);
  const i = anchors.findIndex((a) => a.isConnected);
  if (i < 0) return;
  const a = anchors[i];
  const box = scrollBoxOf(a);
  if (box) box.scrollTop += a.getBoundingClientRect().top - before[i];
  const r = a.getBoundingClientRect();
  if (r.top < pinnedTopBottom(a) || r.bottom > window.innerHeight) scrollBelowPinned(a);
}
