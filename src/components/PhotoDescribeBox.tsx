import { useState, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import PhotoAltField from "./PhotoAltField.tsx";

export interface PhotoDescribeBoxProps {
  /** The description the photo has now. */
  initial?: string | null;
  /** Saves the trimmed text; "Saved" is shown only once this resolves. */
  onSave: (text: string) => unknown | Promise<unknown>;
  style?: CSSProperties;
}
interface SaveMsg { ok: boolean; t: string }

/**
 * The owner's way to describe a photo AFTER it is posted — which is also the only way the photos that
 * already exist can ever get one. Saves on an explicit tap, reports the outcome in words
 * (role=status / role=alert), and says nothing it cannot back: "Saved" only once onSave resolved.
 * Centred with left/right + margin:auto, NOT translateX(-50%): index.html's reduced-motion rule forces
 * transform:none, which would shove a transform-centred box off the screen for exactly the climbers who
 * asked for less motion. Core's own lines, moved by script; only types and the style spread were added.
 */
export default function PhotoDescribeBox({initial,onSave,style}: PhotoDescribeBoxProps) {
  const [v,setV]=useState(initial||"");const [busy,setBusy]=useState(false);const [msg,setMsg]=useState<SaveMsg | null>(null);
  const dirty=String(v||"").trim()!==String(initial||"").trim();
  return <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:20,right:20,margin:"0 auto",maxWidth:420,background:"rgba(13,17,23,0.94)",border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",boxSizing:"border-box",...style}}>
    <PhotoAltField value={v} onChange={x=>{setV(x);setMsg(null);}}/>
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
      <button disabled={!dirty||busy} onClick={()=>{setBusy(true);setMsg(null);Promise.resolve(onSave(String(v||"").trim())).then(()=>setMsg({ok:true,t:"Description saved"}),e=>setMsg({ok:false,t:"Couldn’t save the description — "+((e&&e.message)||"try again")})).finally(()=>setBusy(false));}} style={{padding:"7px 14px",borderRadius:8,border:"none",background:dirty&&!busy?C.blueSolid:C.border,color:dirty&&!busy?C.onSolid:C.textSub,fontSize:12.5,fontWeight:700,cursor:dirty&&!busy?"pointer":"default"}}>{busy?"Saving…":"Save description"}</button>
      {msg?<span role={msg.ok?"status":"alert"} style={{fontSize:12,color:msg.ok?C.green:C.red,lineHeight:1.4}}>{msg.t}</span>:null}
    </div>
  </div>;
}
