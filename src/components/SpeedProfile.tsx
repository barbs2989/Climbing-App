import { useState } from "react";
import { C, uImp, uRateN, uRateUnit } from "../../ClimbMatchCore.jsx";

export interface SpeedProfileProps {
  /** Whose pace: `hikingSpeedFtHr` in ft/hr as stored. */
  climber: { hikingSpeedFtHr?: number | null };
  /** Your own profile: show the Edit control and treat `override` as the typed value. */
  editable?: boolean;
  /** Your typed trail gain rate (ft/hr), when you have set one. */
  override?: number | null;
  /** Called with the typed rate converted to ft/hr. */
  onSave?: (ftHr: number) => void;
}

/**
 * SPEED PROFILE on a profile: the trail/approach gain rate in the climber's units with a one-line reading of it, an
 * Edit control on your own profile (self-reported rates are flagged as such), and an honest "not set" when there is
 * no pace — never a verdict on a number nobody supplied.
 */
export default function SpeedProfile({climber,editable,override,onSave}: SpeedProfileProps){
  const [edit,setEdit]=useState<string | null>(null);
  const selfReported=editable&&override!=null;
  const hikingSpeed=(selfReported?override:climber.hikingSpeedFtHr)||0;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}><span style={{fontSize:12,fontWeight:700,color:C.blue}}>{/* Never " (logged GPS)": nothing derives a speed from a track. `gpxTrack` is only stored and read back, and hikingSpeedFtHr is a seed constant, a hash-derived filler for demo climbers, or this user's own typed override. The label promised a measurement the app has never taken, for every climber. */}{"SPEED PROFILE"+(selfReported?" (self-reported)":"")}</span>{editable?<button onClick={()=>setEdit(edit==null?String(uRateN(hikingSpeed)):null)} style={{fontSize:11.5,fontWeight:700,color:edit==null?C.blue:C.textMuted,background:"none",border:"none",cursor:"pointer",padding:"8px 10px",margin:"-8px -10px"}}>{edit==null?"Edit":"Cancel"}</button>:null}</div>{editable&&edit!=null?<div style={{marginBottom:10}}><div style={{fontSize:11.5,color:C.textMuted,marginBottom:6,lineHeight:1.4}}>Type your typical trail/approach gain rate in {uRateUnit()} — we'll flag it as self-reported when matching you with partners and crews.</div><div style={{display:"flex",gap:8}}><input aria-label="Typical gain rate" type="number" value={edit} onChange={e=>setEdit(e.target.value)} placeholder={uImp()?"e.g. 1000 ft/hr of gain":"e.g. 300 m/hr of gain"} style={{flex:1,padding:"8px 10px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none"}}/><button onClick={()=>{const v=parseInt(edit||"",10);if(v>0){onSave?.(uImp()?v:Math.round(v*3.28084));}setEdit(null);}} style={{padding:"8px 16px",background:C.blueSolid,color:C.onSolid,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button></div></div>:null}{/* No pace on a new account is the honest state, not "Building fitness": every band below
      would be a verdict on a number nobody supplied, and uRateN(undefined) renders NaN. */}
  {hikingSpeed>0?<><div style={{background:C.surface,borderRadius:9,padding:9,marginBottom:8}}><div style={{fontSize:17,fontWeight:700,color:C.green}}>{uRateN(hikingSpeed).toLocaleString()}</div><div style={{fontSize:12,color:C.textMuted,overflowWrap:"anywhere"}}>{uRateUnit()+" gain · Trail / Approach"}</div></div><div style={{padding:"8px 10px",background:C.surface,borderRadius:8,fontSize:12,color:C.textSub}}>{hikingSpeed>=1400?"Fast mover — long alpine days":hikingSpeed>=1100?"Moderate pace — most objectives":hikingSpeed>=800?"Relaxed pace":"Building fitness"}</div></>:<div style={{padding:"10px 11px",background:C.surface,borderRadius:9,fontSize:12,color:C.textSub,lineHeight:1.45}}>{editable?"Not set yet — add your typical trail gain rate so partner matches and time estimates use your real pace.":"Not shared yet."}</div>}</div>;
}
