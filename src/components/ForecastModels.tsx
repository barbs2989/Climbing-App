import type { ReactNode } from "react";
import { C, uTemp, uWind, uPrecip, uElev } from "../../ClimbMatchCore.jsx";
import { BOX, MUTED, RETRY } from "../../lib/alpineConditionsShared.js";
import { MODEL_LABELS } from "../../lib/forecast.js";
import LoadingRows from "./LoadingRows.tsx";

/* FORECAST MODELS, side by side (Windy audit, owner's note 2026-11-25: Windy lets you cross-reference several
   forecast models, the European ones especially). One day, one row per model -- ECMWF's 9 km run and its AI
   model, GFS, ICON, Canada's GEM, the UK Met Office -- with the forecast this card prints on top, so a climber
   can see for themselves whether the day is settled or the models split. The read is the same one behind the
   "Forecast models disagree" flag (fetchAlpineSpread); a failed read says nothing about agreement, and a field a
   model does not publish is a dash with the reason under the table, never a zero. */
export interface ForecastModelRow { model: string; hi: number | null; lo: number | null; gust: number | null; fl: number | null; rain: number | null }
export interface ForecastModelsProps {
  /** The heading row: a DayHead on the alpine card, a plain CardHead on the crag card. */
  head: ReactNode;
  /** modelDays(sp, date): one row per model that answered for the day. Ignored while `state` is not "ok". */
  rows: ForecastModelRow[];
  /** The day as this card prints it (the NBM blend): the first row, so the others read against it. */
  shown: { hi: number | null; lo: number | null; gust: number | null; rain: number | null; fl: number | null } | null;
  /** "loading" until the read returns, "error" when it failed. */
  state: "loading" | "error" | "ok";
  /** Show the freezing-level column (alpine); a crag card leaves it out. */
  showFl: boolean;
  /** Where the models are read, e.g. "at 10,781 ft". */
  where: string;
  /** Reads the models again after a failed read. */
  onRetry: () => void;
}
const dash = "—";
export default function ForecastModels({ head, rows, shown, state, showFl, where, onRetry }: ForecastModelsProps) {
  const temp = function (r: { hi: number | null; lo: number | null }) { return r.hi != null ? uTemp(r.hi) + (r.lo != null ? " / " + uTemp(r.lo) : "") : dash; };
  const cell = function (v: number | null, f: (n: number) => string) { return v != null ? f(v) : dash; };
  const fl = function (v: number) { return uElev(Math.round(v / 100) * 100); };
  const th = { fontSize: 10.5, color: C.textMuted, fontWeight: 700, textAlign: "left" as const, padding: "0 4px 4px 0", verticalAlign: "bottom" as const };
  const td = { fontSize: 12, color: C.text, padding: "5px 4px 5px 0", borderTop: "1px solid " + C.border, verticalAlign: "top" as const, overflowWrap: "anywhere" as const };
  const noGust = rows.some(function (r) { return r.gust == null; }), noFl = showFl && rows.some(function (r) { return r.fl == null; });
  const row = function (key: string, name: string, r: { hi: number | null; lo: number | null; gust: number | null; rain: number | null; fl: number | null }, bold: boolean) {
    const w = bold ? 800 : 400;
    return <tr key={key}>
      <th scope="row" style={{ ...td, fontWeight: bold ? 800 : 600, textAlign: "left" }}>{name}</th>
      <td style={{ ...td, fontWeight: w }}>{temp(r)}</td>
      <td style={{ ...td, fontWeight: w }}>{cell(r.gust, uWind)}</td>
      <td style={{ ...td, fontWeight: w }}>{cell(r.rain, uPrecip)}</td>
      {showFl ? <td style={{ ...td, fontWeight: w }}>{cell(r.fl, fl)}</td> : null}
    </tr>;
  };
  return <div style={BOX}>
    {head}
    {state === "loading" ? <LoadingRows C={C} label="Loading the other forecast models…"/>
      : state === "error" ? <div><div style={MUTED}>Couldn’t load the other forecast models, so this says nothing about whether they agree.</div><button onClick={onRetry} style={RETRY}>Try again</button></div>
      : !rows.length ? <div style={MUTED}>The other forecast models don’t reach this day, so there is nothing to compare it with.</div>
      : <div>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{"Each forecast model’s day, " + where}</caption>
          <thead><tr>
            <th scope="col" style={{ ...th, width: showFl ? "30%" : "36%" }}>Model</th>
            <th scope="col" style={th}>High / low</th>
            <th scope="col" style={th}>Top gust</th>
            <th scope="col" style={th}>Rain</th>
            {showFl ? <th scope="col" style={th}>Freezing level</th> : null}
          </tr></thead>
          <tbody>
            {shown ? row("shown", "This forecast", shown, true) : null}
            {rows.map(function (r) { return row(r.model, MODEL_LABELS[r.model as keyof typeof MODEL_LABELS] || r.model, r, false); })}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 6 }}>
          {"Read " + where + ". Rain is the day’s total, snow melted in. When the models sit close together the forecast is more likely to hold; when they split, plan for the worse one." + (noGust || noFl ? " A dash: that model does not publish " + (noGust && noFl ? "gusts or a freezing level" : noGust ? "gusts" : "a freezing level") + "." : "")}
        </div>
      </div>}
  </div>;
}
