// No import of ClimbMatchCore: lib/AuthModal.jsx draws this before core has ever loaded, and a
// component core imports back must not read core at module scope (check:no-module-scope-core-reads).

export interface BrandMarkProps {
  /** Width and height in px. */
  size: number;
  /** The mountain's stroke. Defaults to the brand blue the splash and sign-in screen draw. */
  color?: string;
  /** The soft blue drop-shadow the sign-in screen gives its mark. */
  glow?: boolean;
  style?: React.CSSProperties;
}

/**
 * The app's mark: the mountain on its dark rounded square, as the loading splash, the sign-in
 * screen, Home's banner and the Menu draw it. Decorative -- the wordmark beside it carries the name.
 * BootSplash and index.html's #cm-splash keep their own copies: they must match each other to the
 * pixel and are sized by index.html's CSS.
 */
export default function BrandMark({ size, color = "#2f81f7", glow, style }: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0, ...(glow ? { filter: "drop-shadow(0 " + Math.round(size / 7.6) + "px " + Math.round(size / 2.7) + "px rgba(47,129,247,0.35))" } : null), ...style }}>
      <rect width="24" height="24" rx="5.5" fill="#161b22" stroke="#30363d" strokeWidth="0.4" />
      <g transform="translate(2.4 2.4) scale(0.8)"><path d="m8 3 4 8 5-5 5 15H2L8 3z" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}
