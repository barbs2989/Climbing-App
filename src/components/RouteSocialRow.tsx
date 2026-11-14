import { C, OPEN_CREWS, RECENT_DAYS, realProfileId, FALLBACK_AV } from "../../ClimbMatchCore.jsx";
import { tx } from "../../lib/tapWords.js";
import { popInterest } from "../../lib/popInterest.js";
import { climbNoun } from "../../lib/discLabels.js";
import { clickable } from "../../lib/clickable";
import CountUp from "./CountUp.tsx";
import Av from "./Av.tsx";

/** One climber the presence channel names (visible, signed in). */
export interface SocialViewer {
  id?: string | null;
  name?: string | null;
  avatar?: string | null;
}

export interface RouteSocialRowProps {
  /** The route: its id (crews, saved counts) and discipline (the noun in a viewer's title). */
  route: { id: string; discipline?: string | null };
  /** `"body"` draws the chip strip on the Overview; `"header"` draws a bordered cell strip under the header's facts. */
  variant: "body" | "header";
  /** presenceSplit's answer: how many OTHERS are viewing, and the ones who chose to be named. */
  presence?: { others?: number; viewers?: SocialViewer[] } | null;
  /** Real crews from the database; OPEN_CREWS is the seed set. */
  dbCrews?: { routeId: string; spots: number }[] | null;
  /** How many real climbers saved this climb (objectives, grouped by route). */
  savedCountQ: { data?: Record<string, number> | null };
  /** Distinct climbers who logged it. */
  climberN: number;
  /** Trip reports in the last RECENT_DAYS. */
  recentN: number;
  /** How many trip reports there are at all; the "logged it" chip shows only when there is one. */
  activityN: number;
  /** Page views so far (route_stats, 0353: one per visitor, route and day); 0 until the read lands, and then the stat is left out. */
  pageViews?: number;
  setTab: (t: string) => void;
  onViewProfile?: ((p: { id: string | null; name: string; avatar: string; _real: boolean }) => void) | null;
}

interface Chip { n: number; label: string; reports?: boolean; plain?: boolean }

/**
 * The social-proof strip: viewing now, page views, crews eyeing, climbers who logged it, lists saved — ONE ROW (owner,
 * 2026-11-05), never wrapping; the body strip scrolls sideways if it must, the header strip is a cell grid
 * with a bottom border matching the facts strip above it. A stat that is zero is left out, never claimed as
 * "0" — a failed saved-count read looks like zero, and this must not say nobody saved it.
 * Each pill is its own control: the strip itself used to be the button (to Partners), with the viewer avatars
 * and the ascents chip as buttons INSIDE it — controls nested in a control, which a screen reader cannot
 * operate reliably (axe nested-interactive).
 */
export default function RouteSocialRow({route,variant,presence,dbCrews,savedCountQ,climberN,recentN,activityN,pageViews,setTab,onViewProfile}: RouteSocialRowProps){
  const vw=(presence&&presence.others)||0;const viewers=(presence&&presence.viewers)||[];
  const ey=[...OPEN_CREWS,...(dbCrews||[])].filter(function(oc){return oc.routeId===route.id&&oc.spots>0;}).length;
  const lists=popInterest(route)+(((savedCountQ.data||{})[route.id])||0);
  const pv=Number(pageViews)||0;
  const chips: Chip[]=[];
  if(pv)chips.push({n:pv,label:" page view"+(pv!==1?"s":""),plain:true});
  if(ey)chips.push({n:ey,label:" crew"+(ey!==1?"s":"")+" eyeing"});
  if(activityN)chips.push({n:climberN,label:" climber"+(climberN!==1?"s":"")+" logged it",reports:true});
  if(recentN)chips.push({n:recentN,label:" in the last "+RECENT_DAYS+" days",reports:true});
  if(lists>0)chips.push({n:lists,label:" climber"+(lists!==1?"s":"")+" saved it"});
  if(!(vw||viewers.length||chips.length))return null;
  /* "N climbers logged it" and "N in the last 45 days" are about the trip reports, not partners — they open them; the rest of the strip still goes to Partners. */
  const goFor=function(c: Chip){return c.plain?{}:c.reports?clickable(function(){setTab("conditions");setTimeout(function(){const el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});},60);}):clickable(()=>setTab("partners"));};
  const avatars=viewers.slice(0,4).map(function(vwr,i){/* A signed-in viewer opens THEIR OWN profile, by uid. It used to open a copy of the first example climber with the viewer's name pasted on -- their location, grades and disciplines -- under an id nothing could message. A signed-out viewer has no profile to open. */const _vid=realProfileId(vwr.id);return <span key={"v"+i} {...clickable(_vid?function(e: {stopPropagation: () => void}){e.stopPropagation();if(onViewProfile)onViewProfile({id:_vid,name:vwr.name||"Climber",avatar:vwr.avatar||FALLBACK_AV,_real:true});}:undefined)} title={(vwr.name||"A climber")+" is viewing this "+climbNoun(route)+" now"+(_vid?tx(" — tap to view their profile"):"")} style={{cursor:_vid?"pointer":"default",display:"inline-flex",flexShrink:0}}><Av src={vwr.avatar} size={22}/></span>;});
  if(variant==="header"){
    /* The header strip: the same cells as the facts grid above it (value over label, a rule between cells, a rule beneath), so the two read as one block. */
    const cells: {key: string; n: number; label: string; live?: boolean; go: ReturnType<typeof clickable>|Record<string,never>; plain?: boolean}[]=[];
    if(vw)cells.push({key:"vw",n:vw,label:"viewing now",live:true,go:clickable(()=>setTab("partners"))});
    chips.forEach(function(c,i){cells.push({key:"c"+i,n:c.n,label:c.label.trim(),go:goFor(c),plain:c.plain});});
    return <div style={{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",background:C.surface,borderBottom:`1px solid ${C.border}`}}>{cells.map(function(x,xi){/* THIN (owner, 2026-11-05: "make the boxes not as long, make it thinner"): number and label on ONE line, 4px of padding, so the row is half the facts strip's height. */return <div key={x.key} {...x.go} style={{padding:"4px 4px",textAlign:"center",cursor:x.plain?"default":"pointer",borderRight:xi===cells.length-1?"none":`1px solid ${C.border}`,minWidth:0,display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",columnGap:4,rowGap:0,lineHeight:1.2}}>{x.live?<span style={{width:6,height:6,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/>:null}<span style={{fontSize:11.5,fontWeight:800,color:x.live?C.green:C.text}}><CountUp value={x.n}/></span><span style={{fontSize:11,color:C.textMuted,overflowWrap:"anywhere"}}>{x.label}</span></div>;})}</div>;
  }
  return <div className="cm-stagger" style={{display:"flex",alignItems:"center",gap:7,flexWrap:"nowrap",overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:7,paddingBottom:2}}>{vw?<span {...clickable(()=>setTab("partners"))} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:20,padding:"4px 11px",flexShrink:0,whiteSpace:"nowrap"}}><span style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/><span style={{fontSize:12,fontWeight:700,color:C.green}}><CountUp value={vw}/> viewing now</span></span>:null}{avatars}{chips.map(function(c,i){return <span key={i} {...goFor(c)} style={{cursor:c.plain?"default":"pointer",display:"inline-flex",alignItems:"center",gap:4,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:C.textSub,flexShrink:0,whiteSpace:"nowrap"}}><b style={{color:C.text,fontWeight:800}}><CountUp value={c.n}/></b>{c.label}</span>;})}</div>;
}
