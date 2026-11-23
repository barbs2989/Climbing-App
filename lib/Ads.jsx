// ADS ON ROUTE PAGES, DESKTOP ONLY (owner 2026-11-04: "i would also like to have ads on route pages.
// So as you scroll down, ads will be on the left panel and right panels" — then "go" to ship it).
//
// Two slots, one each side of the page column: a 160×600 skyscraper in the LEFT PANEL beside the
// centred column (SideAd; the left panel is as wide as the rail since 2026-11-11, "equal space"; it is a
// fixed box under the header, at AD_SIDE_MIN px and up), and a 300×600
// half-page in the RAIL, last in its column. The rail follows the page's scroll (useRailFollow — the
// owner's "one consistent scroll bar"): the widgets or the map slide away, the ad reaches the panel's
// top and stays in view. The phone never draws an ad.
// BOTH SIDE PANELS ARE FUTURE AD SPACE (owner 2026-11-11): App decides per page which slots draw
// (`_adPage` in ClimbMatch.jsx; route pages only for now), so adding a page is one line there.
//
// THE SLOTS ARE OFF UNTIL A PUBLISHER ID IS SET. There is no ad account yet; Google AdSense is the
// network wired here (the only one a static Pages site can carry with no server). The build reads
// VITE_ADSENSE_CLIENT (ca-pub-…) and the two slot ids VITE_ADSENSE_SLOT_SIDE / VITE_ADSENSE_SLOT_RAIL
// from deploy.yml's repository variables; with the client unset nothing renders — not a label, not a
// box — so a real climber never sees a placeholder. Turning them on changes the Privacy Policy's
// "What we collect" (lib/LegalView.jsx reads ADS_ON), so bump POLICY_VERSION in the same change.
//
// LOCAL PREVIEW: the dev server with ?ads=preview draws labelled grey boxes in the two slots, the
// mock-up the owner reviewed the placement on. Never in a build (import.meta.env.DEV).
import { useEffect, useRef, useState } from "react";
import { ZOOM } from "./wideLayout.js";

export const ADS_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || "";
export const ADS_ON = !!ADS_CLIENT;
const SLOT_SIDE = import.meta.env.VITE_ADSENSE_SLOT_SIDE || "";
const SLOT_RAIL = import.meta.env.VITE_ADSENSE_SLOT_RAIL || "";
export const adPreviewOn = () => !!(import.meta.env.DEV && typeof location !== "undefined" && /[?&]ads=preview\b/.test(location.search));
/** Draw the two slots at all? Real ads, or the dev server's preview boxes. */
export const adsActive = () => ADS_ON || adPreviewOn();

const BOX = (w, h) => ({ width: w, height: h, boxSizing: "border-box", border: "1px dashed #4a443c", borderRadius: 10, background: "repeating-linear-gradient(45deg,#1a1916,#1a1916 12px,#1a2029 12px,#1a2029 24px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a69d90", fontSize: 12, gap: 6 });
const Label = () => <div style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#a69d90", margin: "0 0 4px 2px" }}>Advertisement</div>;

let scriptAsked = false;
function askScript() {
  if (scriptAsked || typeof document === "undefined") return;
  scriptAsked = true;
  const s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADS_CLIENT);
  document.head.appendChild(s);
}

/** One ad unit of a fixed size. A preview draws the box; a build with a client id draws the network's
 *  <ins> and asks it to fill, once, after mount. */
function AdSlot({ w, h, slot, note }) {
  const ref = useRef(null);
  const live = ADS_ON && !adPreviewOn();
  useEffect(() => {
    if (!live || !ref.current || ref.current.getAttribute("data-adsbygoogle-status")) return;
    askScript();
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* the network's script is not here yet, or blocked: the slot stays empty */ }
  }, [live]);
  if (!live) return <div style={BOX(w, h)}><b style={{ color: "#f1ede6" }}>{w + " × " + h}</b><span>{note}</span></div>;
  return <ins ref={ref} className="adsbygoogle" style={{ display: "inline-block", width: w, height: h }} data-ad-client={ADS_CLIENT} data-ad-slot={slot} />;
}

/** The left panel's slot (lib/wideLayout.js wideLeft): last in the panel's column, under whatever a page
 *  put there (the area page's sub-area list), against the column's side as it was when it was a fixed box
 *  of its own. Zoomed back to 1, as RailAd is, so the unit is drawn at the 160×600 the network sells. */
export function SideAd() {
  return <div data-cm-ad="" style={{ marginTop: 2, alignSelf: "flex-end", width: 160, zoom: 1 / ZOOM }}><Label /><AdSlot w={160} h={600} slot={SLOT_SIDE} note="stays in view" /></div>;
}

