import { useState, useEffect } from "react";
import { breakdownRows } from "../../lib/breakdownRows.js";
import { pitchAnchorSummary, pitchShortfall } from "../../lib/pitchAnchors.js";
import { ROUTE_GAP, RSL as SL, C, SUB_LABEL } from "../../ClimbMatchCore.jsx";
import EditIconButton from "./EditIconButton.tsx";
import { BTN_SM } from "../../lib/buttonStyles.js";
import { uLen } from "../../lib/uLen.js";
import { clickable } from "../../lib/clickable";
import Chevron from "./Chevron.tsx";
import { editBtnStyle, EditPencil } from "../../lib/areaChrome";
import PitchConsensus from "./PitchConsensus.tsx";
import CardHead from "./CardHead.tsx";
import PitchPhotos from "./PitchPhotos.tsx";
import PitchComments from "./PitchComments.tsx";
import type { PitchCommentsProps, PitchComment } from "./PitchComments.tsx";
import type { PhotoRowItem } from "./PhotoRow.tsx";

/** One row of the breakdown, as lib/breakdownRows.js builds it from a `pitch_detail` entry. */
interface BreakdownRow {
  /** Index in the stored list; the key and the editor's target. */
  _i: number;
  /** "pitch" (a roped pitch) or "stage" (a travel or route-finding leg). */
  _kind: string;
  /** The entry's raw label; it is the comment key. */
  _n: string | number;
  _note?: string;
  /** A pitch's position among the roped pitches. */
  _pIdx?: number;
  _badge?: string;
  _title?: string;
  /** A stage's position among the stages. */
  _seq?: number;
  _label?: string;
  /** Height climbed so far, over the roped pitches. */
  _cum?: number;
  grade?: string | null;
  crux?: boolean | null;
  lengthM?: number | null;
  bolts?: number | null;
  belay?: string | null;
  anchor?: string | null;
}
/** A route photo as the page lists it; `_pitch` ties it to a pitch label. */
type PitchTaggedPhoto = PhotoRowItem & {_pitch?: string | number | null};

export interface RouteBreakdownProps {
  /** The route; only what the breakdown and its helpers read. */
  route: {id: string; pitches?: number | null; pitchDetail?: unknown[] | null};
  /** A pitch index to open when it changes (the route page's jump from the pitch editor). */
  focus?: number | null;
  /** Opens the editor, at the entry with this index when one is given; without it there are no edit buttons. */
  onEdit?: ((pIdx?: number) => void) | null;
  comments?: PitchComment[] | null;
  commentsUnavailable?: boolean;
  onCommentAdd?: PitchCommentsProps["onAdd"];
  dbPhotos?: PitchTaggedPhoto[] | null;
  /** Uploads photos for the pitch labelled `n`; without it signed-out climbers are told to sign in. */
  onAddPitchPhoto?: ((files: File[], n: string | number) => unknown) | null;
  /** The signed-in climber has logged this route. */
  logged?: boolean;
}

/* THE STATE IS `aria-expanded`, NOT WORDS IN THE NAME. These rows are disclosures — tapping one
   reveals its own detail and changes nothing else — and this file already states the convention
   on TagChip: "`aria-expanded` rather than `aria-pressed`: this is a disclosure, not a toggle
   that changes anything". The stage row's old ▸ carried it and lost it when the whole row became
   the control, which is a regression rather than a gap; the pitch row spelled "collapsed" into
   its own label instead, which announces the state to a screen reader and to nothing else — no
   automation, and no user agent that offers "expand" as an action. So the attribute carries it
   and the name stops repeating it: with both, a reader hears "collapsed" twice. */
function pitchRowName(p: BreakdownRow){
  const bits=["Pitch "+p._badge];
  if(p.grade)bits.push(String(p.grade));
  if(p.crux)bits.push("crux");
  if(p._title)bits.push(String(p._title));
  return bits.join(", ");
}
function stageRowName(r: BreakdownRow){
  const bits=["Section "+r._seq,r._label];
  if(r.crux)bits.push("crux");
  if(r.grade)bits.push(String(r.grade));
  return bits.filter(Boolean).join(", ");
}
/* A PITCH'S PHOTOS, WITH AN ADD BUTTON ON THE PITCH ITSELF (owner's note, 2026-10-25: "a photo right there of the pitch").
   The upload is a route photo tagged with the pitch's label (contributions value.pitch), so the route's Photos tab still
   lists it with the rest. Signed out there is no upload, and the box says so rather than offering a button that does nothing.
   Moved verbatim from RouteDetail.jsx (PR58); only the types were added. */
