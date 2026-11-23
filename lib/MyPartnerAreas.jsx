// MY LISTED AREAS — the screen where a climber lists themselves as an available partner at the areas
// they climb (0300). Lazy, like the other sheets: rendered from App behind React.lazy + Suspense, and
// opened from the Menu's "Listed areas" tile as well as from Partners, Crews and an area page.
//
// One listing per area: the crag types wanted there (empty = any), ONE optional date window
// ("free here Oct 18-19") and a short note. Any area but the world or a country (too broad to search),
// and since 0456 a PEAK too (owner 2026-11-18) — what you climb there is picked from the alpine family.
// The server refuses the rest with a readable reason, which this screen relays.
//
// Adding is built for one hand: the search box comes first and searches EVERY area in every state,
// the way the Climbs search does (owner 2026-11-14: "add an area like you would when searching for
// climbs"). It used to search one state, picked from a dropdown under it, so from Washington "smith
// rock" or "red river gorge" said "didn't match" — scripts/oneoff/audit-area-search.mjs measures the
// difference. (theCrag files favourites from the place itself; Mountain Project's partner posts are
// "area + dates".) The areas the climber's own climbs and saved areas sit in are offered as one-tap
// suggestions, and the date window is a preset (This weekend / Next weekend) before it is a picker.
//
// Writes reflect by the list updating (the hooks invalidate every reader), so there is no success
// toast; a refused write toasts the server's reason.
import { tx } from "./tapWords.js";
import { createPortal } from "react-dom";
import { BTN_LG } from "./buttonStyles.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { USE_DB } from "./supabase";
import { POP_BACK, POP_CLOSE, POP_REMOVE } from "./popupChrome.js";
import { removePartnerArea, removeRouteListing, savePartnerArea, useAreaCardsByIds, useAreaChildren, useCatalogAreaSearch } from "./db";
import { discLabel } from "./discLabels.js";
import { C, CRAG_CATS, DLOCALE, SL, haptic, localYmd } from "../ClimbMatchCore.jsx";
import { ALPINE_COND_DISCIPLINES } from "./alpineConditions.js";
import ActionIcon from "../src/components/ActionIcon.tsx";

