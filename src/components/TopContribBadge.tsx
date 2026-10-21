import type { CSSProperties } from "react";
import { C, DB_UID, realProfileId, seedIdentity, seedRoutesOn, topContribBadges } from "../../ClimbMatchCore.jsx";
import { useUserTopContribAreas } from "../../lib/db.js";
import Lbl from "./Lbl.tsx";

/** The climber the badge is for: a seed climber (numeric id; `0` is the signed-in account) or a real profile (uuid id). */
export interface TopContribClimber {
  id?: number | string | null;
  name?: string | null;
}

export interface TopContribBadgeProps {
  climber?: TopContribClimber | null;
  /** Merged over the chip's own styles. */
  style?: CSSProperties;
}

/** One area where the climber tops the contributor leaderboard; the DB rpc and the seed list both carry `name`. */
interface TopContribArea {
  name: string;
}

/**
 * The "🏆 Top Contributor · <area>" chip on a profile. A real profile (or the signed-in account, id 0 while
 * `DB_UID` is set) reads its areas from the DB; a seed climber on the seed path derives them from the seed
 * routes by display name. Renders nothing when the climber tops no area.
 */
export default function TopContribBadge({ climber, style }: TopContribBadgeProps) {
  const uid: string | null = realProfileId(climber && climber.id) || (climber && climber.id === 0 ? DB_UID : null);
  const q = useUserTopContribAreas(uid);
  const areas: TopContribArea[] = uid
    ? (q.data || [])
    : (climber && seedRoutesOn() && seedIdentity(climber) ? topContribBadges(climber.name) : []);
  if (!areas.length) return null;
  const label = areas.length === 1 ? areas[0].name : areas.length + " areas";
  return (
    <span
      title={areas.map((a) => a.name).join(", ")}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberBg, border: "1px solid " + C.amber + "44", padding: "2px 8px", borderRadius: 9, whiteSpace: "nowrap", ...(style || {}) }}
    >
      <Lbl s={"🏆 Top Contributor"} />{" · " + label}
    </span>
  );
}
