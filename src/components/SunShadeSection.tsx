import { useMemo } from "react";
import { sunPins, BOX, clockOf } from "../../lib/alpineConditionsShared.js";
import { hasSnowLegs } from "../../lib/alpineConditions.js";
import DayHead from "./DayHead.tsx";
import ShadeMap from "../../lib/ShadeMap.jsx";
import { C } from "../../ClimbMatchCore.jsx";

export default function SunShadeSection({ route, kind, terrain, pt, fc, day, isToday, dayLabel, nav }) {
  const pins = useMemo(function () { return sunPins(route); }, [route]);
  if (!pt || !day || day.sunrise == null || day.sunset == null) return null;
  // The terrain is centred on the CLIMB: its base, else its top, else the forecast point.
  const ctr = pins.find(function (p) { return p.key === "Base"; }) || pins.find(function (p) { return p.key === "Summit" || p.key === "Topout"; }) || pt;
  const rise = day.sunrise * 1000, set = day.sunset * 1000, now = Date.now();
  const at0 = isToday && now >= rise && now <= set ? now : Math.min(set, rise + 3 * 3600e3);
  const steep = kind === "glacier" || kind === "alpineice" || kind === "waterfall" || kind === "cragmixed" || hasSnowLegs(kind, terrain);
  return <div style={BOX}>
    <DayHead title="SUN AND SHADE" dayLabel={dayLabel} nav={nav} />
    <ShadeMap lat={ctr.lat} lng={ctr.lng} pins={pins.length ? pins : null} steep={steep} place={pins.length ? "climb" : "area"} rise={rise} set={set} at0={at0} dayKey={day.date} clock={function (u) { return clockOf(fc, Math.round(u / 1000)); }} C={C} />
  </div>;
}
