// START A CREW AT AN AREA — a crag SESSION (0302): "Hellgate on Saturday, sport, three of us". Lazy, like
// the other sheets; rendered from App behind React.lazy + Suspense when `startCrew` holds a payload.
//
// A crew has ONE place, a route or an area. The route half already has its entry points (a saved
// climb in the Crews tab's picker, a friend's shared objective, the invite dialog); this sheet is the
// area half: the area page's "Start a crew here", the Crews tab's "At an area…", a past crew's "…or an
// area". It collects what the database demands of an area crew (the area and the session's discipline)
// and what a session needs to be joinable (a day, a size), then hands `formCrew` a place.
import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { USE_DB } from "./supabase";
import { POP_CLOSE } from "./popupChrome.js";
import { useAreaSearch, useStates } from "./db";
import { discLabel } from "./discLabels.js";
import { Av, C, CRAG_CATS, MOUNTAINS, SL, crewMax, pubName } from "../ClimbMatchCore.jsx";

const AREA_TYPE_LABEL = { state: "State", region: "Region", range: "Range", canyon: "Canyon", crag: "Crag", wall: "Wall", peak: "Peak" };
const NO_CREW_TYPES = new Set(["peak", "world", "country", "state"]);
const CRAG_SET = new Set(CRAG_CATS);

