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

// Only a dialog that is actually OVER the page counts. The route map carried role="dialog" in
// its inline state too, and once this hook began locking the root (#1794) the whole Plan tab
// stopped scrolling -- and Tab and Escape were captured by a 300px map in the page flow. Every
// real modal here is position:fixed, so an element in the flow is not one, whatever its role.
function topDialog() {
  const all = Array.prototype.filter.call(document.querySelectorAll('[role="dialog"]'), el => getComputedStyle(el).position === "fixed");
  return all.length ? all[all.length - 1] : null; // last in DOM order = topmost
}

// The scroll lock asks a wider question than the focus trap: is ANYTHING covering the page? Not
// every full-screen view carries role="dialog" -- Edit profile, Guides, the calendar and the guide
// dashboard are position:fixed, inset:0, opaque and role-less -- and the page behind them scrolled
// just the same. A transparent fixed layer (the click-catcher behind a dropdown) or one that lets
// pointer events through covers nothing, and must not freeze the page. <body> is skipped by name:
// the lock itself pins it position:fixed, and at scroll 0 on a page one viewport tall it would pass
// every other test and hold the lock on forever. The wide-screen sidebar (role="navigation",
// lib/wideLayout.js) is skipped too: it is fixed, opaque and full height, so on every screen
// 1024px and wider it passed as a cover and froze the page for good.
function coveringLayer() {
  const els = document.querySelectorAll('[style*="position: fixed"]');
  for (let i = 0; i < els.length; i++) {
    if (els[i] === document.body || els[i] === document.documentElement) continue;
    if (els[i].getAttribute("role") === "navigation") continue;
    const cs = getComputedStyle(els[i]);
    // On a desktop a full-screen view is a page in the column, starting under the 64px top bar
    // (lib/wideLayout.js wideCss), and still covers the page it sits on.
    if (cs.position !== "fixed" || cs.pointerEvents === "none" || parseFloat(cs.top) > 64 || cs.bottom !== "0px") continue;
    const bg = cs.backgroundColor;
    if (!bg || bg === "transparent" || /,\s*0\)$/.test(bg)) continue;
    const r = els[i].getBoundingClientRect();
    if (r.width > 0 && r.height >= (window.innerHeight - Math.max(0, r.top)) * 0.9) return true;
  }
  return false;
}

// --- a popup's ✕ and ← Back stay on screen while it scrolls ---
// Reported 2026-10-24: "The x out to close the page and back button need to be sticky when a popup
// page comes up." Measured at 390x844 (check:pinned-dismiss): of 54 popups, 5 already lost their ✕
// with the demo's own content (Log a climb 3,124px of travel, Suggest a fix 3,634px, the Menu,
// Privacy, the trip report) and ~45 more lost it as soon as they held a screen more -- a long list,
// a long report -- because the header row was ordinary flow inside the pane that scrolls. Only
// eight popups had pinned their own header, each by hand.
// They are pinned centrally for the same reason the focus trap is: every popup already shares the
// shape -- a header row at the top of the pane that scrolls, holding a button labelled Close… or
// Back… (check:popup-chrome keeps those labels) -- so one rule reaches all of them, and every popup
// written later, with nothing per-popup to forget. Material's full-screen dialog and iOS's sheet
// both keep the close in a top bar the content scrolls under; this is that bar.
const DISMISS = /^(close|back)\b/i;
const isDismiss = b => {
  const a = (b.getAttribute("aria-label") || "").trim(), t = (b.textContent || "").trim();
  if (/^(remove|delete|dismiss|clear)\b/i.test(a)) return false; // a remove-✕ on a chip closes nothing
  return DISMISS.test(a) || t === "✕" || /^← ?Back\b/.test(t);
};
const canScroll = el => { const o = getComputedStyle(el).overflowY; return o === "auto" || o === "scroll"; };
const solidBg = el => {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (bg && bg !== "transparent" && !/,\s*0\)$/.test(bg)) return bg;
  }
  return "#0d1117";
};
// The header row is the tallest ancestor of the control that is still a ROW (at most 120px), below
// the pane that scrolls. Pinned only when it sits at the TOP of that pane: a "Back" at the foot of a
// wizard step is a way back too, and lifting it over the form would be wrong.
function pinDismiss(layer) {
  const btns = layer.querySelectorAll("button");
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    if (b.__cmPinChecked || !isDismiss(b)) continue;
    const br = b.getBoundingClientRect();
    if (!br.width || !br.height) continue; // not laid out yet; looked at again on the next change
    b.__cmPinChecked = true;
    let host = b.parentElement;
    while (host && host !== layer.parentElement && !canScroll(host)) host = host.parentElement;
    if (!host || host === layer.parentElement) continue; // nothing around it scrolls
    let row = b;
    while (row.parentElement && row.parentElement !== host && row.parentElement.offsetHeight <= 120) row = row.parentElement;
    const cs = getComputedStyle(row);
    // Already pinned by its popup: lift it over the content only (a range slider's thumb is z 4).
    if (cs.position === "sticky" || cs.position === "fixed") { if (cs.zIndex === "auto" || +cs.zIndex < 5) row.style.zIndex = "5"; continue; }
    if (cs.position === "absolute") continue; // drawn over a photo; that popup pins its own
    const hr = host.getBoundingClientRect();
    if (row.getBoundingClientRect().top - hr.top - host.clientTop + host.scrollTop > 80) continue;
    const bg = solidBg(row), pad = parseFloat(getComputedStyle(host).paddingTop) || 0;
    // top:0 sticks the row below the pane's top padding; the shadow paints that strip in the row's
    // colour so the content scrolling under it does not show through above the ✕.
    Object.assign(row.style, { position: "sticky", top: "0px", zIndex: "5", background: bg, boxShadow: pad ? `0 -${pad}px 0 0 ${bg}` : row.style.boxShadow });
  }
}

