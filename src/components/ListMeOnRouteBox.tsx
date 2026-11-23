import { useEffect, useState } from "react";
import { addRouteListing, removeRouteListing, saveRouteListing } from "../../lib/db";
import { CARD, EYEBROW } from "../../lib/cardStyles.js";
import { DLOCALE, localYmd } from "../../ClimbMatchCore.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

/** One of the climber's own route listings (0489), as `useMyRouteListings` hands it back. */
export interface MyRouteListing { routeId: string; name?: string; grade?: string | null; freeFrom?: string | null; freeTo?: string | null; note?: string | null }
export interface ListMeOnRouteBoxProps {
  routeId: string;
  /** "route", "climb", "hike": the noun the page uses for this route. */
  noun: string;
  C: typeof Palette;
  /** The signed-in climber's id. */
  uid: string;
  /** The climber's own route listings, to know whether they are listed here. */
  myListings?: MyRouteListing[] | null;
  /** The read of those listings failed: the box must not say "not listed" as a fact. */
  listingsError?: boolean;
  /** The read has not answered yet: the box says neither "listed" nor "not listed", and offers no button. */
  listingsLoading?: boolean;
  /** profiles.discoverable; false means no partner search shows this climber at all. Undefined = not read. */
  discoverable?: boolean;
  onOpenPrivacy?: (() => void) | null;
  notify?: (msg: string) => void;
}

