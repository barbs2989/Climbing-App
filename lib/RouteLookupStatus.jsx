// YOUR CLIMBS THAT HAVE NOT RESOLVED YET. Your logs name a route by id only (climb_logs carries no
// name or grade), and App resolves the DB ones in one batched read (useRoutesByIds over
// dbOnlyRouteIds). Until that read lands — or for good if it fails — the logbook lists used to DROP
// those rows, so the header said "12 logged" over a list of 9 with nothing to say why. App provides
// the read's state here; the lists of YOUR OWN logs say what is missing and offer a retry.
// Another climber's résumé resolves through its own read and keeps its own wording.
import { createContext, useContext } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { USE_DB } from "./supabase";
import { BTN } from "./buttonStyles.js";

export const RouteLookupCtx = createContext({ fetching: false, failed: false, retry: null });

const plural = (n, one, many) => n + " " + (n === 1 ? one : many);

/**
 * One line under a list of your logs, for the `missing` rows whose route has not resolved.
 * @param {{ missing: number, noun?: string }} props
 */
export function UnresolvedClimbsNote({ missing, noun }) {
  const st = useContext(RouteLookupCtx);
  if (!USE_DB || !missing) return null;
  const what = plural(missing, noun || "climb", (noun || "climb") + "s");
  const box = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, fontSize: 12.5, lineHeight: 1.45 };
  if (st.fetching) return <div role="status" style={{ ...box, color: C.textMuted }}>{"Loading " + what + "…"}</div>;
  if (st.failed) return <div role="alert" style={{ ...box, color: C.text }}>
    <span style={{ flex: "1 1 200px", minWidth: 0 }}>{"Couldn’t load " + what + " — they’re still in your logbook."}</span>
    {st.retry ? <button onClick={st.retry} style={{ ...BTN, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>Retry</button> : null}
  </div>;
  return <div style={{ ...box, color: C.textMuted }}>{plural(missing, noun || "climb", (noun || "climb") + "s") + (missing === 1 ? " you logged is" : " you logged are") + " no longer in the catalog."}</div>;
}
