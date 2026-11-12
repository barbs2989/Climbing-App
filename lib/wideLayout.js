import { useEffect, useState } from "react";

/* DESKTOP LAYOUT — the WEBSITE. The app is drawn for a phone. At WIDE_MIN px and up (a laptop or
   monitor) it is laid out the way a website is: a full-width fixed HEADER of two rows — the TOP BAR
   (☰, logo, search, icons, avatar) and under it the NAV STRIP of the seven tabs — then the page
   column and, at FULL_MIN and up, the RIGHT RAIL (widgets, and later ads), the two CENTRED TOGETHER
   as one block (owner 2026-11-11: "move home, climbs, partners… above the screen and sticky below
   what is already at the top like a real website would"; the left sidebar that held the tabs is
   gone). Between WIDE_MIN and FULL_MIN there is no rail and the column is centred alone. The margins
   either side of the block are where the left ad goes (AD_SIDE_MIN). Below WIDE_MIN nothing
   changes: the hooks return false and every style falls back to the phone values. index.html's boot
   placeholder repeats these numbers in its @media blocks, so the shell does not jump when React
   mounts. */
export const WIDE_MIN = 1024;
export const FULL_MIN = 1280;
/** The width from which the left margin holds a 160px ad beside the block (lib/Ads.jsx SideAd). */
export const AD_SIDE_MIN = 1440;
export const TOP_H = 64;
/** The nav strip's height, and the whole fixed header's (top bar + nav strip). Everything placed
 *  "under the top bar": the column's padding, the rail, a page. A drop-down from a top-bar icon still opens right under that icon (TOP_H), over the strip, as a site's header menus do. */
export const NAV_H = 48;
export const HEAD_H = TOP_H + NAV_H;
export const GAP = 24;
export const COL_W = 700; // 720 → 640 (owner 2026-10-22, read too wide) → 700 with the 110% scale below (owner 2026-11-04)
export const RAIL_W = 300;
/* THE WEBSITE IS DRAWN ~10% LARGER (owner 2026-11-04). The app's type is a phone's — mostly 13px —
   and on a monitor it read small beside Mountain Project (14px), Strava (15px) and Gaia (16px). The
   page column, the pages that open in it, the rail and the centred windows are drawn at this zoom,
   so every inline size grows in step and nothing has to be re-laid-out by hand. The phone never
   loads it. Maps are zoomed back to 1, so a map's pointer maths stays its own. */
export const ZOOM = 1.1;
/* THE BLOCK IS CENTRED (owner 2026-11-11, "center as one block"; it replaced 2026-11-04's
   Facebook-style edges, where a sidebar and the rail held the window's edges and only the column was
   centred). The top bar's ☰ and avatar still hold the window's corners, EDGE px in. The block is
   centred between EDGE on the left and EDGE_R on the right: EDGE_R keeps a classic (Windows)
   scrollbar's ~16px clear, because a `left` written from 100vw counts the scrollbar. */
const EDGE = 12;
const EDGE_R = 28;

