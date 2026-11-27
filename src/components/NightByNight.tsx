import { campNightRowLabel } from "../../lib/camps.js";
import { C, ROUTE_GAP, uElev } from "../../ClimbMatchCore.jsx";
import type { CampRow } from "./CampSite.tsx";

export interface NightByNightProps {
  /** campNightPlan(): one row per night (or run of nights) with its usual camp and the other options. */
  plan: { nights: number[]; main: CampRow | null; alts: CampRow[] }[];
  /** Length of the trip plan in days. */
  dayCount: number;
}

/* NIGHT BY NIGHT (owner note 2026-11-26: "on day one people usually camp at this spot, day two, day
   three ... and provide information on other options to give them context to why they would camp
   there"). One row per night of the trip plan: the camp most parties sleep at, why, and the other
   camps a party uses that night with the reason each would be picked instead. Built only from
   researched nights (campNightPlan); renders nothing when there are none. The `why` lives here and
   not again on the camp's own card, so a reason is printed once. */
export default function NightByNight({plan,dayCount}: NightByNightProps){
  if(!plan||!plan.length)return null;
  const nm=function(s: CampRow){return String((s&&s.name)||"").trim()+(s&&s.elev!=null?" · "+uElev(s.elev):"");};
  return <section aria-label="Night by night" style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px 4px",marginBottom:ROUTE_GAP}}>
    <div style={{fontSize:11.5,fontWeight:800,color:C.green,letterSpacing:0.6}}>{"NIGHT BY NIGHT"}</div>
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:2,marginBottom:6}}>{"Where most parties sleep on the "+dayCount+"-day trip plan, and the other camps they use."}</div>
    {plan.map(function(r,ri){
      const lbl=campNightRowLabel(r.nights);
      /* A camp slept at again after a night that differed only in its options keeps its reason on its first row. */
      const said=!!r.main&&plan.slice(0,ri).some(function(q){return q.main===r.main;});
      return <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",borderTop:"1px solid "+C.borderLight}}>
        <div style={{width:62,flexShrink:0,fontSize:11.5,fontWeight:800,color:C.green,lineHeight:1.35,paddingTop:1}}>{lbl}</div>
        <div style={{flex:1,minWidth:0}}>
          {r.main?<>
            <div style={{fontSize:13.5,fontWeight:700,color:C.text,lineHeight:1.35,wordBreak:"break-word"}}>{nm(r.main)}</div>
            {r.main.why&&!said?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginTop:2}}>{r.main.why}</div>:null}
          </>:r.nights[0]===0?null:<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45}}>{"No usual camp on file for this night."}</div>}
          {r.alts.length?<div style={{marginTop:6}}>
            <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.6,marginBottom:2}}>{r.main?"OTHER OPTIONS":r.nights[0]===0?"CAMPGROUNDS":"CAMPS USED"}</div>
            {r.alts.map(function(a){return <div key={String(a.name)} style={{fontSize:12.5,lineHeight:1.5,marginBottom:4}}>
              <span style={{fontWeight:700,color:C.text}}>{nm(a)}</span>
              {a.why?<span style={{color:C.textSub}}>{" — "+a.why}</span>:null}
            </div>;})}
          </div>:null}
        </div>
      </div>;
    })}
  </section>;
}
