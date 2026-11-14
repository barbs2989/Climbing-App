import { useState } from "react";
import { C, DB_UID, pubFirst } from "../../ClimbMatchCore.jsx";
import { setMyCrewRide, useCrewRides } from "../../lib/db";

/* RIDES on a crew (0377; the owner's Shredder audit, 2026-10-28). Shredder makes carpools a headline feature; for a
   climbing crew it matters more -- trailhead lots fill and permit zones cap the party. Each climber says, for
   themselves only, "Driving from <area> · N seats" or "Needs a ride from <area>". The area is what they type, a town
   or a neighbourhood, never an address, and only the crew's confirmed members can read it (crew_members is public,
   so this is its own table). A climber who has only asked to join sees nothing here.
   An example crew (no database row) keeps the choice on this screen only, and says so. */

export interface CrewRidesMember { id: string | number; _me?: boolean; _status?: string; name?: string; showName?: boolean; username?: string }
interface RideRow { user_id: string; mode: "driving" | "need"; seats: number | null; from_area: string }
interface Draft { mode: "driving" | "need"; seats: number; fromArea: string }
export interface CrewRidesProps {
  crewDbId: string | null;
  roster: ReadonlyArray<CrewRidesMember>;
  confirmedMe: boolean;
}

const MAX_SEATS = 8;
const btn = (on: boolean) => ({ flex: "1 1 0", minHeight: 44, padding: "9px 10px", borderRadius: 9, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, fontSize: 13, fontWeight: 700, cursor: "pointer" });
const step = { minWidth: 44, minHeight: 44, padding: 0, borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 18, fontWeight: 700, cursor: "pointer", flexShrink: 0 };

export function rideLine(r: { mode: string; seats: number | null; from_area: string }): string {
  const from = r.from_area ? " from " + r.from_area : "";
  return r.mode === "driving" ? "Driving" + from + " · " + (r.seats || 1) + " seat" + ((r.seats || 1) === 1 ? "" : "s") + " free" : "Needs a ride" + from;
}

