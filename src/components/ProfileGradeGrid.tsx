import { C, gradeRoleText } from "../../ClimbMatchCore.jsx";
import DiscIcon from "./DiscIcon.tsx";
import { SR_ONLY } from "../../lib/srOnly.js";

/** One row of `profileGradeRows()` (ClimbMatchCore.jsx): a discipline, its grade, the climber's role, and the harder grade a leader will follow. */
export interface ProfileGradeRow {
  k: string;
  label: string;
  grade: string;
  role: string;
  follow: string;
}

export interface ProfileGradeGridProps {
  /** The rows to draw, as `profileGradeRows()` returns them. A row with neither a grade nor a follow grade is skipped. */
  rows: ProfileGradeRow[];
}

/**
 * A climber's grades as a LEADS / FOLLOWS grid: one row per discipline, a column for each role, the way
 * Mountain Project's partner profile lays it out. It replaced a tile per discipline whose one big grade was
 * the lead grade and whose caption read "Sport · leads · follows 5.10d", so the follow grade sat in small
 * print under a lead grade nothing labelled (owner, 2026-11-25: "hard to tell what your grade is for
 * leading and following"). A screen reader hears each row whole ("Sport: leads 5.10b, follows 5.10d");
 * the column headers are drawn for the eye only.
 *
 * - A LEADER: their grade under Leads, and under Follows the harder grade they stated, else a dash.
 * - FOLLOW ONLY: a dash under Leads, their grade under Follows.
 * - NO ROLE STATED (older rows): the grade under Leads, as `profileGradeRows` reads it.
 * - BOULDER is not roped: one grade across both columns.
 * Reads `C` at render time; core imports this file back through MeTab and FullProfile.
 */
export default function ProfileGradeGrid({ rows }: ProfileGradeGridProps) {
  const shown = rows.filter(r => r.grade || r.follow);
  if (!shown.length) return null;
  const roped = shown.some(r => r.k !== "boulder");
  const col = "minmax(64px,auto)";
  const head = { fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" as const, color: C.textMuted, textAlign: "center" as const, padding: "2px 5px 6px" };
  const gradeStyle = { fontSize: 15, fontWeight: 800, color: C.text, textAlign: "center" as const, lineHeight: 1.2 };
  const dash = <div aria-hidden="true" style={{ ...gradeStyle, color: C.textMuted, fontWeight: 600 }}>–</div>;
  const val = (g: string) => g ? <div aria-hidden="true" style={gradeStyle}>{g}</div> : dash;
  return <div style={{ display: "grid", gridTemplateColumns: "1fr " + col + " " + col, columnGap: 0, alignItems: "center" }}>
    {roped ? <>
      <div aria-hidden="true" style={{ ...head, textAlign: "left" }}>Discipline</div>
      <div aria-hidden="true" style={head}>Leads</div>
      <div aria-hidden="true" style={head}>Follows</div>
    </> : null}
    {shown.map((r, i) => {
      const cell = { borderTop: i || roped ? "1px solid " + C.borderLight : "none", padding: "8px 5px", minHeight: 22 };
      const followOnly = r.role === "follow";
      return <div key={r.k} style={{ display: "contents" }}>
        <div style={{ ...cell, display: "flex", alignItems: "center", gap: 7, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: C.text }}><span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><DiscIcon d={r.k === "boulder" ? "bouldering" : r.k} size={15} /></span><span aria-hidden="true" style={{ minWidth: 0 }}>{r.label}</span><span style={SR_ONLY}>{r.label + ": " + gradeRoleText(r)}</span></div>
        {r.k === "boulder"
          ? <div style={{ ...cell, gridColumn: "span 2" }}>{val(r.grade)}</div>
          : <>
            <div style={cell}>{followOnly ? dash : val(r.grade)}</div>
            <div style={cell}>{val(followOnly ? r.grade : r.follow)}</div>
          </>}
      </div>;
    })}
  </div>;
}
