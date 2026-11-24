// No import of ClimbMatchCore: lib/AuthModal.jsx draws this before core has ever loaded, and a
// component core imports back must not read core at module scope (check:no-module-scope-core-reads).

export interface BrandMarkProps {
  /** Width and height in px. */
  size: number;
  /** The first strand and the knot. Defaults to the brand orange the splash and sign-in screen draw; the second strand is always chalk. */
  color?: string;
  /** The soft blue drop-shadow the sign-in screen gives its mark. */
  glow?: boolean;
  style?: React.CSSProperties;
}

/**
 * The app's mark (2026-11-24): a twin-peak ridge that is also an M, drawn as two strands in the wordmark's
 * two colours and tied by a knot at the col, the same ring the rope motif uses (`data-rope-knot`).
 * On its dark rounded square, as the loading splash, the sign-in
 * screen, Home's banner and the Menu draw it. Decorative -- the wordmark beside it carries the name.
 * BootSplash and index.html's #cm-splash keep their own copies: they must match each other to the
 * pixel and are sized by index.html's CSS.
 */
export default function BrandMark({ size, color = "#ff8a3d", glow, style }: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0, ...(glow ? { filter: "drop-shadow(0 " + Math.round(size / 7.6) + "px " + Math.round(size / 2.7) + "px rgba(255,138,61,0.35))" } : null), ...style }}>
      <rect width="24" height="24" rx="5.5" fill="#1a1916" stroke="#36322c" strokeWidth="0.4" />
      {/* Drawn in a 64 box, scaled into this 24 one. One ridge, two climbers: the orange strand climbs the first summit, the chalk one the second, and the knot ties them at the col. */}
      <g transform="translate(-1.44 -1.44) scale(0.42)" fill="none" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 50 L24 14 L33.5 33" stroke={color}/><path d="M33.5 33 L42.5 22 L54 50" stroke="#f1ede6"/><circle cx="33.5" cy="33" r="5.4" fill="#1a1916" stroke="none"/><circle cx="33.5" cy="33" r="3.3" stroke={color} strokeWidth="2.8"/></g>
    </svg>
  );
}