export default function RouteBreakdown({route,focus,onEdit,comments,commentsUnavailable,onCommentAdd,dbPhotos,onAddPitchPhoto,logged}: RouteBreakdownProps){
  const [open,setOpen]=useState<number|null>(null);
  const photosOf=function(r: BreakdownRow){return (dbPhotos||[]).filter(function(p){return p._pitch!=null&&String(p._pitch)===String(r._n);});};
  const {rows,pitchCount,stageCount}=breakdownRows(route) as {rows: BreakdownRow[]; pitchCount: number; stageCount: number};
  useEffect(function(){if(focus==null)return;const hit=rows.filter(r=>r._kind==="pitch")[focus];if(hit)setOpen(hit._i);},[focus]); // eslint-disable-line react-hooks/exhaustive-deps -- opens the pitch row only when the focus request changes; rows is rebuilt every render and must not re-fire it
  if(!rows.length)return null;
  const hasPitchLen=rows.some(r=>r._kind==="pitch"&&r.lengthM!=null);
  const hasStageLen=rows.some(r=>r._kind==="stage"&&r.lengthM!=null);
  /* THE SHORTFALL IS pitchShortfall()'s, NOT A COUNT OF PITCHES. #1440 measured the mismatched
     version on the live catalog: comparing `route.pitches` against the ROPED half told 55 routes
     that entries were undescribed while every one of them was on screen, because the denominator
     was counting the very stages the old table filtered out. Merging the two sections removes the
     mechanism — everything described is in this list — but the rule stays the rule, and passing
     `rows.length` is what says so: a shortfall may only be claimed when the route claims more
     pitches than the page describes ANYWHERE. */
  /* STATE THE GAP, not both totals. This read "The route lists 20 pitches and 18 sections are
     described here." — a run-on whose "and" joins a noun phrase to a clause, and which then
     REPEATS the count the intro has just given ("18 roped pitches, in route order.") under a
     different noun. Captured verbatim on CI's demo walk. What a climber wants from this line is
     the number of pitches with no description; `pitchCount` is the described roped pitches, so
     the subtraction is in one unit. It cannot go zero or negative here: pitchShortfall only
     fires when route.pitches exceeds pitchDetail.length, and pitchCount is at most that. */
  const _anchors=pitchAnchorSummary(route);
  const _undesc=(route.pitches as number)-pitchCount;
  const short=pitchShortfall(route,rows.length)?(" The route lists "+route.pitches+" pitches, so "+_undesc+(_undesc===1?" is":" are")+" not described here."):"";
  const intro=(pitchCount&&stageCount)
    ?("The whole climb in order — "+rows.length+" sections, of which "+pitchCount+" are roped pitches and "+stageCount+" are travel or route-finding legs."+short)
    :(pitchCount
      ?(pitchCount+" roped pitch"+(pitchCount!==1?"es":"")+", in route order."+short)
      :("How the route goes, section by section — "+stageCount+" leg"+(stageCount!==1?"s":"")+". These are stages of travel and route-finding, not roped pitches."));
  return <div id="route-breakdown" style={{marginBottom:ROUTE_GAP,scrollMarginTop:"80px"}}>
    <SL action={<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11.5,color:C.textMuted,whiteSpace:"nowrap"}}>Tap a row for detail</span>{onEdit?<EditIconButton onClick={onEdit} title="Edit the route breakdown"/>:null}</div>}>ROUTE BREAKDOWN</SL>
    <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>{intro}</div>
      {/* ASK THE CLIMBER WHO WAS THERE (owner note 2026-10-25, belay stations; multipitch audit proposal 2,
          "prompt for pitches after logging a multipitch"). Online research could place a belay on 449
          pitches and no further, so the rest can only come from climbers. Someone who has logged this
          route sees how many pitches still lack one and a button that opens the editor at the first. */}
      {(function(){const _noBelay=rows.filter(function(r){return r._kind==="pitch"&&!String(r.belay||"").trim();});
        if(!logged||!onEdit||!_noBelay.length)return null;
        return <div data-belay-ask="" style={{background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:C.onSolid,marginBottom:3}}>You've climbed this</div>
          <div style={{fontSize:12,color:C.onSolid,lineHeight:1.5,marginBottom:8}}>{_noBelay.length+(_noBelay.length===1?" pitch has":" pitches have")+" no belay station yet. Say where you belayed, and the next party will find it."}</div>
          <button onClick={function(){onEdit(_noBelay[0]._i);}} style={{...BTN_SM,background:C.blueSolid,color:C.onSolid,border:"none"}}>Add belay stations</button>
        </div>;})()}
      {_anchors?<div data-pitch-anchors="" style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:10,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}><span style={{fontWeight:700,color:C.text}}>{"Anchors change by pitch: "}</span>{_anchors.map(function(x,i){return <span key={x[0]}>{i?" · ":""}<span style={{fontWeight:700,color:x[0]==="Bolted"?C.green:C.blue}}>{x[0]}</span>{" "+x[1]}</span>;})}</div>:null}
      {rows.map(function(r,idx){
        const isOpen=open===r._i;
        const isPitch=r._kind==="pitch";
        const last=idx===rows.length-1;
        /* EVERY BOX OPENS (owner note 2026-10-22, "more information for each box"). A travel leg
           used to open only when it had a terrain, length or anchor, and then showed three tiles
           that were mostly "—". Now it opens like a pitch does: an edit button that lands on THIS
           entry in the editor, the tiles that carry a value, and climbers' comments on the leg —
           Mountain Project ties beta to each pitch the same way. */
        const hasMore=true;
        /* A LONG terrain is a sentence, so it is drawn as one: a small full-width line under the leg's name, not a
           right-aligned chip that wraps beside the label, and not a third-width bold tile when the row opens
           (owner note 2026-10-28, Mount Logan's "Hiking, steep descent through alpine meadows and forest" read
           stacked in both). A short one ("Class 2", "Scree, Class 2") is still a chip. */
        const longTerrain=!isPitch&&!!r.grade&&(String(r.grade).length>18||String(r.grade).trim().split(/\s+/).length>3);
        /* A pitch's tiles drop an empty value the same way a leg's do: a row of "—" told the climber nothing, and PitchConsensus below already asks for what is missing. */
        const stageTiles=((isPitch?[["Length",r.lengthM!=null?uLen(r.lengthM):null,C.blue],["Bolts (this pitch)",r.bolts!=null?String(r.bolts):null,C.amber]]:[["Terrain",longTerrain?null:r.grade,C.amber],["Length",r.lengthM!=null?uLen(r.lengthM):null,C.blue],["Anchor / belay",r.anchor,C.blue]]) as [string,string|null|undefined,string][]).filter(t=>t[1]);
        const accent=r.crux?C.amber:(isPitch?C.blue:C.border);
        return <div key={r._i} data-kind={r._kind} data-label={isPitch?("P"+r._badge+(r._title?" "+r._title:"")):r._label} id={isPitch?("pitch-"+r._pIdx):undefined} style={{display:"flex",gap:10,marginBottom:last?0:9,scrollMarginTop:"80px"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
            <div aria-hidden="true" style={{width:26,height:26,borderRadius:isPitch?7:13,background:r.crux?C.amberBg:(isPitch?C.blueBg:C.surface),border:"1px solid "+(r.crux?C.amber:(isPitch?C.blueDim:C.border)),display:"flex",alignItems:"center",justifyContent:"center",fontSize:isPitch?11.5:12,fontWeight:700,color:r.crux?C.amber:(isPitch?"#fff":C.textSub)}}>{isPitch?("P"+r._badge):r._seq}</div>
            {last?null:<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:14}}/>}
          </div>
          <div style={{flex:1,minWidth:0,background:C.surface,border:"1px solid "+C.border,borderLeft:"3px solid "+accent,borderRadius:10}}>
            <div {...(hasMore?clickable(function(){setOpen(isOpen?null:r._i);}):{})} aria-expanded={hasMore?isOpen:undefined} aria-label={hasMore?(isPitch?pitchRowName(r):stageRowName(r)):undefined} style={{padding:"9px 11px",minHeight:44,boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"center",cursor:hasMore?"pointer":"default"}}>
              {(isPitch&&r._title)?<div style={{fontSize:12.5,fontWeight:700,color:C.text,marginBottom:3,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r._title}</div>:null}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap",marginBottom:(r._note&&!longTerrain)?5:0}}>
                <span style={{fontSize:13,fontWeight:700,color:isPitch?C.amber:C.text,minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{isPitch?(r.grade||("Pitch "+r._badge)):r._label}{r.crux?<span style={{...SUB_LABEL,color:C.red,marginLeft:6,whiteSpace:"nowrap"}}>CRUX</span>:null}</span>
                {/* A stage's `grade` is TERRAIN PROSE, not a grade token: measured across the
                    live catalog it runs to 51 characters ("Class 2-3 rock scramble (easy snow
                    ridge in winter)", "Glacier travel to a bergschrund/moat"). Drawn as a
                    nowrap chip in a flexShrink:0 group it measured 315px wide and put its own
                    row's right edge at x=392 on a 390px phone, clipping the ▸ expander off
                    screen. So this group SHRINKS and WRAPS, and only the ▸ is pinned. Do not
                    restore whiteSpace:nowrap here — that is what a pitch grade wants, and a
                    stage is the other half of pitch_detail. */}
                <span style={{display:"flex",alignItems:"center",gap:7,flexShrink:1,minWidth:0,flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
                  {(!isPitch&&r.grade&&!longTerrain)?<span style={{fontSize:11.5,fontWeight:700,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:6,padding:"2px 7px",minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r.grade}</span>:null}
                  {(isPitch?hasPitchLen:(hasStageLen&&r.lengthM!=null))?<span style={{fontSize:11.5,color:C.textMuted,whiteSpace:"nowrap"}}>{r.lengthM!=null?uLen(r.lengthM):"—"}</span>:null}
                  {(isPitch&&hasPitchLen&&r._cum)?<span style={{fontSize:11.5,color:C.textMuted,opacity:0.6,whiteSpace:"nowrap"}}>{uLen(r._cum)+" up"}</span>:null}
                  {hasMore?<Chevron open={isOpen} size={16} color={C.blue}/>:null}
                </span>
              </div>
              {longTerrain?<div data-terrain="" style={{fontSize:11.5,fontWeight:600,color:C.amber,lineHeight:1.45,margin:"3px 0 "+(r._note?"4px":"0"),wordBreak:"break-word",overflowWrap:"break-word"}}>{r.grade}</div>:null}
              {r._note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,wordBreak:"break-word",overflowWrap:"break-word"}}>{r._note}</div>:null}
            </div>
            {isOpen?<div style={{padding:"0 11px 11px"}}>{onEdit?<button onClick={function(e){e.stopPropagation();onEdit(r._i);}} style={{...editBtnStyle(C),marginTop:8}}><EditPencil C={C}/>{isPitch?"Edit this pitch":"Edit this section"}</button>:null}
              {stageTiles.length?<div style={{marginTop:2,paddingTop:9,borderTop:"1px solid "+C.borderLight,display:"grid",gridTemplateColumns:isPitch?"repeat(2,1fr)":"repeat(3,1fr)",gap:7,marginBottom:isPitch?9:0}}>
                {stageTiles.map(function(s){return <div key={s[0]} style={{background:C.card,borderRadius:8,padding:"7px 9px",textAlign:"center",minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:s[2],overflowWrap:"anywhere"}}>{s[1]}</div><div style={{fontSize:11,color:C.textMuted,marginTop:2,lineHeight:1.3}}>{s[0]}</div></div>;})}
              </div>:null}
              {isPitch?<><PitchConsensus p={r} onSuggestFix={onEdit?function(){onEdit(r._i);}:null}/><CardHead style={{marginBottom:8}}>Photos</CardHead><PitchPhotos items={photosOf(r)} onAdd={onAddPitchPhoto?function(fs){return onAddPitchPhoto(fs,r._n);}:null}/><PitchComments targetId={route.id+"_pitch_"+r._n} comments={comments} commentsUnavailable={commentsUnavailable} onAdd={onCommentAdd}/></>:<PitchComments title="Comments on this section" targetId={route.id+"_pitch_"+r._n} comments={comments} commentsUnavailable={commentsUnavailable} onAdd={onCommentAdd}/>}
            </div>:null}
          </div>
        </div>;})}
    </div>
  </div>;
}
