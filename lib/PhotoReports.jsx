// The reviewer's queue for reported photos — the consume half of 0155.
//
// It exists because the report and the power to act on it were built in the wrong order: 0152
// gave admins the ability to take a photo down, 0155 gave climbers the ability to report one,
// and without this screen a reviewer would have had to notice the report by querying the
// database. A report nobody sees is the same as no report.
//
// Gated on `useIsAdmin`, and that gate is cosmetic exactly as RouteProposals says of itself:
// the SELECT policy on content_reports already returns nothing to a non-admin, and the delete
// is re-checked by 0152's policy in SQL. The gate exists so nobody is shown a queue that would
// only ever be empty, not as the security boundary.
//
// A reviewer sees the photo. Judging a report without seeing what was reported is not review,
// which is why usePhotoReports embeds the contribution row rather than only its id.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePhotoReports, dismissPhotoReport, deleteRoutePhoto } from "./db";
import { C } from "../ClimbMatchCore";

const REASON_LABEL = {
  not_this_route: "Not this route",
  inappropriate: "Inappropriate",
  not_their_photo: "Not their photo",
  other: "Something else",
};

export function PhotoReportQueue({ notify }) {
  const { data, isLoading, error } = usePhotoReports();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["photo-reports"] });

  // Say which of the three it is. "No reports" over a failed read is the false-clean-bill
  // shape a lot of this codebase's guards exist to prevent.
  if (isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>Loading reports…</div>;
  if (error) return <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load the queue — " + ((error && error.message) || "try again")}</div>;
  if (!data || !data.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>Nothing reported.</div>;

  const act = (r, what) => {
    setBusy(r.id);
    const url = r.contributions && r.contributions.value && r.contributions.value.url;
    const p = what === "down"
      ? deleteRoutePhoto(r.contribution_id, url)   // deleting the photo cascades its reports away
      : dismissPhotoReport(r.id);
    Promise.resolve(p)
      .then(() => { refresh(); notify && notify(what === "down" ? "Photo taken down" : "Report dismissed — the photo stays up"); })
      .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(null));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((r) => {
        const url = r.contributions && r.contributions.value && r.contributions.value.url;
        return (
          <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 10, display: "flex", gap: 10 }}>
            {url
              ? <img loading="lazy" decoding="async" src={url} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 9, flexShrink: 0, background: C.surface }} />
              /* The photo is gone but the report is still here: only possible if the row was
                 removed by something other than the cascade. Say so rather than render a gap. */
              : <div style={{ width: 68, height: 68, borderRadius: 9, flexShrink: 0, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, color: C.textMuted, textAlign: "center", padding: 4 }}>photo missing</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{REASON_LABEL[r.reason] || r.reason}</div>
              <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.route_id || "route unknown"}</div>
              {r.detail ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, lineHeight: 1.4 }}>{r.detail}</div> : null}
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <button disabled={busy === r.id} onClick={() => act(r, "down")}
                  style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.red + "55", background: C.redBg, color: C.red, fontSize: 12.5, fontWeight: 700, cursor: busy === r.id ? "default" : "pointer" }}>
                  {busy === r.id ? "Working…" : "Take down"}
                </button>
                <button disabled={busy === r.id} onClick={() => act(r, "dismiss")}
                  style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 600, cursor: busy === r.id ? "default" : "pointer" }}>
                  Keep it up
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
