import { LIMITS, aqiWord } from "../../lib/alpineConditions.js";
import { C } from "../../ClimbMatchCore.jsx";
import { BOX, RETRY, MUTED, clockOf } from "../../lib/alpineConditionsShared.js";
import DayHead from "./DayHead.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { TileGrid, Tile, NOT_MEASURED } from "../../lib/HourTiles.jsx";

/* AIR QUALITY for the selected day. The crag card has had this since the conditions score; the alpine card
   had none, and wildfire smoke is a first-order reason to change a plan in the West. A day the forecast
   does not reach says so; a failed read says "not measured" and offers a retry, never "clean air". */
export default function AirSection({ day, dayLabel, nav, air, onRetry }) {
  const a = day.aqi;
  const tone = a ? (a.max > LIMITS.aqiWarn ? C.red : a.max > LIMITS.aqiCaution ? C.amber : a.max > 50 ? C.yellow : C.green) : null;
  return <div style={BOX}>
    <DayHead title="AIR QUALITY" dayLabel={dayLabel} nav={nav} />
    {!air ? <LoadingRows C={C} label="Loading air quality…"/>
      : air.error ? <div><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load air quality, so smoke is not measured. This is not a clean-air reading.</div><button onClick={onRetry} style={RETRY}>Try again</button></div>
      : !a ? <div style={MUTED}>The air-quality forecast does not reach this day (it runs about five days), so smoke is not measured for it.</div>
      : <TileGrid>
        <Tile label="Worst hour's US AQI" when={"around " + clockOf(air.data, a.at)} value={Math.round(a.max)} tone={tone} sub={aqiWord(a.max)} />
        <Tile label="Fine smoke (PM2.5)" when="at that hour" value={a.pm != null ? Math.round(a.pm) + " µg/m³" : NOT_MEASURED} sub={a.pm != null ? "24-hour average basis" : null} />
      </TileGrid>}
  </div>;
}
