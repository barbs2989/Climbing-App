import { ActionIcon, Pill, trustTier } from "../../ClimbMatchCore.jsx";

export interface TrustBadgeProps {
  /** The climber's trust score, 0–100; the tier (colour and label) is read off `trustTier`. */
  score: number;
  /** Show the number alone, without the tier label — for rows and headers. */
  compact?: boolean;
}

/**
 * The trust-score pill: a shield, the score and (unless compact) its tier label, tinted by tier.
 * The tooltip is read by `check:profile-claims`, which finds this component's declaration in the
 * stitched core and reads the first title attribute within a few hundred characters of it: keep the
 * title a plain string close to the declaration, and do not write that anchor pattern in a comment
 * above it (the regex would match the comment first).
 */
export default function TrustBadge({ score, compact }: TrustBadgeProps) {
  const t = trustTier(score);
  return (
    <span title="Trust score: built from a verified email, time on ClimbMatch, partner vouches, belay catches logged, and climbs and conditions logged. Higher means more proven." style={{ display: "inline-flex", verticalAlign: "middle" }}>
      <Pill icon={<ActionIcon name="shield" size={11} color={t.color} />} label={compact ? `${score}` : `${score} — ${t.label}`} color={t.color} bg={t.bg} sm />
    </span>
  );
}
