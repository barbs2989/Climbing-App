import { C, ROUTE_GAP } from "../../ClimbMatchCore.jsx";

export interface VerifNoteProps {
  /** The route; its `verif.status` is read. Nothing renders for a verified route or one with no status. */
  route?: { verif?: { status?: string | null } | string | null } | null;
}

/**
 * One muted line on Overview when a route is not verified: "Community-reported" or "Unverified". Names no source.
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function VerifNote({route}: VerifNoteProps){
  const v=route&&route.verif;
  if(!v||typeof v!=="object")return null;
  const st=String(v.status||"").toLowerCase();
  if(!st||st==="verified")return null;
  const note=st==="community"?"Community-reported":"Unverified";
  return <div style={{margin:ROUTE_GAP+"px 0",paddingLeft:9,borderLeft:"2px solid "+C.amber+"66"}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}><b style={{color:C.amber,fontWeight:700}}>{note}</b></span></div>;
}
