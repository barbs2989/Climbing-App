import { breakdownRows } from "./breakdownRows.js";

/* HOW MANY ROPED PITCHES the route has, by the larger of what it STATES (`pitches`) and what it DESCRIBES
   (the roped rows of pitchDetail). A gate that asks "is this multi-pitch?" reads this, not `pitches` alone:
   a route stored with 0 or 1 that a climber then describes pitch by pitch is multi-pitch from that moment,
   and a contributed pitch count reaches `pitches` through routeEdits, so either way the multi-pitch
   sections (ROUTE BREAKDOWN, RAPPELS) appear as soon as the route gains a second pitch. */
export function pitchCountOf(r){if(!r)return 0;var n=+r.pitches>0?+r.pitches:0;var d=(Array.isArray(r.pitchDetail)&&r.pitchDetail.length)?breakdownRows(r).pitchCount:0;return Math.max(n,d);}