const TYPE_LABEL = { state: "State", region: "Region", range: "Range", canyon: "Canyon", crag: "Crag", wall: "Wall", peak: "Peak", boulder: "Boulder", sector: "Sector" };
// How many search hits the box shows; `total` says how many matched, so a cut is never silent.
const HIT_LIM = 30;
// A long list of your own listings folds to this many (owner, 2026-11-18): 14 of them put the area finder a screen down.
const LIST_FOLD = 4;
const NO_LISTING = new Set(["world", "country"]);
// What a climber can want at a place: crag types at a crag, the alpine family at a peak (0456 allows both).
const discsFor = (areaType) => areaType === "peak" ? ALPINE_COND_DISCIPLINES : CRAG_CATS;
const fmtDay = (d) => { if (!d) return ""; try { return new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch (e) { return d; } };
export const windowText = (l) => (l && l.freeFrom && l.freeTo) ? (l.freeFrom === l.freeTo ? "Free " + fmtDay(l.freeFrom) : "Free " + fmtDay(l.freeFrom) + "–" + fmtDay(l.freeTo)) : "Any time";
// The coming Saturday–Sunday (today, when today is one of them), and the one after it.
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function weekendFrom(now, weeksOut) { const dow = now.getDay(); const sat = dow === 0 ? addDays(now, -1) : addDays(now, 6 - dow); const s = addDays(sat, 7 * weeksOut); return { freeFrom: localYmd(dow === 0 && !weeksOut ? now : s), freeTo: localYmd(addDays(s, 1)) }; }

// THE AREA FINDER (owner, 2026-11-18: "the hierarchy for finding climbs, but for listing areas"). The Climbs tab's own tree,
// read the same way (useAreaChildren, A to Z): country, state, region, crag. Tapping a row opens what is inside it; the button
// at its right lists you there, at any level below a country. A climber who does not know a crag's spelling can walk to it.
function AreaFinder({ listed, onPick, chain, setChain }) {
  // `chain` (root-first: the areas opened so far) is the SCREEN's state, not this component's: the listing form replaces the list
  // while it is open, and a finder that kept its own place came back at the country level after every listing saved.
  const cur = chain.length ? chain[chain.length - 1] : null;
  // Opening an area from far down a long list (the 40th state) left the page scrolled past its shorter list; bring the heading back.
  const topRef = useRef(null), seen = useRef(cur ? cur.id : "");
  useEffect(() => { const k = cur ? cur.id : ""; if (seen.current === k) return; seen.current = k; if (topRef.current && topRef.current.scrollIntoView) topRef.current.scrollIntoView({ block: "start" }); }, [cur]);
  const kq = useAreaChildren(cur ? cur.id : null, { enabled: USE_DB });
  const kids = (Array.isArray(kq.data) ? kq.data : []).filter((a) => a && a.id && a.name);
  const crumb = { background: "none", border: "none", padding: "6px 2px", minHeight: 32, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left", overflowWrap: "anywhere" };
  const listBtn = (a, parent, wide) => { const on = listed.has(a.id); return <button type="button" onClick={() => onPick(a, parent)} aria-label={(on ? "Edit your listing at " : "List me at ") + a.name} style={{ flexShrink: 0, minHeight: wide ? 44 : 40, width: wide ? "100%" : undefined, padding: "8px 12px", borderRadius: 9, border: "1px solid " + (on ? C.green : C.blueDim), background: on ? C.surface : C.blueBg, color: on ? C.green : C.onSolid, fontSize: 12.5, fontWeight: 800, cursor: "pointer", overflowWrap: "anywhere" }}>{wide ? (on ? "Listed at " + a.name + " ✓ — edit" : "List me at " + a.name) : (on ? "Listed ✓" : "+ List")}</button>; };
  return <div ref={topRef} style={{ marginBottom: 16, scrollMarginTop: 70 }}>
    <SL>Browse areas</SL>
    {cur ? <div role="group" aria-label="Where you are in the areas" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginBottom: 6 }}>
      <button type="button" onClick={() => setChain([])} style={crumb}>All areas</button>
      {chain.map((a, i) => <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}><span aria-hidden="true" style={{ color: C.textMuted, fontSize: 13 }}>›</span>{i === chain.length - 1 ? <span style={{ fontSize: 13, fontWeight: 800, color: C.text, overflowWrap: "anywhere" }}>{a.name}</span> : <button type="button" onClick={() => setChain(chain.slice(0, i + 1))} style={crumb}>{a.name}</button>}</span>)}
    </div> : null}
    {cur && !NO_LISTING.has(cur.area_type) ? <div style={{ marginBottom: 8 }}>{listBtn(cur, chain.length > 1 ? chain[chain.length - 2] : null, true)}</div> : null}
    {kq.isError ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>{"Couldn’t load " + (cur ? "what’s inside " + cur.name : "the areas") + " — try again in a moment."}</div>
      : kq.isPending ? <div style={{ fontSize: 12.5, color: C.textMuted }}>Loading areas…</div>
      : !kids.length ? (cur ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>{"No smaller areas inside " + cur.name + "."}</div> : null)
      : kids.map((a) => { const no = NO_LISTING.has(a.area_type); return <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "4px 8px 4px 4px", marginBottom: 6 }}>
        <button type="button" onClick={() => setChain(chain.concat([{ id: a.id, name: a.name, area_type: a.area_type }]))} aria-label={"Open " + a.name} style={{ /* flexGrow, not flex:1: lib/wideLayout.js shrinks a lone flex:1 button to its text on the website, and a country row has no + List beside it */ flexGrow: 1, flexBasis: 0, minWidth: 0, minHeight: 44, display: "flex", alignItems: "center", gap: 8, textAlign: "left", background: "none", border: "none", padding: "6px 8px", cursor: "pointer", color: C.text }}>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{a.name}</span><span style={{ display: "block", fontSize: 12, color: C.textMuted }}>{[TYPE_LABEL[a.area_type] || "", a.route_count ? Number(a.route_count).toLocaleString() + " climb" + (a.route_count === 1 ? "" : "s") : ""].filter(Boolean).join(" · ")}</span></span>
          <span aria-hidden="true" style={{ color: C.textMuted, fontSize: 18, flexShrink: 0 }}>›</span>
        </button>
        {no ? null : listBtn(a, cur, false)}
      </div>; })}
  </div>;
}

