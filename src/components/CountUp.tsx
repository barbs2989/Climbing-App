import { useEffect, useState, type CSSProperties } from "react";

export interface CountUpProps {
  /** What to show. A clean number (optionally with ↑/↓/~ and a unit suffix) animates up from 0; anything else renders as-is. */
  value: string | number | null | undefined;
  /** Animation length in ms (default 700). */
  dur?: number;
  style?: CSSProperties;
}

/**
 * An animated counter. Under server rendering (`renderToStaticMarkup`) effects never run, so it
 * renders its INITIAL 0 — the guards and probes that read a page that way never assert on its number.
 * Only values the pattern below calls clean animate; a grade like "Class 3-4" passes through literally.
 */
export default function CountUp({ value, dur, style }: CountUpProps) {
  const s = String(value == null ? "" : value);
  const clean = /^[↑↓~\s]*-?[\d]+\.?\d*\s*(ft|m|mi|km|°|%|hrs?|min|pitches?|x|×)?\s*$/i.test(s);
  const m = s.match(/-?[\d]*\.?\d+/);
  const target = m ? parseFloat(m[0].replace(/,/g, "")) : NaN;
  const [n, setN] = useState(0);
  useEffect(
    function () {
      if (!clean || !isFinite(target)) return;
      let t0: number | null = null;
      let raf = 0;
      const step = function (ts: number) {
        if (t0 === null) t0 = ts;
        const p = Math.min(1, (ts - t0) / (dur || 700));
        setN(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
        else setN(target);
      };
      raf = requestAnimationFrame(step);
      return function () {
        if (raf) cancelAnimationFrame(raf);
      };
    },
    // Re-animate when the number it counts to changes. `clean` and `target` are primitives derived
    // from `value`, so this runs exactly when the value's NUMBER changes ("12 ft" → "12 ft" does not
    // restart it); `dur` is a constant at every call site.
    [clean, target, dur],
  );
  if (!clean || !m) return <span style={style}>{s}</span>;
  const idx = m.index ?? 0;
  const before = s.slice(0, idx);
  const after = s.slice(idx + m[0].length);
  const dec = (m[0].split(".")[1] || "").length;
  const disp = dec ? n.toFixed(dec) : Math.round(n).toLocaleString();
  return (
    <span style={style}>
      {before}
      {disp}
      {after}
    </span>
  );
}
