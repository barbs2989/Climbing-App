import { ActionIcon, C, RISK_LEVELS } from "../../ClimbMatchCore.jsx";
import Pill from "./Pill.tsx";

/** The three answers the safety questionnaire offers for risk tolerance. */
export type RiskLevelId = "conservative" | "moderate" | "aggressive";

export interface RiskBadgeProps {
  /** A climber's stored risk tolerance. Anything that is not a known level renders "Not set". */
  id?: string | null;
  /** Compact variant for a row of crew members. */
  sm?: boolean;
}

const ICON: Record<RiskLevelId, string> = { conservative: "shield", moderate: "balance", aggressive: "fire" };

/** A pill naming a climber's risk tolerance in that level's colour. */
export default function RiskBadge({ id, sm }: RiskBadgeProps) {
  const r = RISK_LEVELS.find((x) => x.id === id);
  if (!r) return <Pill label="Not set" color={C.textMuted} bg={C.surface} sm={sm} />;
  const icon = ICON[r.id as RiskLevelId] || "shield";
  return <Pill icon={<ActionIcon name={icon} size={sm ? 11 : 13} color={r.color} />} label={r.label} color={r.color} bg={r.bg} sm={sm} />;
}