export default function MyPartnerAreas({ uid, listings, listingsError, prefill, discoverable, onOpenPrivacy, onClose, notify, suggestIds, routeListings, routeListingsError }) {
  /* OPENED ON ONE LISTING (a chip under Partners › My areas, review 2026-11-18): Back, Escape and Save return to Partners, where you came from. They used to drop you on the full Listed areas list, one more screen to leave. */
  const direct = !!(prefill && prefill.areaId);
  const leaveDraft = () => { if (direct) onClose(); else setDraft(null); };
  const [draft, setDraft] = useState(null); // {areaId,name,areaType,parentName, disciplines[], freeFrom, freeTo, note, pick}
  const [q, setQ] = useState("");
  const [allListings, setAllListings] = useState(false); // more than LIST_FOLD + 1 listings: the first LIST_FOLD until "Show all N" is opened
  const [finderChain, setFinderChain] = useState([]); // where the area finder is; kept here so it survives the listing form
  const [busy, setBusy] = useState(false);
  // The whole catalog, every state: the same search (and spelling rules) as Add a climb's area picker.
  const searchQ = useCatalogAreaSearch(USE_DB ? q : "", HIT_LIM);
  const hits = ((searchQ.data && searchQ.data.rows) || []).filter((a) => a && a.id);
  const hitTotal = (searchQ.data && searchQ.data.total) || 0;
  const qOk = q.trim().length >= 2;
  const listed = useMemo(() => new Set((listings || []).map((l) => l.areaId)), [listings]);
  // Suggestions: where the climber's own logged/saved crag climbs and saved areas sit. A wall is too
  // fine a place to find a partner at, so it is offered as its crag; a peak is offered as itself (0456).
  const cardsQ = useAreaCardsByIds(USE_DB ? (suggestIds || []).slice(0, 60) : []);
  const suggestions = useMemo(() => {
    const m = cardsQ.data || {}, out = [], seen = new Set();
    for (const id of suggestIds || []) {
      const a = m[id]; if (!a) continue;
      const up = a.type === "wall" && a.parentId;
      const s = up ? { areaId: a.parentId, name: a.parentName || "", areaType: null, parentName: null } : { areaId: id, name: a.name, areaType: a.type, parentName: a.parentName };
      if (!s.name || seen.has(s.areaId) || listed.has(s.areaId) || NO_LISTING.has(s.areaType)) continue;
      seen.add(s.areaId); out.push(s);
      if (out.length >= 8) break;
    }
    return out;
  }, [cardsQ.data, suggestIds, listed]);
  const pill = (on, disabled) => ({ minHeight: 36, padding: "7px 13px", borderRadius: 20, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: disabled ? C.textMuted : on ? "#fff" : C.textSub, fontSize: 13, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 });
  const field = { width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, fontSize: 15 };
  const card = { background: C.card, border: "1px solid " + C.border, borderRadius: 12 };
  const searchRef = useRef(null);
  const now = new Date(), today = localYmd(now);
  const wk1 = weekendFrom(now, 0), wk2 = weekendFrom(now, 1);

  useEffect(() => { if (!prefill || !prefill.areaId) return; const ex = (listings || []).find((l) => l.areaId === prefill.areaId); startEdit(ex || { areaId: prefill.areaId, name: prefill.name, areaType: prefill.areaType, disciplines: prefill.disciplines || [] }); }, [prefill && prefill.areaId]); // eslint-disable-line react-hooks/exhaustive-deps -- re-run only when the prefilled AREA changes

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
    try { await savePartnerArea(uid, { areaId: draft.areaId, disciplines: draft.disciplines, freeFrom: draft.freeFrom || null, freeTo: draft.freeTo || null, note: draft.note }); haptic && haptic("light");
      // Opened FOR this place (List me at <crag> on a route or area page): back to that page, not on into the
      // whole Listed areas list, which left the climber a screen away from the climb they came from (owner walk,
      // 2026-11-18). Opened from the Menu, it still returns to the list.
      if (prefill && prefill.areaId && prefill.areaId === draft.areaId) { const nm = draft.name || "this area", ed = listed.has(draft.areaId); setDraft(null); onClose(); notify && notify(ed ? "Listing updated" : "You’re listed " + (["crag", "wall", "boulder", "sector", "peak"].includes(draft.areaType) ? "at " : "in ") + nm); return; }
      setDraft(null); }
    catch (e) { notify && notify("Couldn’t list you there — " + ((e && e.message) || "try again")); }
    finally { setBusy(false); }
  }
  async function remove(l) {
    if (busy) return; setBusy(true);
    try { await removePartnerArea(uid, l.areaId);
      // Opened ON this listing (a chip under Join a crew or Partners): removing it goes back where you came from, as Back and
      // Save do (audit 2026-11-19). It used to drop you on the whole Listed areas list, one more screen to leave.
      if (direct && prefill.areaId === l.areaId) { setDraft(null); onClose(); notify && notify("Listing removed"); return; }
      if (draft && draft.areaId === l.areaId) setDraft(null); } catch (e) { notify && notify("Couldn’t remove that listing — " + ((e && e.message) || "try again")); } finally { setBusy(false); }
  }

  // CLIMBS YOU'RE LISTED ON (0489): a route listing is made on the route's own Find tab; this is the one place
  // that shows them all, so one can be taken down without finding the route again.
  async function removeRoute(l) {
    if (busy) return; setBusy(true);
    try { await removeRouteListing(uid, l.routeId); } catch (e) { notify && notify("Couldn’t remove that listing — " + ((e && e.message) || "try again")); } finally { setBusy(false); }
  }
  const listingsN = (listings || []).length;
  const foldable = listingsN > LIST_FOLD + 1, folded = foldable && !allListings; // 5 listings show whole: a row that reveals one row is not worth a tap
  const hiddenPast = folded ? (listings || []).slice(LIST_FOLD).filter((l) => l.freeTo && l.freeTo < today).length : 0; // an ended window is flagged on its card; say so when the card is folded away
  const editing = draft && listed.has(draft.areaId);
  const title = draft ? (editing ? "Edit listing" : "List me here") : "Listed areas";
  return createPortal(<div onKeyDown={(e) => { if (e.key === "Escape") { if (draft) leaveDraft(); else onClose(); } }} tabIndex={-1} role="dialog" aria-label="My listed areas" aria-modal="true" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1200, overflowY: "auto", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ minHeight: "100%" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "calc(env(safe-area-inset-top) + 10px) 16px 10px", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
        {draft ? <button onClick={leaveDraft} style={POP_BACK}>← Back</button> : <button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button>}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, minWidth: 0, overflowWrap: "anywhere" }}>{title}</div>
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
          <div role="group" aria-label={draft.areaType === "peak" ? "Disciplines" : "Crag types"} style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6 }}>
            <button aria-pressed={!draft.disciplines.length} onClick={() => setDraft({ ...draft, disciplines: [] })} style={pill(!draft.disciplines.length)}>Any</button>
            {discsFor(draft.areaType).map((d) => { const on = draft.disciplines.includes(d); return <button key={d} aria-pressed={on} onClick={() => toggleDisc(d)} style={pill(on)}>{discLabel(d)}</button>; })}
          </div>
          <SL>When you’re free here</SL>
          <div role="group" aria-label="When you’re free" style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
            {[["any", "Any time"], ["wk1", "This weekend · " + fmtDay(wk1.freeFrom)], ["wk2", "Next weekend · " + fmtDay(wk2.freeFrom)], ["dates", "Pick dates"]].map(([k, lab]) => <button key={k} aria-pressed={draft.pick === k} onClick={() => pickWindow(k)} style={pill(draft.pick === k)}>{lab}</button>)}
          </div>
          {draft.pick === "dates" ? <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 12, color: C.textMuted }}>From</span><input type="date" aria-label="Free from" min={today} value={draft.freeFrom} onChange={(e) => setDraft({ ...draft, freeFrom: e.target.value, freeTo: draft.freeTo && draft.freeTo >= e.target.value ? draft.freeTo : e.target.value })} style={{ ...field, flex: 1 }} /><span style={{ color: C.textMuted }}>to</span><input type="date" aria-label="Free until" min={draft.freeFrom || today} value={draft.freeTo} onChange={(e) => setDraft({ ...draft, freeTo: e.target.value })} style={{ ...field, flex: 1 }} /></div> : null}
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>{draft.pick === "any" ? "You stay listed until you remove it." : (draft.freeFrom && draft.freeTo ? windowText(draft) + "." : "Pick the first and last day.")}</div>
          <SL>A line for partners (optional)</SL>
          <input value={draft.note} maxLength={140} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="e.g. Looking for a rope gun on weekends" aria-label="Note for partners" style={{ ...field, marginBottom: 4 }} />
          <div style={{ fontSize: 11.5, color: C.textMuted, textAlign: "right", marginBottom: 16 }}>{(draft.note || "").length}/140</div>
          <button onClick={save} disabled={busy} style={{ ...BTN_LG, width: "100%", minHeight: 48, border: "none", background: C.blueSolid, color:C.onSolid, opacity: busy ? 0.6 : 1 }}>{editing ? "Save changes" : "List me at " + draft.name}</button>
          {/* Apart from Save (owner, 2026-11-18: "too close together"): 10px under the save button put a thumb aimed at Save on the one tap that deletes the listing. A rule and 28px either side of it now. */}
          {editing ? <div aria-hidden="true" style={{ height: 1, background: C.border, margin: "28px 0" }} /> : null}
          {editing ? <button onClick={() => remove({ areaId: draft.areaId })} disabled={busy} style={{ width: "100%", minHeight: 44, padding: "10px", borderRadius: 12, border: "1px solid " + C.border, background: C.surface, color: C.red, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Remove this listing</button> : null}
        </div> : <div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5, marginBottom: 14 }}>List the crags, canyons and ranges you climb. Climbers looking for a partner there will find you, and you’ll see who climbs where you do.</div>
          <SL>Add an area</SL>
          {/* A box that reads as the way in (owner, 2026-11-18): it was the page's own colour with a hairline edge, under a paragraph and with no heading, and a typed name could only be deleted a letter at a time. */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input ref={searchRef} type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any crag, peak or area" aria-label="Search for an area to add" style={{ ...field, minHeight: 50, fontSize: 16, fontWeight: 600, paddingLeft: 42, paddingRight: q ? 40 : 12, background: C.surface, border: "1.5px solid " + C.blueDim, borderRadius: 12 }} />
            <span aria-hidden="true" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}><ActionIcon name="search" color={C.blue} size={20} /></span>
            {q ? <button type="button" onClick={() => { setQ(""); if (searchRef.current) searchRef.current.focus(); }} aria-label="Clear search" style={Object.assign({}, POP_REMOVE, { position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)" })}>✕</button> : null}
          </div>
          {q.trim() ? <div style={{ marginBottom: 16 }}>{!qOk ? <div style={{ fontSize: 12, color: C.textMuted }}>Keep typing — at least two letters.</div> : searchQ.isError ? <div style={{ fontSize: 12, color: C.amber }}>Couldn’t search areas right now.</div> : searchQ.isPending && !hits.length ? <div style={{ fontSize: 12, color: C.textMuted }}>Searching…</div> : !hits.length ? <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Nothing in the catalog is named “{q.trim()}”. Try part of the name (“smith” finds Smith Rock), or the full name instead of a nickname.</div> : <>{searchQ.data && searchQ.data.fuzzy ? <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{"No exact match for “" + q.trim() + "” — closest names:"}</div> : null}{hits.map((a) => { const no = NO_LISTING.has(a.area_type); const already = listed.has(a.id); return <button key={a.id} disabled={no} onClick={() => startEdit(already ? (listings || []).find((l) => l.areaId === a.id) : { areaId: a.id, name: a.name, areaType: a.area_type, parentName: (a.trail && a.trail.length ? a.trail[a.trail.length - 1] : null), disciplines: [] })} style={{ ...card, display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", minHeight: 52, padding: "9px 12px", color: no ? C.textMuted : C.text, cursor: no ? "default" : "pointer", marginBottom: 6, opacity: no ? 0.6 : 1 }}><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{a.name}</span><span style={{ display: "block", fontSize: 12, color: C.textMuted, overflowWrap: "anywhere" }}>{[TYPE_LABEL[a.area_type] || a.area_type, (a.trail || []).slice(-2).join(" › "), a.route_count ? a.route_count + " climb" + (a.route_count === 1 ? "" : "s") : ""].filter(Boolean).join(" · ")}</span></span><span style={{ fontSize: 12, fontWeight: 800, color: no ? C.textMuted : already ? C.green : C.blue, flexShrink: 0 }}>{no ? "Too broad to list" : already ? "Listed ✓" : "+ Add"}</span></button>; })}{hitTotal > hits.length ? <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{"Showing " + hits.length + " of " + hitTotal + " matches, closest names first — type more of the name to narrow."}</div> : null}</>}</div> : null}
          {/* YOUR LISTINGS COME FIRST (owner, 2026-11-18): what you came to see or change sits right under the search box; the suggestions and the open-ended area finder follow it, so a long state list never pushes your own listings off the screen. */}
          <SL>{listingsN ? "Listed at " + listingsN + " area" + (listingsN === 1 ? "" : "s") : "Your listings"}</SL>
          {listingsError ? <div style={{ fontSize: 12.5, color: C.amber, marginBottom: 10 }}>Couldn’t load your listed areas — try again in a moment.</div> : null}
          {listingsN ? (listings || []).slice(0, folded ? LIST_FOLD : listingsN).map((l) => { const past = l.freeTo && l.freeTo < today; return <div key={l.areaId} style={{ ...card, display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 4px 4px", marginBottom: 8 }}>
            <button onClick={() => startEdit(l)} aria-label={"Edit " + l.name} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: "8px 10px", cursor: "pointer", color: C.text }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{l.name}<span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, marginLeft: 7 }}>{TYPE_LABEL[l.areaType] || ""}</span></span>
              <span style={{ display: "block", fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{(l.disciplines && l.disciplines.length ? l.disciplines.map((d) => discLabel(d)).join(", ") : l.areaType === "peak" ? "Any discipline" : "Any crag type") + " · "}<span style={{ color: past ? C.amber : C.textSub }}>{past ? "Window ended " + fmtDay(l.freeTo) + tx(" — tap to update") : windowText(l)}</span></span>
              {l.note ? <span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2, fontStyle: "italic" }}>{l.note}</span> : null}
            </button>
            <button onClick={() => remove(l)} aria-label={"Remove " + l.name} style={POP_REMOVE}>✕</button>
          </div>; }) : !listingsError ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, padding: "12px 14px", border: "1px dashed " + C.border, borderRadius: 12 }}>You’re not listed anywhere yet. Search above or browse below{suggestions.length ? tx(", or tap one of the areas from your climbs") : ""}, or use “List me here” on any area page.</div> : null}
          {foldable ? <button type="button" aria-expanded={!folded} onClick={() => setAllListings(folded)} style={{ width: "100%", minHeight: 44, padding: "10px 12px", borderRadius: 12, border: "1px solid " + C.border, background: C.surface, color: C.blue, fontSize: 13.5, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>{folded ? "Show all " + listingsN + (hiddenPast ? " · " + hiddenPast + " window" + (hiddenPast === 1 ? "" : "s") + " ended" : "") : "Show fewer"}</button> : null}
          {routeListingsError ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5, padding: "10px 2px 0" }}>Couldn’t load the climbs you’re listed on — check your connection and try again.</div> : (routeListings || []).length ? <div style={{ marginTop: 14 }}>
            <SL>{"Climbs you’re listed on · " + routeListings.length}</SL>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>Climbers who open one of these can find you on its Find tab. Change the dates or note there.</div>
            {routeListings.map((l) => <div key={l.routeId} style={{ ...card, display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 4px", marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0, padding: "8px 10px" }}>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{l.name}{l.grade ? <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, marginLeft: 7 }}>{l.grade}</span> : null}</span>
                <span style={{ display: "block", fontSize: 12.5, color: C.textSub, marginTop: 2 }}>{l.freeTo && l.freeTo < today ? "Dates ended " + fmtDay(l.freeTo) : windowText(l)}</span>
                {l.note ? <span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2, fontStyle: "italic", overflowWrap: "anywhere" }}>{l.note}</span> : null}
              </div>
              <button onClick={() => removeRoute(l)} aria-label={"Remove your listing on " + l.name} style={POP_REMOVE}>✕</button>
            </div>)}
          </div> : null}
          <div aria-hidden="true" style={{ height: 10 }} />
          {!q.trim() && suggestions.length ? <div style={{ marginBottom: 16 }}>
            <SL>From your climbs</SL>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{suggestions.map((s) => <button key={s.areaId} onClick={() => startEdit(s)} aria-label={"Add " + s.name} style={pill(false)}>{"+ " + s.name}</button>)}</div>
          </div> : null}
          {!q.trim() && USE_DB ? <AreaFinder listed={listed} chain={finderChain} setChain={setFinderChain} onPick={(a, parent) => startEdit(listed.has(a.id) ? (listings || []).find((l) => l.areaId === a.id) : { areaId: a.id, name: a.name, areaType: a.area_type, parentName: parent ? parent.name : null, disciplines: [] })} /> : null}
        </div>}
      </div>
    </div>
  </div>, document.body);
}
