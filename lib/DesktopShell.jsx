import { useEffect, useRef, useState } from "react";
import { C, CAT, CLIMBERS, ROUTES, catOf, gradeLabel, routeLocText, shortDate, daysUntil, pubName } from "../ClimbMatchCore.jsx";
import Av from "../src/components/Av.tsx";
import DiscIcon from "../src/components/DiscIcon.tsx";
import ActionIcon from "../src/components/ActionIcon.tsx";
import { discLabel } from "./discLabels";
import { usePlaceSearch, useProfilesByIds, useRouteSearch, useStates } from "./db.js";
import { USE_DB } from "./supabase";
import Chevron from "../src/components/Chevron.tsx";

/* THE WEBSITE'S OWN PIECES (lib/wideLayout.js). Everything here renders only at 1024px and up — the
   phone app never mounts it — except WideSearch, which the phone's Climbs tab also mounts INLINE
   (owner 2026-11-04). The top bar's search, the right rail's widgets and the site footer. */

const SECTION = { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.textMuted };
const CARD = { background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 14px 12px" };
const ROW = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "none", borderRadius: 10, background: "transparent", color: C.text, cursor: "pointer", textAlign: "left" };

/* The browser tab names the page ("Coleman-Deming – ClimbMatch"), as a website's tabs do. */
export function DocTitle({ title }) {
  useEffect(() => { if (typeof document !== "undefined") document.title = title; }, [title]);
  return null;
}

/* LOGBOOK AS A SPREADSHEET (desktop website, owner-approved 2026-10-21): every logged climb as one
   CSV row, for a climber's own records. Dates stay ISO (YYYY-MM-DD) so a spreadsheet sorts them;
   the route's name, place and grade are resolved the way My Ascents resolves them. */