export default function StartCrewSheet({ payload, uid, onClose, onStart, notify }) {
  const p = payload || {};
  const [area, setArea] = useState(p.area && p.area.id ? { id: p.area.id, name: p.area.name || p.area.id, areaType: p.area.areaType || p.area.area_type || null, disciplines: p.area.disciplines || [], parentName: p.area.parentName || null } : null);
  const firstDisc = (a) => { const d = (a && a.disciplines || []).find((x) => CRAG_SET.has(x)); return d || (p.disc && CRAG_SET.has(p.disc) ? p.disc : ""); };
  const [disc, setDisc] = useState(firstDisc(area));
  const [date, setDate] = useState(p.date || "");
  const [cap, setCap] = useState(() => crewMax({ discipline: firstDisc(area) || "sport" }));
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [rootId, setRootId] = useState(p.homeStateId || "");
  const statesQ = useStates();
  const states = (statesQ.data || []).filter((s) => s && s.id);
  const searchQ = useAreaSearch(USE_DB && rootId && !area ? rootId : null, q, 30);
  const hits = (searchQ.data || []).filter((a) => a && a.id);
  // The demo's own areas, so the sheet works signed out on the seed path too.
  const seedHits = useMemo(() => !USE_DB && q.trim() ? MOUNTAINS.filter((m) => !NO_CREW_TYPES.has(m.areaType) && (m.name || "").toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12).map((m) => ({ id: m.id, name: m.name, area_type: m.areaType, parent_name: (MOUNTAINS.find((x) => x.id === m.parentId) || {}).name })) : [], [q]);
  const partners = Array.isArray(p.partners) ? p.partners : [];
  const chip = (on, disabled) => ({ padding: "6px 11px", borderRadius: 20, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: disabled ? C.textMuted : on ? C.blue : C.textSub, fontSize: 12.5, fontWeight: 700, cursor: disabled ? "default" : "pointer" });
  const field = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, fontSize: 14 };
  const pick = (a) => { const next = { id: a.id, name: a.name, areaType: a.area_type || null, disciplines: a.disciplines || [], parentName: a.parent_name || null }; setArea(next); const d = firstDisc(next); if (d) { setDisc(d); setCap(crewMax({ discipline: d })); } setQ(""); };
  const pickDisc = (d) => { setDisc(d); setCap(crewMax({ discipline: d })); };
  const canStart = !!(area && area.id && disc);
  const start = () => {
    if (!canStart) { notify && notify(!area ? "Pick an area first" : "Pick what the session is — sport, trad, bouldering…"); return; }
    onStart && onStart({ kind: "area", id: area.id, disc, name: area.name }, partners, { date: date || null, note: note.trim(), cap: Math.max(2, Math.min(12, Number(cap) || 4)) });
  };
  return createPortal(<div onClick={onClose} role="dialog" aria-label="Start a crew" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1200, overflowY: "auto", overscrollBehavior: "contain", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "12px 8px" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 440, border: "1px solid " + C.border, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid " + C.border }}><div style={{ color: C.text, fontSize: 17, fontWeight: 700, borderLeft: "3px solid " + C.blue, paddingLeft: 9 }}>{area ? "Start a crew at " + area.name : "Start a crew at an area"}</div><button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button></div>
      <div style={{ padding: "12px 14px", maxHeight: "76vh", overflowY: "auto", overscrollBehavior: "contain" }}>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 12, lineHeight: 1.5 }}>A crag session: the crag, canyon or range you’re meeting at, what you’re climbing, and a day. Climbers browsing Join a crew for that area will find it.</div>
        <SL>Where</SL>
        {area ? <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.blueBg, border: "1px solid " + C.blueDim, borderRadius: 10, padding: "9px 11px", marginBottom: 12 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, color: C.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{area.name}</div><div style={{ fontSize: 12, color: C.textSub }}>{(AREA_TYPE_LABEL[area.areaType] || "Area") + (area.parentName ? " · " + area.parentName : "")}</div></div><button onClick={() => { setArea(null); setDisc(""); }} style={{ background: C.surface, border: "1px solid " + C.border, color: C.textSub, borderRadius: 8, padding: "8px 11px", fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}>Change</button></div>
        : <div style={{ marginBottom: 12 }}>
          {USE_DB ? <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><select aria-label="State" value={rootId} onChange={(e) => setRootId(e.target.value)} style={{ ...field, flex: "0 0 44%" }}><option value="">State…</option>{states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rootId ? "Crag, canyon or range" : "Pick a state first"} disabled={!rootId} aria-label="Search for an area" style={{ ...field, flex: 1 }} /></div>
            : <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Crag, canyon or range" aria-label="Search for an area" style={{ ...field, marginBottom: 8 }} />}
          {q.trim() ? (USE_DB ? (searchQ.isError ? <div style={{ fontSize: 12, color: C.amber }}>Couldn’t search areas right now.</div> : searchQ.isPending && !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>Searching…</div> : !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>That name didn’t match a crag, canyon or range here — try another spelling.</div> : null) : (!seedHits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>That name didn’t match a crag, canyon or range here.</div> : null)) : null}
          {(USE_DB ? hits : seedHits).map((a) => { const no = NO_CREW_TYPES.has(a.area_type); return <button key={a.id} disabled={no} onClick={() => pick(a)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, color: no ? C.textMuted : C.text, cursor: no ? "default" : "pointer", marginBottom: 6, opacity: no ? 0.6 : 1 }}><span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}{a.parent_name ? <span style={{ fontWeight: 500, color: C.textMuted }}>{" · " + a.parent_name}</span> : null}</span><span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>{no ? (a.area_type === "peak" ? "Peak — crews form on its routes" : "Too broad") : (AREA_TYPE_LABEL[a.area_type] || a.area_type)}</span></button>; })}
        </div>}
        <SL>What you’re climbing</SL>
        <div role="group" aria-label="Session type" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>{CRAG_CATS.map((d) => <button key={d} aria-pressed={disc === d} onClick={() => pickDisc(d)} style={chip(disc === d)}>{discLabel(d)}</button>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div><SL>Day (optional)</SL><input type="date" aria-label="Session day" value={date} onChange={(e) => setDate(e.target.value)} style={field} /></div>
          <div><SL>Crew size</SL><input type="number" min={2} max={12} aria-label="Crew size" value={cap} onChange={(e) => setCap(e.target.value)} style={field} /></div>
        </div>
        <SL>A line for the crew (optional)</SL>
        <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Swapping burns on the 5.11s, two spots" aria-label="Note for the crew" style={{ ...field, marginBottom: 12 }} />
        {partners.length ? <div style={{ marginBottom: 12 }}><SL>Inviting</SL><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{partners.map((c) => <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "4px 10px 4px 4px", fontSize: 12.5, color: C.text }}><Av src={c.avatar} size={22} />{pubName(c)}</span>)}</div></div> : null}
        <button onClick={start} disabled={!canStart} style={{ width: "100%", padding: "12px", borderRadius: 11, background: canStart ? C.blueSolid : C.surface, color: canStart ? "#fff" : C.textMuted, fontSize: 14, fontWeight: 800, cursor: canStart ? "pointer" : "default", border: canStart ? "none" : "1px solid " + C.border }}>{partners.length ? "Start the crew and invite" : "Start the crew"}</button>
        {!uid ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.5 }}>Signed out, the crew is kept on this device only — sign in to let others find it.</div> : null}
      </div>
    </div>
  </div>, document.body);
}