// Every popup open right now: the dialogs, and the role-less full-screen views coveringLayer() finds.
function pinLayers() {
  const els = document.querySelectorAll('[role="dialog"], [style*="position: fixed"]');
  for (let i = 0; i < els.length; i++) {
    if (els[i] === document.body || els[i].getAttribute("role") === "navigation") continue;
    if (getComputedStyle(els[i]).position !== "fixed") continue;
    const r = els[i].getBoundingClientRect();
    if (r.width >= window.innerWidth * 0.5 && r.height >= window.innerHeight * 0.25) pinDismiss(els[i]);
  }
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
        // ...and so may a control that is holding something Escape should let go of first: the topo
        // photo while a point is selected (RouteDetail's TopoDrawer sets this only then).
        if (ae && ae.closest && ae.closest('[data-keeps-escape="true"]')) return;
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

    // --- the page behind an open dialog must not scroll ---
    // Every modal here is position:fixed over a document that is still scrollable (the DOCUMENT
    // is the scroller: the shell is min-height:100vh, so #appscroll grows with its content and
    // never scrolls itself), so a wheel or a drag over a popup that has nothing left to scroll --
    // its backdrop, its header, a pane whose content fits -- scrolled the screen underneath
    // instead: TWO scrolls from one gesture. overscroll-behavior:contain on the popup's pane cannot
    // stop that; it governs only a pane that is itself scrolling.
    // overflow:hidden on <html> is enough on desktop and was all this did -- and iOS Safari (the
    // home-screen app above all) IGNORES it for a touch drag, so on the phone the feed still
    // scrolled behind "Log a climb" and every other popup. Pinning <body> at its current offset is
    // the one lock iOS honours; "Past crews" already did exactly that for itself, which is why that
    // one sheet never had the bug, and it now shares this lock instead of keeping its own (two pins
    // on one <body> would each restore the other's values). The scroll position is put back on
    // close, so the reader lands exactly where they were -- read back from body.top AT CLOSE, not
    // remembered from open, because while pinned window.scrollTo is a no-op: a popup action that
    // navigates (open a route, switch tab) asks for the top through scrollAppTop in ClimbMatch.jsx,
    // which zeroes body.top when it finds the body pinned. Where the platform draws a classic
    // (space-taking) scrollbar, its gutter is kept so the 520px column does not jump sideways.
    const setPageLock = on => {
      const root = document.documentElement, b = document.body;
      if (on && !locked) {
        const y = window.scrollY;
        locked = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter,
          body: { position: b.style.position, top: b.style.top, left: b.style.left, right: b.style.right, width: b.style.width } };
        const hadBar = window.innerWidth - root.clientWidth > 0;
        root.style.overflow = "hidden";
        if (hadBar) root.style.scrollbarGutter = "stable";
        Object.assign(b.style, { position: "fixed", top: -y + "px", left: "0", right: "0", width: "100%" });
      } else if (!on && locked) {
        const y = -parseFloat(b.style.top) || 0;
        root.style.overflow = locked.overflow;
        root.style.scrollbarGutter = locked.gutter;
        Object.assign(b.style, locked.body);
        window.scrollTo(0, y);
        locked = null;
      }
    };

    // --- move focus in on open, and back to the trigger on close ---
    // Coalesced to one check per frame: the observer watches the whole subtree (modals render
    // both through portals and inline), and this app re-renders often enough that running the
    // query on every mutation record would be wasteful.
    let queued = false;
    let locked = null;
    const check = () => {
      queued = false;
      const dlg = topDialog();
      setPageLock(!!dlg || coveringLayer());
      if (locked) pinLayers();
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

    return () => { obs.disconnect(); document.removeEventListener("keydown", onKey, true); setPageLock(false); };
  }, []);
}
