import { useEffect, useState } from "react";
import { SOLID_FILL } from "../../lib/buttonStyles.js";
import { createPortal } from "react-dom";
import { C, pubNameRow, shortDate, tripToday } from "../../ClimbMatchCore.jsx";
import { POP_BACK } from "../../lib/popupChrome.js";
import { submitTripReport, useCrewRecap, useProfilesByIds } from "../../lib/db.js";
import Av from "./Av.tsx";

/** The five things that can have happened to one crewmate on the day, in the order a climber thinks of them (0519). */
export const TRIP_OUTCOMES: ReadonlyArray<readonly [string, string]> = [
  ["on_time", "On time"],
  ["late", "Late"],
  ["cancelled_early", "Cancelled with notice"],
  ["cancelled_late", "Cancelled last minute"],
  ["no_show", "Didn’t show"],
];
/** What each outcome reads as, for a sentence ("marked you Late"). */
export const TRIP_OUTCOME_LABEL: Record<string, string> = Object.fromEntries(TRIP_OUTCOMES);

export interface TripRecapSheetProps {
  /** The real crew (a uuid). */
  crewId: string;
  /** False for an example crew, which has no record to write to: the sheet says so instead of pretending. */
  real?: boolean;
  /** The climb or area the crew went to, for the header. */
  placeName?: string | null;
  onClose: () => void;
  showToast: (msg: string) => void;
  /** Called once this climber has filed something for the crew, or the sheet shows there is nobody to mark: the "Who showed up" alert has done its job. */
  onDone?: () => void;
}

interface RecapMate { id: string; departed: boolean; outcome: string | null; theirReply: string | null; theirNote: string | null }
interface RecapData { tripDate: string | null; open: boolean; calledOff: boolean; mates: RecapMate[] }
interface ProfileRow { id: string; name?: string | null; username?: string | null; show_name?: boolean; avatar?: string | null }

/** "How did it go?": after a crew's day, each crewmate says what happened to each other crewmate — or that the crew
 *  called it off, which marks nobody. One tap per crewmate; a second tap on the same answer takes it back. Every tap
 *  is a write (submitTripReport), shown at once and put back if the write fails. */
