// The top bar's Back on a phone (owner, 2026-11-18: "persist the back button on the top left so it's always
// visible even as you scroll down ... If there's already a back button on the screen, just have 1 and have
// it be on the top left. This is for app view only").
//
// No screen is rewired. Whatever screen is in the main column keeps its own ← Back and its own handler (a
// climb's route stack, a chat's way back to where it was opened, the area browser's crumbs); this finds that
// control (findPageBack in lib/dialogA11y.js), marks it so the <style> rule in ClimbMatch.jsx hides it, and
// gives App its name so the sticky top bar draws one Back beside the Menu that taps it.
//
// It looks again on every DOM change in a MutationObserver callback, which runs before the browser paints,
// so the screen's own Back is hidden in the same frame it appears rather than flashing for a moment.
// Phone only: on the website (lib/wideLayout.js) the screens keep their own Back.

import { useEffect, useRef, useState } from "react";
import { findPageBack, PAGE_BACK_ATTR } from "./dialogA11y.js";

const nameOf = function (b) {
  const s = (b.getAttribute("aria-label") || b.textContent || "").replace(/^←\s*/, "").replace(/\s+/g, " ").trim();
  return s || "Back";
};

/** @returns {{ label: string | null, go: () => void }} label is null when the screen has no Back of its own. */
export function usePageBack(enabled) {
  const [label, setLabel] = useState(/** @type {string | null} */ (null));
  const held = useRef(/** @type {Element | null} */ (null));

  useEffect(function () {
    if (!enabled || typeof document === "undefined" || typeof MutationObserver === "undefined") return undefined;
    const scan = function () {
      const b = findPageBack();
      const prev = held.current;
      if (prev && prev !== b) prev.removeAttribute(PAGE_BACK_ATTR);
      if (b && !b.hasAttribute(PAGE_BACK_ATTR)) b.setAttribute(PAGE_BACK_ATTR, "");
      held.current = b;
      const next = b ? nameOf(b) : null;
      setLabel(function (cur) { return cur === next ? cur : next; });
    };
    // Attributes are not watched: marking the control is an attribute change, and would wake this again.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    scan();
    return function () {
      mo.disconnect();
      if (held.current) held.current.removeAttribute(PAGE_BACK_ATTR);
      held.current = null;
      setLabel(null);
    };
  }, [enabled]);

  const go = function () {
    const b = held.current;
    if (b && b.isConnected && b instanceof HTMLElement) b.click();
  };
  return { label: label, go: go };
}
