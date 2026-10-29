import { useEffect, useRef, useState, type CSSProperties } from "react";
import { C, CAT, NONCOMPLETION_TICKS, ROUTES, catOf, rDiscs, routeGradeSystem } from "../../ClimbMatchCore.jsx";
import Chevron from "./Chevron.tsx";
import DiscIcon from "./DiscIcon.tsx";

/** A logged climb as the profile hands it over: the route it names and how it was ticked. */
export interface PyramidLog {
  routeId: string | number;
  tickType?: string | null;
}
/** The route a log resolves to; `catOf`, `rDiscs` and `routeGradeSystem` read the whole row. */
export interface PyramidRoute {
  id: string | number;
  grade?: string | null;
  discipline?: string | null;
  style?: string | null;
}
/** Another climber's stored pyramid (`profiles`): sends per grade, roped and bouldering. */
export interface StoredPyramid {
  rock?: Record<string, number> | null;
  boulder?: Record<string, number> | null;
}
/** One grade's bar: how many logs, how many were sends, and the count per style. */
interface GradeRow { grade: string; count: number; sent: number; by: Record<string, number> }
export interface AscentPyramidProps {
  /** Your own logs (real rows); when present they win over `pyramid`. */
  logs?: ReadonlyArray<PyramidLog> | null;
  pyramid?: StoredPyramid | null;
  routeById?: (id: string | number) => PyramidRoute | null | undefined;
  emptyMsg?: string;
}

