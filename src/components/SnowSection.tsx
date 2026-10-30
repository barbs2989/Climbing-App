import { useState, useEffect } from "react";
import { fetchSnotelStations, nearestStation, fetchSnotelDepth, snowReading } from "../../lib/snotel.js";
import CardHead from "./CardHead.tsx";
import { HEAD, MUTED, RETRY } from "../../lib/alpineConditionsShared.js";
import LoadingRows from "./LoadingRows.tsx";
import { C, uImp, uElev, uSnowfall, DLOCALE } from "../../ClimbMatchCore.jsx";

/* SNOW ON THE GROUND at the nearest snow station within 30 km. One point, usually far below the
   route -- the section says how far away and how much lower, every time. */
export default function SnowSection({ pt }) {
  const [st, setSt] = useState(null), [tries, setTries] = useState(0);
  useEffect(function () {
    let live = true; setSt(null);
    fetchSnotelStations().then(function (s) {
      const n = nearestStation(s, pt.lat, pt.lng, 30);
      if (!n) return { none: true };
      return fetchSnotelDepth(n.id).then(function (v) { return { st: n, r: snowReading(v) }; });
    }).then(function (x) { if (live) setSt(x); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [pt.lat, pt.lng, tries]);
  const head = <CardHead style={HEAD}>Snow on the ground</CardHead>;
  if (!st) return <div aria-busy="true">{head}<LoadingRows C={C} label="Loading the nearest snow station…"/></div>;
  if (st.error) return <div>{head}<div style={{ ...MUTED, color: C.amber }}>Couldn’t load the snow station. This says nothing about the snow.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>;
  if (st.none) return <div>{head}<div style={MUTED}>{"No snow station within " + (uImp() ? "19 mi" : "30 km") + " of this climb."}</div></div>;
  const s = st.st, r = st.r, below = pt.elevFt != null && s.elevFt != null ? pt.elevFt - s.elevFt : null;
  const where = "Snow station " + (uImp() ? (s.km < 1.609 ? "under 1 mi" : Math.round(s.km / 1.60934) + " mi") : s.km < 1 ? "under 1 km" : Math.round(s.km) + " km") + " away at " + uElev(s.elevFt) + (below != null && below > 300 ? ", " + uElev(Math.round(below / 100) * 100) + " below the top of this climb" : "");
  if (!r) return <div>{head}<div style={MUTED}>{where + ". It has not reported this week."}</div></div>;
  const ch = function (d, w) { return d == null ? null : (d > 0 ? "+" : d < 0 ? "−" : "±") + uSnowfall(Math.abs(d)) + " " + w; };
  const stale = Date.now() - Date.parse(r.date + "T12:00:00Z") > 2.5 * 864e5;
  return <div>{head}
    <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}><b>{uSnowfall(r.depth) + " on the ground"}</b>{[ch(r.d24, "in a day"), ch(r.d7, "in a week")].filter(Boolean).map(function (x) { return " · " + x; }).join("")}</div>
    <div style={MUTED}>{where + "." + (stale ? " Last reported " + new Date(r.date + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }) + "." : "")}</div>
  </div>;
}
