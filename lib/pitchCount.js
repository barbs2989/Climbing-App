import { breakdownRows } from "./breakdownRows.js";

/* HOW MANY ROPED PITCHES the route has, by the larger of what it STATES (`pitches`) and what it DESCRIBES
   (the roped rows of pitchDetail). A gate that asks "is this multi-pitch?" reads this, not `pitches` alone:
   a route stored with 0 or 1 that a climber then describes pitch by pitch is multi-pitch from that moment,
   and a contributed pitch count reaches `pitches` through routeEdits, so either way the multi-pitch
   sections (ROUTE BREAKDOWN, RAPPELS) appear as soon as the route gains a second pitch. */
export function pitchCountOf(r){if(!r)return 0;var n=+r.pitches>0?+r.pitches:0;var d=(Array.isArray(r.pitchDetail)&&r.pitchDetail.length)?breakdownRows(r).pitchCount:0;return Math.max(n,d);}

/* NO PITCH COUNT ON FILE, BUT LONGER THAN A ROPE REACHES (owner note 2026-11-25: "What do we do when there's
   no information on number of pitches?"). Mountain Project and OpenStreetMap both store 1 as the DEFAULT pitch
   count, so a crag climb with no count and no long length is read as one pitch, as they read it. But a rope does
   not reach 100 m (the planner's MAX_PITCH_FT placeholder rule, lib/planTimes.js), so a roped climb stated longer
   than that is multi-pitch whatever its count says: no count, or a placeholder 1. Such a route gets ROUTE
   BREAKDOWN and RAPPELS as "help fill this in" sections, and `estPitchesByLength` says roughly how many (35 m
   each, the planner's default pitch); nothing is stored. Walk-ups, scrambles and boulders are never read this way. */
export const ROPE_REACH_FT = 330;
const ROPED = /^(trad|sport|toprope|aid|alpine|ice|mixed)\b/i;
export function multiPitchByLength(r){if(!r||!ROPED.test(r.discipline||""))return false;if(pitchCountOf(r)>1)return false;return +r.routeFt>ROPE_REACH_FT;}
export function estPitchesByLength(r){return r&&+r.routeFt>0?Math.max(2,Math.round(+r.routeFt/(35*3.28084))):0;}
