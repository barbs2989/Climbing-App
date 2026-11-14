import { C } from "../../ClimbMatchCore.jsx";
import Lbl from "./Lbl.tsx";

/** A float plan read back out of a chat message by `parseFloatPlanText`. Empty fields are "". */
export interface ParsedFloatPlan {
  route: string;
  partner: string;
  party: string;
  vehicle: string;
  lot: string;
  depart: string;
  ret: string;
  comms: string;
  contact: string;
  notes: string;
  coords: { lat: number; lng: number; name: string } | null;
}

export interface FloatPlanCardProps {
  plan: ParsedFloatPlan;
  /** The climber's own post: no Save button, since the plan is already theirs. */
  mine?: boolean;
  /** Copies the plan into the climber's own Float plans. Absent, the card only shows the plan. */
  onSave?: () => void;
}

/**
 * A float plan posted in a crew chat, drawn as a card instead of a wall of "Label: value" lines:
 * the climb, then the times first (the hard return in amber, since it is the line a search starts
 * from), then the rest only where the poster filled it in. A crewmate's card can be saved into
 * their own Float plans.
 */
export default function FloatPlanCard({ plan, mine, onSave }: FloatPlanCardProps) {
  const party = [plan.party, plan.partner].filter(Boolean).join(" · ");
  const rows: [string, string, boolean][] = [
    ["Leaves", plan.depart, false],
    ["Back by", plan.ret, true],
    ["Parking", plan.lot, false],
    ["Vehicle", plan.vehicle, false],
    ["Party", party, false],
    ["Comms", plan.comms, false],
    ["Contact", plan.contact, false],
  ];
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: C.amber, marginBottom: 3 }}>FLOAT PLAN</div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 8, wordBreak: "break-word" }}>{plan.route || "A climb"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", fontSize: 13, lineHeight: 1.4 }}>
        {rows
          .filter((r) => r[1])
          .map((r) => [
            <div key={r[0] + "-k"} style={{ color: C.textMuted, fontSize: 12 }}>{r[0]}</div>,
            <div key={r[0] + "-v"} style={{ color: r[2] ? C.amber : C.text, fontWeight: r[2] ? 700 : 400, wordBreak: "break-word", minWidth: 0 }}>{r[1]}</div>,
          ])}
      </div>
      {plan.notes ? (
        <div style={{ marginTop: 7, fontSize: 12.5, color: C.textSub, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{plan.notes}</div>
      ) : null}
      {plan.coords ? (
        <div style={{ marginTop: 7, fontSize: 12, color: C.textMuted }}>{<Lbl s={"📍 " + plan.coords.lat.toFixed(4) + ", " + plan.coords.lng.toFixed(4)} />}</div>
      ) : null}
      {!mine && onSave ? (
        <button
          onClick={onSave}
          aria-label={"Save " + (plan.route || "this float plan") + " to my float plans"}
          style={{ width: "100%", marginTop: 10, padding: "9px 10px", borderRadius: 10, border: "1px solid " + C.amber, background: C.amberBg, color: C.amber, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Save to my float plans
        </button>
      ) : null}
    </div>
  );
}
