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
export function Tile({ label, when, value, sub, tone, wide }) {
  return <div style={{ background: C.surface, border: "1px solid " + (tone ? tone + "77" : C.border), borderRadius: 10, padding: "8px 10px", minWidth: 0, gridColumn: wide ? "1 / -1" : undefined }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
    {when ? <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{when}</div> : null}
    <div style={{ fontSize: 17, fontWeight: 800, color: tone || C.text, marginTop: 3, lineHeight: 1.2, overflowWrap: "anywhere" }}>{value}</div>
    {sub ? <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 2, lineHeight: 1.4 }}>{sub}</div> : null}
  </div>;
}
// A reading the forecast did not carry: said, never a blank and never a zero.
export const NOT_MEASURED = <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>Not measured</span>;

export function TileGrid({ children, min }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(" + (min || 104) + "px,1fr))", gap: 6 }}>{children}</div>;
}
