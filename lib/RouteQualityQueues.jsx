// The owner's contributor-standing queue (0307–0309), a tile in the Menu's admin-only Review section.
//
//   ContributorStandingQueue — every climber with a strike or a hand-set standing; reset, warn,
//                              restrict or ban, with a reason the climber is shown.
//
// The held route edits and the "this is wrong" flags USED to be queues here too (FieldContributionQueue,
// RouteFlagQueue). Since 2026-11-14 the owner reviews both on the standalone Review desk
// (review.html → review/ReviewDesk.jsx), as one table beside the nightly AI checker's verdicts.
//
// Gated on `useIsAdmin` by the caller, but that gate is cosmetic by design: every RPC re-checks
// is_admin() in SQL (0309). Every date is formatted through DLOCALE (check:date-locale).
import { useState } from "react";
import { useContributionStandings, setContributionStanding } from "./db";
import { C, DLOCALE, pubNameRow } from "../ClimbMatchCore";
import LoadingRows from "../src/components/LoadingRows.tsx";

const NO_ROWS = [];
const when = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch (_e) { return String(iso).slice(0, 10); } };

const btn = (kind, busy) => ({
  padding: "8px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", flex: 1,
  background: busy ? C.surface : kind === "ok" ? C.blueSolid : kind === "bad" ? C.redBg : C.surface,
  color: busy ? C.textMuted : kind === "ok" ? C.onSolid : kind === "bad" ? C.red : C.textSub,
  border: kind === "ok" && !busy ? "none" : "1px solid " + (kind === "bad" ? C.red : C.border),
});
const fld = { width: "100%", background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" };
function Msg({ msg }) {
  if (!msg) return null;
  return <div role={msg.kind === "err" ? "alert" : "status"} style={{ background: msg.kind === "err" ? C.redBg : C.greenBg, color: msg.kind === "err" ? C.red : C.green, border: "1px solid " + (msg.kind === "err" ? C.red : C.greenDim), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>{msg.text}</div>;
}

// ── Contributor standing ───────────────────────────────────────────────────────────── ──────────────────────────────────────────────────────────
export function ContributorStandingQueue() {
  const q = useContributionStandings(true);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [reason, setReason] = useState({});
  const rows = q.data || NO_ROWS;
  if (q.isLoading) return <LoadingRows C={C} label="Loading contributor standing…" style={{padding: "8px 0"}}/>;
  if (q.error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>Could not load contributor standing — {(q.error && q.error.message) || "the request failed"}. This is not a report that nobody has a strike.</div>;
  const act = async (uid, status, days) => {
    setBusy(uid); setMsg(null);
    try { await setContributionStanding(uid, status, status === "ok" ? 0 : null, days, reason[uid] || ""); setMsg({ kind: "ok", text: status === "ok" ? "Reset — they can edit again and were told." : "Updated — they were told, with your reason." }); }
    catch (e) { setMsg({ kind: "err", text: (e && e.message) || "That did not go through." }); }
    finally { setBusy(null); }
  };
  const LBL = { ok: "OK", warned: "Warned", restricted: "Restricted", banned: "Banned from contributing" };
  return <div>
    <Msg msg={msg} />
    {!rows.length ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>Nobody has a strike.</div>
      : rows.map(function (r) {
        const isBusy = busy === r.user_id;
        const col = r.status === "banned" || r.status === "restricted" ? C.red : r.status === "warned" ? C.amber : C.green;
        return <div key={r.user_id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.profile ? (pubNameRow(r.profile) || "a climber") : String(r.user_id).slice(0, 8)}</div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: col }}>{LBL[r.status] || r.status}</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{[r.strikes + " strike" + (r.strikes === 1 ? "" : "s"), r.last_strike_at ? "last " + when(r.last_strike_at) : null, r.until ? "until " + when(r.until) : null].filter(Boolean).join(" · ")}</div>
          {r.reason ? <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 5, lineHeight: 1.5 }}>{"Last reason: " + r.reason}</div> : null}
          <textarea aria-label="Reason the climber will be shown" value={reason[r.user_id] || ""} onChange={(e) => setReason((x) => ({ ...x, [r.user_id]: e.target.value }))} rows={1} placeholder="Reason the climber will be shown (needed for warn, restrict and ban)" style={{ ...fld, marginTop: 8 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
            <button disabled={isBusy} style={btn("ok", isBusy)} onClick={() => act(r.user_id, "ok", null)}>{isBusy ? "Working…" : "Reset strikes"}</button>
            <button disabled={isBusy} style={btn("plain", isBusy)} onClick={() => act(r.user_id, "warned", null)}>Warn</button>
            <button disabled={isBusy} style={btn("bad", isBusy)} onClick={() => act(r.user_id, "restricted", 90)}>Restrict 90 days</button>
            <button disabled={isBusy} style={btn("bad", isBusy)} onClick={() => act(r.user_id, "banned", null)}>Ban from contributing</button>
          </div>
        </div>;
      })}
  </div>;
}
