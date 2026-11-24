// The review queue for climber-submitted routes — the consume half of AddRoute.
//
// AddRoute has filed `new_route` rows into `contributions` since #794 and nothing read
// them, so a proposal was accepted, toasted as "Submitted for review", and could never
// become a route. This is the screen where one becomes real; migration 0127 is the half that
// does the writing, and 0131 widened it to keep six more fields the form always collected.
//
// Gated on `useIsAdmin`, but that gate is cosmetic by design: `approve_new_route` and
// `reject_new_route` both re-check `is_admin(auth.uid())` in SQL, so a tampered client
// gets a P0001 rather than a write. The gate exists so that a non-admin is not shown a
// button that would only fail.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteProposals, useAreaProposals, useAreaPlacementClaims, useAreaNamesByIds, resolveAreaPlacement, approveNewRoute, approveNewArea, rejectNewRoute, useProposalDuplicates, preferNetworkReads } from "./db";
import { gradeNumFor } from "./grade";
import { discLabel } from "./discLabels";
import { C } from "../ClimbMatchCore";
import LoadingRows from "../src/components/LoadingRows.tsx";
import { searchCanon, searchBare } from "./search";

// Shown here because a reviewer should see everything the climber wrote, not only the part
// the schema models. Six of these got real columns in 0131 (prot_rating, start_type, landing,
// pads, rock, crux), so approval now stores them rather than parking them in verif.proposal —
// they stay on this list because the reviewer still needs to READ them before deciding.
//
// `rockStyle` is the one that will never get a column: it is the rock sub-discipline
// (trad / sport / bouldering), which `discipline` already carries, and a second column for the
// same fact is how a route ends up filed as sport in one place and trad in another. It reaches
// the route only through `discipline`, so it is displayed here and deliberately not persisted
// under its own name. See 0131's header.
const EXTRA_KEYS = [
  ["rockStyle", "Rock style"], ["rock", "Rock"], ["protRating", "Protection"],
  ["crux", "Crux"], ["landing", "Landing"], ["pads", "Pads"], ["startType", "Start"],
  // 0327: the seven route-page fields the form asks for since then. The three lists render below.
  ["ffa", "First free ascent"], ["fwa", "First winter ascent"], ["highPointFt", "High point (ft)"], ["sun", "Sun"],
  // 0352: what the edit sheet takes per discipline and the form now asks too.
  ["approach", "Approach"], ["location", "Location on the wall"], ["bolts", "Bolts"], ["anchor", "Anchor"],
  ["fixedGear", "Fixed gear"], ["rockQuality", "Rock quality"], ["wet", "Wet / seepage"], ["ropeLen", "Rope length (m)"],
  ["rockGrade", "Hardest rock"], ["iceGrade", "Hardest ice / mixed"], ["alpineGrade", "Alpine grade"], ["angle", "Steepest angle (°)"],
];
const LIST_KEYS = [["altNames", "Also known as"], ["variations", "Variations"], ["proTips", "Pro tips"], ["rack", "Rack"]];

function Row({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return <div style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.6, marginTop: 2 }}>
    <span style={{ color: C.textMuted, flexShrink: 0, minWidth: 96 }}>{label}</span>
    <span style={{ color: C.textSub, wordBreak: "break-word" }}>{children}</span>
  </div>;
}

