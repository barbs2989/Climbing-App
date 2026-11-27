import { useContext } from "react";
import type { ReactNode } from "react";
import { ClimberCtx } from "../../lib/climberCtx.js";
import { useScopedWishlistRoutes } from "../../lib/db";
import ClassicsList from "./ClassicsList.tsx";
import type { ClassicsListRow } from "./ClassicsList.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

// YOUR SAVED CLIMBS HERE (owner note: "There should also be a box that shows the routes that are on their lists of
// saved climbs or objectives"). Every climb under this area that is in My Objectives or on one of the climber's own
// lists, in one box on the area page, so walking into a crag you see what you came for without opening the
// Objectives screen. 27 Crags and theCrag mark a crag's climbs you have saved; Mountain Project leaves its to-do list
// on a separate page. Objectives first (they carry the ★), then the rest by name; each row's muted line names the
// lists it is on. Drawn by ClassicsList, so it is the same five-then-a-dropdown table as the classics beside it.
// Nothing saved here draws nothing: the box is the climber's own, not an invitation. A failed read says so, but only
// to a climber who HAS saved climbs (otherwise there was nothing to read).
export interface SavedHereListProps {
  area: { id: string | number; name: string; path?: string | null };
  onOpen: (r: RouteRowRoute) => void;
  dense?: boolean;
  C: typeof Palette;
  /** Draws the box's card (AreaPage's section()). */
  wrap: (el: ReactNode) => ReactNode;
}
interface SavedRow extends ClassicsListRow { area_id?: string | number | null; areas?: { name?: string | null } | null }
export default function SavedHereList({ area, onOpen, dense, C, wrap }: SavedHereListProps) {
  const { wishlist, lists } = useContext(ClimberCtx);
  const wish = new Set((wishlist || []).map(String));
  const onLists = new Map<string, string[]>();
  for (const l of lists || []) for (const id of l.routeIds || []) {
    const k = String(id);
    const names = onLists.get(k) || [];
    if (l.name && !names.includes(l.name)) names.push(l.name);
    onLists.set(k, names);
  }
  const ids: Array<string | number> = [];
  const seen = new Set<string>();
  for (const id of [...(wishlist || []), ...(lists || []).flatMap(l => l.routeIds || [])]) { const k = String(id); if (!seen.has(k)) { seen.add(k); ids.push(id); } }
  const q = useScopedWishlistRoutes(area, ids) as { data?: SavedRow[]; error?: unknown };
  if (!ids.length) return null;
  if (q.error && !(q.data && q.data.length)) return wrap(<div role="status" style={{ fontSize: 12, color: C.textMuted, padding: "10px 14px" }}>Couldn't load your saved climbs here.</div>);
  if (!q.data || !q.data.length) return null;
  const rows: ClassicsListRow[] = q.data.map(r => {
    const names = onLists.get(String(r.id)) || [];
    return { ...r, area_name: String(r.area_id) !== String(area.id) && r.areas && r.areas.name ? r.areas.name : null, note: names.length ? (names.length > 1 ? "Lists: " : "List: ") + names.join(", ") : null };
  }).sort((a, b) => Number(wish.has(String(b.id))) - Number(wish.has(String(a.id))) || String(a.name || "").localeCompare(String(b.name || "")));
  return wrap(<ClassicsList rows={rows} withWall dense={dense} onOpen={onOpen} C={C} title="Your saved climbs here" />);
}
