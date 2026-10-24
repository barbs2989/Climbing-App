export interface ChevronProps {
  /** Points down when open, right when closed. */
  open?: boolean;
  /** Width and height in px. */
  size?: number;
  color: string;
}

/**
 * The open/closed marker at the end of a disclosure row. Replaces the ▸/▾ text glyphs, which drew
 * at 9-13px -- a speck at the end of a full-width row, and inside a 28-34px blue box on the Logbook
 * rows. Decorative: the row it sits in is the control, and carries aria-expanded or its own name.
 */
export default function Chevron({ open, size = 18, color }: ChevronProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s ease" }}>
      <path d="m9 5 7 7-7 7" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
