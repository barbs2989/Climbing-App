// MY LISTED AREAS — the screen where a climber lists themselves as an available partner at the areas
// they climb (0300). Lazy, like the other sheets: rendered from App behind React.lazy + Suspense, and
// opened from the Menu's "Listed areas" tile as well as from Partners, Crews and an area page.
//
// One listing per area: the crag types wanted there (empty = any), ONE optional date window
// ("free here Oct 18-19") and a short note. Any area but a peak, world or country — peaks are matched
// by route, and the server refuses one with a readable reason, which this screen relays.
//
// Adding is built for one hand: the search box comes first and already searches the climber's home
// state (theCrag files favourites from the place itself; Mountain Project's partner posts are "area +
// dates"), the areas the climber's own climbs and saved areas sit in are offered as one-tap
// suggestions, and the date window is a preset (This weekend / Next weekend) before it is a picker.
//
// Writes reflect by the list updating (the hooks invalidate every reader), so there is no success
// toast; a refused write toasts the server's reason.
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { USE_DB } from "./supabase";
import { POP_BACK, POP_CLOSE, POP_REMOVE } from "./popupChrome.js";
import { removePartnerArea, savePartnerArea, useAreaCardsByIds, useAreaSearch, useMyHomeStatePaths, useStates } from "./db";
import { discLabel } from "./discLabels.js";
import { ActionIcon, C, CRAG_CATS, DLOCALE, SL, haptic, localYmd } from "../ClimbMatchCore.jsx";

