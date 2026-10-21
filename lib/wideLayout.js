import { useEffect, useState } from "react";

/* DESKTOP LAYOUT — the WEBSITE. The app is drawn for a phone. At WIDE_MIN px and up (a laptop or
   monitor) it is laid out the way a website is: a full-width sticky TOP BAR, a fixed left SIDEBAR
   under it, the page column, and at FULL_MIN and up a RIGHT RAIL (widgets now, ads later). The
   three columns sit in one SHELL capped at SHELL_FULL px and centred, so a 1920px monitor gets
   plain background either side, as Facebook, Reddit and Strava do. Between WIDE_MIN and FULL_MIN
   there is no rail and the sidebar shrinks to icons. Below WIDE_MIN nothing changes: the hooks
   return false and every style falls back to the phone values. index.html's boot placeholder
   repeats these numbers in its @media blocks, so the shell does not jump when React mounts. */
export const WIDE_MIN = 1024;
export const FULL_MIN = 1280;
export const TOP_H = 64;
export const SIDEBAR_W = 240;
export const SIDEBAR_MINI = 72;
export const GAP = 24;
export const COL_W = 720;
export const RAIL_W = 300;
const SHELL_FULL = SIDEBAR_W + GAP + COL_W + GAP + RAIL_W;
const SHELL_MINI = SIDEBAR_MINI + GAP + COL_W;

function useMinWidth(px) {
  const query = "(min-width: " + px + "px)";
  const read = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
  const [on, setOn] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    if (mq.addEventListener) { mq.addEventListener("change", sync); return () => mq.removeEventListener("change", sync); }
    mq.addListener(sync); return () => mq.removeListener(sync);
  }, [query]);
  return on;
}

export function useWideScreen() { return useMinWidth(WIDE_MIN); }
export function useFullWidth() { return useMinWidth(FULL_MIN); }

/* Every horizontal position of the shell, as CSS lengths. `full` is the ≥FULL_MIN layout (labelled
   sidebar + rail); otherwise the icon sidebar and no rail. Between FULL_MIN and SHELL_FULL + 32px
   the page column gives up width (720 → 660 at 1280) rather than the rail disappearing. */
export function wideGeom(full) {
  const shell = full ? SHELL_FULL : SHELL_MINI;
  const navW = full ? SIDEBAR_W : SIDEBAR_MINI;
  const shellW = "min(" + shell + "px, calc(100vw - 32px))";
  const left = "max(16px, calc(50vw - " + shell / 2 + "px))";
  const colLeft = "calc(" + left + " + " + (navW + GAP) + "px)";
  const colW = full ? "calc(" + shellW + " - " + (navW + GAP + GAP + RAIL_W) + "px)" : COL_W + "px";
  const railLeft = "calc(" + colLeft + " + " + colW + " + " + GAP + "px)";
  return { full, shellW, left, navW, colLeft, colW, railLeft };
}

/* The app column: placed right of the sidebar, under the fixed top bar. */
export const wideColumn = g => ({ maxWidth: "none", width: g.colW, marginLeft: g.colLeft, marginRight: 0, paddingTop: TOP_H, boxSizing: "border-box" });

/* The sidebar: pinned under the top bar at the shell's left edge. It is role="navigation", which
   lib/dialogA11y.js's scroll lock skips — a fixed opaque full-height panel otherwise reads as a
   popup covering the page, and froze every desktop page until #2560. */
export const wideSidebar = g => ({ position: "fixed", top: TOP_H, bottom: 0, left: g.left, width: g.navW, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 2, padding: g.full ? "16px 12px 16px" : "16px 8px", overflowY: "auto", overscrollBehavior: "contain", zIndex: 30 });

/* The right rail: pinned under the top bar, scrolling on its own when it outgrows the window. */
export const wideRail = g => ({ position: "fixed", top: TOP_H, bottom: 0, left: g.railLeft, width: RAIL_W, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, padding: "16px 0 24px", overflowY: "auto", overscrollBehavior: "contain", zIndex: 20 });

/* Rules only the website gets, mounted by App while `wide` (so no phone ever loads them):
   - HOVER: a control under the mouse brightens and shows the hand cursor. A filter, not a
     background, so it works over every inline colour and gradient alike.
   - BOTTOM SHEETS become CENTRED WINDOWS. A phone sheet is a role="dialog" backdrop with
     align-items:flex-end whose single child is the sheet; on a desktop the same markup is lifted
     to the middle of the screen, rounded on every corner and capped at 85% of its height (its
     own body already scrolls). Matched on the serialised inline style, so every existing sheet
     is covered without touching any of them. */
export const WIDE_CSS =
  "@media (hover: hover){button:not(:disabled):hover,[role=\"button\"]:not([aria-disabled=\"true\"]):hover,[role=\"option\"]:hover{filter:brightness(1.14);cursor:pointer;}button,[role=\"button\"]{transition:filter .12s ease,background-color .15s ease;}}" +
  "[role=\"dialog\"][style*=\"align-items: flex-end\"]{align-items:center !important;padding:24px !important;}" +
  "[role=\"dialog\"][style*=\"align-items: flex-end\"]>div{border-radius:18px !important;border-bottom:1px solid #30363d !important;max-height:85vh !important;box-shadow:0 24px 70px rgba(0,0,0,0.6);}";

/* The top bar spans the window; its content row starts at the shell's left edge (the same `left`
   as the sidebar, not flex-centred — a classic scrollbar would shift a centred row off the
   sidebar by half its width). */
export const wideTopBar = { position: "fixed", top: 0, left: 0, right: 0, height: TOP_H, zIndex: 40, boxSizing: "border-box" };
export const wideTopRow = g => ({ marginLeft: g.left, width: g.shellW, height: "100%", display: "flex", alignItems: "center", gap: 12 });
