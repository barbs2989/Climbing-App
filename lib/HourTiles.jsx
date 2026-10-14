// The labelled boxes the Conditions tabs draw an hour (or a day) with, so one reading is one box with
// its own name, its own period and its own unit -- on the crag card, the weather list and the alpine
// card alike (owner, 2026-10-08: "temp, rain, wind and gusts need their own boxes... be clearer").
//
// WHY EVERY BOX NAMES ITS PERIOD. Open-Meteo stamps an hour T and means two different things by it
// (open-meteo.com/en/docs, verified 2026-10-08): temperature, wind speed, humidity, cloud cover and the
// freezing level are the reading AT T, but precipitation, rain, snowfall, the chance of precipitation
// and the 10 m GUST are the sum / probability / maximum of the PRECEDING hour (T-1 to T). One label for
// both -- "2 PM" -- is wrong for half of the numbers beside it, so the boxes carry `at(T)` or
// `spanEnding(T)` and never share a time.
import { C } from "../ClimbMatchCore.jsx";

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
// The direction the wind blows FROM, as 16-point compass text; null when there is no direction.
export function compass(deg) {
  if (deg == null || isNaN(deg)) return null;
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}
// "2 PM" for a local hour 0-23.
export function clockHr(hr) { const h = ((hr % 24) + 24) % 24; return (h % 12 || 12) + (h < 12 ? " AM" : " PM"); }
// The hour that ENDS at `endHr`: "1–2 PM", "11 AM–12 PM", "11 PM–12 AM".
export function spanEnding(endHr) {
  const e = ((endHr % 24) + 24) % 24, s = (e + 23) % 24, sm = s < 12 ? "AM" : "PM", em = e < 12 ? "AM" : "PM", sh = s % 12 || 12, eh = e % 12 || 12;
  return sm === em ? sh + "–" + eh + " " + em : sh + " " + sm + "–" + eh + " " + em;
}

// One reading. `tone` is a palette colour for the value (and a tinted edge); `wide` takes the full row.
// `when` is said in words: "at 2 PM" reads "At 2 PM" (the reading at that moment), a bare span like
// "1–2 PM" reads "During 1–2 PM" (the total or peak over that hour).
export function whenText(when) {
  if (!when) return null;
  if (/^\d/.test(when)) return "During " + when;
  return when.charAt(0).toUpperCase() + when.slice(1);
}
export function Tile({ label, when, value, sub, tone, wide }) {
  return <div style={{ background: C.surface, border: "1px solid " + (tone ? tone + "77" : C.border), borderLeft: "4px solid " + (tone || C.borderHi), borderRadius: 10, padding: "9px 11px", minWidth: 0, gridColumn: wide ? "1 / -1" : undefined }}>
    <div style={{ fontSize: 12, fontWeight: 800, color: C.textSub, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    {when ? <div style={{ display: "inline-block", fontSize: 11.5, fontWeight: 600, color: C.textMuted, background: C.card, border: "1px solid " + C.borderLight, borderRadius: 20, padding: "1px 8px", marginTop: 3 }}>{whenText(when)}</div> : null}
    <div style={{ fontSize: 21, fontWeight: 800, color: tone || C.text, marginTop: 5, lineHeight: 1.15, overflowWrap: "anywhere" }}>{value}</div>
    {sub ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 3, lineHeight: 1.4 }}>{sub}</div> : null}
  </div>;
}
// A titled group of tiles ("Temperature", "Wind", ...) so a dozen readings read as three small topics.
export function TileGroup({ title, children, min }) {
  return <div style={{ marginTop: 12 }}>
    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: "0 0 6px", paddingBottom: 4, borderBottom: "1px solid " + C.borderLight }}>{title}</div>
    <TileGrid min={min}>{children}</TileGrid>
  </div>;
}
// A reading the forecast did not carry: said, never a blank and never a zero.
export const NOT_MEASURED = <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>Not measured</span>;

export function TileGrid({ children, min }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(" + (min || 130) + "px,1fr))", gap: 6 }}>{children}</div>;
}
