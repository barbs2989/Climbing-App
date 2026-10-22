import { catOf } from "../../ClimbMatchCore.jsx";
import DiscBadge from "./DiscBadge.tsx";

/** The part of a route this strip reads: its listed disciplines, or nothing (then `catOf` decides). */
interface DiscBadgesRoute {
  disciplines?: readonly string[] | null;
}

export interface DiscBadgesProps {
  /** The route whose disciplines to show; a route with none listed shows its category from `catOf`. */
  route: DiscBadgesRoute;
  /** Compact variant for rows and chips. */
  sm?: boolean;
}

/** One `DiscBadge` per discipline a route lists, wrapped on one line. */
export default function DiscBadges({ route, sm }: DiscBadgesProps) {
  const ds: readonly string[] = route.disciplines && route.disciplines.length ? route.disciplines : [catOf(route)];
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {ds.map((d) => <DiscBadge key={d} id={d} sm={sm} />)}
    </span>
  );
}
