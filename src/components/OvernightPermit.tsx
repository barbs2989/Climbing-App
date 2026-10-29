import { C, SUB_LABEL } from "../../ClimbMatchCore.jsx";
import { overnightPermitOf } from "../../lib/overnightPermit.js";

export interface OvernightPermitProps {
  route: Parameters<typeof overnightPermitOf>[0];
}

/** The OVERNIGHT PERMIT card: what is needed, where to get it, and the issuing agency's page. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function OvernightPermit({route}: OvernightPermitProps){
  const p=overnightPermitOf(route);
  if(!p)return null;
  return <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"9px 11px",marginBottom:10}}>
    <div style={{...SUB_LABEL,marginBottom:3}}>{"OVERNIGHT PERMIT"}</div>
    {p.what?<div style={{fontSize:12.5,fontWeight:700,color:C.text,lineHeight:1.45}}>{p.what}</div>:null}
    {p.where?<div style={{fontSize:12,color:C.textSub,lineHeight:1.55,marginTop:3}}>{p.where}</div>:null}
    {p.url?<a href={p.url} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:8,padding:"8px 12px",background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:9,color:C.onSolid,fontSize:12.5,fontWeight:700,textDecoration:"none",textAlign:"center"}}>{"Get the permit →"}</a>:null}
  </div>;
}
