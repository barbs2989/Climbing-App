// The review queue for climber-submitted routes — the consume half of AddRoute.
//
// AddRoute has filed `new_route` rows into `contributions` since #794 and nothing read
// them, so a proposal was accepted, toasted as "Submitted for review", and could never
// become a route. This is the screen where one becomes real, and migration 0125 is the
// half that does the writing.
//
// Gated on `useIsAdmin`, but that gate is cosmetic by design: `approve_new_route` and
// `reject_new_route` both re-check `is_admin(auth.uid())` in SQL, so a tampered client
// gets a P0001 rather than a write. The gate exists so that a non-admin is not shown a
// button that would only fail.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteProposals, approveNewRoute, rejectNewRoute } from "./db";
import { gradeNumFor } from "./grade";
import { C } from "../ClimbMatchCore";

// The form collects seven fields that have no column in `routes` (rockStyle, rock,
// protRating, crux, landing, pads, startType). They are preserved verbatim in
// verif.proposal on approval, and shown here, so a reviewer sees everything the climber
// actually wrote rather than only the part the schema can hold.
const EXTRA_KEYS = [
  ["rockStyle", "Rock style"], ["rock", "Rock"], ["protRating", "Protection"],
  ["crux", "Crux"], ["landing", "Landing"], ["pads", "Pads"], ["startType", "Start"],
];

function Row({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return <div style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.6, marginTop: 2 }}>
    <span style={{ color: C.textMuted, flexShrink: 0, minWidth: 96 }}>{label}</span>
    <span style={{ color: C.textSub, wordBreak: "break-word" }}>{children}</span>
  </div>;
}

