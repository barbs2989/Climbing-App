import { C, roadReportOf } from "../ClimbMatchCore.jsx";

// ROAD CONDITIONS read off climbers' reports: the tone a road status is drawn in, and the reports newest first.
// Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of the component extraction): RoadReports in
// src/components/ and the Plan tab both read them.

export const ROAD_TONE=function(t){return t==="open"?[C.green,C.greenBg]:t==="gated"?[C.amber,C.amberBg]:t==="closed"?[C.red,C.redBg]:[C.textSub,C.surface];};
export function roadReportsOf(activity){return (activity||[]).map(function(a){var r=roadReportOf(a);return r?Object.assign({},r,{user:a.user,date:a.date}):null;}).filter(Boolean).sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));});}