const TYPE_LABEL = { state: "State", region: "Region", range: "Range", canyon: "Canyon", crag: "Crag", wall: "Wall", peak: "Peak" };
const NO_LISTING = new Set(["peak", "world", "country"]);
const fmtDay = (d) => { if (!d) return ""; try { return new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch (e) { return d; } };
export const windowText = (l) => (l && l.freeFrom && l.freeTo) ? (l.freeFrom === l.freeTo ? "Free " + fmtDay(l.freeFrom) : "Free " + fmtDay(l.freeFrom) + "–" + fmtDay(l.freeTo)) : "Any time";
// The coming Saturday–Sunday (today, when today is one of them), and the one after it.
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function weekendFrom(now, weeksOut) { const dow = now.getDay(); const sat = dow === 0 ? addDays(now, -1) : addDays(now, 6 - dow); const s = addDays(sat, 7 * weeksOut); return { freeFrom: localYmd(dow === 0 && !weeksOut ? now : s), freeTo: localYmd(addDays(s, 1)) }; }

export default function MyPartnerAreas({ uid, listings, listingsError, prefill, discoverable, onOpenPrivacy, onClose, notify, homeStateId, suggestIds }) {
  const [draft, setDraft] = useState(null); // {areaId,name,areaType,parentName, disciplines[], freeFrom, freeTo, note, pick}
  const [q, setQ] = useState("");
  const [rootId, setRootId] = useState(homeStateId || "");
  const [busy, setBusy] = useState(false);
  const statesQ = useStates();
  const states = (statesQ.data || []).filter((s) => s && s.id);
  // The climber's home state, so the search box works the moment the screen opens.
  const homePaths = useMyHomeStatePaths();
  const homeId = homeStateId || ((states.find((s) => homePaths.includes(s.path)) || {}).id) || "";
  useEffect(() => { if (!rootId && homeId) setRootId(homeId); }, [homeId]); // eslint-disable-line
  const searchQ = useAreaSearch(USE_DB && rootId ? rootId : null, q, 30);
  const hits = (searchQ.data || []).filter((a) => a && a.id);
  const listed = useMemo(() => new Set((listings || []).map((l) => l.areaId)), [listings]);
  // Suggestions: where the climber's own logged/saved crag climbs and saved areas sit. A wall is too
  // fine a place to find a partner at, so it is offered as its crag.
  const cardsQ = useAreaCardsByIds(USE_DB ? (suggestIds || []).slice(0, 60) : []);
  const suggestions = useMemo(() => {
    const m = cardsQ.data || {}, out = [], seen = new Set();
    for (const id of suggestIds || []) {
      const a = m[id]; if (!a) continue;
      const up = (a.type === "wall" || a.type === "peak") && a.parentId;
      const s = up ? { areaId: a.parentId, name: a.parentName || "", areaType: null, parentName: null } : { areaId: id, name: a.name, areaType: a.type, parentName: a.parentName };
      if (!s.name || seen.has(s.areaId) || listed.has(s.areaId) || NO_LISTING.has(s.areaType)) continue;
      seen.add(s.areaId); out.push(s);
      if (out.length >= 8) break;
    }
    return out;
  }, [cardsQ.data, suggestIds, listed]);
  const pill = (on, disabled) => ({ minHeight: 36, padding: "7px 13px", borderRadius: 20, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: disabled ? C.textMuted : on ? C.blue : C.textSub, fontSize: 13, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 });
  const field = { width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, fontSize: 15 };
  const card = { background: C.card, border: "1px solid " + C.border, borderRadius: 12 };
  const searchRef = useRef(null);
  const now = new Date(), today = localYmd(now);
  const wk1 = weekendFrom(now, 0), wk2 = weekendFrom(now, 1);

  useEffect(() => { if (!prefill || !prefill.areaId) return; const ex = (listings || []).find((l) => l.areaId === prefill.areaId); startEdit(ex || { areaId: prefill.areaId, name: prefill.name, areaType: prefill.areaType, disciplines: prefill.disciplines || [] }); /* eslint-disable-next-line */ }, [prefill && prefill.areaId]);

  function startEdit(l) {
    const ff = l.freeFrom || "", ft = l.freeTo || "";
    const pick = !ff ? "any" : (ff === wk1.freeFrom && ft === wk1.freeTo) ? "wk1" : (ff === wk2.freeFrom && ft === wk2.freeTo) ? "wk2" : "dates";
    setDraft({ areaId: l.areaId, name: l.name, areaType: l.areaType || null, parentName: l.parentName || null, disciplines: (l.disciplines || []).slice(), freeFrom: ff, freeTo: ft, note: l.note || "", pick }); setQ("");
  }
  function toggleDisc(d) { setDraft((x) => { const s = new Set(x.disciplines); if (s.has(d)) s.delete(d); else s.add(d); return { ...x, disciplines: [...s] }; }); }
  function pickWindow(p) { setDraft((x) => p === "any" ? { ...x, pick: p, freeFrom: "", freeTo: "" } : p === "wk1" ? { ...x, pick: p, ...wk1 } : p === "wk2" ? { ...x, pick: p, ...wk2 } : { ...x, pick: p }); }
  async function save() {
    if (!draft || busy) return;
    if ((draft.freeFrom && !draft.freeTo) || (!draft.freeFrom && draft.freeTo)) { notify && notify("Pick both days of the window, or choose Any time"); return; }
    if (draft.freeFrom && draft.freeTo && draft.freeTo < draft.freeFrom) { notify && notify("The window ends before it starts"); return; }
    setBusy(true);
    try { await savePartnerArea(uid, { areaId: draft.areaId, disciplines: draft.disciplines, freeFrom: draft.freeFrom || null, freeTo: draft.freeTo || null, note: draft.note }); haptic && haptic("light"); setDraft(null); }
    catch (e) { notify && notify("Couldn’t list you there — " + ((e && e.message) || "try again")); }
    finally { setBusy(false); }
  }
  async function remove(l) {
    if (busy) return; setBusy(true);
    try { await removePartnerArea(uid, l.areaId); if (draft && draft.areaId === l.areaId) setDraft(null); } catch (e) { notify && notify("Couldn’t remove that listing — " + ((e && e.message) || "try again")); } finally { setBusy(false); }
  }

  const listingsN = (listings || []).length;
  const editing = draft && listed.has(draft.areaId);
  const title = draft ? (editing ? "Edit listing" : "List me here") : "Listed areas";
  const rootName = (states.find((s) => s.id === rootId) || {}).name || "";
  return createPortal(<div onKeyDown={(e) => { if (e.key === "Escape") { if (draft) setDraft(null); else onClose(); } }} tabIndex={-1} role="dialog" aria-label="My listed areas" aria-modal="true" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1200, overflowY: "auto", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ minHeight: "100%" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "calc(env(safe-area-inset-top) + 10px) 16px 10px", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
        {draft ? <button onClick={() => setDraft(null)} style={POP_BACK}>← Back</button> : <button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button>}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
      </div>
      <div style={{ padding: "14px 16px calc(env(safe-area-inset-bottom) + 40px)" }}>
        {discoverable === false ? <div style={{ fontSize: 12.5, color: C.amber, background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 10, padding: "9px 11px", marginBottom: 12, lineHeight: 1.5 }}>You’re off the Partners list, so your areas aren’t shown to anyone. {onOpenPrivacy ? <button onClick={onOpenPrivacy} style={{ background: "none", border: "none", color: C.blue, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12.5 }}>Turn it on in Privacy &amp; safety</button> : "Turn it on in Settings → Privacy & safety."}</div> : null}
        {draft ? <div>
          <div style={{ ...card, padding: "12px 14px", marginBottom: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{draft.name}</div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{[draft.areaType ? (TYPE_LABEL[draft.areaType] || draft.areaType) : "", draft.parentName || ""].filter(Boolean).join(" · ") || "Area"}</div>
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6, lineHeight: 1.5 }}>Climbers who search here, inside it, or across a wider area that contains it will see you.</div>
          <SL>What you climb here</SL>
          <div role="group" aria-label="Crag types" style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
            <button aria-pressed={!draft.disciplines.length} onClick={() => setDraft({ ...draft, disciplines: [] })} style={pill(!draft.disciplines.length)}>Any</button>
            {CRAG_CATS.map((d) => { const on = draft.disciplines.includes(d); return <button key={d} aria-pressed={on} onClick={() => toggleDisc(d)} style={pill(on)}>{discLabel(d)}</button>; })}
          </div>
          <SL>When you’re free here</SL>
          <div role="group" aria-label="When you’re free" style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
            {[["any", "Any time"], ["wk1", "This weekend · " + fmtDay(wk1.freeFrom)], ["wk2", "Next weekend · " + fmtDay(wk2.freeFrom)], ["dates", "Pick dates"]].map(([k, lab]) => <button key={k} aria-pressed={draft.pick === k} onClick={() => pickWindow(k)} style={pill(draft.pick === k)}>{lab}</button>)}
          </div>
          {draft.pick === "dates" ? <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><input type="date" aria-label="Free from" min={today} value={draft.freeFrom} onChange={(e) => setDraft({ ...draft, freeFrom: e.target.value, freeTo: draft.freeTo && draft.freeTo >= e.target.value ? draft.freeTo : e.target.value })} style={{ ...field, flex: 1 }} /><span style={{ color: C.textMuted }}>to</span><input type="date" aria-label="Free until" min={draft.freeFrom || today} value={draft.freeTo} onChange={(e) => setDraft({ ...draft, freeTo: e.target.value })} style={{ ...field, flex: 1 }} /></div> : null}
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{draft.pick === "any" ? "You stay listed until you remove it." : (draft.freeFrom && draft.freeTo ? windowText(draft) + "." : "Pick the first and last day.")}</div>
          <SL>A line for partners (optional)</SL>
          <input value={draft.note} maxLength={140} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="e.g. Looking for a rope gun on weekends" aria-label="Note for partners" style={{ ...field, marginBottom: 4 }} />
          <div style={{ fontSize: 11.5, color: C.textMuted, textAlign: "right", marginBottom: 16 }}>{(draft.note || "").length}/140</div>
          <button onClick={save} disabled={busy} style={{ width: "100%", minHeight: 48, padding: "12px", borderRadius: 12, border: "none", background: C.blueSolid, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{editing ? "Save changes" : "List me at " + draft.name}</button>
          {editing ? <button onClick={() => remove({ areaId: draft.areaId })} disabled={busy} style={{ width: "100%", minHeight: 44, marginTop: 10, padding: "10px", borderRadius: 12, border: "1px solid " + C.border, background: C.surface, color: C.red, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Remove this listing</button> : null}
        </div> : <div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5, marginBottom: 14 }}>List the crags, canyons and ranges you climb. Climbers looking for a partner there will find you, and you’ll see who climbs where you do.</div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={rootId ? "Add an area — search " + (rootName || "a state") : "Pick a state to search"} disabled={!rootId} aria-label="Search for an area to add" style={{ ...field, paddingLeft: 36 }} />
            <span aria-hidden="true" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}><ActionIcon name="search" color={C.textMuted} size={17} /></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Searching in</span>
            <select aria-label="State to search" value={rootId} onChange={(e) => { setRootId(e.target.value); }} style={{ ...field, width: "auto", flex: 1, padding: "7px 10px", fontSize: 13 }}><option value="">Pick a state…</option>{states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          {statesQ.isError ? <div style={{ fontSize: 12, color: C.amber, marginBottom: 8 }}>Couldn’t load the list of states.</div> : null}
          {q.trim() && rootId ? <div style={{ marginBottom: 16 }}>{searchQ.isError ? <div style={{ fontSize: 12, color: C.amber }}>Couldn’t search areas right now.</div> : searchQ.isPending && !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>Searching…</div> : !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>That name didn’t match a crag, canyon or range in {rootName || "this state"} — try another spelling or state.</div> : hits.slice(0, 30).map((a) => { const no = NO_LISTING.has(a.area_type); const already = listed.has(a.id); return <button key={a.id} disabled={no} onClick={() => startEdit(already ? (listings || []).find((l) => l.areaId === a.id) : { areaId: a.id, name: a.name, areaType: a.area_type, parentName: a.parent_name || null, disciplines: [] })} style={{ ...card, display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", minHeight: 52, padding: "9px 12px", color: no ? C.textMuted : C.text, cursor: no ? "default" : "pointer", marginBottom: 6, opacity: no ? 0.6 : 1 }}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span><span style={{ display: "block", fontSize: 12, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[TYPE_LABEL[a.area_type] || a.area_type, a.parent_name, a.route_count ? a.route_count + " climb" + (a.route_count === 1 ? "" : "s") : ""].filter(Boolean).join(" · ")}</span></span><span style={{ fontSize: 12, fontWeight: 800, color: no ? C.textMuted : already ? C.green : C.blue, flexShrink: 0 }}>{no ? "Peak — matched by route" : already ? "Listed ✓" : "+ Add"}</span></button>; })}</div> : null}
          {!q.trim() && suggestions.length ? <div style={{ marginBottom: 16 }}>
            <SL>From your climbs</SL>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{suggestions.map((s) => <button key={s.areaId} onClick={() => startEdit(s)} aria-label={"Add " + s.name} style={pill(false)}>{"+ " + s.name}</button>)}</div>
          </div> : null}
          <SL>{listingsN ? "Listed at " + listingsN + " area" + (listingsN === 1 ? "" : "s") : "Your listings"}</SL>
          {listingsError ? <div style={{ fontSize: 12.5, color: C.amber, marginBottom: 10 }}>Couldn’t load your listed areas — try again in a moment.</div> : null}
          {listingsN ? (listings || []).map((l) => { const past = l.freeTo && l.freeTo < today; return <div key={l.areaId} style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 4px 4px", marginBottom: 8 }}>
            <button onClick={() => startEdit(l)} aria-label={"Edit " + l.name} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: "8px 10px", cursor: "pointer", color: C.text }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{l.name}<span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, marginLeft: 7 }}>{TYPE_LABEL[l.areaType] || ""}</span></span>
              <span style={{ display: "block", fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{(l.disciplines && l.disciplines.length ? l.disciplines.map((d) => discLabel(d)).join(", ") : "Any crag type") + " · "}<span style={{ color: past ? C.amber : C.textSub }}>{past ? "Window ended " + fmtDay(l.freeTo) + " — tap to update" : windowText(l)}</span></span>
              {l.note ? <span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2, fontStyle: "italic" }}>{l.note}</span> : null}
            </button>
            <button onClick={() => remove(l)} aria-label={"Remove " + l.name} style={POP_REMOVE}>✕</button>
          </div>; }) : !listingsError ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, padding: "12px 14px", border: "1px dashed " + C.border, borderRadius: 12 }}>You’re not listed anywhere yet. Search above{suggestions.length ? ", or tap one of the areas from your climbs" : ""}, or use “List me here” on any area page.</div> : null}
        </div>}
      </div>
    </div>
  </div>, document.body);
}
