import { useEffect } from "react";

// The app has 38 [role="dialog"] modals and not one of them moved focus into itself, kept Tab
// inside it, or closed on Escape -- verified in a real browser, not inferred. For a keyboard or
// screen-reader user that means opening Settings leaves focus on the button behind the overlay,
// Tab then walks the page underneath, and there is no key that dismisses it.
//
// They are fixed centrally rather than one at a time because they already share a shape: the
// element carrying role="dialog" IS the full-screen backdrop, and it carries the close handler
// (`<div onClick={close} role="dialog" style={{position:"fixed",inset:0,...}}>`). So clicking
// that element is exactly what the app already does to dismiss a modal, and Escape can reuse it.
// One effect covers all 38 with no per-modal wiring to get wrong.

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function topDialog() {
  const all = document.querySelectorAll('[role="dialog"]');
  return all.length ? all[all.length - 1] : null; // last in DOM order = topmost
}

function focusablesIn(dlg) {
  return Array.prototype.filter.call(dlg.querySelectorAll(FOCUSABLE), el => {
    if (el.disabled || el.getAttribute("aria-hidden") === "true") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

export function useDialogA11y() {
  useEffect(() => {
    let restoreTo = null;

    // --- Escape to close, and Tab kept inside the topmost dialog ---
    const onKey = e => {
      const dlg = topDialog();
      if (!dlg) return;

      if (e.key === "Escape") {
        // Let a text field have Escape first (clearing a search is the expected behaviour).
        const ae = document.activeElement;
        if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA") && ae.value) return;
        e.preventDefault();
        dlg.click(); // the backdrop's own close handler
        return;
      }

      if (e.key !== "Tab") return;
      const f = focusablesIn(dlg);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!dlg.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    // --- move focus in on open, and back to the trigger on close ---
    // Coalesced to one check per frame: the observer watches the whole subtree (modals render
    // both through portals and inline), and this app re-renders often enough that running the
    // query on every mutation record would be wasteful.
    let queued = false;
    const check = () => {
      queued = false;
      const dlg = topDialog();
      if (dlg) {
        if (!dlg.__cmA11y) {
          dlg.__cmA11y = true;
          const ae = document.activeElement;
          if (ae && ae !== document.body) restoreTo = ae;
          if (!dlg.hasAttribute("tabindex")) dlg.setAttribute("tabindex", "-1");
          const f = focusablesIn(dlg);
          try { (f[0] || dlg).focus({ preventScroll: true }); } catch (err) { /* focus is best-effort */ }
        }
      } else if (restoreTo) {
        const back = restoreTo;
        restoreTo = null;
        try { if (document.contains(back)) back.focus({ preventScroll: true }); } catch (err) { /* the trigger may be gone */ }
      }
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };

    const obs = new MutationObserver(queue);
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", onKey, true);
    queue();

    return () => { obs.disconnect(); document.removeEventListener("keydown", onKey, true); };
  }, []);
}