// Catalog rows this proposal may already be (0214's catalog_find_*). Approving still refuses a same-named
// copy nearby (0216); this catches the ones it cannot: another spelling, or farther away.
// The same name as the search box spells it ("Mt Baker" = "Mount Baker", a leading "The" dropped): lib/search.js.
const nameKey = (n) => searchBare(searchCanon(String(n || "")));
// Other proposals STILL WAITING that name the same climb or area (QA run, 2026-11-23: two climbers proposed one climb,
// and neither card warned until one was approved, because the catalog read cannot see a pending proposal). A climb
// matches on the same area; an area on the same name anywhere in the queue, since a twin may name another parent.
function waitingTwins(list, r, sameArea) {
  const k = nameKey((r.value || {}).name);
  if (!k) return [];
  return list.filter(function (x) { return x.id !== r.id && nameKey((x.value || {}).name) === k && (!sameArea || x.area_id === r.area_id); });
}
function PossibleDuplicates({ kind, name, areaId, lat, lng, waiting }) {
  const { data, isLoading, error } = useProposalDuplicates(kind, name, areaId, lat, lng);
  const twins = waiting || [];
  const twinBox = twins.length ? <div style={{ background: C.surface, border: "1px solid " + C.amber, borderRadius: 8, padding: "7px 9px", marginTop: 7 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 3 }}>{"Also waiting for review: " + twins.length + " more with this name"}</div>
    {twins.map(function (t) {
      const tv = t.value || {};
      return <div key={t.id} style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, wordBreak: "break-word" }}>
        {"By " + String(t.contributor || "anonymous").slice(0, 8) + (t.created_at ? " on " + String(t.created_at).slice(0, 10) : "") + (kind === "new_area" && tv.parentName ? ", inside " + tv.parentName : "")}
      </div>;
    })}
  </div> : null;
  if (isLoading) return <>{twinBox}<Row label="Already in catalog?">Checking…</Row></>;
  if (error) return <>{twinBox}<Row label="Already in catalog?"><span style={{ color: C.amber }}>Could not check — {(error && error.message) || "the request failed"}</span></Row></>;
  const hits = (data || []).slice(0, 5);
  if (!hits.length) return <>{twinBox}<Row label="Already in catalog?">No match found</Row></>;
  return <>{twinBox}<div style={{ background: C.surface, border: "1px solid " + C.amber, borderRadius: 8, padding: "7px 9px", marginTop: 7 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 3 }}>Possible duplicate{hits.length > 1 ? "s" : ""}: read before approving</div>
    {hits.map(function (h) {
      return <div key={h.id} style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, wordBreak: "break-word" }}>
        {h.label}{h.grade ? " · " + h.grade : ""}{h.km != null ? " · " + Number(h.km).toFixed(1) + " km" : ""} · {h.match} <span style={{ color: C.textMuted }}>({h.id})</span>
      </div>;
    })}
  </div></>;
}

// What the nightly AI checker (review-flags-nightly, 0436) concluded about this proposal: does the climb or
// area exist where it is filed, and are its facts right. Only the Review desk passes verdicts; the AI never acts.
const AI_LABEL = { agree: "AI agrees", disagree: "AI disagrees", partly: "AI: partly right", unsure: "AI unsure" };
function AiNote({ v }) {
  if (!v) return <Row label="AI check">Not checked yet</Row>;
  const col = v.verdict === "agree" ? C.green : v.verdict === "disagree" ? C.red : v.verdict === "partly" ? C.amber : C.textSub;
  const src = Array.isArray(v.sources) ? v.sources : [];
  return <div style={{ border: "1px solid " + C.border, borderRadius: 8, padding: "7px 9px", marginTop: 7, fontSize: 12, lineHeight: 1.5 }}>
    <div style={{ fontWeight: 700, color: col }}>{(AI_LABEL[v.verdict] || v.verdict) + (v.confidence && v.confidence !== "none" ? " · " + v.confidence : "")}</div>
    {v.reasoning ? <div style={{ color: C.textSub, marginTop: 2 }}>{v.reasoning}</div> : null}
    {v.verdict !== "agree" && v.ai_value && typeof v.ai_value === "object" && !Array.isArray(v.ai_value) && Object.keys(v.ai_value).length
      ? <div style={{ color: C.textSub, marginTop: 2 }}><b>AI would correct:</b> {Object.keys(v.ai_value).map(function (k) { return k + ": " + (typeof v.ai_value[k] === "object" ? JSON.stringify(v.ai_value[k]) : String(v.ai_value[k])); }).join(" · ")}</div> : null}
    {src.map(function (s, i) { return <div key={i} style={{ color: C.textMuted, wordBreak: "break-word" }}><a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>{s.title || s.url}</a>{s.quote ? " — “" + s.quote + "”" : ""}</div>; })}
  </div>;
}

