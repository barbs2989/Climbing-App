import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface ScreenSkeletonProps {
  /** The dark-theme palette the caller renders with (core's `C`). */
  C: typeof Palette;
  /** What is loading, read to a screen reader through the status role. */
  label: string;
}

/**
 * The placeholder a lazily-loaded SCREEN shows while its chunk arrives: the screen's own shape in grey
 * (a heading bar and four avatar-plus-two-lines rows, pulsing — and still, under prefers-reduced-motion)
 * plus a real "Loading …" line. The words are load-bearing, not decoration: they are what a screen
 * reader announces (`role="status"`, `aria-live="polite"`), and what the render guards recognise as
 * "still fetching" rather than blank.
 */
export default function ScreenSkeleton({ C, label }: ScreenSkeletonProps) {
  const bar = (w: string, h: number, m: number) => <div style={{ width: w, height: h, borderRadius: 8, background: C.surface, marginBottom: m, animation: "cmPulse 1.2s ease-in-out infinite" }} />;
  return (
    <div role="status" aria-live="polite" style={{ padding: "4px 0 20px" }}>
      <style>{"@keyframes cmPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion:reduce){[style*=cmPulse]{animation:none!important}}"}</style>
      <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>{label}</div>
      {bar("60%", 18, 14)}
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: C.surface, flexShrink: 0, animation: "cmPulse 1.2s ease-in-out infinite" }} />
          <div style={{ flex: 1 }}>
            {bar("70%", 12, 6)}
            {bar("45%", 10, 0)}
          </div>
        </div>
      ))}
    </div>
  );
}