export default function CrewRides({ crewDbId, roster, confirmedMe }: CrewRidesProps) {
  const q = useCrewRides(crewDbId);
  const [local, setLocal] = useState<RideRow | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  if (!confirmedMe) return null;
  const me = String(DB_UID || "");
  const inCrew = roster.filter(p => p._me || !p._status || p._status === "confirmed");
  const memberOf = (uid: string) => inCrew.find(p => !p._me && String(p.id) === uid);
  const rows: RideRow[] = crewDbId
    ? ((q.data || []) as RideRow[]).filter(r => r.user_id === me || !!memberOf(r.user_id))
    : (local ? [local] : []);
  const mine = crewDbId ? rows.find(r => r.user_id === me) || null : local;
  const others = rows.filter(r => r !== mine);
  const seats = rows.filter(r => r.mode === "driving").reduce((s, r) => s + (r.seats || 1), 0);
  const need = rows.filter(r => r.mode === "need").length;
  const save = (ride: Draft | null) => {
    setNote("");
    if (!crewDbId) { setLocal(ride ? { user_id: me, mode: ride.mode, seats: ride.mode === "driving" ? ride.seats : null, from_area: ride.fromArea.trim().slice(0, 60) } : null); setDraft(null); return; }
    setBusy(true);
    setMyCrewRide(crewDbId, ride).then(() => { setDraft(null); }).catch((e: unknown) => { setNote((e instanceof Error && e.message) || "That didn’t save — try again."); }).finally(() => setBusy(false));
  };
  const open = (mode: "driving" | "need") => setDraft({ mode, seats: mine && mine.seats ? mine.seats : 1, fromArea: mine ? mine.from_area : "" });
  return <div style={{ border: "1px solid " + C.border, borderRadius: 12, padding: "12px 13px", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Rides · carpool</div>
      {rows.length ? <div style={{ fontSize: 11.5, fontWeight: 700, color: need > seats ? C.amber : C.green, flexShrink: 0 }}>{seats + " seat" + (seats === 1 ? "" : "s") + " free · " + need + " need" + (need === 1 ? "s" : "") + " a ride"}</div> : null}
    </div>
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 10 }}>{"Say if you’re driving and how many seats you have, or that you need a ride. Name a town or area, not your address. " + (crewDbId ? "Only the crew’s confirmed members see this." : "Example crew: this stays on this screen until you reload.")}</div>
    {crewDbId && q.isLoading ? <div role="status" style={{ fontSize: 12.5, color: C.textMuted, padding: "4px 0 6px" }}>Loading rides…</div> : null}
    {crewDbId && q.isError ? <div role="status" style={{ fontSize: 12.5, color: C.amber, padding: "4px 0 6px" }}>Couldn’t load the crew’s rides. Check your connection and reopen the crew.</div> : null}
    {others.map(r => { const p = memberOf(r.user_id); return <div key={r.user_id} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "6px 0", borderTop: "1px solid " + C.borderLight, fontSize: 13, color: C.textSub, lineHeight: 1.4 }}><b style={{ color: C.text, flexShrink: 0 }}>{p ? pubFirst(p) : "A crewmate"}</b><span style={{ minWidth: 0 }}>{rideLine(r)}</span></div>; })}
    {mine && !draft ? <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid " + C.borderLight, fontSize: 13, color: C.textSub, lineHeight: 1.4 }}><b style={{ color: C.text, flexShrink: 0 }}>You</b><span style={{ flex: 1, minWidth: 0 }}>{rideLine(mine)}</span><button onClick={() => open(mine.mode)} disabled={busy} style={{ ...btn(false), flex: "0 0 auto", minWidth: 60 }}>Edit</button><button onClick={() => save(null)} disabled={busy} aria-label="Take your ride off the crew" style={{ ...btn(false), flex: "0 0 auto", minWidth: 70 }}>Remove</button></div> : null}
    {!mine && !draft && !(crewDbId && (q.isLoading || q.isError)) ? <div style={{ display: "flex", gap: 8, marginTop: rows.length ? 8 : 0 }}><button onClick={() => open("driving")} style={btn(false)}>I’m driving</button><button onClick={() => open("need")} style={btn(false)}>I need a ride</button></div> : null}
    {draft ? <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      <div role="radiogroup" aria-label="Your ride" style={{ display: "flex", gap: 8 }}><button role="radio" aria-checked={draft.mode === "driving"} onClick={() => setDraft({ ...draft, mode: "driving" })} style={btn(draft.mode === "driving")}>I’m driving</button><button role="radio" aria-checked={draft.mode === "need"} onClick={() => setDraft({ ...draft, mode: "need" })} style={btn(draft.mode === "need")}>I need a ride</button></div>
      {draft.mode === "driving" ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ flex: 1, fontSize: 13, color: C.textSub }}>Seats free for the crew</span><button onClick={() => setDraft({ ...draft, seats: Math.max(1, draft.seats - 1) })} disabled={draft.seats <= 1} aria-label="Fewer seats" style={step}>−</button><div role="status" aria-label={"Seats free: " + draft.seats} style={{ minWidth: 26, textAlign: "center", fontSize: 14, fontWeight: 800, color: C.text }}>{draft.seats}</div><button onClick={() => setDraft({ ...draft, seats: Math.min(MAX_SEATS, draft.seats + 1) })} disabled={draft.seats >= MAX_SEATS} aria-label="More seats" style={step}>+</button></div> : null}
      <input aria-label={draft.mode === "driving" ? "Driving from" : "Need a ride from"} value={draft.fromArea} maxLength={60} onChange={e => setDraft({ ...draft, fromArea: e.target.value })} placeholder={draft.mode === "driving" ? "Driving from — e.g. North Seattle" : "Need a ride from — e.g. Bellevue"} style={{ minHeight: 44, padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14 }}/>
      <div style={{ display: "flex", gap: 8 }}><button onClick={() => { setDraft(null); setNote(""); }} disabled={busy} style={btn(false)}>Cancel</button><button onClick={() => save(draft)} disabled={busy} style={{ ...btn(true), flex: "2 1 0" }}>{busy ? "Saving…" : "Save"}</button></div>
    </div> : null}
    {note ? <div role="status" style={{ fontSize: 11.5, color: C.amber, marginTop: 5 }}>{note}</div> : null}
  </div>;
}
