import { POP_BACK } from "../../lib/popupChrome.js";
import { C } from "../../ClimbMatchCore.jsx";
import { Suspense } from "react";
import ScreenSkeleton from "./ScreenSkeleton.tsx";
import { SafetyTab } from "../../lib/lazyScreens.js";
import { saveCrewSafetyAnswers } from "../../lib/db";
import type { Dispatch, SetStateAction } from "react";

/** A crew's id, as the crew list and the safety screen carry it. */
type CrewSafetyScreenCrewId = string | number;
/** The questionnaire answers: a map of question to chosen option. */
type CrewSafetyScreenAnswers = Record<string, unknown>;

export interface CrewSafetyScreenProps {
  /** The crew's stored alignment (or the climber's own answers) could not be read. */
  crewAlignmentUnavailable: boolean;
  crewMarkSafe: (crewId: CrewSafetyScreenCrewId | null) => void;
  fileCrewFloatPlan: (crewId: CrewSafetyScreenCrewId | null) => void;
  /** The id of the crew whose safety plan is open. */
  safetyCrew: CrewSafetyScreenCrewId | null;
  safetyCrewRoute: { name?: string };
  /** The stored crew's database id; null for a demo crew. */
  safetyDbId: string | null;
  /** The signed-in climber's answers, or null while they have none. */
  safetyMeAnswers: CrewSafetyScreenAnswers | null;
  safetyMeReady: boolean;
  /** The climbers whose answers the alignment is computed over. */
  safetyMembers: unknown[];
  /** The group-level alignment the server computed, for a stored crew. */
  safetyServer: unknown;
  sendCrewMsg: (crewId: CrewSafetyScreenCrewId | null, text: string) => void;
  setMeAnswers: Dispatch<SetStateAction<CrewSafetyScreenAnswers | null>>;
  setSafetyCrew: Dispatch<SetStateAction<CrewSafetyScreenCrewId | null>>;
  showToast: (t: string, d?: number) => void;
  uid: string | null;
}

/* tab==="crew"&&safetyCrew&&safetyCrewObj? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function CrewSafetyScreen({crewAlignmentUnavailable,crewMarkSafe,fileCrewFloatPlan,safetyCrew,safetyCrewRoute,safetyDbId,safetyMeAnswers,safetyMeReady,safetyMembers,safetyServer,sendCrewMsg,setMeAnswers,setSafetyCrew,showToast,uid}: CrewSafetyScreenProps){
  return <div style={{padding:14}}>
        <button onClick={()=>setSafetyCrew(null)} style={Object.assign({},POP_BACK,{marginBottom:12})}>← Back to crews</button><button onClick={()=>safetyMeAnswers&&!safetyMeReady&&crewMarkSafe(safetyCrew)} disabled={!safetyMeAnswers||safetyMeReady} title={safetyMeAnswers?undefined:"Complete your questionnaire below first"} style={{width:"100%",marginBottom:14,padding:"11px",borderRadius:10,border:"1px solid "+(safetyMeAnswers?C.green:C.border),background:safetyMeAnswers?C.greenBg:C.surface,color:safetyMeAnswers?C.green:C.textMuted,fontSize:13.5,fontWeight:800,cursor:safetyMeAnswers&&!safetyMeReady?"pointer":"default",opacity:safetyMeAnswers?1:0.6}}>{safetyMeReady?"✓ You’re marked safety-ready":safetyMeAnswers?"✓ I've reviewed this — mark me safety-ready":"Complete your questionnaire below to mark yourself ready"}</button>
        <div style={{background:C.redBg,borderRadius:12,padding:"13px 15px",marginBottom:14,border:`1px solid ${C.red}44`}}><div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:3}}>Safety check — {safetyCrewRoute.name}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.6}}>Backcountry objective. Align on risk, synthesize gear, and file a float plan with your crew before you commit.</div></div>
        <Suspense fallback={<ScreenSkeleton C={C} label="Loading safety plan…"/>}><SafetyTab who={uid} scope={safetyCrew?"crew:"+safetyCrew:null} onFiled={safetyCrew?()=>fileCrewFloatPlan(safetyCrew):undefined} onSendToCrew={safetyCrew?(text: string)=>sendCrewMsg(safetyCrew,text):undefined} members={safetyMembers} meAnswers={safetyMeAnswers} serverMode={!!safetyDbId} server={safetyServer} unavailable={crewAlignmentUnavailable} onComplete={(a: CrewSafetyScreenAnswers)=>{if(safetyDbId){saveCrewSafetyAnswers(safetyDbId,uid,a).then(function(){showToast("Questionnaire saved — your crew sees only group-level flags");}).catch(function(e: Error){showToast((e&&e.message)||"Your answers didn’t save — try again.");});return;}setMeAnswers(a);showToast("Questionnaire complete");}}/></Suspense>
        <div style={{fontSize:12,color:C.textMuted,textAlign:"center",marginTop:12,lineHeight:1.5,fontStyle:"italic"}}>{safetyDbId?"Only you can see your answers. Your crew sees group-level counts, never who answered what.":"Other crew members' answers shown here are simulated, not ones they entered."}</div>
      </div>;
}
