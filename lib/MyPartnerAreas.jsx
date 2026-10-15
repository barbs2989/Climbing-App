// MY LISTED AREAS — the sheet where a climber lists themselves as an available partner at the areas
// they climb (0300). Lazy, like the other sheets: rendered from App behind React.lazy + Suspense.
//
// One listing per area: the crag types wanted there (empty = any), ONE optional date window
// ("free here Oct 18-19") and a short note. Any area but a peak, world or country — peaks are matched
// by route, and the server refuses one with a readable reason, which this sheet relays.
//
// Writes reflect by the list updating (the hooks invalidate every reader), so there is no success
// toast; a refused write toasts the server's reason.
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { USE_DB } from "./supabase";
import { POP_CLOSE, POP_REMOVE } from "./popupChrome.js";
import { removePartnerArea, savePartnerArea, useAreaSearch, useStates } from "./db";
import { discLabel } from "./discLabels.js";
import { C, CRAG_CATS, DLOCALE, SL, haptic } from "../ClimbMatchCore.jsx";

const TYPE_LABEL = { state: "State", region: "Region", range: "Range", canyon: "Canyon", crag: "Crag", wall: "Wall", peak: "Peak" };
const NO_LISTING = new Set(["peak", "world", "country"]);
const fmtDay = (d) => { if (!d) return ""; try { return new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch (e) { return d; } };
export const windowText = (l) => (l && l.freeFrom && l.freeTo) ? (l.freeFrom === l.freeTo ? "Free " + fmtDay(l.freeFrom) : "Free " + fmtDay(l.freeFrom) + "–" + fmtDay(l.freeTo)) : "Any time";

export default function MyPartnerAreas({ uid, listings, listingsError, prefill, discoverable, onOpenPrivacy, onClose, notify, homeStateId }) {
  const [draft, setDraft] = useState(null); // {areaId,name,areaType,parentName, disciplines[], freeFrom, freeTo, note}
  const [q, setQ] = useState("");
  const [rootId, setRootId] = useState(homeStateId || "");
  const [busy, setBusy] = useState(false);
  const statesQ = useStates();
  const states = (statesQ.data || []).filter((s) => s && s.id);
  const searchQ = useAreaSearch(USE_DB && rootId ? rootId : null, q, 30);
  const hits = (searchQ.data || []).filter((a) => a && a.id);
  const listed = useMemo(() => new Set((listings || []).map((l) => l.areaId)), [listings]);
  const chip = (on, disabled) => ({ padding: "6px 11px", borderRadius: 20, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: disabled ? C.textMuted : on ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 });
  const field = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, fontSize: 14 };

  useEffect(() => { if (!prefill || !prefill.areaId) return; const ex = (listings || []).find((l) => l.areaId === prefill.areaId); startEdit(ex || { areaId: prefill.areaId, name: prefill.name, areaType: prefill.areaType, disciplines: prefill.disciplines || [] }); /* eslint-disable-next-line */ }, [prefill && prefill.areaId]);
  useEffect(() => { if (!rootId && states.length && homeStateId) setRootId(homeStateId); }, [states.length, homeStateId]);

  function startEdit(l) { setDraft({ areaId: l.areaId, name: l.name, areaType: l.areaType || null, parentName: l.parentName || null, disciplines: (l.disciplines || []).slice(), freeFrom: l.freeFrom || "", freeTo: l.freeTo || "", note: l.note || "" }); setQ(""); }
  function toggleDisc(d) { setDraft((x) => { const s = new Set(x.disciplines); if (s.has(d)) s.delete(d); else s.add(d); return { ...x, disciplines: [...s] }; }); }
  async function save() {
    if (!draft || busy) return;
    if ((draft.freeFrom && !draft.freeTo) || (!draft.freeFrom && draft.freeTo)) { notify && notify("Pick both days of the window, or clear it for any time"); return; }
    if (draft.freeFrom && draft.freeTo && draft.freeTo < draft.freeFrom) { notify && notify("The window ends before it starts"); return; }
    setBusy(true);
    try { await savePartnerArea(uid, { areaId: draft.areaId, disciplines: draft.disciplines, freeFrom: draft.freeFrom || null, freeTo: draft.freeTo || null, note: draft.note }); haptic && haptic("light"); setDraft(null); }
    catch (e) { notify && notify("Couldn’t list you there — " + ((e && e.message) || "try again")); }
    finally { setBusy(false); }
  }
  async function remove(l) {
    if (busy) return; setBusy(true);
    try { await removePartnerArea(uid, l.areaId); } catch (e) { notify && notify("Couldn’t remove that listing — " + ((e && e.message) || "try again")); } finally { setBusy(false); }
  }

  const listingsN = (listings || []).length;
  return createPortal(<div onClick={onClose} role="dialog" aria-label="My listed areas" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1200, overflowY: "auto", overscrollBehavior: "contain", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12px 8px" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 440, border: "1px solid " + C.border, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid " + C.border }}><div style={{ color: C.text, fontSize: 17, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{draft ? (listed.has(draft.areaId) ? "Edit listing" : "List me at " + draft.name) : "My listed areas"}</div><button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button></div>
      <div style={{ padding: "12px 14px", maxHeight: "76vh", overflowY: "auto", overscrollBehavior: "contain" }}>
        {discoverable === false ? <div style={{ fontSize: 12.5, color: C.amber, background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 10, padding: "9px 11px", marginBottom: 12, lineHeight: 1.5 }}>You’re off the Partners list, so your areas aren’t shown to anyone. {onOpenPrivacy ? <button onClick={onOpenPrivacy} style={{ background: "none", border: "none", color: C.blue, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12.5 }}>Turn it on in Privacy &amp; safety</button> : "Turn it on in Settings → Privacy & safety."}</div> : null}
        {draft ? <div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{(draft.areaType ? (TYPE_LABEL[draft.areaType] || draft.areaType) + (draft.parentName ? " · " + draft.parentName : "") : "")}{" — climbers who search here, inside it, or across a wider area that contains it will see you."}</div>
          <SL>What you climb here</SL>
          <div role="group" aria-label="Crag types" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{CRAG_CATS.map((d) => { const on = draft.disciplines.includes(d); return <button key={d} aria-pressed={on} onClick={() => toggleDisc(d)} style={chip(on)}>{discLabel(d)}</button>; })}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: -6, marginBottom: 12 }}>{draft.disciplines.length ? "" : "None picked = any of these."}</div>
          <SL>When you’re free here</SL>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><input type="date" aria-label="Free from" value={draft.freeFrom} onChange={(e) => setDraft({ ...draft, freeFrom: e.target.value })} style={{ ...field, flex: 1 }} /><span style={{ color: C.textMuted }}>to</span><input type="date" aria-label="Free until" value={draft.freeTo} onChange={(e) => setDraft({ ...draft, freeTo: e.target.value })} style={{ ...field, flex: 1 }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 11.5, color: C.textMuted }}>Leave both blank for “any time”.</span>{(draft.freeFrom || draft.freeTo) ? <button onClick={() => setDraft({ ...draft, freeFrom: "", freeTo: "" })} style={{ background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Any time</button> : null}</div>
          <SL>A line for partners (optional)</SL>
          <input value={draft.note} maxLength={140} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="e.g. Looking for a rope gun on weekends" aria-label="Note for partners" style={{ ...field, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 8 }}><button onClick={() => setDraft(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Back</button><button onClick={save} disabled={busy} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: C.blueSolid, color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{listed.has(draft.areaId) ? "Save changes" : "List me here"}</button></div>
        </div> : <div>
          {listingsError ? <div style={{ fontSize: 12.5, color: C.amber, marginBottom: 10 }}>Couldn’t load your listed areas — try again in a moment.</div> : null}
          {listingsN ? <div style={{ marginBottom: 14 }}>{(listings || []).map((l) => <div key={l.areaId} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{l.name}<span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, marginLeft: 7 }}>{TYPE_LABEL[l.areaType] || ""}</span></div><div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{(l.disciplines && l.disciplines.length ? l.disciplines.map((d) => discLabel(d)).join(", ") : "Any crag type") + " · " + windowText(l)}</div>{l.note ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, fontStyle: "italic" }}>{l.note}</div> : null}<button onClick={() => startEdit(l)} style={{ marginTop: 6, background: "none", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}>Edit</button></div>
            <button onClick={() => remove(l)} aria-label={"Remove " + l.name} style={POP_REMOVE}>✕</button>
          </div>)}</div> : !listingsError ? <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>You’re not listed anywhere yet. List the crags, canyons or ranges you climb and climbers who search there can find you.</div> : null}
          <SL>Add an area</SL>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select aria-label="State" value={rootId} onChange={(e) => { setRootId(e.target.value); }} style={{ ...field, flex: "0 0 44%" }}><option value="">State…</option>{states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rootId ? "Crag, canyon or range" : "Pick a state first"} disabled={!rootId} aria-label="Search for an area" style={{ ...field, flex: 1 }} />
          </div>
          {statesQ.isError ? <div style={{ fontSize: 12, color: C.amber, marginBottom: 8 }}>Couldn’t load the list of states.</div> : null}
          {q.trim() && rootId ? (searchQ.isError ? <div style={{ fontSize: 12, color: C.amber }}>Couldn’t search areas right now.</div> : searchQ.isPending && !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>Searching…</div> : !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>That name didn’t match a crag, canyon or range here — try another spelling.</div> : <div style={{ maxHeight: 240, overflowY: "auto", overscrollBehavior: "contain" }}>{hits.slice(0, 30).map((a) => { const no = NO_LISTING.has(a.area_type); const already = listed.has(a.id); return <button key={a.id} disabled={no} onClick={() => startEdit(already ? (listings || []).find((l) => l.areaId === a.id) : { areaId: a.id, name: a.name, areaType: a.area_type, parentName: a.parent_name || null, disciplines: [] })} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: no ? C.textMuted : C.text, cursor: no ? "default" : "pointer", marginBottom: 6, opacity: no ? 0.6 : 1 }}><span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}{a.parent_name ? <span style={{ fontWeight: 500, color: C.textMuted }}>{" · " + a.parent_name}</span> : null}</span><span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>{no ? "Peak — matched by route" : already ? "Listed ✓" : (TYPE_LABEL[a.area_type] || a.area_type)}</span></button>; })}</div>) : null}
        </div>}
      </div>
    </div>
  </div>, document.body);
}
