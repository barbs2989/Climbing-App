import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { C, MOUNTAINS, ROUTES, inArea } from "../../ClimbMatchCore.jsx";
import { useMyPartnerAreas, useAreaPath, useAreaChildren, useAreaChildrenDiscCounts } from "../../lib/db.js";
import { POP_BACK } from "../../lib/popupChrome.js";
import { scrollAppToTop } from "../../lib/climbsReturn.js";
import { subdivisionNoun } from "../../lib/countries";
import { SL } from "../../lib/areaBrowserParts.jsx";
import GroupPlaceSearch from "./GroupPlaceSearch.tsx";
import AreaChildrenList from "./AreaChildrenList.tsx";
import type { AreaChildRow } from "./AreaChildrenList.tsx";
import LoadingRows from "./LoadingRows.tsx";
import ActionIcon from "./ActionIcon.tsx";

/** One area on a trail: its id ("" = the level above the countries) and its name. */
export interface RankArea { id: string; name: string; }
/** The slice of a `useMyPartnerAreas` row this picker reads. */
interface MyArea { areaId: string; name: string; }
interface RankSeedArea { id: string; name: string; parentId?: string | null; }

export interface RankAreaPickerProps {
  /** Signed in with the DB on: the catalog, its search and Your areas only exist there. */
  real: boolean;
  uid?: string | null;
  /** The area the board is ranking. */
  ranked: RankArea;
  /** The names above it, the country left off. */
  trail: string[];
  /** null: the card alone, over the board. An id: the Choose-an-area page, standing on that area ("" = above the countries). */
  browseId: string | null;
  /** Walk to another area on the page, or (null) leave it without choosing. */
  onBrowse: (id: string | null) => void;
  /** Rank this area, and go back to the board. */
  onRank: (id: string) => void;
}

const RANK_ROOT: RankArea = { id: "", name: "All countries" };

/* RANKS › BY AREA is chosen THE WAY A CLIMB IS FOUND (owner, 2026-11-18: "ranks by area on phone needs a
   better ui like how we would find a climb"). The board keeps one card naming the area it ranks; Change
   opens a PAGE in place of the board, laid out as the Climbs tab is: the countries and states as
   two-column cards with their climb counts (StatePicker's phone cards), and below a state the Climbs
   area page's own sub-area list (AreaChildrenList: A to Z, the same Sort, a View area button on every
   row), under a header that names the area with its path as links. Walking the page ranks nothing; the
   header's "See rankings for <area>" does, and so does a search hit or one of Your areas. It replaced
   an inline list squeezed between the scope row and the board, eight rows at a time, ordered by size,
   one "Up to" step at a time. A failed read of what is inside says so; it is never drawn as an area
   with nothing in it (DbAreaLevel's rule). */