const fmtDay = (d: string) => { try { return new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", day: "numeric" }); } catch { return d; } };
/** "Free Nov 28–30", or "" for a listing with no window. */
export const routeListingWindow = (l: { freeFrom?: string | null; freeTo?: string | null } | null | undefined) => (l && l.freeFrom && l.freeTo) ? (l.freeFrom === l.freeTo ? "Free " + fmtDay(l.freeFrom) : "Free " + fmtDay(l.freeFrom) + "–" + fmtDay(l.freeTo)) : "";

/* LIST ME FOR THIS ROUTE (owner, 2026-11-23: "you should be able to list yourself as a partner under the
   partners tab for all routes"). A crag route already had "List me at <crag>" (partner_areas); every other
   route had nothing, and a climber appeared on its page only by saving it as an objective. This box is the
   route-level listing (route_partner_listings, 0489): one tap lists you, and once listed you can say when
   you are free and add a line. Same shape and optimism as ListMeInAreaBox; the write is the truth. */
export default function ListMeOnRouteBox({ routeId, noun, C, uid, myListings, listingsError, listingsLoading, discoverable, onOpenPrivacy, notify }: ListMeOnRouteBoxProps) {
  const [busy, setBusy] = useState(false);
  const [optListed, setOptListed] = useState<boolean | null>(null);
  const [editing, setEditing] = useState(false);
  const mine = (myListings || []).find((l) => l && l.routeId === routeId) || null;
  const serverListed = !!mine;
  useEffect(() => { setOptListed(null); }, [serverListed, routeId]);
  const listed = optListed == null ? serverListed : optListed;
  const [note, setNote] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const openEditor = () => { setNote((mine && mine.note) || ""); setFrom((mine && mine.freeFrom) || ""); setTo((mine && mine.freeTo) || ""); setEditing(true); };
  const today = localYmd(new Date());
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setOptListed(!listed);
    try {
      if (listed) { await removeRouteListing(uid, routeId); setEditing(false); }
      else await addRouteListing(uid, routeId);
    } catch (e: unknown) {
      setOptListed(null);
      if (notify) notify((listed ? "Couldn’t remove your listing — " : "Couldn’t list you here — ") + ((e && (e as Error).message) || "try again"));
    } finally { setBusy(false); }
  };
  const saveDetails = async () => {
    if (busy) return;
    if ((from && !to) || (!from && to)) { if (notify) notify("Pick both days, or clear them to stay listed any time"); return; }
    if (from && to && to < from) { if (notify) notify("The last day is before the first"); return; }
    setBusy(true);
    try { await saveRouteListing(uid, { routeId, freeFrom: from || null, freeTo: to || null, note: note.trim() || null }); setEditing(false); }
    catch (e: unknown) { if (notify) notify("Couldn’t save your listing — " + ((e && (e as Error).message) || "try again")); }
    finally { setBusy(false); }
  };
  if (listingsError && optListed == null) return <div role="status" style={{ ...CARD(C, C.amber), marginBottom: 12, fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load whether you’re listed for this {noun} — check your connection and try again.</div>;
  /* NOT KNOWN YET IS NOT "NOT LISTED" (review, 2026-11-23): while the read was in flight the box offered List me to a climber who was already listed. */
  if (listingsLoading && optListed == null && !mine) return <div role="status" style={{ ...CARD(C), marginBottom: 12, fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>Checking your listing…</div>;
  /* DATES THAT HAVE PASSED are not "free": the search hands other climbers no window for them, so this box must not print one either. */
  const ended = !!(mine && mine.freeTo && mine.freeTo < today);
  const win = ended ? "" : routeListingWindow(mine);
  const field = { width: "100%", boxSizing: "border-box" as const, minHeight: 44, padding: "9px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.bg, color: C.text, fontFamily: "inherit", fontSize: 13.5 };
  return (
    <div role="region" aria-label={"List yourself as a partner for this " + noun} style={{ ...CARD(C, listed ? C.green : C.blueDim), marginBottom: 12 }}>
      <div style={EYEBROW(listed ? C.green : C.blue)}>Your listing</div>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: C.text, marginBottom: 4, overflowWrap: "anywhere" }}>{listed ? "You’re listed for this " + noun + " ✓" : "Looking for a partner for this " + noun + "?"}</div>
      <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginBottom: 10, overflowWrap: "anywhere" }}>{listed ? ((discoverable === false ? "Your listing for this " + noun + " is saved." : "Climbers who open this " + noun + " can find you and start a crew with you.") + (win ? " " + win + "." : "") + (ended && mine && mine.freeTo ? " Your dates ended " + fmtDay(mine.freeTo) + "." : "") + (mine && mine.note ? " “" + mine.note + "”" : "")) : "List yourself here so climbers looking at this " + noun + " can find you and start a crew with you."}</div>
      {listed && discoverable === false ? <div style={{ fontSize: 12.5, color: C.amber, background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 10, padding: "9px 11px", marginBottom: 10, lineHeight: 1.5 }}>You’re off the Partners list, so this listing isn’t shown to anyone. {onOpenPrivacy ? <button type="button" onClick={onOpenPrivacy} style={{ background: "none", border: "none", color: C.blue, fontWeight: 800, cursor: "pointer", padding: "8px 0", fontSize: 12.5, fontFamily: "inherit" }}>Turn it on in Privacy</button> : null}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={toggle} disabled={busy} aria-pressed={listed} style={{ flex: listed ? "0 0 auto" : "1 1 auto", minHeight: 44, padding: "0 16px", borderRadius: 10, border: listed ? "1px solid " + C.border : "none", background: listed ? C.surface : C.blueSolid, color: listed ? C.textSub : C.onSolid, fontSize: 13.5, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{listed ? "Remove listing" : "List me for this " + noun}</button>
        {listed && serverListed && !editing ? <button type="button" onClick={openEditor} style={{ flex: "1 1 auto", minHeight: 44, padding: "0 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>{win || (mine && mine.note) ? "Change the dates or note" : "Add dates or a note"}</button> : null}
      </div>
      {listed && editing ? <div style={{ marginTop: 12, borderTop: "1px solid " + C.border, paddingTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 6 }}>When are you free? Leave both empty to stay listed any time.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <input type="date" aria-label="Free from" min={today} value={from} onChange={(e) => { const v = e.target.value; setFrom(v); if (v && (!to || to < v)) setTo(v); }} style={{ ...field, flex: "1 1 130px", width: "auto" }} />
          <span style={{ fontSize: 12, color: C.textMuted }}>to</span>
          <input type="date" aria-label="Free to" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} style={{ ...field, flex: "1 1 130px", width: "auto" }} />
          {from || to ? <button type="button" onClick={() => { setFrom(""); setTo(""); }} style={{ minHeight: 44, padding: "0 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Clear dates</button> : null}
        </div>
        <input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="A line for climbers who find you (optional)" aria-label="A note on your listing" style={{ ...field, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={saveDetails} disabled={busy} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: "none", background: C.blueSolid, color: C.onSolid, fontSize: 13.5, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>Save</button>
          <button type="button" onClick={() => setEditing(false)} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: C.textSub, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
        </div>
      </div> : null}
    </div>
  );
}