// Turning a proposal down: the reason is shown to the proposer (0505 refuses under 10 characters), and it is
// a strike against their contributing (3 pauses it 90 days, 5 closes it) unless ticked as an honest mistake.
function RejectBox({ busy, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  const [mistake, setMistake] = useState(false);
  const ok = note.trim().length >= 10;
  return <div style={{ marginTop: 9 }}>
    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
      aria-label="Why this proposal is turned down"
      placeholder="Why? The climber is shown this (at least 10 characters)"
      style={{ width: "100%", background: C.surface, color: C.text, border: "1px solid " + C.field, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.textSub, marginTop: 6, minHeight: 44, cursor: "pointer" }}>
      <input type="checkbox" checked={mistake} onChange={e => setMistake(e.target.checked)} style={{ width: 18, height: 18 }} />
      Honest mistake: no strike
    </label>
    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
      <button onClick={() => onConfirm(note.trim(), !mistake)} disabled={busy || !ok}
        style={{ flex: 1, padding: 9, background: busy || !ok ? C.surface : C.redBg, color: busy || !ok ? C.textMuted : C.red, border: "1px solid " + (busy || !ok ? C.border : C.red), borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy || !ok ? "default" : "pointer" }}>
        {busy ? "Working…" : mistake ? "Turn down" : "Turn down + strike"}
      </button>
      <button onClick={onCancel} disabled={busy}
        style={{ flex: 1, padding: 9, background: C.surface, color: C.textSub, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}>
        Cancel
      </button>
    </div>
  </div>;
}

/** @param {{ ai?: Record<string, any> | null }} [props] AI verdicts keyed "contribution:<id>"; the Review desk passes them, the Menu does not. */
export function RouteProposalQueue({ ai = null } = {}) {
  const { data: rows, isLoading, error } = useRouteProposals("pending");
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);      // {kind:"ok"|"err", text}
  const [rejecting, setRejecting] = useState(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["route-proposals"] });
    // A new row in `routes` changes area listings and their counts. A downloaded state answers
    // those lists from the device until tonight's file has the row, so read the network from here on.
    preferNetworkReads();
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
      setMsg({ kind: "ok", text: "Approved — " + (v.name || "the climb") + " is now in the catalog (" + newId + ")" });
      refresh();
    } catch (e) {
      // Surfaced verbatim: "area X already holds a route named Y" means a human has to
      // decide whether it is really the same climb, and a generic message hides that.
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "Could not approve that proposal." });
    } finally { setBusyId(null); }
  };

  const doReject = async (id, note, strike) => {
    setBusyId(id); setMsg(null);
    try {
      await rejectNewRoute(id, note, strike);
      setMsg({ kind: "ok", text: strike ? "Turned down, with a strike. The climber is told why." : "Turned down, no strike. The climber is told why." });
      setRejecting(null); refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "Could not reject that proposal." });
    } finally { setBusyId(null); }
  };

  if (isLoading) return <LoadingRows C={C} label="Loading proposals…" style={{padding: "8px 0"}}/>;
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
            {[v.areaName || r.area_id || "no area", v.discipline && discLabel(v.discipline), v.grade].filter(Boolean).join(" · ")}
          </div>

          <Row label="Pitches">{v.pitchCount}</Row>
          <Row label="Height (ft)">{v.length}</Row>
          <Row label="Gain (ft)">{v.gain}</Row>
          <Row label="Distance (mi)">{v.dist}</Row>
          <Row label="Aspect">{v.aspect}</Row>
          <Row label="Season">{v.season}</Row>
          <Row label="Commitment">{v.commit}</Row>
          <Row label="FA">{v.fa}</Row>
          <Row label="Descent">{v.descentText}</Row>
          <Row label="Rappels">{v.rap}</Row>
          <Row label="Comms">{v.comms}</Row>
          <Row label="Style">{Array.isArray(v.style) && v.style.length ? v.style.join(", ") : null}</Row>
          <Row label="Hazards">{Array.isArray(v.haz) && v.haz.length ? v.haz.join(", ") : null}</Row>
          <Row label="Beta">{v.beta}</Row>
          {EXTRA_KEYS.map(function (p) { return <Row key={p[0]} label={p[1]}>{v[p[0]]}</Row>; })}
          {LIST_KEYS.map(function (p) { return <Row key={p[0]} label={p[1]}>{Array.isArray(v[p[0]]) && v[p[0]].length ? v[p[0]].join(p[0] === "proTips" ? " · " : ", ") : null}</Row>; })}
          <Row label="Climbed it">{v.climbed ? "yes" : null}</Row>
          <Row label="Photos">{v.photoCount ? v.photoCount + " offered (not stored)" : null}</Row>
          <Row label="Submitted">{r.created_at ? String(r.created_at).slice(0, 10) : null}</Row>
          <Row label="By">{r.contributor ? String(r.contributor).slice(0, 8) : "anonymous"}</Row>

          {!r.area_id ? <div style={{ fontSize: 11.5, color: C.amber, marginTop: 7, lineHeight: 1.5 }}>
            This proposal names no DB area, so it cannot be filed. Approving it will be refused.
          </div> : null}

          {r.area_id ? <PossibleDuplicates kind="new_route" name={v.name} areaId={r.area_id} waiting={waitingTwins(list, r, true)} /> : null}
          {ai ? <AiNote v={ai["contribution:" + r.id]} /> : null}

          {rejecting === r.id
            ? <RejectBox busy={busy} onConfirm={(n, st) => doReject(r.id, n, st)} onCancel={() => setRejecting(null)} />
            : <div style={{ display: "flex", gap: 12, marginTop: 9 }}>
                <button onClick={() => doApprove(r)} disabled={busy}
                  style={{ flex: 2, padding: 9, background: busy ? C.surface : C.blueSolid, color: busy ? C.textMuted : C.onSolid, border: busy ? "1px solid " + C.border : "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
                  {busy ? "Working…" : "Approve — file this climb"}
                </button>
                <button onClick={() => setRejecting(r.id)} disabled={busy}
                  style={{ flex: 1, padding: 9, background: C.surface, color: C.textSub, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}>
                  Turn down
                </button>
              </div>}
        </div>;
      })}
  </div>;
}