function useMinWidth(px, extra) {
  const query = "(min-width: " + px + "px)" + (extra ? " and " + extra : "");
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

/** The zoom a box is DRAWN at (the website's ZOOM when it sits in a zoomed column, else 1). A pointer's
 *  clientX/getBoundingClientRect are window pixels; a box's scrollLeft, transform and clientWidth are
 *  its own CSS pixels, so a distance moves between the two by this factor. offsetWidth is whole pixels,
 *  so a ratio within 2% of 1 is 1.
 *  @param {HTMLElement | null | undefined} el @returns {number} */
export function boxZoom(el) {
  if (!el) return 1;
  const w = el.offsetWidth, r = el.getBoundingClientRect().width, z = w > 0 && r > 0 ? r / w : 1;
  return Math.abs(z - 1) < 0.02 ? 1 : z;
}
export function useFullWidth() { return useMinWidth(FULL_MIN); }
/** True where the left margin beside the centred block holds the 160px side ad (AD_SIDE_MIN wide)
 *  AND the window is tall enough to show all of it: the ad is fixed under the header (it does not
 *  scroll), so on a shorter window its foot would be cut off for good. HEAD_H + 16 + the label and
 *  the 600px unit + 16. */
export function useAdSideWidth() { return useMinWidth(AD_SIDE_MIN, "(min-height: " + (HEAD_H + 16 + 620 + 16) + "px)"); }

/* Every horizontal position, as CSS lengths. `full` is the ≥FULL_MIN layout (column + rail);
   otherwise the column alone. The BLOCK (column, plus GAP and the rail when `full`) is centred
   between EDGE and EDGE_R; the column is COL_W wide and narrows only if the window could not hold
   the block (it always can from WIDE_MIN: 1024 − 40 ≥ 700, and 1280 − 40 ≥ 1024).
   Measured (100vw, a 16px classic scrollbar included): 1024 → column 150–850; 1280 → column
   120–820, rail 844–1144; 1440 → 200–900, rail 924; 1920 → 440–1140, rail 1164. */
/* The top bar's fixed ends, measured at 1920px (the top bar is not zoomed, so they do not change with
   the window): ☰ + logo end at 263px, the icons + avatar take the last 282px. 20px clear of each. */
const SEARCH_MIN_L = 284;
const SEARCH_R_GAP = 302;
export function wideGeom(full) {
  const left = EDGE + "px";
  const side = full ? GAP + RAIL_W : 0;
  const colW = "min(" + COL_W + "px, calc(100vw - " + (EDGE + EDGE_R + side) + "px))";
  const blockW = side ? "(" + colW + " + " + side + "px)" : colW;
  const colLeft = "max(" + EDGE + "px, calc((100vw - " + (EDGE_R - EDGE) + "px) / 2 - " + blockW + " / 2))";
  const railLeft = "calc(" + colLeft + " + " + colW + " + " + GAP + "px)";
  /* THE HEADER'S SEARCH AND THE NAV STRIP'S TABS LINE UP (owner 2026-11-11: "the search bar above should
     be aligned with the home, climbs, partners… and ranks"; it was centred on the window and sat right of
     the tabs). Both start at the column's left edge, or just past the logo (SEARCH_MIN_L) where the column
     starts under it (below ~1730px); the search ends at the column's right edge, or short of the icons
     (SEARCH_R_GAP). 1920 → 440–1140, the column; 1280 → 284–820; 1024 → 284–722. */
  const searchL = "max(" + colLeft + ", " + SEARCH_MIN_L + "px)";
  const searchR = "min(calc(" + colLeft + " + " + colW + "), calc(100vw - " + SEARCH_R_GAP + "px))";
  const searchW = "calc(" + searchR + " - " + searchL + ")";
  return { full, left, colLeft, colW, railLeft, searchL, searchW };
}

/* C.border and C.bg, written out: this file imports nothing (see wideRail). */
const BORDER = "#30363d";
/* The app column: the left part of the centred block, under the fixed header. EDGES (owner 2026-11-05, "a
   border around all the middle"; the competitor audit is in docs/features/app-shell-and-layout.md): a
   1px line down each side. A box-shadow, not a border, so the column's width and index.html's copy of
   it do not change. No top or bottom line: the top bar's border-bottom and the footer's border-top are
   those. A full-screen page placed in the column draws no edge of its own — the column's lie just
   outside it, and a second stroke drawn inside the page's zoom could land a device pixel off. */
export const COL_EDGES = "-1px 0 0 " + BORDER + ", 1px 0 0 " + BORDER;
export const wideColumn = g => ({ maxWidth: "none", width: g.colW, marginLeft: g.colLeft, marginRight: 0, paddingTop: HEAD_H, boxSizing: "border-box", boxShadow: COL_EDGES });

/* The right rail: the block's right part, pinned under the header; its column follows the page's
   scroll (useRailFollow, lib/Ads.jsx). It is OPAQUE (the page background, C.bg written out — this
   file imports nothing): Chrome gives a fixed element its own GPU layer, and text on a transparent
   layer loses ClearType on Windows and reads blurry (2026-11-04). */
export const wideRail = g => ({ position: "fixed", top: HEAD_H, bottom: 0, left: g.railLeft, width: RAIL_W, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, padding: "16px 0 24px", overflowY: "auto", overscrollBehavior: "contain", zIndex: 20, background: "#0d1117" });

/* Rules only the website gets, mounted by App while `wide` (so no phone ever loads them):
   - HOVER: a control under the mouse brightens and shows the hand cursor. A filter, not a
     background, so it works over every inline colour and gradient alike.
   - BOTTOM SHEETS become CENTRED WINDOWS. A phone sheet is a role="dialog" backdrop with
     align-items:flex-end whose single child is the sheet; on a desktop the same markup is lifted
     to the middle of the screen, rounded on every corner and capped at 85% of its height (its
     own body already scrolls). Matched on the serialised inline style, so every existing sheet
     is covered without touching any of them.
   - FULL-SCREEN VIEWS become PAGES. Every phone view that covers the screen is the same inline
     shape — position:fixed, inset:0, maxWidth:520 (check:overlay-width-cap holds them to it) — so
     on a desktop that shape is placed in the PAGE COLUMN under the top bar, leaving the top bar,
     nav strip and rail live around it. The views App returns early (Calendar, Messages, Edit
     profile, the guide screens) are drawn inside the shell on desktop for the same reason.
   - The NOTIFICATIONS panel drops down under the bell at the shell's right edge, over a clear
     backdrop that still closes it on a click outside. */
export const wideCss = g =>
  ":root{--cm-col-left:" + g.colLeft + ";--cm-col-w:" + g.colW + ";--cm-shell-right:" + EDGE + "px;}" +
  "@media (hover: hover){button:not(:disabled):hover,[role=\"button\"]:not([aria-disabled=\"true\"]):hover,[role=\"option\"]:hover{filter:brightness(1.14);cursor:pointer;}button,[role=\"button\"]{transition:filter .12s ease,background-color .15s ease;}}" +
  "[role=\"dialog\"][style*=\"align-items: flex-end\"]{align-items:center !important;padding:24px !important;}" +
  "[role=\"dialog\"][style*=\"align-items: flex-end\"]>div{border-radius:18px !important;border-bottom:1px solid " + BORDER + " !important;max-height:calc(85vh / " + ZOOM + ") !important;box-shadow:0 24px 70px rgba(0,0,0,0.6);}" +
  /* A page is zoomed on ITSELF (it is position:fixed, so a zoomed ancestor would scale where it
     sits), which multiplies its own top/left/width by ZOOM: they are written divided by it. */
  "[style*=\"position: fixed\"][style*=\"inset: 0px\"][style*=\"max-width: 520px\"]{zoom:" + ZOOM + ";top:calc(" + HEAD_H + "px / " + ZOOM + ") !important;bottom:0 !important;left:calc(var(--cm-col-left) / " + ZOOM + ") !important;right:auto !important;width:calc(var(--cm-col-w) / " + ZOOM + ") !important;max-width:none !important;margin:0 !important;}" +
  /* THE SCALE: the page column's scroller (its popups are portalled out of it — check:overlays), the
     rail's cards (not the fixed rail itself) and every centred window's panel. A map inside any of
     them is zoomed back to exactly 1. */
  "#appscroll,[data-cm-rail]>*,[role=\"dialog\"][style*=\"align-items: flex-end\"]>div{zoom:" + ZOOM + ";}" +
  /* ...only a map that HAS a zoomed ancestor: one portalled straight to the body (the fire map's full-
     window dialog) would otherwise be drawn at 91%, its tiles blurred (review, desktop polish 1). */
  ":is(#appscroll,[data-cm-rail]>*,[role=\"dialog\"][style*=\"align-items: flex-end\"]>div,[role=\"dialog\"][aria-label=\"Notifications\"]>div,[style*=\"position: fixed\"][style*=\"inset: 0px\"][style*=\"max-width: 520px\"],[style*=\"zoom:\"]) :is(.leaflet-container,.maplibregl-map){zoom:" + (1 / ZOOM).toFixed(4) + ";}" +
  /* VISIBLE PAGE TITLES (owner 2026-11-04). A phone tab carries its title only for screen readers
     (lib/ScreenHero.jsx `quiet`, owner 2026-10-25: the box took a third of a phone screen); a
     website page opens on its name, so here the same <h1> is drawn. */
  "h1[data-cm-quiet-title]{position:static !important;width:auto !important;height:auto !important;margin:2px 0 4px !important;overflow:visible !important;clip:auto !important;white-space:normal !important;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;}" +
  /* CHIP ROWS WRAP (owner 2026-11-04). A phone swipes a row of chips sideways; a mouse has no swipe,
     and the row was cut off mid-word ("Ic", "Base of th") with nothing saying more lay beyond. In the
     page column and its pages every sideways-scrolling flex row wraps onto more lines instead, so all
     of it is on screen — the Logbook's discipline filters, the route page's section jumps. A PHOTO
     strip (a row holding <img>s) keeps scrolling: wrapped, its last tile sat alone on a second row. */
  ":is(#appscroll,[style*=\"position: fixed\"][style*=\"inset: 0px\"][style*=\"max-width: 520px\"]) [style*=\"display: flex\"][style*=\"overflow-x: auto\"]:not(:has(img)):not([aria-label=\"Pick an hour\"]){flex-wrap:wrap !important;overflow-x:visible !important;}" +
  /* THE ROUTE PAGE'S ACTION ROW FITS ONE LINE AT 1280px (owner's desktop audit 2026-11-04): Print,
     Draw approach, Compare, Share and Saved beside ← Back ran 12px past the 622px column and dropped
     "Saved" onto a line of its own. Under 1400px they lose 4px of side padding each. */
  "@media (max-width:1400px){.cm-route-acts button{padding-left:10px !important;padding-right:10px !important;}}" +
  /* A MOUSE CANNOT SWIPE: SwipeRow's Archive / Delete buttons show while the row is pointed at or
     holds keyboard focus. */
  ".cm-swipe .cm-swipe-acts{opacity:0;pointer-events:none;transition:opacity .12s ease;}@media (hover:hover){.cm-swipe:hover .cm-swipe-acts{opacity:1;pointer-events:auto;}}.cm-swipe:has(:focus-visible) .cm-swipe-acts{opacity:1;pointer-events:auto;}" +
  /* CONTROLS ARE WEBSITE-HEIGHT (owner 2026-11-04, "are buttons and things too large on the desktop
     view?" — "do what you recommend"). A census of the desktop view at 1440px measured the text at a
     median 13.8px rendered, in line with Mountain Project (14) and Strava (14–15), but the controls at
     a median 44–48px rendered against their 35–43px: the phone's 44px touch minimum (check:tap-slop,
     check:dropdown-targets) times the 1.1 zoom. The zoom stays — dropping it would shrink the text
     under the competitors' — and the pointer-driven website trims the controls instead, here, in one
     place, matched on the serialised inline style as the rules above do, so no call site changes and
     the phone keeps every 44px. Buttons and selects ONLY: a row or a card that reserves 44px is layout.
       index.html's two floors — every select 44px, every box-shaped button 40px (same selector) → 38 / 34;
         the box-button rule is the most specific, so a box-shaped button with its own inline 44 or 48
         (Home's Explore tiles, Sort & filter, Log a climb) lands on 34 as well
       inline min-height 44/45/46 → 38px, 48 → 40px, 40 → 34px, on what the box rule does not reach
         (flex rows such as Alerts and the Logbook's list rows)
       a fixed height: 48px (the Crews tab's two tiles, a button and a select) → 40px
       BTN's 9px vertical padding → 7px (36 → 32px CSS, ~35 rendered); a 13px one (BTN_LG, the Partners
       mode row) → 10px; an 11px one (full-width Log / Alerts buttons, list rows) → 9px
     popupChrome's ✕ / Back are the one fixed 48px kept, by the owner's own choice (2026-10-21): told
     apart by their 24px radius. WCAG 2.2's target size (2.5.8, AA) asks 24px: every value here clears it. */
  "select:not([multiple]):not([size]){min-height:38px !important;}" +
  "button[style*=\"border-radius\"]:not([role=\"switch\"]):not([style^=\"height:\"]):not([style*=\" height:\"]):not([style*=\"position: absolute\"]):is([style*=\"padding: 3px\"],[style*=\"padding: 4px\"],[style*=\"padding: 5px\"],[style*=\"padding: 6px\"],[style*=\"padding: 7px\"],[style*=\"padding: 8px\"]):not([style*=\"display: flex\"]:not([style*=\"align-items: center\"])):not([style*=\"display: inline-flex\"]:not([style*=\"align-items: center\"])){min-height:34px !important;}" +
  ":is(button,[role=\"button\"],select):is([style*=\"min-height: 44px\"],[style*=\"min-height: 45px\"],[style*=\"min-height: 46px\"]){min-height:38px !important;}" +
  ":is(button,[role=\"button\"],select)[style*=\"min-height: 48px\"]{min-height:40px !important;}" +
  ":is(button,[role=\"button\"])[style*=\"min-height: 40px\"]{min-height:34px !important;}" +
  ":is(button,select):is([style^=\"height: 48px\"],[style*=\" height: 48px\"]):not([style*=\"border-radius: 24px\"]){height:40px !important;}" +
  "button[style*=\"padding: 9px 14px\"]{padding-top:7px !important;padding-bottom:7px !important;}" +
  "button[style*=\"padding: 13px\"]{padding-top:10px !important;padding-bottom:10px !important;}" +
  ":is(button,[role=\"button\"])[style*=\"padding: 11px\"]{padding-top:9px !important;padding-bottom:9px !important;}" +
  /* ACTION BUTTONS SIZE TO THEIR LABEL (owner 2026-10-22: "we don't need boxes and buttons to fill
     the whole screen"). ~100 phone buttons are width:100% inline, which on a desktop column reads as a
     690px bar. In the page column and the views that are pages here, such a button becomes as wide as
     its label. ROWS are left alone — a full-width button laid out space-between, left-aligned or
     flex-start is a list row (Ranks, View profile, Unfinished business), and rows run edge to edge.
     Sheets and small windows are outside the scope, so a dialog's footer button keeps its width. A
     button centred in a centred block (an empty state) stays centred. */
  ":is([role=\"main\"],[style*=\"position: fixed\"][style*=\"inset: 0px\"][style*=\"max-width: 520px\"]) button[style*=\"width: 100%\"]:not([style*=\"space-between\"]):not([style*=\"text-align: left\"]):not([style*=\"flex-start\"]){width:fit-content !important;min-width:180px;max-width:100%;padding-left:20px !important;padding-right:20px !important;}" +
  "[style*=\"text-align: center\"]>button[style*=\"width: 100%\"]{margin-left:auto;margin-right:auto;}" +
  /* ...and the same for a flex:1 button ALONE in its row (Add trip report, Add climbs): a pair shares
     the row and keeps doing so; a lone one would otherwise stretch exactly like width:100%. */
  ":is([role=\"main\"],[style*=\"position: fixed\"][style*=\"inset: 0px\"][style*=\"max-width: 520px\"]) [style*=\"display: flex\"]>button[style*=\"flex: 1\"]:only-child{flex:0 1 auto !important;min-width:180px;padding-left:20px !important;padding-right:20px !important;}" +
  /* Settings is a small window whose rows open full-screen views (Privacy & safety, Notifications…).
     As pages those sit in the column, and Settings' full-window backdrop would still cover the
     header and rail around them, so it steps out of sight while one is open; its own state is
     untouched, so the page's ← Back lands on it again. */
  /* The Menu opens over whatever page is open (pages carry their own z-index, up to 1300). */
  "[role=\"dialog\"][aria-label=\"Menu\"]{z-index:1400 !important;}" +
  "body:has([style*=\"position: fixed\"][style*=\"inset: 0px\"][style*=\"max-width: 520px\"]) [role=\"dialog\"][aria-label=\"Settings\"]{display:none !important;}" +
  "[role=\"dialog\"][aria-label=\"Notifications\"][style*=\"align-items: flex-start\"]{background:transparent !important;justify-content:flex-end !important;padding:" + (TOP_H + 6) + "px var(--cm-shell-right) 0 0 !important;z-index:1450 !important;}" +
  "[role=\"dialog\"][aria-label=\"Notifications\"][style*=\"align-items: flex-start\"]>div{zoom:" + ZOOM + ";max-width:" + (400 / ZOOM).toFixed(2) + "px !important;max-height:calc((100vh - " + (TOP_H + 24) + "px) / " + ZOOM + ");overflow-y:auto !important;overscroll-behavior:contain;box-shadow:0 18px 50px rgba(0,0,0,0.6);}";

/* The header spans the window and holds two rows: the top bar's content row runs from EDGE px in on
   the left to EDGE px in on the right, so Menu and the avatar hold the window's corners; under it the
   NAV STRIP, its tabs starting at the column's left edge, so they sit over the centred block. */
export const wideTopBar = { position: "fixed", top: 0, left: 0, right: 0, height: HEAD_H, zIndex: 40, boxSizing: "border-box" };
export const wideTopRow = g => ({ marginLeft: g.left, width: "calc(100% - " + EDGE * 2 + "px)", height: TOP_H, display: "flex", alignItems: "center", gap: 12 });
export const wideNavStrip = g => ({ height: NAV_H, boxSizing: "border-box", borderTop: "1px solid " + BORDER, display: "flex", alignItems: "stretch", gap: 2, paddingLeft: "max(0px, calc(" + g.searchL + " - 12px))", paddingRight: EDGE_R });
