import { useRef, useState, type ReactNode, type TouchEvent } from "react";

export interface PullToRefreshProps {
  /** Fires once the pull is released past the threshold, after the spinner has shown. */
  onRefresh?: () => void;
  children?: ReactNode;
}

/**
 * "At the top" is #appscroll's scrollTop, NOT window.scrollY. The document never scrolls in this app —
 * #appscroll does — so window.scrollY was always 0 and EVERY downward drag, from anywhere in the feed,
 * started a pull: scrolling back up mid-page grew a spacer and shoved the content instead of scrolling it
 * ("sticky"). A touch inside a PORTALLED overlay still bubbles here through the React tree, so only a touch
 * whose DOM target is inside this wrapper may pull.
 */
function ptrAtTop() {
  const el = typeof document !== "undefined" ? document.getElementById("appscroll") : null;
  return !el || el.scrollTop <= 0;
}

/**
 * Pull-to-refresh around a scrolling screen: a downward drag from the top grows a spacer with a rotating
 * ↻, and releasing past the threshold spins it and fires `onRefresh`. Reads nothing from core.
 */
export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [d, setD] = useState(0);
  const [busy, setBusy] = useState(false);
  const sy = useRef(0), pull = useRef(false);
  return (
    <div
      onTouchStart={function (e: TouchEvent<HTMLDivElement>) { pull.current = false; if (!busy && e.target instanceof Node && e.currentTarget.contains(e.target) && ptrAtTop()) { sy.current = e.touches[0].clientY; pull.current = true; } }}
      onTouchMove={function (e: TouchEvent<HTMLDivElement>) { if (!pull.current || busy) return; const dy = e.touches[0].clientY - sy.current; if (dy > 0 && ptrAtTop()) setD(Math.min(80, dy * 0.5)); else { pull.current = false; setD(0); } }}
      onTouchEnd={function () { if (!pull.current) return; pull.current = false; if (d > 50 && !busy) { setBusy(true); setD(46); setTimeout(function () { setBusy(false); setD(0); if (onRefresh) onRefresh(); }, 850); } else setD(0); }}
    >
      <div style={{ height: d, overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center", transition: pull.current ? "none" : "height .26s ease" }}>
        {d > 6 ? (
          <div style={{ position: "relative", paddingBottom: 9, opacity: Math.min(1, d / 40) }}>
            <span className={busy ? "cm-spin" : undefined} style={{ fontSize: 19, display: "inline-block", transform: busy ? "none" : "rotate(" + Math.min(200, d * 2.6) + "deg)" }}>{"↻"}</span>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