export function RouteProposalQueue() {
  const { data: rows, isLoading, error } = useRouteProposals("pending");
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);      // {kind:"ok"|"err", text}
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["route-proposals"] });
    // A new row in `routes` changes area listings and their counts.
    qc.invalidateQueries({ queryKey: ["area-routes"] });
  };

  /* Takes the whole proposal, not just its id, because `grade_num` is computed HERE from the
     grade and discipline the climber submitted. It is the column both finder RPCs sort and
     filter on (`grade_num ... nulls last`, `grade_num >= min_grade`), so a route approved
     without one sorts behind the entire 205k-route catalog. #814 shipped without it.
     Computed client-side on purpose: the arithmetic already exists four times over in the
     pipeline, and a SQL fifth is the drift this codebase keeps paying for — so the number
     travels to the RPC, which still does the writing. */
  const doApprove = async (r) => {
    const id = r.id;
    setBusyId(id); setMsg(null);
    try {
      const v = r.value || {};
      const newId = await approveNewRoute(id, gradeNumFor(v.grade, v.discipline));
      setMsg({ kind: "ok", text: "Filed as " + newId });
      refresh();
    } catch (e) {
      // Surfaced verbatim: "area X already holds a route named Y" means a human has to
      // decide whether it is really the same climb, and a generic message hides that.
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "Could not approve that proposal." });
    } finally { setBusyId(null); }
  };

  const doReject = async (id) => {
    setBusyId(id); setMsg(null);
    try {
      await rejectNewRoute(id, note);
      setMsg({ kind: "ok", text: "Rejected." });
      setRejecting(null); setNote(""); refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "Could not reject that proposal." });
    } finally { setBusyId(null); }
  };

  if (isLoading) return <div style={{ fontSize: 12.5, color: C.textMuted, padding: "8px 0" }}>Loading proposals…</div>;
  if (error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>
    Could not load route proposals — {(error && error.message) || "the request failed"}. This is not a report that there are none.
  </div>;

  const list = rows || [];

  return <div>
    {msg ? <div role={msg.kind === "err" ? "alert" : "status"} style={{
      background: msg.kind === "err" ? C.redBg : C.greenBg,
      color: msg.kind === "err" ? C.red : C.green,
      border: "1px solid " + (msg.kind === "err" ? C.red : C.greenDim),
      borderRadius: 9, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 10,
    }}>{msg.text}</div> : null}

    {!list.length
      ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>
          No climbs are waiting for review.
        </div>
      : list.map(function (r) {
        const v = r.value || {};
        const busy = busyId === r.id;
        return <div key={r.id} style={{
          background: C.card, border: "1px solid " + C.border, borderRadius: 10,
          padding: "11px 12px", marginBottom: 9,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{v.name || "(no name given)"}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, marginBottom: 6 }}>
            {[v.areaName || r.area_id || "no area", v.discipline, v.grade].filter(Boolean).join(" · ")}
          </div>

          <Row label="Pitches">{v.pitchCount}</Row>
          <Row label="Height (ft)">{v.length}</Row>
          <Row label="Gain (ft)">{v.gain}</Row>
          <Row label="Distance (mi)">{v.dist}</Row>
          <Row label="Aspect">{v.aspect}</Row>
          <Row label="Season">{v.season}</Row>
          <Row label="Commitment">{v.commit}</Row>
          <Row label="FA">{v.fa}</Row>
          <Row label="Approach">{v.approach}</Row>
          <Row label="Descent">{v.descentText}</Row>
          <Row label="Rappels">{v.rap}</Row>
          <Row label="Turnaround">{v.turn}</Row>
          <Row label="Comms">{v.comms}</Row>
          <Row label="Style">{Array.isArray(v.style) && v.style.length ? v.style.join(", ") : null}</Row>
          <Row label="Hazards">{Array.isArray(v.haz) && v.haz.length ? v.haz.join(", ") : null}</Row>
          <Row label="Beta">{v.beta}</Row>
          {EXTRA_KEYS.map(function (p) { return <Row key={p[0]} label={p[1]}>{v[p[0]]}</Row>; })}
          <Row label="Their source">{[v.source, v.sourceNote].filter(Boolean).join(" — ")}</Row>
          <Row label="Climbed it">{v.climbed ? "yes" : null}</Row>
          <Row label="Photos">{v.photoCount ? v.photoCount + " offered (not stored)" : null}</Row>
          <Row label="Submitted">{r.created_at ? String(r.created_at).slice(0, 10) : null}</Row>
          <Row label="By">{r.contributor ? String(r.contributor).slice(0, 8) : "anonymous"}</Row>

          {!r.area_id ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 7, lineHeight: 1.5 }}>
            This proposal names no DB area, so it cannot be filed. Approving it will be refused.
          </div> : null}

          {rejecting === r.id
            ? <div style={{ marginTop: 9 }}>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  aria-label="Why this proposal is rejected"
                  placeholder="Why? (optional, kept on the record)"
                  style={{ width: "100%", background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }} />
                <div style={{ display: "flex", gap: 7, marginTop: 7 }}>
                  <button onClick={() => doReject(r.id)} disabled={busy}
                    style={{ flex: 1, padding: 9, background: busy ? C.surface : C.redBg, color: C.red, border: "1px solid " + C.red, borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
                    {busy ? "Working…" : "Confirm reject"}
                  </button>
                  <button onClick={() => { setRejecting(null); setNote(""); }} disabled={busy}
                    style={{ flex: 1, padding: 9, background: C.surface, color: C.textSub, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            : <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                <button onClick={() => doApprove(r)} disabled={busy}
                  style={{ flex: 2, padding: 9, background: busy ? C.surface : C.blueSolid, color: busy ? C.textMuted : "#fff", border: busy ? "1px solid " + C.border : "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
                  {busy ? "Working…" : "Approve — file this climb"}
                </button>
                <button onClick={() => setRejecting(r.id)} disabled={busy}
                  style={{ flex: 1, padding: 9, background: C.surface, color: C.textSub, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}>
                  Reject
                </button>
              </div>}
        </div>;
      })}
  </div>;
}