const csvCell = v => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s; };
export function downloadLogbookCsv(logs, routeById) {
  const head = ["Date", "Climb", "Where", "Grade", "Discipline", "Style", "Stars", "Partners", "Notes"];
  const rows = (logs || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).map(l => {
    const r = routeById ? routeById(l.routeId) : null;
    const partners = (l.partners && l.partners.length ? l.partners : []).concat(l.typedPartners || []);
    return [l.date || "", r ? r.name : "", r ? routeLocText(r) : "", r ? gradeLabel(r) : "", r ? discLabel(catOf(r)) : "", l.tickType || "", l.stars || "", partners.join("; "), l.text || ""];
  });
  const csv = [head].concat(rows).map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "climbmatch-logbook-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const editable = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/* TOP-BAR SEARCH. One box for every climb and place in the catalog: the same two searches the
   pickers use (useRouteSearch, usePlaceSearch), shown as a drop-down under the box the way a
   website's header search works. "/" jumps to it from anywhere that is not already a text field.
   A failed search says so; it never reads as "nothing matches". */
/* CENTRED in the window (owner 2026-11-04), as a website's header search is: placed on the same 50vw
   midline the shell is centred on, out of the row's flow, so Menu + logo on the left and the icons on
   the right do not push it off centre. `width` is App's: it shrinks the box before it could reach
   either side (the row's ends need ~270px each). */
/* `inline` (owner 2026-11-04, from the competitor review: KAYA, Gaia and Komoot all open on a search
   box): the same search drawn in the page's flow — the phone Climbs tab puts it under its title, the
   way those apps lead with search — with its results running down the page instead of a drop-down.
   `onNearMe` opens the Climbs map at the climber's position. */
/* RECENT SEARCHES (Gaia, AllTrails): the last five things typed here, on THIS DEVICE only (localStorage,
   never the database), offered when the box is focused and empty. A tap refills the box with the words,
   so there is nothing to refetch and nothing to go stale. */
const RECENT_KEY = "cm_recent_search";
const readRecent = () => { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); return Array.isArray(v) ? v.filter(s => typeof s === "string").slice(0, 5) : []; } catch (_e) { return []; } };
export function WideSearch({ onOpenRoute, onOpenArea, width, inline, onNearMe }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [recent, setRecent] = useState(readRecent);
  const box = useRef(null), input = useRef(null);
  const qq = q.trim();
  const remember = term => { const next = [term].concat(recent.filter(s => s.toLowerCase() !== term.toLowerCase())).slice(0, 5); setRecent(next); try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (_e) { /* private mode: the list is for this visit only */ } };
  const forget = () => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch (_e) { /* nothing stored */ } };
  const routesQ = useRouteSearch(USE_DB ? qq : "", 6);
  const placesQ = usePlaceSearch(USE_DB ? qq : "", 4);
  useEffect(() => {
    const key = e => {
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !editable(e.target);
      if (slash && !document.querySelector('[aria-modal="true"]') && input.current) { e.preventDefault(); input.current.focus(); }
    };
    const away = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", key); document.addEventListener("mousedown", away);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", away); };
  }, []);
  useEffect(() => { setHi(0); }, [qq]);
  const seedHits = !USE_DB && qq ? ROUTES.filter(r => r.name.toLowerCase().includes(qq.toLowerCase())).slice(0, 6) : [];
  const places = USE_DB ? ((placesQ.data && placesQ.data.rows) || []) : [];
  const routes = USE_DB ? (routesQ.data || []) : seedHits;
  const hits = places.map(a => ({ kind: "place", a })).concat(routes.map(r => ({ kind: "route", r })));
  const failed = USE_DB && (routesQ.isError || placesQ.isError) && !hits.length;
  const busy = USE_DB && (routesQ.isLoading || placesQ.isLoading) && !hits.length;
  const pick = h => { if (qq) remember(qq); setOpen(false); setQ(""); if (input.current) input.current.blur(); if (h.kind === "place") onOpenArea(h.a); else onOpenRoute(h.r); };
  const onKey = e => {
    if (e.key === "Escape") { setOpen(false); e.currentTarget.blur(); }
    else if (hits.length && e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi(i => (i + 1) % hits.length); }
    else if (hits.length && e.key === "ArrowUp") { e.preventDefault(); setHi(i => (i - 1 + hits.length) % hits.length); }
    else if (hits.length && e.key === "Enter") { e.preventDefault(); pick(hits[Math.min(hi, hits.length - 1)]); }
  };
  const row = (h, i) => {
    const on = i === hi;
    const name = h.kind === "place" ? h.a.name : h.r.name;
    /* A climb row carries ITS discipline's glyph and colours its grade the same way (the competitor
       review, 2026-11-04: every climb drew one mountain glyph, so a V7 boulder, a 5.4 trad route and
       an AI3 ice route looked alike before anyone read them). Places keep the pin. */
    const disc = h.kind === "route" ? (h.r.discipline || catOf(h.r) || "") : "";
    const discColor = (CAT[disc] || {}).color || C.textMuted;
    const where = h.kind === "place" ? [h.a.where, h.a.route_count ? h.a.route_count + (h.a.route_count === 1 ? " climb" : " climbs") : ""].filter(Boolean).join(" · ") : (h.r._dbArea && h.r._dbArea.name) || "";
    const grade = h.kind === "route" ? h.r.grade : "";
    return <button key={h.kind + (h.kind === "place" ? h.a.id : h.r.id)} id={"wide-search-" + i} role="option" aria-selected={on} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHi(i)} onClick={() => pick(h)} style={{ ...ROW, background: on ? C.card : "transparent" }}>{h.kind === "place" ? <ActionIcon name="pin" size={17} color={C.textMuted}/> : <DiscIcon d={disc} size={17}/>}<span style={{ minWidth: 0, flex: 1 }}><span style={{ display: "block", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{name}</span>{grade || where ? <span style={{ display: "block", fontSize: 12, color: C.textMuted, overflowWrap: "anywhere" }}>{grade ? <span style={{ color: discColor, fontWeight: 700 }}>{grade}</span> : null}{grade && where ? " · " : ""}{where}</span> : null}</span></button>;
  };
  const showList = open && !!qq;
  // The EMPTY box, focused: recent words and Near me (nothing when there is neither).
  const showEmpty = open && !qq && (recent.length > 0 || !!onNearMe);
  /* Placed by `left`, not transform:translateX(-50%) — a transform can land the box on a half pixel,
     and text there renders soft on a Windows screen. Inline, it is a block in the page's flow. */
  const w = width || "460px";
  const wrap = inline ? { position: "relative", width: "100%" } : { position: "absolute", top: 12, left: "calc(50vw - (" + w + ") / 2)", width: w };
  // Inline, the list runs DOWN THE PAGE (as DbSearchSplit's does): no inner scroll, no drop-down.
  const panel = inline ? { marginTop: 6, background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 6 }
    : { position: "absolute", top: 46, left: 0, right: 0, background: C.surface, border: "1px solid " + C.border, borderRadius: 14, boxShadow: "0 18px 50px rgba(0,0,0,0.55)", padding: 6, maxHeight: "min(70vh, 520px)", overflowY: "auto", overscrollBehavior: "contain", zIndex: 2 };
  const plain = { ...ROW, minHeight: 44 };
  return <div ref={box} style={wrap}>
    <span aria-hidden="true" style={{ position: "absolute", left: 12, top: 0, height: inline ? 44 : 40, display: "flex", alignItems: "center", pointerEvents: "none" }}><ActionIcon name="search" size={18} color={C.textMuted}/></span>
    <input ref={input} value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKey} aria-label="Search climbs and places" role="combobox" aria-expanded={showList || showEmpty} aria-controls="wide-search-list" aria-activedescendant={showList && hits.length ? "wide-search-" + Math.min(hi, hits.length - 1) : undefined} aria-autocomplete="list" placeholder="Search climbs & crags" style={{ width: "100%", height: inline ? 44 : 40, boxSizing: "border-box", padding: "0 38px 0 38px", borderRadius: inline ? 12 : 20, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: inline ? 15 : 14.5, outline: "none" }}/>
    {!q && !inline ? <kbd aria-hidden="true" title="Press / to search" style={{ position: "absolute", right: 12, top: 10, fontSize: 11.5, fontFamily: "inherit", color: C.textMuted, border: "1px solid " + C.border, borderRadius: 5, padding: "1px 6px", pointerEvents: "none" }}>/</kbd> : null}
    {showList ? <div id="wide-search-list" role="listbox" aria-label="Search results" style={panel}>
      {failed ? <div role="alert" style={{ padding: "12px 10px", fontSize: 13, color: C.amber }}>Search isn’t reachable right now — check your connection and try again.</div>
        : busy ? <div style={{ padding: "12px 10px", fontSize: 13, color: C.textMuted }}>Searching…</div>
        : !hits.length ? <div style={{ padding: "12px 10px", fontSize: 13, color: C.textMuted }}>{"No climbs or places match “" + qq + "”."}</div>
        : <>{places.length ? <div style={{ ...SECTION, padding: "6px 10px 4px" }}>Places</div> : null}{hits.slice(0, places.length).map((h, i) => row(h, i))}{routes.length ? <div style={{ ...SECTION, padding: "8px 10px 4px" }}>Climbs</div> : null}{hits.slice(places.length).map((h, i) => row(h, i + places.length))}</>}
    </div> : showEmpty ? <div id="wide-search-list" role="listbox" aria-label="Search shortcuts" style={panel}>
      {onNearMe ? <button role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => { setOpen(false); if (input.current) input.current.blur(); onNearMe(); }} style={plain}><ActionIcon name="pin" size={17} color={C.blue}/><span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>Near me</span><span style={{ fontSize: 12, color: C.textMuted }}>climbs around your position, on the map</span></button> : null}
      {recent.length ? <><div style={{ ...SECTION, padding: "8px 10px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Recent</span><button onMouseDown={e => e.preventDefault()} onClick={forget} style={{ border: "none", background: "transparent", color: C.textMuted, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: "4px 0", textTransform: "none", letterSpacing: 0 }}>Clear</button></div>
        {recent.map(s => <button key={s} role="option" aria-selected={false} onMouseDown={e => e.preventDefault()} onClick={() => { setQ(s); setOpen(true); if (input.current) input.current.focus(); }} style={plain}><ActionIcon name="search" size={16} color={C.textMuted}/><span style={{ fontSize: 14, fontWeight: 600, overflowWrap: "anywhere" }}>{s}</span></button>)}</> : null}
    </div> : null}
  </div>;
}