export default function TripRecapSheet({ crewId, real = true, placeName, onClose, showToast, onDone }: TripRecapSheetProps) {
  const q = useCrewRecap(crewId, real);
  const data = q.data as RecapData | undefined;
  const ids = (data?.mates || []).map((m) => m.id);
  const profQ = useProfilesByIds(ids);
  const profs: Record<string, ProfileRow> = {};
  ((profQ.data || []) as ProfileRow[]).forEach((p) => { profs[p.id] = p; });
  /* What this climber just tapped, ahead of the write landing; undefined = no local change. */
  const [mine, setMine] = useState<Record<string, string | null>>({});
  const [callOff, setCallOff] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  /* Crewmates with a write in flight: their chips wait, so two quick taps cannot land out of order (review 2026-11-24). */
  const [pending, setPending] = useState<Record<string, boolean>>({});
  /* Nothing to do here, or something already filed: the alert that brought you here can go. */
  const _filed = !!data && (data.calledOff || data.mates.some((m) => m.outcome));
  const _empty = !!data && (!data.tripDate || !data.mates.length);
  const [doneSent, setDoneSent] = useState(false);
  useEffect(() => { if ((_filed || _empty) && !doneSent && onDone) { setDoneSent(true); onDone(); } }, [_filed, _empty, doneSent, onDone]);
  const calledOff = callOff == null ? !!data?.calledOff : callOff;
  const open = !!data?.open;
  const day = data?.tripDate ? shortDate(data.tripDate) : null;

  const pick = (m: RecapMate, outcome: string) => {
    if (pending[m.id] || busy) return;
    const was = m.id in mine ? mine[m.id] : m.outcome;
    const next = was === outcome ? null : outcome;
    setMine((p) => ({ ...p, [m.id]: next }));
    setPending((p) => ({ ...p, [m.id]: true }));
    submitTripReport(crewId, m.id, next)
      .then(() => { if (next && onDone && !doneSent) { setDoneSent(true); onDone(); } })
      .catch((e: Error) => {
        setMine((p) => ({ ...p, [m.id]: was }));
        showToast("Couldn’t save that — " + (e && e.message ? e.message : "check your connection and try again."));
      })
      .finally(() => setPending((p) => ({ ...p, [m.id]: false })));
  };
  const anyPending = Object.values(pending).some(Boolean);
  const toggleCallOff = () => {
    if (anyPending || busy) return;
    const next = !calledOff;
    setBusy(true); setCallOff(next);
    submitTripReport(crewId, null, next ? "called_off" : null)
      .then(() => { if (next) setMine({}); showToast(next ? "Saved — nobody on this trip is marked" : "Taken back — say how it went for each crewmate"); })
      .catch((e: Error) => { setCallOff(!next); showToast("Couldn’t save that — " + (e && e.message ? e.message : "check your connection and try again.")); })
      .finally(() => { /* Let the refetched recap decide what is on screen once the write has landed. */ Promise.resolve(q.refetch()).finally(() => { setCallOff(null); setBusy(false); }); });
  };
  const nameOf = (id: string) => (profs[id] ? pubNameRow(profs[id]) : "") || "A crewmate";

  let body;
  if (!real) body = <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.5, padding: "18px 2px" }}>This is an example crew, so there is nothing to record. On a real crew, after your climbing day, everyone on it can say who showed up, and it adds to each climber’s reliability.</div>;
  else if (q.isLoading) body = <div style={{ fontSize: 13.5, color: C.textMuted, padding: "18px 2px" }}>Loading your crew…</div>;
  else if (q.isError) body = <div style={{ fontSize: 13.5, color: C.amber, lineHeight: 1.5, padding: "18px 2px" }}>Couldn’t load this trip — this is not a claim there is nothing to say. Check your connection and try again.</div>;
  else if (!data || !data.tripDate) body = <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.5, padding: "18px 2px" }}>There’s nothing for you to report here: only the climbers who were on this trip can say how it went.</div>;
  else {
    body = <>
      {!open ? <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5, background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 11px", marginBottom: 12 }}>
        {tripToday() < String(data.tripDate).slice(0, 10) ? "Reports for this trip open on its day — later today if that is today where you are." : "Trip reports closed 14 days after the trip. What you said is shown below."}
      </div> : null}
      <button onClick={toggleCallOff} disabled={!open || busy || anyPending} aria-pressed={calledOff}
        style={{ width: "100%", textAlign: "left", display: "block", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, marginBottom: 14, cursor: open ? "pointer" : "default",
          border: "1px solid " + (calledOff ? C.green : C.border), background: calledOff ? C.greenBg : C.card, color: C.text, opacity: open ? 1 : 0.7 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: calledOff ? C.green : C.text }}>{(calledOff ? "✓ " : "") + "We called it off, or didn’t go"}</span>
        <span style={{ display: "block", fontSize: 12.5, color: C.textSub, lineHeight: 1.45, marginTop: 3 }}>Weather, conditions, safety, or plans fell through for everyone. Nobody is marked.</span>
      </button>
      {calledOff ? null : !data.mates.length ? <div style={{ fontSize: 13.5, color: C.textSub, padding: "6px 2px 14px" }}>Nobody else was on this crew.</div> :
        data.mates.map((m) => {
          const cur = m.id in mine ? mine[m.id] : m.outcome;
          const nm = nameOf(m.id);
          const opts = TRIP_OUTCOMES;
          return <div key={m.id} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
              <Av src={profs[m.id] ? profs[m.id].avatar : null} size={32} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{nm}</div>
                {m.departed ? <div style={{ fontSize: 12, color: C.textMuted }}>Left the crew</div> : null}
              </div>
            </div>
            <div role="group" aria-label={"How it went for " + nm} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {opts.map(([k, label]) => {
                const on = cur === k;
                return <button key={k} onClick={() => pick(m, k)} disabled={!open || !!pending[m.id] || busy} aria-pressed={on} aria-label={label + " — " + nm}
                  style={{ padding: "8px 12px", borderRadius: 18, fontSize: 12.5, fontWeight: 700, cursor: open ? "pointer" : "default", whiteSpace: "nowrap",
                    border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : C.surface, color: on ? C.onSolid : C.textSub, opacity: open || on ? 1 : 0.55 }}>
                  {(on ? "✓ " : "") + label}
                </button>;
              })}
            </div>
            {m.theirReply ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.45, marginTop: 9, borderTop: "1px solid " + C.borderLight, paddingTop: 8 }}>
              {m.theirReply === "was_there" ? nm.split(" ")[0] + " replied that they were there, so this doesn’t count toward their reliability." : null}
              {m.theirNote ? <div style={{ marginTop: m.theirReply === "was_there" ? 4 : 0 }}>{nm.split(" ")[0] + " added: “" + m.theirNote + "”"}</div> : null}
            </div> : null}
          </div>;
        })}
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.55, marginTop: 6 }}>
        Only your crew can say how the trip went. Each crewmate sees what you said about them, and that it came from you, once they’ve said how it went too or after 7 days, and can reply; a report they dispute doesn’t count. Everyone else sees only counts on their profile, like “Showed up for 9 of 10 crew trips”. Tap an answer again to take it back.
      </div>
    </>;
  }

  return createPortal(<div role="dialog" aria-modal="true" aria-label="How did it go?" style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 1300, overflowY: "auto", overscrollBehavior: "contain", maxWidth: 520, margin: "0 auto", boxSizing: "border-box" }}>
    <div style={{ minHeight: "100%" }}>
      <div style={{ position: "sticky", top: 0, background: C.surface, borderBottom: "1px solid " + C.border, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
        <button onClick={onClose} style={POP_BACK}>← Back</button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>How did it go?</div>
          <div style={{ fontSize: 12, color: C.textMuted, overflowWrap: "anywhere" }}>{(placeName || "Your crew’s trip") + (day ? " · " + day : "")}</div>
        </div>
      </div>
      <div style={{ padding: "14px 16px 40px" }}>
        {body}
        <button onClick={onClose} style={{ width: "100%", marginTop: 16, padding: 12, ...SOLID_FILL(C), color: C.onSolid, border: "none", borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  </div>, document.body);
}
