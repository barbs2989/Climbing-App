import { C, CLIMBERS, DLOCALE, ME, catOf, sunReadout } from "../../ClimbMatchCore.jsx";
import Av from "./Av.tsx";
import CardHead from "./CardHead.tsx";

/** The route as this panel reads it; `catOf` takes the whole row. */
export interface AspectRoute {
  id: string | number;
  aspect?: string | null;
  sunNote?: string | null;
  discipline?: string | null;
  style?: string | null;
}
/** One climber's sun report: more sun than forecast, more shade, or as described. */
export interface SunReport {
  vote: string;
  /** `0` is ME; otherwise a seed climber id, or a name and avatar carried on the report. */
  uid?: number | string | null;
  name?: string | null;
  avatar?: string | null;
  note?: string | null;
}
export interface AspectSunPanelProps {
  route: AspectRoute;
  /** Reports keyed by route id. */
  sunReports?: Record<string, SunReport[]> | null;
  onSuggestSun?: (route: AspectRoute) => void;
}

/** ASPECT & SUN at the foot of a crag route's Overview: which way the face points, sun or shade right now, the sun note, and climbers' sun reports. Says so when no aspect is recorded. */
export default function AspectSunPanel({route,sunReports,onSuggestSun}: AspectSunPanelProps){
  /* Returning null here made the gap invisible: no aspect meant no ASPECT & SUN heading at all, so
     the planner silently omitted whether the face bakes or stays frozen. Say so in this section
     rather than in a page-level banner — the section is where someone goes looking for it. */
  if(!route.aspect)return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><CardHead style={{marginBottom:8}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><span aria-hidden="true" style={{fontSize:14}}>☀️</span>ASPECT & SUN</span></CardHead><div style={{background:C.surface,border:"1px dashed "+C.border,borderRadius:11,padding:"10px 12px"}}><div style={{fontSize:12.5,fontWeight:700,color:C.textSub,marginBottom:3}}>No aspect recorded</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>Nothing says which way this face points, so there is no sun-and-shade timing for it. Climbed it? Note the aspect in your trip report.</div></div></div>;
  const sr=sunReadout(route.aspect,catOf(route));const tnow=new Date().toLocaleTimeString(DLOCALE,{hour:"numeric",minute:"2-digit"});const _asp=String(route.aspect||"").trim();/* "S"/"NE"/"S/SW" read as "S-facing"; "varied", or a whole descriptive sentence, does not */const _aspLab=/^[NSEW]{1,3}([/ -][NSEW]{1,3})*$/i.test(_asp)?_asp+"-facing.":_asp.replace(/\.?$/,".");return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><CardHead style={{marginBottom:10}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><span aria-hidden="true" style={{fontSize:14}}>☀️</span>ASPECT & SUN</span></CardHead><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}><b style={{color:C.text}}>{_aspLab}</b> {sr.sunNow==null?null:<span style={{color:sr.sunNow?C.amber:C.blue,fontWeight:600}}><span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:C.green,marginRight:6,animation:"cm-pulse 2s infinite",verticalAlign:"middle"}}/>{sr.sunNow?"In sun now":"In shade now"} ({tnow}).</span>} {sr.line}</div><div style={{fontSize:12,color:C.textMuted,marginTop:5,lineHeight:1.5}}>{route.sunNote}</div>{(function(){const reps=(sunReports&&sunReports[route.id])||[];const more=reps.filter(function(r){return r.vote==="more";}).length;const less=reps.filter(function(r){return r.vote==="less";}).length;const voteLab: Record<string, string>={more:"reports more sun",less:"reports more shade",accurate:"says as described"};return <div style={{marginTop:10}}>{reps.length?<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"9px 11px",marginBottom:8}}><div style={{fontSize:12,fontWeight:800,letterSpacing:0.3,color:C.textMuted,marginBottom:7}}>{"CLIMBER SUN REPORTS ("+reps.length+")"}</div>{(more>0&&more>less&&more*2>=reps.length)?<div style={{fontSize:12,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"44",borderRadius:8,padding:"6px 9px",marginBottom:8,lineHeight:1.45}}>{more+" of "+reps.length+" climbers who have been there report more sun than the forecast model shows — plan for it."}</div>:null}{reps.slice(0,3).map(function(rp,ri){const cl=rp.uid===0?ME:(CLIMBERS.find(function(x){return x.id===rp.uid;})||{name:rp.name||"Climber",avatar:rp.avatar||""});return <div key={ri} style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:ri?9:0}}><Av src={cl.avatar} size={24}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12}}><span style={{fontWeight:700,color:C.text}}>{cl.name}</span> <span style={{color:rp.vote==="more"?C.amber:rp.vote==="less"?C.blue:C.green,fontWeight:600}}>{voteLab[rp.vote]||rp.vote}</span></div>{rp.note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.45,marginTop:2}}>{rp.note}</div>:null}</div></div>;})}</div>:null}<button onClick={function(){onSuggestSun?.(route);}} style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{reps.length?"⊕ Add your sun report":"Climbed it? Suggest a sun correction"}</button></div>;})()}</div>;
}
