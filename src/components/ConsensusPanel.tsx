import { useMemo, useState, useCallback } from "react";
import { isRoadTag, isHazardTag, useRealAuthors, buildConsensus, C, ROUTE_GAP, ago, isRecent, SUB_LABEL, RECENT_DAYS, catOf, uTempU, uElev, MONTHS } from "../../ClimbMatchCore.jsx";
import { routeKw, hazardCategory, hazardCleared } from "../../lib/routeKw.js";
import { reportTrend } from "../../lib/reportTrend.js";
import { climbNoun } from "../../lib/discLabels.js";
import CardHead from "./CardHead.tsx";
import CRow from "./CRow.tsx";
import type { CRowProps, CRowItem } from "./CRow.tsx";
import ActionIcon from "./ActionIcon.tsx";
import Stars from "./Stars.tsx";
import { photoThumb } from "../../lib/photoThumb";
import { clickable } from "../../lib/clickable";

/** One trip report as this panel reads it. */
interface ConsensusReport {
  date?: string | null;
  condTags?: string[] | null;
  text?: string | null;
  /** The reporter's account id, so verified status and level can be looked up. */
  _authorId?: string | null;
  /** The reporter's display name and how they climbed it: the freshness row names the latest party. */
  user?: string | null;
  avatar?: string | null;
  tickType?: string | null;
  /** A report its climber kept private: it feeds the conditions and names nobody. */
  _anon?: boolean;
}
/** One per-condition tally from buildConsensus (temperature, snow, water...). */
interface CondTally {
  value?: string | number | null;
  n?: number;
  stale?: boolean;
  mostRecent?: string | null;
}
/** One month of the seasonal heatmap. */
interface MonthTally {
  count: number;
  stars: number;
  rated: number;
}

export interface ConsensusPanelProps {
  /** The route; its id keys the hazard votes, and routeKw/catOf read the rest. */
  route: Parameters<typeof catOf>[0] & { id: string; activity?: ConsensusReport[] | null; hazards?: string[] | null };
  /** The reports to summarise (route + mine + the database's); none means the route's own. */
  activity?: ConsensusReport[] | null;
  /** Still-there / gone-now tallies, keyed `routeId|label`. */
  hzVotes?: CRowProps["hzVotes"];
  /** Casts a hazard vote; without it the vote buttons are not drawn. */
  onVote?: CRowProps["onVote"];
  /** The reports read failed, so the summary may be partial. */
  reportsUnavailable?: boolean;
  /** The shared star rating (one vote per climber); when anyone has cast one it replaces the report average. */
  starSum?: { raters: number; stars: number | null } | null;
  /** Opens a RECENT PHOTOS tile in the route's photo viewer; without it the tiles are pictures, not controls. */
  onOpenPhoto?: ((url: string) => void) | null;
}