/** The rail's slot: last in the rail's column (under the route map, or under the widgets). The rail's
 *  column is drawn at the website's ZOOM, which drew this 300px unit 330px wide, past the 300px rail
 *  (a sideways scrollbar under it) and at a size the network does not sell: it is zoomed back to 1. */
export function RailAd() {
  return <div data-cm-ad="" style={{ marginTop: 2, zoom: 1 / ZOOM }}><Label /><AdSlot w={300} h={600} slot={SLOT_RAIL} note="stays in view" /></div>;
}

/** ONE SCROLLBAR (owner 2026-11-04: "i don't want a seperate scroll bar … it needs to be one
 *  consistent scroll bar"). A side panel no longer scrolls on its own; its column moves up with the
 *  PAGE's scroll, by at most: with an ad, the distance to the ad's top (the widgets scroll away, the
 *  ad stays); without one, the amount the column overflows the panel (its last card comes into view,
 *  then it stops), the way Facebook's right column behaves.
 *  @param {import("react").RefObject<HTMLElement | null>} ref the panel's column
 *  @param {boolean} [on] false leaves the panel alone (the left panel while it holds the area list, LeftColumn) */
export function useRailFollow(ref, on = true) {
  useEffect(() => {
    const el = ref.current, rail = el && el.parentElement;
    if (!on || !el || !rail) return undefined;
    // Put back the panel's OWN values on cleanup, not "": "" wiped the overflow React drew (wideRail), which
    // React never redraws, so a panel that stops following (LeftColumn) lost its scroll container.
    const was = { o: rail.style.overflowY, b: rail.style.overscrollBehavior };
    rail.style.overflowY = "hidden"; rail.style.overscrollBehavior = "auto"; // the wheel over the panel scrolls the PAGE
    let raf = 0;
    const run = () => {
      raf = 0;
      const sc = document.getElementById("appscroll");
      const s = Math.max(window.scrollY || 0, sc && sc.scrollHeight > sc.clientHeight + 1 ? sc.scrollTop : 0);
      const er = el.getBoundingClientRect(), rr = rail.getBoundingClientRect();
      const z = el.offsetWidth > 0 ? (er.width / el.offsetWidth) || 1 : 1;
      const ad = el.querySelector("[data-cm-ad]");
      const max = ad ? ad.getBoundingClientRect().top - er.top : Math.max(0, er.height - (rr.height - 40));
      el.style.transform = "translateY(" + (-Math.min(s, max) / z) + "px)";
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(run); };
    document.addEventListener("scroll", go, true); window.addEventListener("resize", go);
    const ro = new ResizeObserver(go); ro.observe(el);
    run();
    return () => { document.removeEventListener("scroll", go, true); window.removeEventListener("resize", go); ro.disconnect(); if (raf) cancelAnimationFrame(raf); el.style.transform = ""; rail.style.overflowY = was.o; rail.style.overscrollBehavior = was.b; };
  }, [ref, on]);
}

/** The LEFT PANEL's column. While the area page has drawn its map and sub-areas into #cm-left-panel, that
 *  list scrolls on its own (owner 2026-11-14: "the area map on the left panel should have its own scroll
 *  bar"). Any other time it follows the page like the rail, so the wheel over the panel scrolls the PAGE
 *  (owner 2026-11-14: "the areas scroll should only scroll the areas when they are on areas pages, otherwise
 *  you should be able to scroll if you are on the left panel"). The column is one div in both modes, so the
 *  #cm-left-panel portal target the area page holds is never replaced. */
export function LeftColumn({ children }) {
  const ref = useRef(null);
  const [areas, setAreas] = useState(false);
  useEffect(() => {
    const p = ref.current && ref.current.querySelector("#cm-left-panel");
    if (!p) return undefined;
    const check = () => setAreas(p.style.display !== "none" && p.childElementCount > 0);
    const mo = new MutationObserver(check);
    mo.observe(p, { childList: true, attributes: true, attributeFilter: ["style"] });
    check();
    return () => mo.disconnect();
  }, []);
  useRailFollow(ref, !areas);
  return <div ref={ref} data-cm-left-col="" data-cm-left-mode={areas ? "areas" : "follow"} style={areas ? { flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 14 } : { display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}

/** A panel's column that follows the page (useRailFollow): the route page's rail (a portal target the
 *  route page fills with the map and tracks). The widget rail (WideRail) follows by the same hook. */
export function FollowColumn({ children, gap }) {
  const ref = useRef(null);
  useRailFollow(ref);
  return <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: gap == null ? 14 : gap }}>{children}</div>;
}
