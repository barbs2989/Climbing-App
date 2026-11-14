import { CLIMBERS } from "../ClimbMatchCore.jsx";

/* What each variation IS, beside the tag it wears on the photo. A yellow line with no words left a
   climber guessing whether it was a direct start, an escape or a mistake (owner, 2026-10-23). The
   labels are topo_lines.variant_labels (0362), aligned with variants by index. */
export function popInterest(r){return CLIMBERS.filter(c=>c.objectiveIds&&c.objectiveIds.indexOf(r.id)>=0).length;}
