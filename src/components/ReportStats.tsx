import { C, campLabel, campSummary, rapSummary, uElev, uTempU } from "../../ClimbMatchCore.jsx";

/**
 * The conditions a trip report recorded, as its chips read them. Every field is optional: a report carries only
 * what its author entered. `camps`/`nights` feed `campSummary`/`campLabel`; `rapCount` (with the rappel fields
 * `rapSummary` reads) feeds the Rappels chip.
 */
export interface ReportCond {
  tempF?: number | string | null;
  carToCar?: string | number | null;
  partySize?: string | number | null;
  snow?: string | null;
  snowDepth?: string | null;
  freezingFt?: number | string | null;
  freezing?: string | null;
  water?: string | null;
  trail?: string | null;
  mud?: string | null;
  bugs?: string | null;
  seepage?: string | null;
  protection?: string | null;
  rapCount?: number | string | null;
  anchors?: string | null;
  crowds?: string | null;
  camps?: unknown[] | null;
  nights?: number | string | null;
}

export interface ReportStatsProps {
  cond?: ReportCond | null;
}

/** One chip per figure: `[label, value]` (a two-element array, as the original built them). */
type Chip = (string | number)[];

/**
 * A trip report's recorded conditions as a row of labelled chips (TEMP 41°F · SNOW Firm · …). Renders nothing for a
 * report with no figures. Temperatures and the freezing level are drawn in the climber's units (`check:units`).
 */
export default function ReportStats({cond}: ReportStatsProps){
  if(!cond)return null;
  /* Every one of these chips used to render with an EMPTY label — the slot was there, and all
     ten passed "". So a trip report showed a row of bare values: "Flowing", "Continuous",
     "Clear". Each of those is a different measurement, and which one is unguessable; "Clear"
     alone could be the trail, the sky or the water. The chips are the only place a reader sees
     these numbers, so an unlabelled one is a fact nobody can use. Labels also let the new
     columns (party size, protection, anchors, crowds) join the same row without ambiguity. */
  const items: Chip[]=[cond.tempF!=null&&["Temp",uTempU(cond.tempF)],cond.carToCar&&["Car-to-car",cond.carToCar],cond.partySize&&["Party",cond.partySize],cond.snow&&["Snow",cond.snow],cond.snowDepth&&["Postholing",cond.snowDepth],cond.freezingFt!=null&&cond.freezingFt!==""?["Freezing lvl",uElev(cond.freezingFt)]:cond.freezing&&["Freezing lvl",cond.freezing],cond.water&&["Water",cond.water],cond.trail&&["Trail",cond.trail],cond.mud&&["Mud",cond.mud],cond.bugs&&["Bugs",cond.bugs],cond.seepage&&["Seepage",cond.seepage],cond.protection&&["Protection",cond.protection],cond.rapCount&&["Rappels",rapSummary(cond)],campSummary(cond)&&[campLabel(cond),campSummary(cond)],cond.anchors&&["Anchors",cond.anchors],cond.crowds&&["Crowds",cond.crowds]].filter((x): x is Chip => Array.isArray(x));
  if(!items.length)return null;
  return <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{items.map((x,i)=><span key={i} style={{fontSize:12,color:C.textSub,background:C.surface,padding:"2px 7px",borderRadius:6,border:`1px solid ${C.border}`}}><span style={{color:C.textMuted,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.3,marginRight:4}}>{x[0]}</span>{x[1]}</span>)}</div>;
}
