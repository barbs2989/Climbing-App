import { useContext } from "react";
import { ClimberCtx } from "../../lib/climberCtx.js";
import { useScopedWishlistRoutes } from "../../lib/db";
import { ScreenHero } from "../../lib/ScreenHero";
import LoadingRows from "./LoadingRows.tsx";
import EmptyState from "./EmptyState.tsx";
import RouteRow from "./RouteRow.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { placeOf } from "../../lib/areaBrowserShared.js";

// ── Objectives: your wishlisted routes that fall within the current area ──
export interface ObjectivesPanelProps {
  area: { name: string } | null | undefined;
  onOpen: (r: RouteRowRoute) => void;
  C: typeof Palette;
}
export default function ObjectivesPanel({ area, onOpen, C }: ObjectivesPanelProps) {
  const { wishlist } = useContext(ClimberCtx);
  const { data, isLoading, error } = useScopedWishlistRoutes(area, wishlist);
  return (
    <div>
      <ScreenHero C={C} title={"My objectives" + (area ? " · " + area.name : "")} />
      {isLoading && <LoadingRows C={C} label="Loading…"/>}
      {error && !(data && data.length) ? <div style={{ color: C.red, fontSize: 12.5 }}>Couldn't load your objectives — check your connection and try again.</div> : null}
      {error && data && data.length ? <div style={{ color: C.textMuted, fontSize: 12.5 }}>Couldn't refresh just now — showing the list from your last load.</div> : null}
      {!isLoading && !error && (!data || !data.length) && (
        <EmptyState C={C} icon="target">No objectives here yet — open a climb and tap to add it to your objectives.</EmptyState>
      )}
      {(data || []).map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} areaName={placeOf(r)} />)}
    </div>
  );
}
