import type { CSSProperties, ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { PLACE_REGION_LIST, knownRegion } from "../../lib/db.js";
import GroupPlaceSearch from "./GroupPlaceSearch";

/** The group form, as far as these fields read and write it. */
export interface GroupPlaceDraft {
  areaId?: string | null;
  areaName?: string;
  /** The picked area's state or province, from its trail; "" when the catalog filed it under none. */
  areaRegion?: string;
  /** The town the group is based in (`groups.location`) when it climbs at a catalog area. */
  location?: string;
  /** "custom" when the climber names the place themselves instead of picking one. */
  placeMode?: string;
  placeText?: string;
  /** The custom place's state or province, as its two-letter code. */
  placeState?: string;
}
export interface GroupPlaceFieldsProps {
  /** The form's section heading (title, optional subtitle, first-section flag). */
  H: (t: string, sub?: string, first?: boolean) => ReactNode;
  INP: CSSProperties;
  draft: GroupPlaceDraft;
  onChange: (patch: Partial<GroupPlaceDraft> & { err?: string }) => void;
}

const LINK: CSSProperties = { display: "block", minHeight: 44, padding: "10px 0", background: "none", border: "none", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", textAlign: "left" };

/* WHERE A GROUP CLIMBS, asked first and as a place the app knows (0516). A catalog area gives the
   group a state (Discover's chips) and a point (Near a place) that no typing can get wrong; a place
   the catalog does not hold is still allowed, but with its state or province picked from a list, so
   "Squamish" is filed under British Columbia rather than under Other. */
export default function GroupPlaceFields({H,INP,draft,onChange}: GroupPlaceFieldsProps){
  const custom=draft.placeMode==="custom"&&!draft.areaId;
  const usa=PLACE_REGION_LIST.filter(function(r){return r.country==="United States";});
  const can=PLACE_REGION_LIST.filter(function(r){return r.country==="Canada";});
  return <div>
    {H("Where it climbs","The crag, peak or area the group climbs at most; a whole state counts. Discover files the group under its state, and climbers planning a trip near it find it under Near a place.")}
    {draft.areaId?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"8px 12px"}}>
      <div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{draft.areaName||"Picked"}</div>{draft.areaRegion&&draft.areaRegion!==draft.areaName?<div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{draft.areaRegion}</div>:null}</div>
      <button onClick={function(){onChange({areaId:null,areaName:"",areaRegion:"",err:""});}} aria-label={"Change where the group climbs"+(draft.areaName?", now "+draft.areaName:"")} style={{flexShrink:0,minHeight:44,padding:"8px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:12,fontWeight:700,cursor:"pointer"}}>Change</button>
    </div>:custom?<div>
      <input aria-label="Place name" value={draft.placeText||""} maxLength={80} onChange={function(e){onChange({placeText:e.target.value,err:""});}} placeholder="e.g. Squamish" style={INP}/>
      <select aria-label="State or province" value={draft.placeState||""} onChange={function(e){onChange({placeState:e.target.value,err:""});}} style={Object.assign({},INP,{marginTop:8})}>
        <option value="">State or province…</option>
        <optgroup label="United States">{usa.map(function(r){return <option key={r.abbr} value={r.abbr}>{r.name}</option>;})}</optgroup>
        <optgroup label="Canada">{can.map(function(r){return <option key={r.abbr} value={r.abbr}>{r.name}</option>;})}</optgroup>
      </select>
      <div style={{fontSize:11.5,color:C.textMuted,marginTop:6,lineHeight:1.45}}>A place you type is found by its state and by search, but not by distance; only a catalog area has a point to measure from.</div>
      <button onClick={function(){onChange({placeMode:"",err:""});}} style={LINK}>Search the catalog instead</button>
    </div>:<div>
      <GroupPlaceSearch label="Search crags, peaks and areas" onPick={function(p){const st=knownRegion(p.trail[0])||knownRegion(p.name)||"";onChange({areaId:p.id,areaName:p.name,areaRegion:st,placeMode:"",err:""});}}/>
      <button onClick={function(){onChange({placeMode:"custom",err:""});}} style={LINK}>Not in the catalog? Enter a place yourself</button>
    </div>}
    {custom?null:<div>{H("Based in","Optional. The town the group meets from.")}<input aria-label="Town the group is based in" value={draft.location||""} maxLength={80} onChange={function(e){onChange({location:e.target.value});}} placeholder="e.g. Vancouver, BC" style={INP}/></div>}
  </div>;
}
