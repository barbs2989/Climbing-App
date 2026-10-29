/* WCAG text contrast. A tag tints its own background with its text colour ("#a371f7" on
   "#a371f722"), and several of those colours fall just under 4.5:1 at 11px, the size every
   small tag uses. readableOn() keeps the colour's hue and lifts it toward white only as far as
   AA needs, so a purple tag stays purple and a colour that already passes is returned unchanged.

   `bg` may carry an alpha byte (#rrggbbaa); it is composited over `base`, the surface under it.
   Pass the LIGHTEST surface the tag can sit on: light text on a lighter surface is the worst case.
   Anything that is not a hex colour is returned as given. */

const hex = (s) => {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(s || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
};
const lum = ({ r, g, b }) => {
  const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const mix = (a, b, t) => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });
const toHex = ({ r, g, b }) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

export function contrastRatio(fg, bg) {
  const x = lum(fg), y = lum(bg);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function readableOn(fg, bg, base, min = 4.5) {
  const f = hex(fg), b0 = hex(bg), s = hex(base);
  if (!f || !b0 || !s) return fg;
  const b = b0.a < 1 ? mix(s, b0, b0.a) : b0;
  if (contrastRatio(f, b) >= min) return fg;
  const toward = lum(b) < 0.5 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(f, toward, t);
    if (contrastRatio(c, b) >= min) return toHex(c);
  }
  return toHex(toward);
}

/* Blue text on a blue box reads poorly, and the owner asked for those labels in white (note,
   2026-10: "I don't like the blue text on blue boxes, change text to white"). True when `fg` is a
   saturated blue and `bg`, composited over `base` like readableOn's, is a blue fill: the same two
   tests check:blue-on-blue applies to the rendered page, so a tag drawn through here cannot fail it. */
export function blueOnBlue(fg, bg, base) {
  const f = hex(fg), b0 = hex(bg), s = hex(base);
  if (!f || !b0 || !s) return false;
  const b = b0.a < 1 ? mix(s, b0, b0.a) : b0;
  return f.b >= 180 && f.b - f.r >= 110 && f.b - f.g >= 60 && b.b - b.r >= 35 && b.b - b.g >= 20;
}
