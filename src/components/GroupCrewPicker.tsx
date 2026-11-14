import { useMemo, useState } from "react";
import { BTN_SM, CHIP } from "../../lib/buttonStyles.js";
import { C, SL, pubName, climberLine } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";

/** A member id: a profile uuid on a stored group, a number on an example one. */
type GroupCrewPickerId = string | number;
/** One row of the group's roster, as the group page resolved it. */
export interface GroupCrewPickerPerson {
  id: GroupCrewPickerId;
  name: string;
  avatar?: string;
  online?: boolean;
  [k: string]: unknown;
}
/** A saved list and the climbs on it a crew can be formed for — App's crewPickGroups(). */
export interface GroupCrewPickerPick {
  list: { id: string; name: string };
  rs: ReadonlyArray<{ id: string; name: string }>;
}
export interface GroupCrewPickerProps {
  groupName: string;
  /** The group is private: the crew starts private too (its roster stays as closed as the group's). */
  groupPrivate: boolean;
  /** The group's members, you included (left out here). */
  people: ReadonlyArray<GroupCrewPickerPerson>;
  /** Your own id in this group: your uid on a stored group, 0 on an example one. */
  meId: GroupCrewPickerId;
  blocked: ReadonlyArray<{ id: GroupCrewPickerId }>;
  picks: ReadonlyArray<GroupCrewPickerPick>;
  onClose: () => void;
  /** A crew for one of your saved climbs, inviting `picked`. */
  onRoute: (routeId: string, picked: GroupCrewPickerPerson[], isPrivate: boolean) => void;
  /** A crag session: hands `picked` to the Start a crew sheet, which asks for the area. */
  onArea: (picked: GroupCrewPickerPerson[], isPrivate: boolean) => void;
}

/** The largest crew the sheets allow (StartCrewSheet's size field) is 12, so 11 others besides you. */
const MAX_PICK = 11;

/** FORM A CREW FROM A GROUP (owner 2026-11-14): pick members of a group you are in, then where — a saved climb, or an area through the Start a crew sheet. They get ordinary crew invites they accept or decline. The group is only where the names came from: the crew does not name it. */
export default function GroupCrewPicker({groupName,groupPrivate,people,meId,blocked,picks,onClose,onRoute,onArea}: GroupCrewPickerProps){
  const [sel,setSel]=useState<GroupCrewPickerId[]>([]);
  const [priv,setPriv]=useState(groupPrivate);
  const [q,setQ]=useState("");
  const others=useMemo(()=>people.filter(p=>String(p.id)!==String(meId)&&!blocked.some(b=>String(b&&b.id)===String(p.id))),[people,meId,blocked]);
  const ql=q.trim().toLowerCase();
  const shown=ql?others.filter(p=>(pubName(p)||"").toLowerCase().includes(ql)):others;
  const isOn=(id: GroupCrewPickerId)=>sel.some(x=>String(x)===String(id));
  const full=sel.length>=MAX_PICK;
  const toggle=(id: GroupCrewPickerId)=>setSel(s=>s.some(x=>String(x)===String(id))?s.filter(x=>String(x)!==String(id)):(s.length>=MAX_PICK?s:[...s,id]));
  const picked=()=>others.filter(p=>isOn(p.id));
  const climbs=picks.reduce((n,g)=>n+g.rs.length,0);
  const none=!sel.length;
  return <div onClick={onClose} tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape")onClose();}} role="dialog" aria-modal="true" aria-label="Form a crew from this group" style={{position:"fixed",inset:0,zIndex:1150,background:C.scrimStrong,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:"18px 18px 0 0",border:"1px solid "+C.border,width:"100%",maxWidth:520,padding:16,boxSizing:"border-box",maxHeight:"90%",overflowY:"auto",overscrollBehavior:"contain"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Form a crew</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:2,paddingLeft:12,overflowWrap:"anywhere"}}>From {groupName}. Everyone you pick gets an invite to accept or decline.</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      <SL>Who {sel.length?"· "+sel.length+" picked":""}</SL>
      {!others.length?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:12}}>Nobody else in this group to invite yet.</div>:<>
        {others.length>8?<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Find a member" aria-label="Find a member" style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.bg,color:C.text,marginBottom:8}}/>:null}
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto",overscrollBehavior:"contain",marginBottom:6}}>
          {shown.map(p=>{const on=isOn(p.id);const off=!on&&full;return <button key={String(p.id)} type="button" aria-pressed={on} disabled={off} onClick={()=>toggle(p.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",padding:"7px 10px",borderRadius:10,border:"1px solid "+(on?C.blueDim:C.border),background:on?C.blueBg:C.card,color:off?C.textMuted:C.text,cursor:off?"default":"pointer"}}>
            <Av src={p.avatar} size={30} online={p.online}/>
            <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:13.5,fontWeight:700,overflowWrap:"anywhere"}}>{pubName(p)}</span><span style={{display:"block",fontSize:11.5,color:on?C.textSub:C.textMuted,overflowWrap:"anywhere"}}>{climberLine(p)}</span></span>
            <span aria-hidden="true" style={{flexShrink:0,width:20,height:20,borderRadius:6,border:"1.5px solid "+(on?C.blue:C.border),background:on?C.blue:"transparent",color:C.onSolid,fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{on?"✓":""}</span>
          </button>;})}
          {ql&&!shown.length?<div style={{fontSize:12,color:C.textMuted}}>No member by that name.</div>:null}
        </div>
        {full?<div style={{fontSize:11.5,color:C.amber,marginBottom:6}}>A crew holds 12 at most — you and {MAX_PICK} others.</div>:null}
      </>}
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"10px 0 12px"}}>
        <button type="button" aria-pressed={priv} onClick={()=>setPriv(v=>!v)} style={{...CHIP,flexShrink:0,border:"1px solid "+(priv?C.blueDim:C.border),background:priv?C.blueBg:C.surface,color:priv?C.onSolid:C.textSub}}>{priv?"Private":"Listed"}</button>
        <span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4}}>{priv?"Only the people invited can see who’s in it. It won’t be listed under Join a crew.":"Climbers can find it under Join a crew and ask to join."}</span>
      </div>
      <SL>Where</SL>
      {climbs?<select aria-label="Form the crew for a saved climb" disabled={none} value="" onChange={e=>{if(e.target.value)onRoute(e.target.value,picked(),priv);}} style={{width:"100%",boxSizing:"border-box",height:44,padding:"0 10px",borderRadius:10,border:"1px solid "+(none?C.border:C.blueDim),background:none?C.surface:C.blueBg,color:none?C.textMuted:C.onSolid,fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:none?"default":"pointer",marginBottom:8}}>
        <option value="">{none?"Pick who first":"For a saved climb…"}</option>
        {picks.map(g=><optgroup key={g.list.id} label={g.list.name}>{g.rs.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>)}
      </select>:<div style={{fontSize:11.5,color:C.textMuted,marginBottom:8,lineHeight:1.4}}>Save a climb as an objective to form a crew for it from here.</div>}
      <button type="button" disabled={none} onClick={()=>onArea(picked(),priv)} style={{...BTN_SM,width:"100%",padding:"11px",fontSize:13,border:"1px solid "+C.border,background:C.surface,color:none?C.textMuted:C.text,cursor:none?"default":"pointer"}}>At an area — a crag session…</button>
    </div>
  </div>;
}
