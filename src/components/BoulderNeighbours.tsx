import { catOf } from "../../ClimbMatchCore.jsx";
import { EMPTY_ARR } from "../../lib/emptyArr.js";
import { HeaderNeighbourPill } from "./WallNeighbours.tsx";
import type { NeighbourRow } from "./WallNeighbours.tsx";

export interface BoulderNeighboursProps {
  rows?: NeighbourRow[] | null;
  routeId: string;
  /** The problem's own area (its boulder, or a sector). */
  areaName?: string | null;
  onOpen?: ((row: NeighbourRow) => void) | null;
}

const BOULDER_GROUP_RX=/\b(sector|area|boulders|blocs|field|circuit|zone|cluster|garden|park|woods|forest|hill|ridge|canyon|gulch|trail|valley)s?\b/i;

/** ON THIS BOULDER (owner's note, 2026-10-23): a boulder carries several problems and variations, so a problem page
   steps to the others on the same boulder — never "next door" or left/right, which is the wall's language. The boulder
   is the problem's own area, as Mountain Project files it ("Routes in Solitary Boulder"); an area whose NAME says it is
   a group of boulders (a sector, a field) reads "in this area" instead, so the card never calls a sector a boulder.
   Mountain Project's stored order goes first, then problems with none by name, the crag list's own convention.
 *
 * In the HEADER since 2026-11-26, top right beside ← Back, as the same pill as NEXT DOOR (HeaderNeighbourPill); it was a
 * card under the header facts.
 *
 * Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function BoulderNeighbours({rows,routeId,areaName,onOpen}: BoulderNeighboursProps){const probs=(rows||EMPTY_ARR).filter(function(r){return catOf(r)==="bouldering";}).slice().sort(function(a,b){if(a.sort_order!=null&&b.sort_order!=null)return a.sort_order-b.sort_order;if(a.sort_order!=null)return -1;if(b.sort_order!=null)return 1;return String(a.name||"").localeCompare(String(b.name||""));});const i=probs.findIndex(function(r){return r.id===routeId;});if(i<0||probs.length<2)return null;const prev=probs[i-1],next=probs[i+1];
  const group=!areaName||BOULDER_GROUP_RX.test(areaName),where=group?"in this area":"on this boulder";
  return <HeaderNeighbourPill navLabel={group?"Other problems in this area":"Other problems on this boulder"} title={group?"IN THIS AREA":"ON THIS BOULDER"} count={(i+1)+" of "+probs.length} countTitle={"Problem "+(i+1)+" of "+probs.length+(areaName?(group?" in ":" on ")+areaName:" "+where)} back={{row:prev,aria:"the previous problem "+where,edge:"First"}} fwd={{row:next,aria:"the next problem "+where,edge:"Last"}} onOpen={onOpen}/>;}
