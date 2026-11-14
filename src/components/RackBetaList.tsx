import { C, SUB_LABEL } from "../../ClimbMatchCore.jsx";
import Av from "./Av.tsx";

/** A trip report, as much of it as the rack beta reads. */
export interface RackBetaReport {
  user?: string | null;
  avatar?: string | null;
  date?: string | null;
  /** What the climber said about the rack. */
  gearBeta?: string | null;
  /** The report's text; a rack-shaped one stands in when nobody wrote gear beta. */
  text?: string | null;
}
/** One quoted line of rack beta. */
export interface RackBeta {
  who?: string | null;
  avatar?: string | null;
  date?: string | null;
  note?: string | null;
}
export interface RackBetaListProps {
  /** The reports to read; defaults to the route's own `activity`. */
  activity?: RackBetaReport[] | null;
  route?: { activity?: RackBetaReport[] | null; gearBeta?: RackBeta[] | null } | null;
  /** Opens the Reports tab; without it there is no button. */
  onSeeReports?: (() => void) | null;
}

/**
 * RACK BETA: what climbers said about the rack, quoted with who and when — reports' gear beta first, then the route's
 * own, else up to three report texts that talk about gear. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function RackBetaList({activity,route,onSeeReports}: RackBetaListProps){const _acts=activity||(route&&route.activity)||[];const _gbX: RackBeta[]=_acts.filter(a=>a&&a.gearBeta).map(a=>({who:a.user,avatar:a.avatar,date:a.date,note:a.gearBeta}));const beta=_gbX.concat((route&&route.gearBeta&&route.gearBeta.length)?route.gearBeta:(_acts.filter(a=>a&&a.text&&/(\bcams?\b|\brack\b|doubles|#\d|\bnuts?\b|draws|quickdraw|\bropes?\b|screws|pickets|\bset of\b)/i.test(a.text)).slice(0,3).map(a=>({who:a.user,avatar:a.avatar,date:a.date,note:a.text}))));if(!beta.length)return null;return <div style={{marginTop:11,paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}><div style={{...SUB_LABEL,marginBottom:7}}>Rack beta</div>{beta.map((b,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:8}}>{b.avatar?<Av src={b.avatar} size={24}/>:null}<div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,color:C.textMuted,marginBottom:1}}>{(b.who||"A climber")+(b.date?" · "+b.date:"")}</div><div style={{fontSize:12.5,color:C.text,lineHeight:1.5,fontStyle:"italic"}}>{"\""+b.note+"\""}</div></div></div>)}{onSeeReports?<button onClick={onSeeReports} style={{marginTop:2,padding:"7px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>Reports →</button>:null}</div>;}
