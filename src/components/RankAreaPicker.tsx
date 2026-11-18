import { useState } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { useMyPartnerAreas } from "../../lib/db.js";
import GroupPlaceSearch from "./GroupPlaceSearch.tsx";
import LoadingRows from "./LoadingRows.tsx";
import ActionIcon from "./ActionIcon.tsx";

/** One area on the board's trail or one level down: its id and name, and (for a child) how many climbs it holds. */
export interface RankArea { id: string; name: string; n?: number; }
/** The slice of a `useMyPartnerAreas` row this picker reads. */
interface MyArea { areaId: string; name: string; }

export interface RankAreaPickerProps {
  /** Signed in with the DB on: the catalog search and Your areas only exist there. */
  real: boolean;
  uid?: string | null;
  /** The area the board is ranking ("" = the level above the countries). */
  cur: RankArea;
  /** The trail from the top down, ending with `cur`. */
  chain: RankArea[];
  /** The areas one level down that hold climbs. */
  kids: RankArea[];
  kidsLoading?: boolean;
  kidsError?: boolean;
  onPick: (id: string) => void;
}

const SHOW = 8;

/* RANKS › BY AREA (owner, 2026-11-18: "By area for ranks needs a better ui"). The scope used to be a
   wrapping breadcrumb over up to 24 wrapping chips -- no search, the area being ranked only the last
   amber crumb, and every sub-area past the 24th unreachable. Now: one card that names the area, and a
   picker under it -- a search over the whole catalog (the box Groups uses), the climber's own areas,
   one row up, and every area one level down as a list. A failed read of what is inside says so; it is
   never drawn as an area with nothing in it (DbAreaLevel's rule). */
export default function RankAreaPicker({real,uid,cur,chain,kids,kidsLoading,kidsError,onPick}: RankAreaPickerProps){
  const [openSel,setOpen]=useState(false);
  const [allFor,setAllFor]=useState<string|null>(null);
  const atTop=real&&!cur.id;
  const open=openSel||atTop;
  const myQ=useMyPartnerAreas(real&&open?(uid||null):null);
  const mine: MyArea[]=((myQ.data as MyArea[]|undefined)||[]).filter(a=>a.areaId!==cur.id);
  /* The country left off, as the search's hits print it (GroupPlaceSearch): "Washington › Central-West Cascades", not a line spent on "United States". */
  const trail=chain.slice(0,-1).filter(a=>a.id).slice(1).map(a=>a.name);
  const parent=chain.length>1?chain[chain.length-2]:null;
  const sorted=[...kids].sort((a,b)=>(b.n||0)-(a.n||0));
  const showAll=allFor===cur.id;
  const list=showAll?sorted:sorted.slice(0,SHOW);
  const head={fontSize:11,fontWeight:800,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase" as const,margin:"12px 0 6px"};
  const row={display:"flex",alignItems:"center",gap:10,width:"100%",minHeight:44,boxSizing:"border-box" as const,padding:"8px 12px",background:"transparent",border:"none",borderTop:"1px solid "+C.borderLight,color:C.text,fontSize:13.5,fontWeight:600,textAlign:"left" as const,cursor:"pointer"};
  return <div>
    <div style={{display:"flex",alignItems:"center",gap:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px"}}>
      <div style={{alignSelf:"flex-start",marginTop:19,flexShrink:0,display:"flex"}}><ActionIcon name="pin" size={18} color={C.amber}/></div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase"}}>Ranking in</div>
        <div aria-current="location" style={{fontSize:16,fontWeight:800,color:C.amber,overflowWrap:"anywhere",lineHeight:1.25}}>{cur.name||"this area"}</div>
        {trail.length?<div style={{fontSize:11.5,color:C.textMuted,overflowWrap:"anywhere",lineHeight:1.35,marginTop:1}}>{trail.join(" › ")}</div>:null}
      </div>
      {atTop?null:<button onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label={open?"Done choosing an area":"Change the area these rankings cover"} style={{minHeight:44,minWidth:72,padding:"0 14px",flexShrink:0,borderRadius:10,border:"1px solid "+(open?C.blue:C.border),background:open?C.blueBg:C.surface,color:open?"#fff":C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>{open?"Done":"Change"}</button>}
    </div>
    {open?<div style={{marginTop:8}}>
      {real?<GroupPlaceSearch label="Search any crag, peak or area" onPick={p=>{onPick(p.id);setOpen(false);}}/>:null}
      {mine.length?<div><div style={head}>Your areas</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{mine.map(a=><button key={a.areaId} onClick={()=>{onPick(a.areaId);setOpen(false);}} aria-label={"Rank "+a.name} style={{minHeight:40,padding:"8px 12px",borderRadius:14,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{a.name}</button>)}</div></div>:null}
      <div style={{marginTop:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,overflow:"hidden"}}>
        {parent?<button onClick={()=>onPick(parent.id)} aria-label={"Up to "+parent.name} style={{...row,borderTop:"none",color:C.blue}}><span aria-hidden="true" style={{fontSize:15,width:14,textAlign:"center"}}>‹</span><span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}>{"Up to "+parent.name}</span></button>:null}
        {kidsError?<div role="alert" style={{padding:"10px 12px",borderTop:parent?"1px solid "+C.borderLight:"none",fontSize:12,color:C.amber,lineHeight:1.45}}>{"Couldn’t load what’s inside "+(cur.name||"this area")+" — this is not a claim it holds nothing. Try again in a moment."}</div>
        :kidsLoading?<LoadingRows C={C} label="Loading areas…" style={{padding:"8px 12px"}}/>
        :sorted.length?<div>
          <div style={{...head,margin:0,padding:"9px 12px 5px",borderTop:parent?"1px solid "+C.borderLight:"none"}}>{"Inside "+(cur.name||"this area")}</div>
          {list.map(a=><button key={a.id} onClick={()=>onPick(a.id)} aria-label={/* the visible text, word for word, then the unit (WCAG 2.5.3: the name contains what it shows) */a.name+" "+(a.n||0).toLocaleString()+((a.n||0)===1?" climb":" climbs")} style={row}><span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}>{a.name}</span>{" "}<span style={{fontSize:12,fontWeight:500,color:C.textMuted,fontVariantNumeric:"tabular-nums"}}>{(a.n||0).toLocaleString()}</span><span aria-hidden="true" style={{color:C.textMuted}}>›</span></button>)}
          {sorted.length>SHOW?<button onClick={()=>setAllFor(showAll?null:cur.id)} style={{...row,justifyContent:"center",color:C.blue,fontWeight:700}}>{showAll?"Show fewer":"Show all "+sorted.length}</button>:null}
        </div>
        :<div style={{padding:"10px 12px",borderTop:parent?"1px solid "+C.borderLight:"none",fontSize:12,color:C.textMuted}}>{"No smaller areas inside "+(cur.name||"this area")+"."}</div>}
      </div>
    </div>:null}
  </div>;
}