/* RIGHT RAIL. Widgets drawn from what App already holds — the next agreed crew days and unread alerts
   (collapsed until clicked).
   Best day to climb is NOT here (owner, 2026-10-21): it opens from the Menu's tile. Ads, when they
   come, take slots in this column (desktop only). */
/* CHATS IN THE RAIL (desktop website, owner-approved 2026-10-21): your crews' chats and your direct
   messages, newest first, always in reach the way Facebook's contacts column is. The same threads
   the inbox shows — `shows(id)` is App's own test for a direct thread (blocked and restricted
   people stay out) — and a real account is named the way it chose (pubName), read the way the
   inbox reads it. */
function RailChats({ chats, onOpenDm, onOpenCrew }) {
  const { msgs, crews, crewMsgs, crewUnread, dmUnread, shows, placeOf } = chats;
  const dmIds = Object.keys(msgs || {}).filter(id => (msgs[id] || []).length > 0 && shows(id));
  const realIds = dmIds.filter(id => !/^\d+$/.test(id));
  const profQ = useProfilesByIds(realIds);
  const last = arr => (arr && arr.length ? arr[arr.length - 1] : null);
  const rows = [];
  dmIds.forEach(id => {
    const c = /^\d+$/.test(id) ? CLIMBERS.find(x => x.id === +id) : (profQ.data || []).find(p => p.id === id);
    const m = last(msgs[id]);
    if (c) rows.push({ key: "dm" + id, name: pubName(c), avatar: c.avatar, unread: Number((dmUnread || {})[id]) || 0, ts: (m && m.ts) || 0, open: () => onOpenDm(c) });
  });
  (crews || []).forEach(cr => {
    const p = placeOf(cr);
    const m = last((crewMsgs || {})[cr.id]);
    rows.push({ key: "cr" + cr.id, name: (p && p.kind !== "missing" && p.name) || "Crew", crew: true, unread: Number((crewUnread || {})[cr.id]) || 0, ts: (m && m.ts) || 0, open: () => onOpenCrew(cr) });
  });
  rows.sort((a, b) => b.ts - a.ts);
  const shown = rows.slice(0, 8);
  return <section aria-labelledby="rail-chats" style={CARD}>
    <div id="rail-chats" style={{ ...SECTION, marginBottom: 6 }}>Chats</div>
    {shown.length ? shown.map(r => <button key={r.key} onClick={r.open} aria-label={(r.crew ? r.name + " crew chat" : "Chat with " + r.name) + (r.unread ? ", " + r.unread + " unread" : "")} style={ROW}>
      {r.crew ? <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 12, background: C.card, border: "1px solid " + C.border, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ActionIcon name="crews" size={15} color={C.textSub} /></span> : <Av src={r.avatar} size={28} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: r.unread ? 800 : 600, overflowWrap: "anywhere" }}>{r.name}</span>
      {r.unread ? <span aria-hidden="true" style={{ minWidth: 18, height: 18, borderRadius: 9, background: C.redSolid, color:C.onSolid, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px", boxSizing: "border-box" }}>{r.unread}</span> : null}
    </button>) : <div style={{ fontSize: 13, color: C.textMuted, padding: "2px 2px 4px" }}>No conversations yet.</div>}
  </section>;
}

export function WideRail({ upcoming, alerts, waiting, guest, onSignIn, onOpenCal, onOpenAlerts, onFindPartners, chats, onOpenDm, onOpenCrewChat }) {
  const unread = alerts.filter(n => !n.read);
  /* ONE ALERTS LIST (owner, 2026-10-23, #2734): this card shows what Home's Alerts button shows —
     `waiting` (requests, invites, unread chats, a day or a climb to confirm; amber, first) and then
     the notifications not already one of those — and counts both. It counted unread notifications
     alone, so on a desktop Home the button said "Alerts · 3 new" beside a card saying "Alerts". */
  const newN = waiting.length + unread.length;
  /* Alerts start OPEN, showing the newest THREE (owner, 2026-11-04 — replaces 2026-10-23's "start
     closed"): closed, the card was a bare "ALERTS ›" header on every page, which read as empty. The
     header still folds it away. */
  const [alertsOpen, setAlertsOpen] = useState(true);
  const SHOW = 3;
  const waitShown = waiting.slice(0, SHOW);
  const unreadShown = unread.slice(0, Math.max(0, SHOW - waitShown.length));
  const moreN = waiting.length + unread.length - waitShown.length - unreadShown.length;
  return <aside aria-label="Highlights" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <section aria-labelledby="rail-upcoming" style={CARD}>
      <div id="rail-upcoming" style={{ ...SECTION, marginBottom: 6 }}>Coming up</div>
      {upcoming.length ? upcoming.slice(0, 3).map(x => {
        const n = daysUntil(x.date);
        return <button key={x.crew.id} onClick={onOpenCal} style={ROW}><span style={{ width: 44, flexShrink: 0, fontSize: 12, fontWeight: 800, color: n <= 3 ? C.teal : C.textSub }}>{n === 0 ? "Today" : n === 1 ? "Tmrw" : shortDate(x.date)}</span><span style={{ minWidth: 0, fontSize: 13.5, fontWeight: 700, overflowWrap: "anywhere" }}>{x.route.name}</span></button>;
      }) : <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.45, padding: "2px 2px 4px" }}>No crew days agreed yet.<button onClick={onFindPartners} style={{ display: "block", marginTop: 8, padding: 0, border: "none", background: "transparent", color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Find partners ›</button></div>}
    </section>
    <section aria-labelledby="rail-alerts" style={CARD}>
      <button id="rail-alerts" onClick={() => setAlertsOpen(o => !o)} aria-expanded={alertsOpen} style={{minHeight:44, ...SECTION, width: "100%", display: "flex", alignItems: "center", gap: 8, padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>{newN ? <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 4, background: waiting.length ? C.amber : C.blue, flexShrink: 0 }}/> : null}<span style={{ flex: 1 }}>{newN ? "Alerts · " + newN + " new" : "Alerts"}</span><span aria-hidden="true" style={{ display: "flex" }}><Chevron open={alertsOpen} size={14} color={C.blue} /></span></button>
      {!alertsOpen ? null : <div style={{ marginTop: 6 }}>{guest ? <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.45, padding: "2px 2px 4px" }}>Sign in to get alerts.<button onClick={onSignIn} style={{ display: "block", marginTop: 8, padding: 0, border: "none", background: "transparent", color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sign in ›</button></div> : null}
      {waitShown.map((u, i) => <button key={"w" + i} onClick={u.go} style={{ ...ROW, alignItems: "flex-start" }}><span aria-hidden="true" style={{ display: "flex", marginTop: 1, flexShrink: 0 }}><ActionIcon name={u.icon} size={15} color={C.amber} /></span><span style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 700, color: C.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{u.text}</span></button>)}
      {guest ? null : unreadShown.length ? unreadShown.map(n => <button key={n.id} onClick={onOpenAlerts} style={{ ...ROW, alignItems: "flex-start" }}><span aria-hidden="true" style={{ width: 7, height: 7, marginTop: 6, borderRadius: 4, background: C.blue, flexShrink: 0 }}/><span style={{ fontSize: 13, lineHeight: 1.4, color: C.text, overflowWrap: "anywhere" }}>{n.text}</span></button>) : waiting.length ? null : <div style={{ fontSize: 13, color: C.textMuted, padding: "2px 2px 4px" }}>You’re all caught up.</div>}
      {alerts.length || moreN > 0 ? <button onClick={onOpenAlerts} style={{ marginTop: 4, padding: "4px 10px", border: "none", background: "transparent", color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{moreN > 0 ? "See all alerts · " + moreN + " more ›" : "See all alerts ›"}</button> : null}</div>}
    </section>
    {chats ? <RailChats chats={chats} onOpenDm={onOpenDm} onOpenCrew={onOpenCrewChat} /> : null}
  </aside>;
}

/* SITE FOOTER. A directory of every state the catalog holds, then the site's own links, the way
   Mountain Project ends every page. The states list is a DB read: a failure says so. */
/* `showStates` (owner 2026-11-04): the state directory is a way into the CATALOG, so it ends the
   Climbs tab and its route and area pages only; Home, Crews, Logbook… end on the short footer. */
export function WideFooter({ onOpenState, links, legal, showStates }) {
  const statesQ = useStates(); // read always (hooks order); drawn only where showStates says
  const states = ((statesQ.data || []).filter(s => Number(s.route_count) > 0)).slice().sort((a, b) => a.name.localeCompare(b.name));
  const link = { padding: "4px 0", minHeight: 24, border: "none", background: "transparent", color: C.textSub, fontSize: 13, cursor: "pointer", textAlign: "left" };
  const col = (title, items) => <div style={{ minWidth: 0 }}><div style={{ ...SECTION, marginBottom: 8 }}>{title}</div><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>{items.map(([label, go]) => <button key={label} onClick={go} style={link}>{label}</button>)}</div></div>;
  return <footer style={{ borderTop: "1px solid " + C.border, marginTop: 28, padding: "24px 4px 40px", color: C.textSub }}>
    {USE_DB && showStates ? <div style={{ marginBottom: 22 }}><div style={{ ...SECTION, marginBottom: 8 }}>Explore climbs by state</div>
      {statesQ.isError ? <div style={{ fontSize: 13, color: C.amber }}>The list of states couldn’t load right now.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", columnGap: 16 }}>{states.map(s => <button key={s.id} onClick={() => onOpenState(s)} style={link}>{s.name}</button>)}</div>}
    </div> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, maxWidth: 480 }}>{col("ClimbMatch", links)}{col("Legal", legal)}</div>
    <div style={{ marginTop: 22, fontSize: 12, color: C.textMuted }}>{"© " + new Date().getFullYear() + " ClimbMatch"}</div>
  </footer>;
}
