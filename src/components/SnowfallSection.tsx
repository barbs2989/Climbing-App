import { localDays, snowHistory, todayOf, snowLevel, LIMITS } from "../../lib/alpineConditions.js";
import { BOX } from "../../lib/alpineConditionsShared.js";
import DayHead from "./DayHead.tsx";
import type { DayHeadNav } from "./DayHead.tsx";
import { TileGrid, Tile, NOT_MEASURED } from "../../lib/HourTiles.jsx";
import { uSnowfall, DLOCALE, uElev, C } from "../../ClimbMatchCore.jsx";

/* SNOWFALL AND SNOW LEVEL for the selected day. History is the forecast model's own past hours at the forecast
   point (modelled, not measured) and flags nothing: no validated "days since snowfall" cut exists, because
   instability depends on the weak layers beneath new snow and can last days to weeks. The snow level is the
   freezing level over the day's wet hours less the 500 to 1500 ft the NWS-cited studies put snow below the
   0 C line; it is a rule of thumb with its range stated, and it needs precipitation to mean anything. */
export interface SnowfallSectionProps {
  /** The raw forecast; its hours are the model's own past and future. */
  fc: object;
  /** The card's per-day summary; only its date is read. */
  day: { date: string };
  dayLabel: string;
  nav: DayHeadNav;
}
export default function SnowfallSection({ fc, day, dayLabel, nav }: SnowfallSectionProps) {
  /* `day` is the card's per-day SUMMARY (flags, start, sunrise...): it carries no `hours`. The raw local day does, so
     it is looked up by date -- passing the summary to snowLevel() crashed the whole route page (live, 2026-10-08). */
  const raw = localDays(fc).find(function (d) { return d.date === day.date; });
  const hist = snowHistory(fc, todayOf(fc)), lvl = raw ? snowLevel(fc, raw) : null;
  const when = function (n: number) { return n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago"; };
  return <div style={BOX}>
    <DayHead title="SNOWFALL & SNOW LEVEL" dayLabel={dayLabel} nav={nav} />
    <TileGrid min={150}>
      <Tile label="Last measurable snow" when="at the forecast point" value={!hist ? NOT_MEASURED : hist.none ? "None" : when(hist.daysAgo)} sub={!hist ? null : hist.none ? "none of the last " + hist.days + " days reached " + uSnowfall(LIMITS.snowMeasurableIn) : new Date(hist.lastDate + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }) + " · " + uSnowfall(hist.lastIn)} />
      <Tile label={"Snow in " + (hist ? hist.days : 14) + " days"} when="modelled total" value={hist ? uSnowfall(hist.totalIn) : NOT_MEASURED} />
      <Tile label="Snow level this day" when={lvl ? "over " + lvl.wetHours + " wet hour" + (lvl.wetHours === 1 ? "" : "s") : "no precipitation forecast"} value={lvl ? uElev(Math.round(lvl.snowLo / 100) * 100) + " – " + uElev(Math.round(lvl.snowHi / 100) * 100) : "Not applicable"} sub={lvl ? "where precipitation falls as snow, from the freezing level (" + uElev(Math.round(lvl.flLo / 100) * 100) + " – " + uElev(Math.round(lvl.flHi / 100) * 100) + ") less " + uElev(LIMITS.snowLevelBelowFt[0]) + " to " + uElev(LIMITS.snowLevelBelowFt[1]) : "a dry day has no snow line to read"} wide />
    </TileGrid>
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>The history is the forecast’s own past hours at the forecast point, not a measurement on the route, and a day counts only at {uSnowfall(LIMITS.snowMeasurableIn)} or more (the weather service’s “measurable”). How long ago it snowed does not tell you how stable the snow is: that depends on the layers beneath it, for days to weeks. The snow level is a rule of thumb, lower in heavy precipitation, and falls where it is raining or snowing only.</div>
  </div>;
}