// "Wrong place?" claims on an AREA (0372). A climber says where an area belongs. Nothing on the
// page changes from here: the owner moves the area by hand, then marks the claim moved (approved)
// or not wrong (rejected). resolve_area_placement refuses anything that is not a pending claim.
export function AreaPlacementQueue() {
  const { data: rows, isLoading, error } = useAreaPlacementClaims("pending");
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);      // {kind:"ok"|"err", text}
  const [note, setNote] = useState({});
  // Where each claimed area is filed NOW, so "belongs under X" can be judged from the card.
  const parentIds = [...new Set((rows || []).map(r => r.areas && r.areas.parent_id).filter(Boolean))];
  const parentQ = useAreaNamesByIds(parentIds);
  const parentNames = parentQ.data || {};

  const resolve = async (id, status) => {
    setBusyId(id); setMsg(null);
    try {
      await resolveAreaPlacement(id, status, note[id] || "");
      setMsg({ kind: "ok", text: status === "approved" ? "Marked moved." : "Marked not wrong." });
    } catch (e) {
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "That did not go through." });
    } finally { setBusyId(null); }
  };

  if (isLoading) return <LoadingRows C={C} label="Loading claims…" style={{padding: "8px 0"}}/>;
  if (error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>
    Could not load wrong-place claims — {(error && error.message) || "the request failed"}. This is not a report that there are none.
  </div>;

  const list = rows || [];
  return <div>
    {msg ? <div role={msg.kind === "err" ? "alert" : "status"} style={{ background: msg.kind === "err" ? C.redBg : C.greenBg, color: msg.kind === "err" ? C.red : C.green, border: "1px solid " + (msg.kind === "err" ? C.red : C.greenDim), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>{msg.text}</div> : null}
    {!list.length
      ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>No wrong-place claims are waiting.</div>
      : list.map(function (r) {
        const v = r.value || {};
        const busy = busyId === r.id;
        return <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 9 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{(r.areas && r.areas.name) || r.area_id || "(no area)"}</div>
          <Row label="Filed under">{r.areas && r.areas.parent_id ? parentNames[r.areas.parent_id] || null : null}</Row>
          <Row label="Says it belongs">{v.note}</Row>
          <Row label="In">{v.suggested}</Row>
          <Row label="Submitted">{r.created_at ? String(r.created_at).slice(0, 10) : null}</Row>
          <Row label="By">{r.contributor ? String(r.contributor).slice(0, 8) : "anonymous"}</Row>
          <textarea value={note[r.id] || ""} onChange={e => setNote({ ...note, [r.id]: e.target.value })} rows={2} aria-label="Note kept with this claim (optional)" placeholder="Note kept on the record (optional)"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 8, background: C.surface, color: C.text, border: "1px solid " + C.field, borderRadius: 8, padding: "7px 9px", fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 12, marginTop: 9 }}>
            <button onClick={() => resolve(r.id, "approved")} disabled={busy} style={{ flex: 1, padding: 9, background: busy ? C.surface : C.blueSolid, color: busy ? C.textMuted : C.onSolid, border: busy ? "1px solid " + C.border : "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>Moved it</button>
            <button onClick={() => resolve(r.id, "rejected")} disabled={busy} style={{ flex: 1, padding: 9, background: C.surface, color: C.textSub, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12.5, cursor: busy ? "default" : "pointer" }}>Not wrong</button>
          </div>
        </div>;
      })}
  </div>;
}

// New AREA proposals (0360) — Add an area files a `new_area` row whose area_id is the PARENT.
// approve_new_area writes the areas row; the area triggers refuse a same-named place within
// 1.5 km or a parent that holds climbs, and that refusal is printed here verbatim.
const AREA_KIND = { crag: "Crag, wall or boulder", peak: "Peak", region: "Area" };
/** @param {{ ai?: Record<string, any> | null }} [props] AI verdicts keyed "contribution:<id>"; the Review desk passes them, the Menu does not. */
export function AreaProposalQueue({ ai = null } = {}) {
  const { data: rows, isLoading, error } = useAreaProposals("pending");
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);      // {kind:"ok"|"err", text}
  const [rejecting, setRejecting] = useState(null);

  const doApprove = async (r) => {
    setBusyId(r.id); setMsg(null);
    try {
      const newId = await approveNewArea(r.id);
      setMsg({ kind: "ok", text: "Approved — " + ((r.value || {}).name || "the area") + " is now in the catalog (" + newId + ")" });
    } catch (e) {
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "Could not approve that proposal." });
    } finally { setBusyId(null); }
  };
  const doReject = async (id, note, strike) => {
    setBusyId(id); setMsg(null);
    try {
      await rejectNewRoute(id, note, strike);
      setMsg({ kind: "ok", text: strike ? "Turned down, with a strike. The climber is told why." : "Turned down, no strike. The climber is told why." });
      setRejecting(null);
    } catch (e) {
      setMsg({ kind: "err", text: (e && e.message) ? e.message : "Could not reject that proposal." });
    } finally { setBusyId(null); }
  };

  if (isLoading) return <LoadingRows C={C} label="Loading proposals…" style={{padding: "8px 0"}}/>;
  if (error) return <div role="alert" style={{ fontSize: 12.5, color: C.red, padding: "8px 0" }}>
    Could not load area proposals — {(error && error.message) || "the request failed"}. This is not a report that there are none.
  </div>;

  const list = rows || [];
  return <div>
    {msg ? <div role={msg.kind === "err" ? "alert" : "status"} style={{ background: msg.kind === "err" ? C.redBg : C.greenBg, color: msg.kind === "err" ? C.red : C.green, border: "1px solid " + (msg.kind === "err" ? C.red : C.greenDim), borderRadius: 9, padding: "9px 11px", fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>{msg.text}</div> : null}
    {!list.length
      ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6, padding: "4px 0" }}>No areas are waiting for review.</div>
      : list.map(function (r) {
        const v = r.value || {};
        const busy = busyId === r.id;
        return <div key={r.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "11px 12px", marginBottom: 9 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{v.name || "(no name given)"}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, marginBottom: 6 }}>{[AREA_KIND[v.areaType] || v.areaType, "inside " + (v.parentName || r.area_id || "no area")].filter(Boolean).join(" · ")}</div>
          <Row label="About">{v.description}</Row>
          <Row label="Location">{v.lat != null && v.lng != null ? v.lat + ", " + v.lng : null}</Row>
          <Row label="Submitted">{r.created_at ? String(r.created_at).slice(0, 10) : null}</Row>
          <Row label="By">{r.contributor ? String(r.contributor).slice(0, 8) : "anonymous"}</Row>
          <PossibleDuplicates kind="new_area" name={v.name} areaId={r.area_id} lat={v.lat} lng={v.lng} waiting={waitingTwins(list, r, false)} />
          {ai ? <AiNote v={ai["contribution:" + r.id]} /> : null}
          {rejecting === r.id
            ? <RejectBox busy={busy} onConfirm={(n, st) => doReject(r.id, n, st)} onCancel={() => setRejecting(null)} />
            : <div style={{ display: "flex", gap: 12, marginTop: 9 }}>
                <button onClick={() => doApprove(r)} disabled={busy} style={{ flex: 2, padding: 9, background: busy ? C.surface : C.blueSolid, color: busy ? C.textMuted : C.onSolid, border: busy ? "1px solid " + C.border : "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>{busy ? "Working…" : "Approve — file this area"}</button>
                <button onClick={() => setRejecting(r.id)} disabled={busy} style={{ flex: 1, padding: 9, background: C.surface, color: C.textSub, border: "1px solid " + C.border, borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}>Turn down</button>
              </div>}
        </div>;
      })}
  </div>;
}
