import type { CSSProperties } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface LoadingRowsProps {
  /** The dark-theme palette the caller renders with (core's `C`); passed in so `lib/` files that must not import core can use it. */
  C: typeof Palette;
  /** What is loading ("Loading rankings…"). Rendered as real text: a screen reader announces it, and the render guards (`scripts/lib/render-settle.mjs`, `check:zero`) recognise a line starting "Loading" as still fetching. */
  label: string;
  /** How many grey placeholder rows to draw under the label (default 2). */
  rows?: number;
  /** Layout only (margin, padding) — never the look. */
  style?: CSSProperties;
}

/**
 * The placeholder a SECTION shows while its read is in flight: the "Loading …" line it always had,
 * over a few pulsing grey rows in the shape of the list that is coming — `ScreenSkeleton`'s look at
 * section scale. Polish round 4 (2026-10-25) replaced ~56 bare grey "Loading…" lines with it. Still
 * under prefers-reduced-motion.
 */
export default function LoadingRows({ C, label, rows = 2, style }: LoadingRowsProps) {
  const pulse = "cmPulse 1.2s ease-in-out infinite";
  return (
    <div role="status" aria-live="polite" style={{ padding: "6px 0", ...style }}>
      <style>{"@keyframes cmPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion:reduce){[style*=cmPulse]{animation:none!important}}"}</style>
      <div style={{ color: C.textMuted, fontSize: 12.5, marginBottom: 8 }}>{label}</div>
      {Array.from({ length: rows }, (_, k) => (
        <div key={k} aria-hidden="true" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: k === rows - 1 ? 0 : 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.surface, flexShrink: 0, animation: pulse }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: k % 2 ? "55%" : "75%", height: 10, borderRadius: 6, background: C.surface, marginBottom: 6, animation: pulse }} />
            <div style={{ width: k % 2 ? "35%" : "45%", height: 8, borderRadius: 6, background: C.surface, animation: pulse }} />
          </div>
        </div>
      ))}
    </div>
  );
}
