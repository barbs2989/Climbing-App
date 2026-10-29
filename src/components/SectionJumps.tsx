import { useEffect, useRef, useState, type RefObject } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface SectionJumpsProps {
  /** The tab's content element; the jump row scans its headings and re-scans as they change. */
  rootRef: RefObject<HTMLElement | null>;
  /** The open sub-tab; a change re-runs the scan. */
  tabKey: string;
}

/* JUMP LINKS: one button per section the open tab ACTUALLY rendered, so the row cannot name a section this
   route lacks. Read off the DOM rather than kept as a per-tab list: the headings already are the page's
   outline (SL = aria-level 2, CardHead = 3), and a list beside them would drift the first time a section is
   added or gated on data. Section headings only when a tab has four; otherwise the card titles too, because
   Overview and Safety are mostly cards. Hidden under four links — a short tab is quicker to scroll than a
   row of links about it is to read. Inline, not sticky: a fixed bar has covered controls here before.
   A heading that WRAPS another heading (a fold whose button holds a CardHead and a summary line) is skipped
   for the inner one, and a fold heading whose title sits beside a summary marks the title `data-jump-label`:
   the whole heading's text welded the two into one pill ("Active fire nearby4 fires", "FLOAT PLANCommitting…"). */
const jumpLabel = (t: string | null) => { let s = String(t || "").replace(/\s+/g, " ").trim().split(/ [·—] /)[0].replace(/^[^\p{L}\p{N}]+/u, "").trim(); if (s && s === s.toUpperCase() && /\p{L}/u.test(s)) s = s.charAt(0) + s.slice(1).toLowerCase(); return s.length > 30 ? s.slice(0, 29).trim() + "…" : s; };

/**
 * The route page's inline row of section jump pills (`<nav data-jumps aria-label="Jump to a section">`), built
 * from the headings the open tab really rendered and hidden under four. A tap jumps (no smooth scroll), flashes
 * the heading blue for 1.2 s and focuses it.
 */
export default function SectionJumps({ rootRef, tabKey }: SectionJumpsProps) {
  const [items, setItems] = useState<string[]>([]);
  const els = useRef<HTMLElement[]>([]);
  useEffect(function () {
    const root = rootRef.current;
    if (!root || typeof MutationObserver === "undefined") return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const scan = function () {
      t = null;
      const all = Array.from(root.querySelectorAll<HTMLElement>('[role="heading"][aria-level="2"],[role="heading"][aria-level="3"]')).filter(function (h) { return !h.closest("[data-jumps]") && h.getClientRects().length > 0 && !h.querySelector('[role="heading"]'); });
      const l2 = all.filter(function (h) { return h.getAttribute("aria-level") === "2"; });
      const use: HTMLElement[] = [], labels: string[] = [];
      (l2.length >= 4 ? l2 : all).forEach(function (h) { const l = jumpLabel((h.querySelector("[data-jump-label]") || h).textContent); if (l && labels.indexOf(l) < 0) { labels.push(l); use.push(h); } });
      els.current = use;
      setItems(function (prev) { return prev.join("\n") === labels.join("\n") ? prev : labels; });
    };
    scan();
    const mo = new MutationObserver(function () { if (!t) t = setTimeout(scan, 250); });
    mo.observe(root, { childList: true, subtree: true });
    return function () { mo.disconnect(); if (t) clearTimeout(t); };
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps -- rootRef is a ref object: its identity never changes, and the scan reads .current when it runs
  if (items.length < 4) return null;
  function go(i: number) {
    const h = els.current[i];
    if (!h || !h.isConnected) return;
    /* Land BELOW whatever is pinned at the top of the screen (the app bar is sticky, 59px), not under it: a fixed 12px margin hid the heading it jumped to (owner, 2026-10-21). Measured at tap time, so a taller bar (a notch inset, a banner) is cleared too. */
    let bar = 0;
    try {
      for (let el: Element | null = document.elementFromPoint((window.innerWidth || 0) / 2, 1); el && el !== document.body; el = el.parentElement) {
        const pos = getComputedStyle(el).position;
        if ((pos === "sticky" || pos === "fixed") && !el.contains(h)) { const b = el.getBoundingClientRect().bottom; if (b > 0 && b < (window.innerHeight || 0) / 2) bar = b; break; }
      }
    } catch { /* elementFromPoint before layout: fall back to the plain 12px margin */ }
    h.style.scrollMarginTop = (Math.round(bar) + 12) + "px";
    h.scrollIntoView({ behavior: "auto", block: "start" });
    if (h.animate) h.animate([{ backgroundColor: C.blueDim, boxShadow: "0 0 0 6px " + C.blueDim }, { backgroundColor: "transparent", boxShadow: "0 0 0 6px transparent" }], { duration: 1200, easing: "ease-out" });
    if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
    try { h.focus({ preventScroll: true }); } catch { /* an element that cannot take focus: the jump still happened */ }
  }
  return <nav data-jumps="" aria-label="Jump to a section" style={{display:"flex",gap:6,overflowX:"auto",scrollPaddingInline:2,WebkitOverflowScrolling:"touch",margin:"0 0 4px",padding:"0 0 6px"}}>{items.map(function(l,i){return <button key={l} onClick={function(){go(i);}} style={{flex:"0 0 auto",padding:"6px 11px",borderRadius:999,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12,fontWeight:700,whiteSpace:"nowrap",cursor:"pointer"}}>{l}</button>;})}</nav>;
}
