import { useState } from "react";
import { C, CRAG_CATS, shortDate } from "../ClimbMatchCore.jsx";
import { useGpsSubmissionQueue, reviewGpsSubmission } from "./db.js";
import WalkInMap, { walkInPts } from "./WalkInMap";
import { fmtTrailLen, trailLenM } from "./TrailDrawMap";
import LoadingRows from "../src/components/LoadingRows.tsx";

// THE OWNER'S GPS QUEUE (0397). A recorded track or a traced trail to a crag (Add the trail, #2532)
// was filed to gps_submissions and then waited for an approver that no screen offered, so none ever
// went live. Each card draws the line over the parking pin (P) and the crag (C), says whether it was
// traced or recorded, and approves it as the CRAG's walk in (every climb there draws it) or as this
// climb's own line. An approval REPLACES the line already there; the card says when it would.
const WAITED = (iso) => {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  return h < 1 ? "under an hour ago" : h < 48 ? Math.floor(h) + " h ago" : Math.floor(h / 24) + " days ago";
};
const placed = (lat, lng) => lat != null && lng != null && isFinite(Number(lat)) && isFinite(Number(lng));
function SubmissionCard({ r, notify, onOpenRoute }) {
  const crag = CRAG_CATS.includes(String(r.discipline || "")) && r.area_type !== "peak";
  const [toArea, setToArea] = useState(crag && !!r.area_id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const pts = walkInPts(r.gpx_data);
  const traced = r.device_type === "Traced on the map";
  const short = (r.points || pts.length) < 10;
  const replaces = toArea ? (r.area_has_walkin ? "Replaces the walk in " + (r.area_name || "this crag") + " already shows." : null) : (r.route_has_gpx ? "Replaces the line this climb already shows." : null);
  const act = (action) => {
    setBusy(action);
    reviewGpsSubmission(r.id, action, toArea, note)
      .then(() => notify && notify(action === "reject" ? "Turned down." : toArea ? "Approved: every climb at " + (r.area_name || "this crag") + " now shows this walk in." : "Approved: the line is on this climb."))
      .catch((e) => notify && notify("That didn't work — " + ((e && e.message) || "try again")))
      .finally(() => setBusy(null));
  };
  const btn = { padding: "7px 11px", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" };
  return <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 12px" }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: C.blue, textTransform: "uppercase", letterSpacing: 0.3 }}>{traced ? "Traced on the map" : "Recorded" + (r.device_type ? " · " + r.device_type : "")}</span>
      <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: "auto" }}>{WAITED(r.submitted_at)}</span>
    </div>
    <button onClick={() => onOpenRoute && onOpenRoute(r.route_id, r.route_name)} style={{ display: "block", background: "none", border: "none", padding: "4px 0 0", minHeight: 44, textAlign: "left", fontSize: 14, fontWeight: 700, color: C.text, cursor: "pointer" }}>{(r.route_name || "A climb") + (r.area_name ? " · " + r.area_name : "")}</button>
    <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{[(r.points || pts.length) + " points", fmtTrailLen(trailLenM(pts)), r.climber_name ? "From " + r.climber_name : null, r.climb_date ? "Walked " + shortDate(r.climb_date) : null, r.quality_score != null ? "Score " + r.quality_score : null].filter(Boolean).join(" · ")}</div>
    {r.notes ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{r.notes}</div> : null}
    {Array.isArray(r.issues) && r.issues.length ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{"Checks flagged: " + r.issues.join("; ")}</div> : null}
    <div style={{ marginTop: 8 }}><WalkInMap pts={pts} park={placed(r.parking_lat, r.parking_lng) ? { lat: Number(r.parking_lat), lng: Number(r.parking_lng) } : null} crag={placed(r.crag_lat, r.crag_lng) ? { lat: Number(r.crag_lat), lng: Number(r.crag_lng) }   : null} /></div>
    {short ? <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>Under 10 points: the map draws no line this short, so it can only be turned down.</div> : null}
    {r.area_id ? <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, minHeight: 44, fontSize: 12.5, color: C.text, cursor: "pointer" }}>
      <input type="checkbox" checked={toArea} onChange={(e) => setToArea(e.target.checked)} style={{ width: 18, height: 18 }} />
      {"Save as the walk in for every climb at " + (r.area_name || "this crag")}
    </label> : null}
    {replaces ? <div style={{ fontSize: 12, color: C.textMuted }}>{replaces + " The old line is kept with this submission."}</div> : null}
    <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} aria-label="Note for this review (optional)" placeholder="Note (optional)" style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13 }} />
    <div style={{ display: "flex", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
      <button disabled={!!busy || short} onClick={() => act("approve")} style={{ ...btn, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.onSolid, opacity: short ? 0.45 : 1 }}>{busy === "approve" ? "Working…" : "Approve"}</button>
      <button disabled={!!busy} onClick={() => act("reject")} style={{ ...btn, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontWeight: 600 }}>{busy === "reject" ? "Working…" : "Turn down"}</button>
    </div>
  </div>;
}

// Gated on useIsAdmin by the caller, as the other queues are; the functions refuse a non-admin by themselves.
export function GpsSubmissionQueue({ notify, onOpenRoute }) {
  const { data, isLoading, error } = useGpsSubmissionQueue(true);
  if (isLoading) return <LoadingRows C={C} label="Loading trails…" style={{ padding: "10px 2px" }} />;
  if (error) return <div style={{ fontSize: 12.5, color: C.red, padding: "10px 2px" }}>{"Couldn't load the trails — " + ((error && error.message) || "try again") + ". Do not read this as 'nothing waiting'."}</div>;
  if (!data || !data.length) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "10px 2px" }}>No trails or tracks waiting.</div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{data.map((r) => <SubmissionCard key={r.id} r={r} notify={notify} onOpenRoute={onOpenRoute} />)}</div>;
}
