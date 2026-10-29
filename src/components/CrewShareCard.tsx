import { useState } from "react";
import { C, DLOCALE } from "../../ClimbMatchCore.jsx";
import { useCrewSharePreview } from "../../lib/db.js";

export interface CrewShareCardProps {
  /** The `share_token` from a `?crew=` link. */
  token: string;
  /** True when the visitor has an account session (a guest has none). */
  signedIn: boolean;
  /** Files the visitor's pending request to join; rejects when it did not save. */
  onJoin: (crewId: string) => Promise<unknown>;
  /** Opens sign-in / sign-up; the link is kept on this device so it reopens afterwards. */
  onSignIn: () => void;
  /** Removes the card (and forgets the link). */
  onDismiss: () => void;
}

interface CrewPreview {
  crew_id: string;
  place_name: string | null;
  discipline: string | null;
  dates: string[] | null;
  agreed_date: string | null;
  cap: number;
  going: number;
  first_names: string[];
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(DLOCALE, { weekday: "short", month: "short", day: "numeric" });

/**
 * A crew someone shared by link (0381; owner decisions 2026-10-28, Gora audit): drawn at the top of
 * Find partners → Join a crew, not as a dialog. Shows the place, the day, how full it is, and FIRST
 * NAMES ONLY of members who show their name; everyone else is counted ("Nate, Sam + 2 more"). Join
 * files the ordinary pending request; a guest is sent to sign up first. A dead link (sharing off,
 * crew dismissed, date passed) says so, and a failed read is never shown as a dead link.
 */
export default function CrewShareCard({ token, signedIn, onJoin, onSignIn, onDismiss }: CrewShareCardProps) {
  const q = useCrewSharePreview(token);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const box = { background: C.card, border: "1px solid " + C.blueDim, borderRadius: 12, padding: "12px 14px", marginBottom: 14 };
  const close = <button type="button" onClick={onDismiss} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "4px 0" }}>Dismiss</button>;
  const head = <div style={{ fontSize: 11, fontWeight: 800, color: C.blue, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Crew shared with you</div>;
  if (q.isLoading) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textMuted }}>Loading the shared crew…</div></div>;
  if (q.isError) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5, marginBottom: 6 }}>Couldn’t load this crew right now. The link may still work — try again in a moment.</div><div style={{ display: "flex", gap: 12 }}><button type="button" onClick={() => { q.refetch(); }} style={{ background: "none", border: "none", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "4px 0" }}>Try again</button>{close}</div></div>;
  const p = q.data as CrewPreview | null | undefined;
  if (!p) return <div style={box}>{head}<div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginBottom: 6 }}>This crew link has expired or was turned off by its organiser.</div>{close}</div>;
  const day = p.agreed_date && ISO_DAY.test(p.agreed_date) ? p.agreed_date : ((p.dates || []).filter(d => ISO_DAY.test(d)).sort()[0] || null);
  const open = Math.max(0, (p.cap || 0) - (p.going || 0));
  const names = (p.first_names || []).slice(0, 3);
  const others = Math.max(0, (p.going || 0) - names.length);
  const who = names.length ? names.join(", ") + (others ? " + " + others + " more" : "") : (p.going + (p.going === 1 ? " climber" : " climbers"));
  const join = () => {
    if (!signedIn) { onSignIn(); return; }
    setBusy(true); setErr("");
    onJoin(p.crew_id).then(() => { setSent(true); }).catch((e: unknown) => { setErr((e instanceof Error && e.message) || "Couldn’t send your request — try again."); }).finally(() => { setBusy(false); });
  };
  return <div data-crew-share="" style={box}>
    {head}
    <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3, marginBottom: 3, overflowWrap: "anywhere" }}>{p.place_name || "A climb"}</div>
    <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5, marginBottom: 8 }}>{(day ? fmtDay(day) : "Date to be agreed") + " · " + p.going + " of " + p.cap + (open ? " · " + open + (open === 1 ? " spot left" : " spots left") : " · Full")}</div>
    <div style={{ fontSize: 12.5, color: C.text, marginBottom: 10 }}>{"With " + who}</div>
    {sent
      ? <div style={{ fontSize: 12.5, color: C.green, fontWeight: 700, lineHeight: 1.5 }}>Request sent. The organiser will see it in Requests.</div>
      : <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button type="button" disabled={busy || !open} onClick={join} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: open ? C.blueSolid : C.surface, color: open ? C.onSolid : C.textMuted, fontSize: 13, fontWeight: 800, cursor: busy || !open ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{!open ? "Crew is full" : busy ? "Sending…" : signedIn ? "Ask to join" : "Sign up to join"}</button>
          {close}
        </div>}
    {err ? <div style={{ fontSize: 12, color: C.amber, marginTop: 6 }}>{err}</div> : null}
  </div>;
}
