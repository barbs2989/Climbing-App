import { useState } from "react";
import { uLen } from "../../lib/uLen.js";
import { C } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import Chevron from "./Chevron.tsx";

/** One rappel station, as rappel_detail stores it, numbered by the table (`_n`). */
export interface RappelStation {
  n?: number | null;
  _n: number;
  /** Metres; null where no source gives the distance. */
  lengthM?: number | null;
  anchor?: string | null;
  station?: string | null;
  hazards?: string[] | string | null;
  pull?: string | null;
  notes?: string | null;
}
export interface RappelRowProps {
  r: RappelStation;
  /** The first row opens expanded. */
  first?: boolean;
}

/* ONE RAPPEL, a dropdown like a CampSite (owner, 2026-10-24: "to reduce screen space"). The row
   always shows what a party scans the list FOR — which rap, how long, off what — and the prose
   (finding the station, hazards, the pull, notes) is one tap away. The first opens expanded, as
   the first camp does, so the section proves its rows hold detail. A collapsed row still SAYS it
   has hazards, in red with a count: a station's danger must not hide behind a tap unannounced. */
/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */
export default function RappelRow({r,first}: RappelRowProps){
  const [open,setOpen]=useState(!!first);
  const _haz=Array.isArray(r.hazards)?r.hazards.filter(Boolean):(r.hazards?[r.hazards]:[]);
  const more=!!(r.station||_haz.length||r.pull||r.notes);
  const len=r.lengthM!=null?uLen(r.lengthM):"—";
  const label="Rappel "+r._n+", "+len+(r.anchor?", "+r.anchor:"")+(_haz.length?", "+_haz.length+(_haz.length===1?" hazard":" hazards"):"");
  return <div style={{border:"1px solid "+(open&&more?C.red+"55":C.border),borderRadius:10,marginBottom:8,overflow:"hidden"}}>
    <div {...(more?clickable(function(){setOpen(!open);}):{})} aria-expanded={more?open:undefined} aria-label={more?((open?"Hide":"Show")+" detail for "+label):undefined} style={{minHeight:44,boxSizing:"border-box",display:"flex",gap:10,padding:"9px 11px",alignItems:"center",cursor:more?"pointer":"default"}}>
      <div style={{width:26,height:26,borderRadius:7,background:C.surface,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:C.textSub}}>{"R"+r._n}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:700,color:C.red,flexShrink:0,whiteSpace:"nowrap"}}>{len}</span><span style={{fontSize:11.5,fontWeight:600,color:/bolt/i.test(r.anchor||"")?C.green:C.blue,textAlign:"right",minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r.anchor||"—"}</span></div>
        {more?<div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
          {_haz.length?<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,color:C.red}}><ActionIcon name="alert" size={11} color={C.red}/>{_haz.length+(_haz.length===1?" hazard":" hazards")}</span>:null}
          <span style={{fontSize:11.5,fontWeight:700,color:C.blue,marginLeft:"auto",whiteSpace:"nowrap"}}>{open?"Less ":"More "}<Chevron inline open={open} size={13} color={C.blue}/></span>
        </div>:null}
      </div>
    </div>
    {more&&open?<div style={{padding:"0 11px 9px 47px"}}>{r.station?<div style={{marginTop:0,marginBottom:_haz.length||r.notes||r.pull?6:0,background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"6px 9px"}}><div style={{fontSize:9.5,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Finding the station</div><div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{r.station}</div></div>:null}{_haz.length?<div style={{marginBottom:r.notes||r.pull?6:0,display:"flex",flexDirection:"column",gap:4}}>{_haz.map((h: string,hi: number)=><div key={hi} style={{display:"flex",gap:6,alignItems:"flex-start",background:C.redBg,border:"1px solid "+C.red+"55",borderRadius:8,padding:"5px 8px"}}><span style={{flexShrink:0,marginTop:1}}><ActionIcon name="alert" size={12} color={C.red}/></span><span style={{fontSize:11.5,color:C.text,lineHeight:1.45}}>{h}</span></div>)}</div>:null}{r.pull?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginBottom:r.notes?5:0}}><span style={{fontWeight:800,textTransform:"uppercase",letterSpacing:0.4,fontSize:9.5,color:C.textMuted,marginRight:5}}>Pull</span>{r.pull}</div>:null}{r.notes?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{r.notes}</div>:null}</div>:null}
  </div>;
}
