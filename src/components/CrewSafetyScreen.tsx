import { POP_BACK } from "../../lib/popupChrome.js";
import { C } from "../../ClimbMatchCore.jsx";
import { Suspense } from "react";
import ScreenSkeleton from "./ScreenSkeleton.tsx";
import { SafetyTab } from "../../lib/lazyScreens.js";
import { saveCrewSafetyAnswers } from "../../lib/db";

/* tab==="crew"&&safetyCrew&&safetyCrewObj? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function CrewSafetyScreen({crewAlignmentUnavailable,crewMarkSafe,fileCrewFloatPlan,safetyCrew,safetyCrewRoute,safetyDbId,safetyMeAnswers,safetyMeReady,safetyMembers,safetyServer,sendCrewMsg,setMeAnswers,setSafetyCrew,showToast,uid}){
  return <div style={{padding:14}}>
        <button onClick={()=>setSafetyCrew(null)} style={Object.assign({},POP_BACK,{marginBottom:12})}>← Back to crews</button><button onClick={()=>safetyMeAnswers&&!safetyMeReady&&crewMarkSafe(safetyCrew)} disabled={!safetyMeAnswers||safetyMeReady} title={safetyMeAnswers?undefined:"Complete your questionnaire below first"} style={{width:"100%",marginBottom:14,padding:"11px",borderRadius:10,border:"1px solid "+(safetyMeAnswers?C.green:C.border),background:safetyMeAnswers?C.greenBg:C.surface,color:safetyMeAnswers?C.green:C.textMuted,fontSize:13.5,fontWeight:800,cursor:safetyMeAnswers&&!safetyMeReady?"pointer":"default",opacity:safetyMeAnswers?1:0.6}}>{safetyMeReady?"✓ You’re marked safety-ready":safetyMeAnswers?"✓ I've reviewed this — mark me safety-ready":"Complete your questionnaire below to mark yourself ready"}</button>
        <div style={{background:C.redBg,borderRadius:12,padding:"13px 15px",marginBottom:14,border:`1px solid ${C.red}44`}}><div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:3}}>Safety check — {safetyCrewRoute.name}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.6}}>Backcountry objective. Align on risk, synthesize gear, and file a float plan with your crew before you commit.</div></div>
        <Suspense fallback={<ScreenSkeleton C={C} label="Loading safety plan…"/>}><SafetyTab who={uid} scope={safetyCrew?"crew:"+safetyCrew:null} onFiled={safetyCrew?()=>fileCrewFloatPlan(safetyCrew):undefined} onSendToCrew={safetyCrew?(text)=>sendCrewMsg(safetyCrew,text):undefined} members={safetyMembers} meAnswers={safetyMeAnswers} serverMode={!!safetyDbId} server={safetyServer} unavailable={crewAlignmentUnavailable} onComplete={a=>{if(safetyDbId){saveCrewSafetyAnswers(safetyDbId,uid,a).then(function(){showToast("Questionnaire saved — your crew sees only group-level flags");}).catch(function(e){showToast((e&&e.message)||"Your answers didn’t save — try again.");});return;}setMeAnswers(a);showToast("Questionnaire complete");}}/></Suspense>
        <div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:12,lineHeight:1.5,fontStyle:"italic"}}>{safetyDbId?"Only you can see your answers. Your crew sees group-level counts, never who answered what.":"Other crew members' answers shown here are simulated, not ones they entered."}</div>
      </div>;
}
