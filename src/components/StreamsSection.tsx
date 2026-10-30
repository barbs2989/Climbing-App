import { uImp, C, uDistMi } from "../../ClimbMatchCore.jsx";
import { useState, useEffect } from "react";
import { fetchGaugeSites, fetchGaugeFlow } from "../../lib/forecast.js";
import { nearestGauge, parseSites, flowReading, gaugeName, STEADY_STAGE_FT, STEADY_PCT } from "../../lib/streams.js";
import CardHead from "./CardHead.tsx";
import { HEAD, RETRY, MUTED } from "../../lib/alpineConditionsShared.js";
import LoadingRows from "./LoadingRows.tsx";
import { TileGrid, Tile, NOT_MEASURED } from "../../lib/HourTiles.jsx";

// Stream flow in the climber's units (discharge ft³/s <-> m³/s; stage ft <-> m).
function flowText(v: number, kind: string) {
  if (kind === "stage") return uImp() ? v.toFixed(2) + " ft" : (v * 0.3048).toFixed(2) + " m";
  if (uImp()) return Math.round(v).toLocaleString() + " ft³/s";
  const m3 = v * 0.0283168; return m3.toFixed(m3 < 10 ? 2 : 1) + " m³/s";
}
/* STREAM FLOW near the trailhead: what the nearest gauge measured in the last 24 hours, never a verdict.
   (lib/streams.js has the limits: stage vs a fitted discharge, the cross-section at the gauge, the 10 to 20
   ft²/s depth-times-speed range at which adults lose their footing, snowmelt peaking in the warm hours.) */
export interface StreamsSectionProps {
  /** The forecast point, used when there is no base. */
  pt: { lat: number; lng: number };
  /** The trailhead the gauge is searched around; its name words the distance line. */
  base: { lat: number; lng: number; name: string | null } | null;
}
type StreamsSectionGauge = NonNullable<ReturnType<typeof nearestGauge>>;
type StreamsSectionState = { none: true; error?: undefined; g?: undefined; f?: undefined } | { error: true; none?: undefined; g?: undefined; f?: undefined } | { g: StreamsSectionGauge; f: ReturnType<typeof flowReading>; none?: undefined; error?: undefined };
export default function StreamsSection({ pt, base }: StreamsSectionProps) {
  const [st, setSt] = useState<StreamsSectionState | null>(null), [tries, setTries] = useState(0);
  const at = base || pt;
  useEffect(function () {
    let live = true; setSt(null);
    fetchGaugeSites(at.lat, at.lng).then(function (rdb: Parameters<typeof parseSites>[0]): StreamsSectionState | Promise<StreamsSectionState> {
      const g = nearestGauge(parseSites(rdb), at.lat, at.lng, 25);
      if (!g) return { none: true };
      return fetchGaugeFlow(g.no).then(function (j) { return { g: g, f: flowReading(j) }; });
    }).then(function (r) { if (live) setSt(r); }, function () { if (live) setSt({ error: true }); });
    return function () { live = false; };
  }, [at.lat, at.lng, tries]);
  const where = base && base.name ? base.name : "the forecast point";
  const f = st && st.f;
  // A gauge can stop reporting for hours (a transmitter, a frozen sensor): an old "now" says how old it is.
  const ageH = f && f.now && isFinite(f.now.at) ? (Date.now() - f.now.at) / 3600e3 : null;
  const sgn = function (d: number) { return d > 0 ? "+" : d < 0 ? "−" : "±"; };
  return <div>
    <CardHead style={HEAD}>Stream flow near the approach</CardHead>
    {!st ? <LoadingRows C={C} label="Loading stream flow…"/>
      : st.error ? <div><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load stream gauges, so stream flow is not measured. This is not a report that streams are low.</div><button onClick={function () { setTries(tries + 1); }} style={RETRY}>Try again</button></div>
      : st.none ? <div style={MUTED}>{"No stream gauge within " + uDistMi(25 / 1.60934) + " of " + where + ", so stream flow is not measured here. This is not a report that streams are low."}</div>
      : !f ? <div style={MUTED}>{"The nearest gauge, " + gaugeName(st.g.name) + " (" + uDistMi(st.g.km / 1.60934) + " away), has no current reading."}</div>
      : <div>
        <div style={{ fontSize: 12.5, color: C.text, marginBottom: 6 }}>{gaugeName(st.g.name) + " · " + uDistMi(st.g.km / 1.60934) + " from " + where}</div>
        {f.flags.length ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>{"The gauge marks its current reading as " + f.flags.join(", ") + ", so no number is shown."}</div>
          : <TileGrid min={150}>
            <Tile label={f.kind === "stage" ? "Water level now" : "Flow now"} when={"at " + f.now.clock + (ageH != null && ageH > 2 ? " (" + Math.round(ageH) + " h ago)" : "")} value={flowText(f.now.v, f.kind)} sub={f.provisional ? "provisional: not yet reviewed" : null} />
            <Tile label="Last 3 hours" when="trend" value={f.trend ? f.trend[0].toUpperCase() + f.trend.slice(1) : NOT_MEASURED} sub={f.kind === "stage" ? (f.delta != null ? sgn(f.delta) + flowText(Math.abs(f.delta), "stage") + " (under " + flowText(STEADY_STAGE_FT, "stage") + " reads steady)" : null) : f.pct != null ? (f.pct > 0 ? "+" : "") + Math.round(f.pct) + "% (under " + STEADY_PCT + "% reads steady)" : null} />
            <Tile label="Highest, last 24 h" when={f.hi.day + " at " + f.hi.clock} value={flowText(f.hi.v, f.kind)} />
            <Tile label="Lowest, last 24 h" when={f.lo.day + " at " + f.lo.clock} value={flowText(f.lo.v, f.kind)} />
          </TileGrid>}
      </div>}
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>{"A gauge reads the stream at the gauge, which may be a different stream from the one you cross, and it cannot see the depth or speed at your crossing. Whether a person can stand in water depends on depth times speed: adults lose their footing at about " + (uImp() ? "10 to 20 ft²/s" : "0.9 to 1.9 m²/s") + ", and no flow figure is safe for every crossing. Streams fed by snow melt rise in the warm hours and drop overnight, so cross early, and check it yourself before you commit."}</div>
  </div>;
}