const VOLATILE_DISC=["alpine","mountaineering","ice","mixed"];
/* Exported for scripts/oneoff/probe-consensus-outage-copy.mjs, which renders it directly: it is
   the one surface here that takes the outage flag as a PROP, so it can be driven without a live
   query. Same reason seasonShort and campingGate are exported.
   Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function ConsensusPanel({route,activity,hzVotes,onVote,reportsUnavailable,starSum,onOpenPhoto}: ConsensusPanelProps){
  /* Road tags are left out of THIS panel's tallies: ROAD CONDITIONS sits on the same tab (at its foot) and
     says the same thing as sentences, so on a route with few reports TOP CONDITIONS REPORTED filled
     up with "Road/trailhead closed · Road: washout" and pushed the route's own conditions off it.
     Overview's one-line summary still counts them — the road has no section of its own there. */
  const activityAll=useMemo(function(){return (activity||route.activity||[]).map(function(a: ConsensusReport){return (a&&(a.condTags||[]).some(isRoadTag))?Object.assign({},a,{condTags:(a.condTags as string[]).filter(function(t: string){return !isRoadTag(t);})}):a;});},[activity,route.activity]);
  const [openK,setOpenK]=useState<string|null>(null);const voteFor=useCallback(function(label: string){/* A vote is cast on the hazard CATEGORY (the row's label), so a report's tag is mapped to its category first: looked up raw, "Rockfall observed" never found the votes on "Rockfall", and this tab kept warning of a hazard Overview had cleared. */return hzVotes&&hzVotes[route.id+"|"+(hazardCategory(label)||label)];},[route.id,hzVotes]);/* Real reporters' verified status and level (useRealAuthors): both memos read them, so both re-run when they land. */const authorsV=useRealAuthors(activityAll.map(function(a: ConsensusReport){return a&&a._authorId;}));const c=useMemo(()=>buildConsensus(activityAll,voteFor),[activityAll,voteFor,authorsV]);const k=useMemo(()=>routeKw(Object.assign({},route,{activity:activityAll})),[route.id,activityAll,route.hazards,authorsV]); // eslint-disable-line react-hooks/exhaustive-deps -- authorsV is deliberate: the author cache (useRealAuthors) fills after render and buildConsensus reads it; route is keyed by route.id/route.hazards
  if(!c)return <div style={{color:C.textMuted,fontSize:13,padding:10,marginBottom:ROUTE_GAP}}>{reportsUnavailable?"Couldn’t load this "+climbNoun(route)+"'s reports — try again in a moment.":"No reports yet — be the first to log this climb."}</div>;const _dates=(activityAll||[]).map(function(a: ConsensusReport){return a.date;}).filter(Boolean).sort();const _latest=_dates[_dates.length-1];/* ONE age ladder, not two. This was a private reimplementation of core's ago(), and the two
     rendered the SAME DATE about 700px apart on this tab: "Updated 3mo ago" above "Most recent
     report: 2mo ago - 2026-06-20", because this ROUNDED (Math.round(75/30) is 3) where ago()
     FLOORS (2). Measured over every distinct date the seed catalog renders, the two disagreed on
     34 of 35. It also had no year bucket at all, so a 2023 report read "44mo ago". The
     four-grade-parsers shape, on dates. ago() is already imported here and already formats
     c.lastDate below -- the very value _latest duplicates -- so this is a consolidation onto the
     helper that was already right, not a third spelling. */
  /* The trend reads the newest RECENT reports by whole word (lib/reportTrend.js): substring tests made "nice day, great photo" trend poor, and called ice bad news on an ice route. A stale route gets no arrow and no live pulse — "Updated 2y ago" beside a pulsing dot read as current. */
  const _live=!!_latest&&isRecent(_latest);const _tk=_live?reportTrend(activityAll,{isRecent:isRecent,snowAndIceOk:VOLATILE_DISC.indexOf(catOf(route))>=0}):null;const _trend=_tk==="good"?{a:"↗",l:"trending good",c:C.green}:_tk==="poor"?{a:"↘",l:"trending poor",c:C.red}:_tk==="steady"?{a:"→",l:"holding steady",c:C.textSub}:null;
  /* WHO REPORTED LAST rides on the summary line. A private report has no author, so it reads "a climber": its stand-in name is "A climber (private report)", and taking the first word of that printed "by A". */
  const _newest=(activityAll||[]).filter(function(a: ConsensusReport){return a&&a.date===_latest;})[0];const _latestBy=_newest?(((_newest.user&&!_newest._anon)?String(_newest.user).split(" ")[0]:"a climber")+(_newest.tickType?" ("+_newest.tickType+")":"")):"";
  /* EACH FACT ONCE (owner, 2026-11-18: "very confusing and difficult to understand"). This card used to give the report count four times, the newest date twice in two formats, two confidence pills that could disagree ("high confidence · 6 reports" beside "Low confidence in these tags"), two hazard lists and three condition lists. Now: one summary line, one confidence with its reason, then HAZARDS, CONDITIONS, MENTIONED MOST, RATING AND SEASON. The confidence is routeKw's, which weighs how RECENT the reports are; the other one only counted them. */
  const n=c.reportCount;const summary=n+" report"+(n===1?"":"s")+(_latest?" · "+(n===1?"":"latest ")+ago(_latest)+(_latestBy?" by "+_latestBy:""):"");
  const confCol=k.confidence==="High"?C.green:k.confidence==="Medium"?C.amber:C.red;
  const confWhy=(n===1?(k.recentN?"a single report":"a single report, over a year old"):k.recentN===n?"all from the last year":k.recentN?k.recentN+" from the last year":"none from the last year")+(c.verifiedCount?" · "+c.verifiedCount+" from verified climbers":"");
  /* ONE HAZARD LIST. A row is a hazard two or more reports name, or ANY hazard reported inside the recent window: one fresh report of rockfall is worth showing, which is what the separate red box was for. Recent hazard tags that belong to no category ("Avy: High") keep a row of their own, so nothing the red box showed is dropped. A hazard two climbers voted gone stays listed, unmarked, and says so. */
  const extra: Record<string,CRowItem&{lastDate:string|null}>={};(activityAll||[]).forEach(function(a: ConsensusReport){if(!a||!a.date||!isRecent(a.date))return;(a.condTags||[]).forEach(function(t: string){if(!isHazardTag(t)||hazardCategory(t))return;const e=extra[t]=extra[t]||{label:t,count:0,reports:[],lastDate:null};e.count++;if(!e.lastDate||String(a.date)>e.lastDate)e.lastDate=String(a.date);e.reports.push({user:a.user,avatar:a.avatar,date:a.date});});});
  const hazRows=(k.hazards as (CRowItem&{lastDate:string|null})[]).filter(function(h){return h.count>=2||(!!h.lastDate&&isRecent(h.lastDate));}).concat(Object.keys(extra).map(function(t){return extra[t];})).map(function(h){const v=voteFor(h.label);const cleared=hazardCleared(v);const fresh=!!h.lastDate&&isRecent(h.lastDate)&&!cleared;return {item:h,fresh:fresh,meta:h.count+" report"+(h.count===1?"":"s")+(h.lastDate?" · "+(h.count===1?"":"latest ")+ago(h.lastDate):"")+(cleared&&v?" · "+v.gone+" climbers say it’s gone":"")};}).sort(function(a,b){return (b.fresh?1:0)-(a.fresh?1:0)||b.item.count-a.item.count;});
  /* MENTIONED MOST is the tags reports ticked, counted as reports ("3 of 5"). It replaces the % bars (a trust-weighted share shown as a plain percentage) and the keyword rows that counted the same tags a second time. Hazard tags are left to HAZARDS above. */
  const tagRows=((c.tagTally||[]) as (CRowItem&{lastDate:string|null})[]).filter(function(t){return !isHazardTag(t.label)&&!hazardCategory(t.label);}).slice(0,5);
  const sec={borderTop:`1px solid ${C.border}`,marginTop:14,paddingTop:12};
  const condKeys=c.conditions?Object.keys(c.conditions):[];
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:ROUTE_GAP}}>{/* A PARTIAL CONSENSUS IS NOT A CONSENSUS. `activity` is route.activity + myReports + dbReports, so a failed reports read silently drops the DB half and buildConsensus runs on what is left — the panel then presents a DERIVED SAFETY JUDGEMENT as if it had seen everything filed. `reportsUnavailable` was already passed in and was consulted ONLY on the empty branch, so exactly this case said nothing. Found by walking the Conditions sub-tab in check:outage for the first time: under a blanket outage the screen CHANGED (3,388 -> 3,384 chars) and acknowledged nothing, which is rule 1. */}{reportsUnavailable?<div style={{fontSize:11.5,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 9px",marginBottom:10,lineHeight:1.45}}>{"Some reports couldn’t load, so this is based on the ones that did — not on everything filed for this "+climbNoun(route)+"."}</div>:null}
    <CardHead style={{marginBottom:7}}>Community Consensus</CardHead>
    {/* A stale route gets no arrow and no live pulse: "2y ago" beside a pulsing dot read as current. */}
    <div style={{fontSize:13,color:C.text,fontWeight:600,lineHeight:1.45}}>{/* The dot is INLINE with the words: as a flex item of its own it was left alone on a line when the sentence wrapped at 320px. */}<span aria-hidden="true" style={{display:"inline-block",verticalAlign:"middle",width:6,height:6,borderRadius:"50%",marginRight:7,marginBottom:2,background:_live?C.green:C.textMuted,animation:_live?"cm-pulse 2s infinite":undefined}}/><span>{summary}</span>{_trend?<span style={{color:_trend.c,fontWeight:700,whiteSpace:"nowrap",marginLeft:8}}><span className="cm-pop" style={{display:"inline-block"}}>{_trend.a}</span>{" "+_trend.l}</span>:null}</div>
    <div style={{fontSize:12,color:C.textMuted,marginTop:3,lineHeight:1.45}}><span style={{color:confCol,fontWeight:700}}>{k.confidence+" confidence"}</span>{" · "+confWhy}</div>

    {hazRows.length?<div style={sec}><div style={{...SUB_LABEL,marginBottom:6}}>Hazards</div>{hazRows.map(function(h){return <CRow key={h.item.label} item={h.item} kind="h" meta={h.meta} fresh={h.fresh} routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>;})}</div>:null}

    {condKeys.length?<div style={sec}>{(function(){/* The consensus falls back to reports of ANY age when none is recent, which used to sit under "CONDITIONS NOW" looking current. Say which it is. */const allOld=condKeys.every(function(ck){return (c.conditions as Record<string,CondTally>)[ck].stale;});const newest=condKeys.map(function(ck){return (c.conditions as Record<string,CondTally>)[ck].mostRecent;}).filter(Boolean).sort().slice(-1)[0];return <><div style={{...SUB_LABEL,marginBottom:6,color:allOld?C.amber:SUB_LABEL.color}}>{allOld?"LAST REPORTED CONDITIONS":"CONDITIONS NOW"}</div>{allOld?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginBottom:8}}>{"No one has reported conditions in the last "+RECENT_DAYS+" days"+(newest?" — the newest of these is from "+ago(newest):"")+". Treat them as history, not as today."}</div>:null}</>;})()}{VOLATILE_DISC.indexOf(catOf(route))>=0?<div style={{display:"flex",alignItems:"center",gap:6,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"6px 9px",marginBottom:8,fontSize:11.5,color:C.amber,lineHeight:1.4}}><span aria-hidden="true" style={{display:"inline-flex"}}><ActionIcon name="alert" size={13} color={C.amber}/></span><span>{"This "+climbNoun(route)+"'s conditions can change fast — verify before you go."}</span></div>:null}<div>{[["carToCar","Car-to-car"],["tempF","Temp"],["snow","Snow"],["snowDepth","Postholing"],["freezingFt","Freezing level"],["freezing","Freezing level"],["water","Water"],["bugs","Bugs"],["trail","Trail"],["seepage","Seepage"],["mud","Mud"],["protection","Protection"],["crowds","Crowds"]].map(function(p){let cd: CondTally|null=(c.conditions as Record<string,CondTally>)[p[0]];/* a legacy prose freezing level only speaks when no NUMBER has been reported */if(p[0]==="freezing"&&(c.conditions as Record<string,CondTally>).freezingFt)cd=null;if(!cd)return null;/* WHAT THE VALUE RESTS ON, in words. The chip said "· 3" and left the 3 to be guessed; and car-to-car showed the NEWEST report's time beside the count of ALL of them, which read as five climbers agreeing on it. */const basis=(p[0]==="carToCar"?"latest report":(p[0]==="tempF"||p[0]==="freezingFt")?(cd.n===1?"1 report":"average of "+cd.n+" reports"):(cd.n===1?"1 report":cd.n+" reports agree"))+(cd.mostRecent?" · "+ago(cd.mostRecent):"");return <div key={p[0]} style={{display:"flex",alignItems:"baseline",gap:10,padding:"7px 0",borderTop:`1px solid ${C.borderLight}`}}><span style={{width:96,flexShrink:0,fontSize:12.5,color:C.textMuted}}>{p[1]+" "}</span><div style={{flex:1,minWidth:0}}><span style={{fontSize:13,color:C.text,fontWeight:700,overflowWrap:"anywhere"}}>{p[0]==="tempF"?uTempU(cd.value):p[0]==="freezingFt"?uElev(cd.value):cd.value}</span><div style={{fontSize:12,color:cd.stale?C.amber:C.textMuted,marginTop:1}}>{basis}</div></div></div>;})}</div></div>:null}

    {(tagRows.length||k.conflicts.length)?<div style={sec}><div style={{...SUB_LABEL,marginBottom:6}}>Mentioned most</div>{k.conflicts.length?<div style={{background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:8,padding:"8px 10px",marginBottom:8,fontSize:11.5,color:C.amber,lineHeight:1.45}}>{k.conflicts[0]}</div>:null}{tagRows.map(function(t){return <CRow key={t.label} item={t} kind="c" meta={t.count+" of "+n+" report"+(n===1?"":"s")+(t.lastDate?" · "+(t.count===1?"":"latest ")+ago(t.lastDate):"")} routeId={route.id} openK={openK} setOpenK={setOpenK}/>;})}</div>:null}

    <div style={sec}><div style={{...SUB_LABEL,marginBottom:8}}>Rating and season</div>
      {(function(){/* The SAME star the route header shows: the shared rating (0294, one vote per climber) when anyone has cast one, else the trip-report average. Two different averages on one page read as a contradiction. */const _sh=starSum&&starSum.raters>0&&starSum.stars!=null;const _av=_sh?starSum.stars as number:c.avgStars;const _n=_sh?starSum.raters:c.ratedCount;return <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{fontSize:26,fontWeight:700,lineHeight:1,color:_n?C.amber:C.textMuted}}>{_n?_av.toFixed(1):"—"}</div><div><Stars n={_av}/><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{!_n?"no climber votes yet":_sh?(_n+" climber"+(_n!==1?"s":"")+" rated"):(_n===1?"1 rating":"average of "+_n+" ratings")}</div></div></div>;})()}
      {/* ONE measure per mark. A cell's number was a COUNT and its shade the AVERAGE RATING, graded, which needed a legend to decode. Now the number is the reports that month, and a month is green or it is not: green means its reports average four stars or better. */}
      <div style={{display:"flex",gap:3}}>{MONTHS.map((mo,i)=>{const md=(c.byMonth as Record<number,MonthTally>)[i];const isBest=c.bestMonths.includes(mo);return <div key={mo} style={{flex:1,minWidth:0,textAlign:"center"}}><div style={{height:28,borderRadius:4,background:isBest?C.greenBg:C.surface,border:`1px solid ${isBest?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:isBest?C.green:C.textSub,fontWeight:700}}>{md?md.count:""}</div><div aria-hidden="true" style={{fontSize:11,color:isBest?C.green:C.textMuted,marginTop:2,fontWeight:600}}>{mo.charAt(0)}</div></div>;})}</div>
      <div style={{fontSize:12,color:C.textMuted,marginTop:6,lineHeight:1.45}}>{"Reports per month, January to December."+(c.bestMonths.length?" Green = rated 4★ or better on average: "+c.bestMonths.join(", ")+".":"")}</div>
    </div>
    {c.photos&&c.photos.length?<div style={sec}><div style={{...SUB_LABEL,marginBottom:8}}>Recent photos</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{c.photos.map((p: {url: string; user?: string | null},i: number)=><div key={i} {...(onOpenPhoto?Object.assign(clickable(function(){onOpenPhoto(p.url);}),{"aria-label":"Open photo"+(p.user?" by "+p.user:"")}):{})} style={{position:"relative",paddingBottom:"100%",borderRadius:8,overflow:"hidden",background:C.card,border:`1px solid ${C.border}`,cursor:onOpenPhoto?"pointer":undefined}}><img loading="lazy" decoding="async" src={photoThumb(p.url,180)} alt={"Recent condition photo"+(p.user?" by "+p.user:"")} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={()=>{}} />{p.user?<div style={{position:"absolute",left:0,right:0,bottom:0,padding:"8px 6px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.72))",fontSize:11,color:C.onSolid,fontWeight:600,overflowWrap:"anywhere"}}>{p.user.split(" ")[0]}</div>:null}</div>)}</div></div>:null}
  </div>;
}
