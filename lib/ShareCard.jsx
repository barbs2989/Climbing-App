// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
import { useState } from "react";
import { Av, C, HERO_BG, HERO_SHEEN, TrustBadge, vScore } from "../ClimbMatchCore.jsx";
import { POP_CLOSE } from "./popupChrome.js";

export default function ShareCard({climber,onClose,logsUnavailable,catchesUnavailable}){
  const [copied,setCopied]=useState("");
  const slug=climber.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const link="climbmatch.app/climber/"+slug;
  const grades=[["Sport",climber.sportGrade],["Trad",climber.tradGrade],["Boulder",climber.boulderGrade]].filter(g=>g[1]&&g[1]!=="N/A").map(g=>g[0]+" "+g[1]).join(" · ");
  const hl=(climber.highlights||[]).slice(0,3).map(h=>"• "+h).join("\n");
  /* Every field below is blank on a profile nobody has filled in yet, and this text is
     copied to the clipboard, mailed, texted and tweeted — so an absent level or age has
     to drop out of the sentence, not interpolate as the word "undefined". */
  const idLine=[climber.level?climber.level+" climber":"",climber.location||""].filter(Boolean).join(" · ");
  const expLine=[climber.years?climber.years+" yrs climbing":"",grades].filter(Boolean).join(" · ");
  const _slLogged=climber.routesLogged||0,_slCaught=(climber.catchLedger&&climber.catchLedger.totalCatches)||0;
  const _slParts=[(climber._real||climber._conn||climber._profile||typeof climber.id==="string")?null:("Trust "+vScore(climber))];if(!logsUnavailable)_slParts.push(_slLogged+" climb"+(_slLogged===1?"":"s")+" logged");if(!catchesUnavailable)_slParts.push(_slCaught+" catch"+(_slCaught===1?"":"es")+" caught");const statLine=_slParts.filter(Boolean).join(" · ");
  const summary=[climber.name+(idLine?" — "+idLine:""),expLine,statLine].filter(Boolean).join("\n")+(hl?"\n\n"+hl:"")+"\n\nMy ClimbMatch profile → https://"+link;
  const copy=async(text,what)=>{try{await navigator.clipboard.writeText(text);setCopied(what);}catch(e){setCopied("Couldn't copy");}setTimeout(()=>setCopied(""),1600);};
  const mailto="mailto:?subject="+encodeURIComponent(climber.name+" — ClimbMatch profile")+"&body="+encodeURIComponent(summary);
  const sms="sms:?&body="+encodeURIComponent(summary);
  const tweet="https://twitter.com/intent/tweet?text="+encodeURIComponent(summary);
  return <div onClick={onClose} role="dialog" aria-label="Share your climbing profile" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:850,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px 12px",overflowY:"auto",overscrollBehavior:"contain"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:420,border:`1px solid ${C.border}`,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:16,fontWeight:700}}>Share your climbing profile</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button></div>
      <div style={{padding:16}}>
        <div style={{background:HERO_BG,boxShadow:HERO_SHEEN,borderRadius:14,padding:16,marginBottom:14,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}><Av src={climber.avatar} size={56}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:17,fontWeight:700}}>{climber.name}</div><div style={{fontSize:12,color:C.textSub}}>{idLine||"Add your level and home area to fill this in"}</div><div style={{marginTop:4}}><TrustBadge score={vScore(climber)}/></div></div></div>
          {grades?<div style={{fontSize:13,color:C.textSub,marginBottom:10}}>{grades}</div>:null}
          <div style={{display:"flex",gap:7}}>{[["Years",climber.years],["Logged",logsUnavailable?"—":climber.routesLogged],["Catches",catchesUnavailable?"—":climber.catchLedger.totalCatches]].map(x=><div key={x[0]} style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:9,padding:"7px 4px",textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:C.blue}}>{x[1]}</div><div style={{fontSize:12,color:C.textMuted}}>{x[0]}</div></div>)}</div>
        </div>
        <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:5,letterSpacing:0.4}}>PUBLIC LINK</div>
        <div style={{display:"flex",gap:7,marginBottom:14}}><div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontSize:13,color:C.blue,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</div><button onClick={()=>copy("https://"+link,"link")} style={{padding:"9px 14px",background:C.blueChip,color:C.blue,border:"none",borderRadius:9,fontSize:13,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>{copied==="link"?"✓ Copied":"Copy"}</button></div>
        <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:5,letterSpacing:0.4}}>SHARE VIA</div>
        <div style={{display:"flex",gap:7,marginBottom:14}}>
          <a href={mailto} style={{flex:1,textDecoration:"none",textAlign:"center",padding:"10px 6px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.text}}>Email</a>
          <a href={sms} style={{flex:1,textDecoration:"none",textAlign:"center",padding:"10px 6px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.text}}>Text</a>
          <a href={tweet} target="_blank" rel="noreferrer" style={{flex:1,textDecoration:"none",textAlign:"center",padding:"10px 6px",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,fontSize:13,color:C.text}}>Post to X</a>
        </div>
        <div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:5,letterSpacing:0.4}}>COPY SUMMARY</div>
        <textarea aria-label="Copy summary" readOnly value={summary} onFocus={e=>e.target.select()} style={{width:"100%",height:124,overscrollBehavior:"contain",background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px",fontSize:12,color:C.textSub,boxSizing:"border-box",resize:"none",outline:"none",lineHeight:1.5,fontFamily:"inherit"}}/>
        <button onClick={()=>copy(summary,"summary")} style={{width:"100%",marginTop:8,padding:11,background:C.blueSolid,color:"white",border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:11,fontSize:14,cursor:"pointer",fontWeight:700}}>{copied==="summary"?"✓ Copied to clipboard":"Copy summary"}</button>
        <div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:11,lineHeight:1.5,fontStyle:"italic"}}>The public link doesn’t open a profile page — copy the summary above to share your climbing history.</div>
      </div>
    </div>
  </div>;
}
