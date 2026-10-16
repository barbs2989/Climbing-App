import { useEffect, useState } from "react";

/* DESKTOP LAYOUT (phase 1). The app is drawn for a phone. At WIDE_MIN px and up (a laptop or
   monitor) the bottom tab bar becomes a fixed left sidebar and the column widens from 520 to
   COL_W, the pair centred together. Below WIDE_MIN nothing changes: the hook returns false and
   every style falls back to the phone values. 1024 is the width where a 240px sidebar plus the
   column still leaves a gutter. index.html's boot placeholder repeats these numbers in its
   @media block, so the shell does not jump when React mounts. */
export const WIDE_MIN = 1024;
export const SIDEBAR_W = 232;
export const SIDEBAR_GAP = 28;
export const COL_W = 720;
const PAIR_W = SIDEBAR_W + SIDEBAR_GAP + COL_W;

const query = () => "(min-width: " + WIDE_MIN + "px)";
const read = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query()).matches;

export function useWideScreen() {
  const [wide, setWide] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query());
    const on = () => setWide(mq.matches);
    on();
    if (mq.addEventListener) { mq.addEventListener("change", on); return () => mq.removeEventListener("change", on); }
    mq.addListener(on); return () => mq.removeListener(on);
  }, []);
  return wide;
}

/* The left edge of the centred sidebar+column pair, as a CSS length. */
const pairLeft = "max(0px, calc(50vw - " + (PAIR_W / 2) + "px))";

/* The app column on a wide screen: shifted right of the sidebar, the pair centred. */
export const WIDE_COLUMN = { maxWidth: COL_W, marginLeft: "calc(" + pairLeft + " + " + (SIDEBAR_W + SIDEBAR_GAP) + "px)", marginRight: "auto" };

/* The sidebar itself: pinned to the viewport, full height, at the pair's left edge. */
export const WIDE_SIDEBAR = { position: "fixed", top: 0, bottom: 0, left: pairLeft, width: SIDEBAR_W, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 2, padding: "20px 12px", overflowY: "auto", overscrollBehavior: "contain", zIndex: 30 };
