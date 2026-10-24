// What a climber can see of the safety reports they have filed (0075/0077).
//
// The reviewer's queues that used to live beside this -- Safety reports, Appeals and, in
// PhotoReports.jsx, Reported photos -- were removed from the Menu on the owner's request
// (2026-10-24, "I don't need that feature"). Reports and appeals are still filed into
// user_reports / content_reports / moderation_appeals and read in the Supabase dashboard.

import { useMyFiledReports } from "./db";
import { C } from "../ClimbMatchCore";

const AGES = (iso) => {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
};

// What the person who FILED a report can see of it.
//
// The other half of the same hole. 0077 always allowed a reporter to read their own rows, and
// nothing ever did, so filing a harassment report was a one-way door: a toast, and then no way
// to tell whether the report still existed or had ever been looked at.
//
// IT REPORTS THAT SOMEBODY LOOKED, NOT WHAT THEY DECIDED, and the distinction is honesty rather
// than discretion. `actioned` and `dismissed` both collapse to "Closed" because this app has no
// suspension, no warning and no ban -- so surfacing the word "actioned" to a reporter would
// promise a consequence that no code anywhere implements. That is the same overclaim the
// reviewer's queue refuses to make with a Suspend button it cannot honour, seen from the other
// end. When an enforcement action exists, this is where it becomes tellable.
//
// Renders NOTHING when you have filed nothing, which is almost everyone -- a permanent empty
// "no reports" panel on every climber's settings screen is noise about a feature they have
// never used.
export function MyFiledReports() {
  const { data } = useMyFiledReports(true);
  if (!data || !data.length) return null;
  const label = (st) => (st === "reviewing" ? "Being looked at" : st === "open" ? "Filed" : "Closed");
  return (
    <div style={{ background: C.card, borderRadius: 12, border: "1px solid " + C.border, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
        Reports you have filed. “Closed” means ClimbMatch Safety reviewed it — what was decided
        about someone else stays private to them, whether that was removing what they posted,
        suspending or banning their account, or no action. Blocking is the part that is under your
        control.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.reason || "Report"}</span>
            <span style={{ fontSize: 12, color: C.textSub }}>{"about " + (r.reported_name || "a climber")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: r.status === "reviewing" ? C.amber : C.textMuted, marginLeft: "auto" }}>{label(r.status)}</span>
            <span style={{ fontSize: 11, color: C.textMuted, width: "100%" }}>{AGES(r.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
