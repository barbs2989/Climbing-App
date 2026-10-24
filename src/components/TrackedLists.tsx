import type { CSSProperties } from "react";
import { C, useCuratedLists } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";

/** One curated list as `useCuratedLists` builds it (the fields Home draws). */
export interface CuratedList {
  key: string;
  label: string;
  col: string;
  /** The list's emoji, mapped to an ActionIcon name below. */
  icon: string;
}
/** d of t for one list, the same arithmetic the Logbook card draws. */
export interface ListProgress { d: number; t: number; pct: number; cpl: boolean; }
/** The slice of `useCuratedLists`' result this component reads. */
interface CuratedLists { lists: CuratedList[]; listProgress: (L: CuratedList) => ListProgress; }

export interface TrackedListsProps {
  /** The list keys the climber chose to follow, in the order picked. */
  keys?: string[] | null;
  logs?: unknown[] | null;
  routeById?: ((id: string) => unknown) | null;
  onOpenList: (key: string) => void;
  onChoose: () => void;
  /** The tracked-lists read failed and nothing is cached locally. */
  unavailable?: boolean;
}

/** A list's emoji → the ActionIcon that draws it. */
const LIST_ICONS: Record<string, string> = {"🏆":"award","🎯":"target","🏔️":"mountain","❄️":"snowflake","🧗":"flag","⛰️":"mountain","🌋":"mountain","🌲":"mountain","☀️":"mountain","⭐":"award","🏜️":"mountain"};

/* YOUR LISTS on Home: the curated lists a climber chose to follow (profile_tracked_lists, 0337), in the order picked,
   each with the progress the Logbook shows for it -- the same builder, useCuratedLists, so the two cannot disagree.
   Every list still counts every log; this only decides what Home shows. Nothing is drawn until the climber picks one,
   apart from a one-line way in; a key the app no longer draws is skipped. A row opens that list in Logbook > Challenges. */
export default function TrackedLists({keys,logs,routeById,onOpenList,onChoose,unavailable}: TrackedListsProps){
  const {lists,listProgress}: CuratedLists=useCuratedLists(logs||[],routeById);
  const hd: CSSProperties={fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,margin:"4px 2px 10px",borderLeft:"3px solid "+C.blue,paddingLeft:9};
  if(unavailable)return <div style={{marginBottom:14}}><div style={hd}>{"Your lists"}</div><div style={{fontSize:12.5,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px"}}>{"Couldn’t load the lists you follow. Your progress is safe — it comes from your logs."}</div></div>;
  const shown=(keys||[]).map(k=>lists.find(L=>L.key===k)).filter((L): L is CuratedList => !!L);
  if(!shown.length)return <button onClick={onChoose} style={{width:"100%",display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"11px 13px",borderRadius:12,border:"1px solid "+C.border,background:C.card,color:C.text,cursor:"pointer",textAlign:"left"}}><ActionIcon name="award" size={17} color={C.amber}/><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:13,fontWeight:700}}>{"Follow a climbing list here"}</span><span style={{display:"block",fontSize:12,color:C.textMuted,marginTop:1,lineHeight:1.35}}>{"Pick the Fifty Classics, the Bulgers or any list to see your progress on Home."}</span></span><span style={{color:C.blue,fontSize:12.5,fontWeight:700,whiteSpace:"nowrap"}}>{"Choose →"}</span></button>;
  return <div style={{marginBottom:14}}><div style={{display:"flex",alignItems:"baseline",gap:8}}><div style={{...hd,flex:1}}>{"Your lists"}</div><button onClick={onChoose} style={{background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",padding:"4px 2px"}}>{"Edit"}</button></div><div style={{display:"flex",flexDirection:"column",gap:8}}>{shown.map(L=>{const p=listProgress(L);return <button key={L.key} onClick={()=>onOpenList(L.key)} aria-label={L.label+": "+p.d+" of "+p.t} style={{width:"100%",background:C.card,border:"1px solid "+(p.cpl?L.col:C.border),borderRadius:12,padding:"10px 13px",cursor:"pointer",textAlign:"left",color:C.text}}><span style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}><ActionIcon name={LIST_ICONS[L.icon]||"target"} size={16} color={L.col}/><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700}}>{L.label}</span><span style={{fontSize:12,fontWeight:700,color:p.cpl?L.col:C.textMuted,whiteSpace:"nowrap"}}>{p.cpl?"✓ Complete":p.d+" / "+p.t}</span></span><span style={{display:"block",height:7,background:C.surface,borderRadius:5,overflow:"hidden"}}><span style={{display:"block",width:Math.max(p.pct,3)+"%",height:"100%",background:L.col,borderRadius:4}}/></span></button>;})}</div></div>;
}
