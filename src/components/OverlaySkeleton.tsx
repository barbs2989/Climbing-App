import { createPortal } from "react-dom";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface OverlaySkeletonProps {
  /** The dark-theme palette the caller renders with (core's `C`). */
  C: typeof Palette;
  /** What is loading, read to a screen reader through the status role. */
  label: string;
}

/**
 * The placeholder a lazily-loaded OVERLAY shows while its chunk arrives. An overlay draws over the
 * screen, so an inline skeleton would appear in the wrong place: this is a translucent scrim — never an
 * opaque full-screen view, which check:overlay-width-cap would rightly hold to the 520px column — with a
 * small labelled card, portalled to document.body like every other overlay (check:overlays).
 * `role="status"` with `aria-live="polite"` so the label is announced once.
 */
export default function OverlaySkeleton({ C, label }: OverlaySkeletonProps) {
  return createPortal(
    <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 18px", color: C.textMuted, fontSize: 13 }}>{label}</div>
    </div>,
    document.body,
  );
}