export default function RankAreaPicker({real,uid,ranked,trail,browseId,onBrowse,onRank}: RankAreaPickerProps){
  const open=browseId!==null;
  const lvl=browseId||"";
  const pathQ=useAreaPath(real&&open&&lvl?lvl:null);
  const kidsQ=useAreaChildren(lvl||null,{enabled:real&&open});
  const myQ=useMyPartnerAreas(real&&open?(uid||null):null);
  const seedChain=(): RankArea[]=>{const out: RankArea[]=[];const all=MOUNTAINS as RankSeedArea[];let m=all.find(x=>x.id===lvl);let g=0;while(m&&g++<10){out.unshift({id:m.id,name:m.name});if(m.id==="usa"||!m.parentId||m.parentId==="world")break;const up=m.parentId;m=all.find(x=>x.id===up);}return out;};
  const chain: RankArea[]=!open?[]:real?[RANK_ROOT].concat(lvl?((pathQ.data as RankArea[]|undefined)||[]):[]):seedChain();
  /* How far down the page stands: 0 above the countries, 1 on a country, 2 on a state. Unknown while the path loads
     (the list waits, so a country never flashes as rows); a path that failed reads as a list of rows. */
  const pathWait=real&&!!lvl&&pathQ.isPending;
  const depth=real?(lvl?(pathQ.data?chain.length-1:2):0):chain.length;
  const cards=depth<=1;
  const discQ=useAreaChildrenDiscCounts(lvl||null,{enabled:real&&open&&!!lvl});
  const here=real&&!lvl?RANK_ROOT:chain[chain.length-1];
  const nameUnavailable=real&&pathQ.isError;
  const name=here?here.name:nameUnavailable?"Couldn’t load this area’s name":real&&pathQ.isPending?"Loading…":"this area";
  const named=!!here;
  const above=chain.slice(0,-1);
  const acount=(id: string)=>(ROUTES as {mountainId: string}[]).filter(r=>inArea(r.mountainId,id)).length;
  const kids: AreaChildRow[]=!open?[]:real?((kidsQ.data as AreaChildRow[]|undefined)||[]).filter(a=>(a.route_count||0)>0)
    :(MOUNTAINS as RankSeedArea[]).filter(m=>m.parentId===lvl).map(m=>({id:m.id,name:m.name,route_count:acount(m.id)})).filter(a=>a.route_count>0).sort((a,b)=>a.name.localeCompare(b.name));
  const kidsLoading=real&&(kidsQ.isPending||pathWait),kidsUnavailable=real&&kidsQ.isError;
  const mine: MyArea[]=((myQ.data as MyArea[]|undefined)||[]).filter(a=>a.areaId!==ranked.id);
  const allPeaks=kids.length>0&&kids.every(a=>a.area_type==="peak");

  /* Each step is a new page: it starts at the top with the area's name in focus, as the Climbs tab's pages do. Not on mount. */
  const title=useRef<HTMLHeadingElement>(null);
  const last=useRef(browseId);
  useEffect(()=>{
    if(last.current===browseId)return;
    last.current=browseId;
    scrollAppToTop();
    if(browseId!==null&&title.current)title.current.focus({preventScroll:true});
  },[browseId]);

  if(!open)return <div style={{display:"flex",alignItems:"center",gap:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px"}}>
    <div style={{alignSelf:"flex-start",marginTop:19,flexShrink:0,display:"flex"}}><ActionIcon name="pin" size={18} color={C.amber}/></div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase"}}>Ranking in</div>
      <div aria-current="location" style={{fontSize:16,fontWeight:800,color:C.amber,overflowWrap:"anywhere",lineHeight:1.25}}>{ranked.name||"this area"}</div>
      {trail.length?<div style={{fontSize:11.5,color:C.textMuted,overflowWrap:"anywhere",lineHeight:1.35,marginTop:1}}>{trail.join(" › ")}</div>:null}
    </div>
    <button onClick={()=>onBrowse(ranked.id)} aria-label="Change the area these rankings cover" style={{minHeight:44,minWidth:72,padding:"0 14px",flexShrink:0,borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>Change</button>
  </div>;

  const head: CSSProperties={fontSize:11,fontWeight:800,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase",margin:"12px 0 6px"};
  const box: CSSProperties={background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"12px 14px"};
  const card: CSSProperties={textAlign:"left",minWidth:0,minHeight:56,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",cursor:"pointer",color:C.text,fontFamily:"inherit"};
  const noun=!lvl?"country":subdivisionNoun(lvl);
  const failed=<div role="alert" style={{fontSize:12.5,color:C.amber,lineHeight:1.45}}>{"Couldn’t load what’s inside "+name+" — this is not a claim it holds nothing. Try again in a moment."}</div>;
  return <div data-swipe="off">
    {/* The phone's top bar draws this Back beside the Menu (lib/pageBack.js); the website draws it here. */}
    <button data-cm-step-back="true" onClick={()=>onBrowse(null)} style={{...POP_BACK,marginBottom:12}}><span aria-hidden="true">{"←"}</span><span>Back to rankings</span></button>
    <div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45,marginBottom:10}}>{"Choose the area to rank. Now ranking "}<span style={{color:C.amber,fontWeight:700}}>{ranked.name||"this area"}</span>.</div>
    {real?<GroupPlaceSearch label="Search any crag, peak or area" onPick={p=>onRank(p.id)}/>:null}
    {mine.length?<div><div style={head}>Your areas</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{mine.map(a=><button key={a.areaId} onClick={()=>onRank(a.areaId)} aria-label={"Rank "+a.name} style={{minHeight:40,padding:"8px 12px",borderRadius:14,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{a.name}</button>)}</div></div>:null}

    {/* THE AREA THIS PAGE STANDS ON, as the Climbs area page heads itself: the name, the path above it as links, and the one button that ranks it. */}
    <div style={{...box,marginTop:14,borderColor:C.borderHi}}>
      <h2 ref={title} tabIndex={-1} style={{margin:0,fontSize:22,fontWeight:800,color:C.text,lineHeight:1.2,overflowWrap:"anywhere",outline:"none"}}>{name}</h2>
      {above.length?<nav aria-label="Area path" style={{display:"flex",alignItems:"center",flexWrap:"wrap",rowGap:2,columnGap:5,minWidth:0,marginTop:5}}>
        {above.map((a,i)=><span key={a.id||"root"} style={{display:"inline-flex",alignItems:"center",gap:5,minWidth:0,maxWidth:"100%"}}>
          {i>0?<span aria-hidden="true" style={{color:C.textMuted,fontSize:14,fontWeight:700}}>{"›"}</span>:null}
          <button onClick={()=>onBrowse(a.id)} style={{background:"transparent",border:"none",color:C.blue,fontSize:13.5,cursor:"pointer",fontWeight:700,padding:"3px 0",textAlign:"left",lineHeight:1.3,overflowWrap:"anywhere"}}>{a.name}</button>
        </span>)}
      </nav>:null}
      {lvl?<button onClick={()=>onRank(lvl)} style={{display:"block",width:"100%",minHeight:46,boxSizing:"border-box",marginTop:12,padding:"10px 12px",borderRadius:12,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:14.5,fontWeight:800,cursor:"pointer",overflowWrap:"anywhere"}}>{named?"See rankings for "+name:"See rankings for this area"}</button>
        :<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45,marginTop:6}}>Pick a country to see its states, or search for any place above.</div>}
    </div>

    {cards?<div>
      <SL C={C}>{"Pick a "+noun}</SL>
      {kidsUnavailable?failed
        :kidsLoading?<LoadingRows C={C} label={"Loading "+(lvl?noun+"s":"countries")+"…"}/>
        :kids.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:8}}>{kids.map(a=><button key={a.id} onClick={()=>onBrowse(String(a.id))} style={card}><div style={{fontSize:14,fontWeight:700,overflowWrap:"anywhere"}}>{a.name}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{a.route_count.toLocaleString()+(a.route_count===1?" climb":" climbs")}</div></button>)}</div>
        :<div style={{fontSize:13,color:C.textMuted}}>{"No smaller areas inside "+name+"."}</div>}
    </div>
    :<div style={{...box,marginTop:12}}>
      {kidsUnavailable?failed
        :kidsLoading?<LoadingRows C={C} label="Loading areas…"/>
        :kids.length?<AreaChildrenList rows={kids} noun={allPeaks?"Peaks":"Areas"} onDrill={a=>onBrowse(String(a.id))} C={C} variant="section" discCounts={(discQ.data as Record<string, Record<string, number>>|undefined)||null}/>
        :<div style={{fontSize:13,color:C.textMuted,lineHeight:1.45}}>{"No smaller areas inside "+name+" — this is as far down as it goes."}</div>}
    </div>}
  </div>;
}
