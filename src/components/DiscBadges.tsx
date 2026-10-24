import { rDiscs } from "../../ClimbMatchCore.jsx";
import DiscBadge from "./DiscBadge.tsx";

/** The part of a route this strip reads: its listed disciplines (`rDiscs` puts its `catOf` category first). */
interface DiscBadgesRoute {
  disciplines?: readonly string[] | null;
}

export interface DiscBadgesProps {
  /** The route whose disciplines to show, its primary category (`catOf`) first. */
  route: DiscBadgesRoute;
  /** Compact variant for rows and chips. */
  sm?: boolean;
}

/** One `DiscBadge` per discipline a route lists, wrapped on one line. */
export default function DiscBadges({ route, sm }: DiscBadgesProps) {
  const ds: readonly string[] = rDiscs(route);
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {ds.map((d) => <DiscBadge key={d} id={d} sm={sm} />)}
    </span>
  );
}