/** SENDS BY GRADE on a profile: one stacked bar per grade, a segment per style (onsight … top-rope, "not sent" faint), grouped by grade system, with a discipline filter. */
export default function AscentPyramid({logs,pyramid,routeById,emptyMsg}: AscentPyramidProps){
  /* `CAT` keyed by discipline. Read HERE, at render time, never at module scope: core imports this component back (FullProfile renders it). */
  const cats: Record<string, { label?: string; color?: string }>=CAT;
  const SYSUMBR: Record<string, string>={yds:"Roped climbing",v:"Bouldering",class:"Peaks & scrambles",wi:"Ice",m:"Mixed",aid:"Aid"};
  const SORD=["yds","v","class","wi","m","aid"];
  const ord=(sys: string,g: string)=>{if(sys==="yds"){const mm=g&&g.match(/5\.(\d+)([a-d]?)/);return mm?parseInt(mm[1])+(mm[2]?("abcd".indexOf(mm[2])+1)/4:0.5):0;}const m=g&&g.match(/\d+/);return m?parseInt(m[0]):0;};
  /* One category per STYLE, not per rank. The bar used to take one colour from the best tick at a
     grade and the legend merged "Onsight / flash" and "Redpoint / lead", so a grade climbed once
     onsight and once on top-rope read the same as two onsights, and an onsight could not be told
     from a flash at all. Each grade is now a stacked bar with a segment per style, in this order
     (most to least committing). Hung/Fell/Attempt/Project are drawn as a faint "Not sent" segment
     and are NOT counted as sends -- the old header counted them in "N sends". */
  const STYLES: [string, string, string][]=[["onsight","Onsight",C.green],["flash","Flash",C.teal],["redpoint","Redpoint",C.blue],["lead","Lead",C.indigo],["send","Send",C.cyan],["summit","Summit",C.lime],["follow","Follow",C.amber],["tr","Top-rope",C.orange],["none","Not sent",C.textMuted]];
  const STYLE_OF: Record<string, string>={Onsight:"onsight",Flash:"flash",Redpoint:"redpoint",Lead:"lead",Send:"send",Sent:"send",Repeat:"send",Completed:"send",Summit:"summit",Follow:"follow","Top-rope":"tr","Top rope":"tr",Toprope:"tr",TR:"tr",Project:"none"};
  const styleOf=(t?: string | null)=>STYLE_OF[t||""]||(NONCOMPLETION_TICKS.indexOf(t||"")>=0?"none":"send");
  const useLogs=!!(logs&&logs.length);
  const [discF,setDiscF]=useState<string[]>([]);
  const [ddOpen,setDdOpen]=useState(false);
  /* A tap anywhere outside the open menu closes it. This was a full-screen catcher portalled to body (#690, so it cleared the tabs), but inside the résumé (9900) a body-level catcher lay UNDER the résumé and a tap outside closed nothing. A document listener needs no layer, so it works on the Profile tab and in the résumé alike. */
  const ddRef=useRef<HTMLDivElement | null>(null);
  useEffect(()=>{if(!ddOpen)return undefined;const h=(e: PointerEvent)=>{if(ddRef.current&&e.target instanceof Node&&!ddRef.current.contains(e.target))setDdOpen(false);};document.addEventListener("pointerdown",h,true);return ()=>document.removeEventListener("pointerdown",h,true);},[ddOpen]);
  const allDiscs=useLogs?[...new Set((logs||[]).map(l=>{const r=(routeById?routeById(l.routeId):ROUTES.find(x=>x.id===l.routeId));return r?catOf(r):null;}).filter((d): d is string => !!d))]:[];
  const flogs=useLogs?(logs||[]).filter(l=>{const r=(routeById?routeById(l.routeId):ROUTES.find(x=>x.id===l.routeId));return r&&(!discF.length||discF.some(_d=>rDiscs(r).includes(_d)));}):null;
  const bySys: Record<string, Record<string, GradeRow>>={},discsInSys: Record<string, Set<string>>={};
  if(useLogs&&flogs)flogs.forEach(l=>{const r=(routeById?routeById(l.routeId):ROUTES.find(x=>x.id===l.routeId));if(!r||!r.grade)return;if(/snow|glacier/i.test(r.grade))return;const sys=routeGradeSystem(r);if(!sys)return;(bySys[sys]=bySys[sys]||{});const e=(bySys[sys][r.grade]=bySys[sys][r.grade]||{grade:r.grade,count:0,sent:0,by:{}});const st=styleOf(l.tickType);e.count++;if(st!=="none")e.sent++;e.by[st]=(e.by[st]||0)+1;(discsInSys[sys]=discsInSys[sys]||new Set()).add(catOf(r));});
  else if(pyramid){const add=(sys: string,obj?: Record<string, number> | null)=>{Object.keys(obj||{}).forEach(g=>{const n=obj?obj[g]:0;if(!n)return;(bySys[sys]=bySys[sys]||{});bySys[sys][g]={grade:g,count:n,sent:n,by:{}};});};add("yds",pyramid.rock);add("v",pyramid.boulder);}
  const systems=Object.keys(bySys).sort((a,b)=>SORD.indexOf(a)-SORD.indexOf(b));
  const sysLabel=(sys: string)=>{const ds=discsInSys[sys]?[...discsInSys[sys]]:[];return ds.length===1&&cats[ds[0]]?<span style={{display:"inline-flex",alignItems:"center",gap:5}}><DiscIcon d={ds[0]} size={12} color={cats[ds[0]].color}/>{cats[ds[0]].label}</span>:(SYSUMBR[sys]||sys);};
  const card: CSSProperties={background:C.card,borderRadius:12,border:"1px solid "+C.border,padding:"14px 16px"};
  const toggle=(d: string)=>setDiscF(v=>v.includes(d)?v.filter(x=>x!==d):[...v,d]);
  const dd=allDiscs.length>1?<div ref={ddRef} style={{position:"relative",marginBottom:14}}>
      <button onClick={()=>setDdOpen(o=>!o)} aria-expanded={ddOpen} style={{minHeight:44,width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 11px",borderRadius:10,border:"1px solid "+(discF.length?C.blue:C.border),background:C.surface,color:C.text,fontSize:12.5,fontWeight:600,cursor:"pointer"}}><span style={{flex:1,textAlign:"left",color:discF.length?C.text:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{discF.length?discF.map(d=>(cats[d]||{}).label||d).join(", "):"All disciplines"}</span>{discF.length?<span style={{flexShrink:0,fontSize:11.5,fontWeight:700,color:C.onSolid,background:C.blueBg,borderRadius:9,padding:"2px 7px"}}>{discF.length}</span>:null}<Chevron open={ddOpen} size={15} color={C.textMuted}/></button>
      {ddOpen?<div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:6,zIndex:41,background:C.surface,border:"1px solid "+C.border,borderRadius:11,boxShadow:"0 10px 30px rgba(0,0,0,0.5)",padding:7,maxHeight:280,overflowY:"auto",overscrollBehavior:"contain"}}><button onClick={()=>setDiscF([])} aria-current={!discF.length?"true":undefined} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 9px",borderRadius:8,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",background:discF.length?"transparent":C.blueBg,color:C.text,fontSize:12.5,fontWeight:600,cursor:"pointer",textAlign:"left"}}><span style={{width:16,height:16,borderRadius:5,border:"1px solid "+(!discF.length?C.blue:C.border),background:!discF.length?C.blueSolid:"transparent",color:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{!discF.length?"✓":""}</span>All disciplines</button>{allDiscs.map(d=>{const on=discF.includes(d),cat=cats[d]||{};return <button key={d} onClick={()=>toggle(d)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 9px",borderRadius:8,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",background:on?C.blueBg:"transparent",color:C.text,fontSize:12.5,fontWeight:600,cursor:"pointer",textAlign:"left"}}><span style={{width:16,height:16,borderRadius:5,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueSolid:"transparent",color:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{on?"✓":""}</span><span style={{display:"inline-flex",alignItems:"center",gap:5}}><DiscIcon d={d} size={18}/>{cat.label||d}</span></button>;})}</div>:null}
    </div>:null;
  if(!systems.length)return <div style={card}>{dd}<div style={{fontSize:12.5,color:C.textMuted,textAlign:"center",lineHeight:1.6,padding:"8px 0"}}>{useLogs?"No sends in the selected disciplines — adjust the filter above.":(emptyMsg||"Log your ascents and they’ll stack up here by grade.")}</div></div>;
  const used: Record<string, number>={};if(useLogs)systems.forEach(sys=>Object.values(bySys[sys]).forEach(r=>Object.keys(r.by).forEach(k=>{used[k]=(used[k]||0)+r.by[k];})));
  const rowLabel=(r: GradeRow)=>r.grade+": "+(useLogs?STYLES.filter(x=>r.by[x[0]]).map(x=>r.by[x[0]]+" "+x[1].toLowerCase()).join(", "):r.count+" send"+(r.count!==1?"s":""));
  return <div style={card}>{dd}{systems.map((sys,si)=>{const rows=Object.values(bySys[sys]).sort((a,b)=>ord(sys,b.grade)-ord(sys,a.grade));const max=Math.max.apply(null,rows.map(r=>r.count).concat([1]));const total=rows.reduce((t,r)=>t+r.sent,0);const tries=rows.reduce((t,r)=>t+(r.count-r.sent),0);const top=rows.find(r=>r.sent>0);const one=discsInSys[sys]&&[...discsInSys[sys]].length===1?[...discsInSys[sys]][0]:null;const accent=one&&cats[one]?(cats[one].color||C.blue):C.blue;return <div key={sys} style={{marginTop:si?20:0}}><div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:11,flexWrap:"wrap"}}><span style={{fontSize:11.5,fontWeight:800,color:C.text,letterSpacing:0.3}}>{sysLabel(sys)}</span><span style={{fontSize:12,color:C.textMuted}}>{total+" send"+(total!==1?"s":"")+(top?" · top "+top.grade:"")+(tries?" · "+tries+" not sent":"")}</span></div>{rows.map(r=>{const w=Math.max(r.count/max*100,14);const segs: [string, string, string][]=useLogs?STYLES.filter(x=>r.by[x[0]]):[["all","",accent]];return <div key={r.grade} role="img" aria-label={rowLabel(r)} style={{display:"flex",alignItems:"center",gap:11,marginBottom:7}}><div style={{width:48,textAlign:"right",fontSize:12,fontWeight:700,color:C.textSub,flexShrink:0,letterSpacing:-0.2}}>{r.grade}</div><div style={{flex:1,height:22,borderRadius:11,background:"rgba(255,255,255,0.045)",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",left:0,top:0,bottom:0,width:w+"%",minWidth:30,display:"flex",gap:2,borderRadius:11,overflow:"hidden"}}>{segs.map(x=>{const n=useLogs?r.by[x[0]]:r.count;const faint=x[0]==="none";return <div key={x[0]} style={{flex:n,minWidth:6,background:faint?x[2]+"40":"linear-gradient(90deg,"+x[2]+"cc,"+x[2]+")",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{n/r.count*w>=9?<span style={{fontSize:11.5,fontWeight:800,color:faint?C.text:"#0d1117"}}>{n}</span>:null}</div>;})}</div></div></div>;})}</div>;})}{useLogs&&Object.keys(used).length?<div style={{display:"flex",gap:"6px 13px",flexWrap:"wrap",marginTop:14,paddingTop:11,borderTop:"1px solid "+C.borderLight}}>{STYLES.filter(x=>used[x[0]]).map(x=><span key={x[0]} style={{fontSize:12,color:C.textMuted,display:"flex",alignItems:"center",gap:5}}><span style={{width:9,height:9,borderRadius:3,background:x[0]==="none"?x[2]+"40":x[2],display:"inline-block"}}/>{x[1]+" "}<span style={{color:C.textSub,fontWeight:700}}>{used[x[0]]}</span></span>)}</div>:null}</div>;
}
