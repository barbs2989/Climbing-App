import { C } from "../../ClimbMatchCore.jsx";
import { useState, useEffect } from "react";
import { fetchAvyMap, zoneFor, avyReading, fetchAvyProduct, DANGER_NAME } from "../../lib/avalanche.js";
import CardHead from "./CardHead.tsx";
import { HEAD, MUTED, RETRY } from "../../lib/alpineConditionsShared.js";
import LoadingRows from "./LoadingRows.tsx";

const dangerCol = function (d) { return d >= 4 ? C.red : d === 3 ? C.orange : d === 2 ? C.yellow : C.green; };
/* AVALANCHE TODAY. Off season, no rating published, outside every zone and a failed read are four
   different answers and none of them is "low": each says which it is. The centre is not named (no
   source credits on screen); the zone is, and its full forecast is one tap away. */
export default function AvalancheSection({ pt }) {
  const [st, setSt] = useState(null), [tries, setTries] = useState(0);
  useEffect(function () {
    let live = true; setSt(null);
    fetchAvyMap().then(function (map) {
      const z = zoneFor(map, pt.lat, pt.lng);
      if (!z) return avyReading(null, null);
      // The zone's band forecast failing still leaves the map's own overall rating to read.
      return fetchAvyProduct(z.properties.center_id, z.id).then(function (p) { return avyReading(z, p); }, function () { return avyReading(z, null); });
    }).then(function (r) { if (live) setSt({ r }); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [pt.lat, pt.lng, tries]);
  const head = <CardHead style={HEAD}>Avalanche today</CardHead>;
  if (!st) return <div aria-busy="true">{head}<LoadingRows C={C} label="Loading the avalanche forecast…"/></div>;
  if (st.error) return <div>{head}<div style={{ ...MUTED, color: C.amber }}>Couldn’t load the avalanche forecast. This is not a rating.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>;
  const r = st.r, link = r.link ? <a href={r.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 4, color: C.blue, fontSize: 12, fontWeight: 700 }}>Full avalanche forecast ↗</a> : null;
  if (r.kind === "outside") return <div>{head}<div style={MUTED}>This climb is outside the avalanche forecast zones the app reads. That is not a rating — check the local forecast before you go.</div></div>;
  if (r.kind === "off") return <div>{head}<div style={MUTED}>{"No avalanche forecast is being issued for " + (r.zone || "this zone") + " right now (off season). That is not a rating — snow can still slide."}</div>{link}</div>;
  if (r.kind === "none") return <div>{head}<div style={MUTED}>{"No danger rating is published for " + (r.zone || "this zone") + " today. That is not a rating."}</div>{link}</div>;
  const pill = function (lbl, d) { return <div key={lbl} style={{ background: C.surface, borderRadius: 8, padding: "6px 8px" }}><div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{lbl}</div><div style={{ fontSize: 12.5, fontWeight: 800, color: d ? dangerCol(d) : C.textMuted }}>{d ? d + " · " + DANGER_NAME[d] : "—"}</div></div>; };
  return <div>{head}
    <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 6 }}><b style={{ color: dangerCol(r.max) }}>{(r.max >= 3 ? "Warning: " : "") + "Up to " + DANGER_NAME[r.max]}</b>{" in " + (r.zone || "this zone") + " today" + (r.kind === "bands" ? " — the highest of the three elevation bands, since a climb usually crosses them." : ".")}</div>
    {r.kind === "bands" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 2 }}>{pill("Above treeline", r.today.upper)}{pill("Near treeline", r.today.middle)}{pill("Below treeline", r.today.lower)}</div> : null}
    {link}
  </div>;
}
