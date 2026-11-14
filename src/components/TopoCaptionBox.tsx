import { useState, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface TopoCaptionBoxProps {
  /** The caption as stored; the Save button wakes only once the text differs from it. */
  initial?: string | null;
  /** Saves the trimmed caption; a rejection is shown under the box and the text is kept. */
  onSave: (caption: string) => unknown;
  /** Merged over the box's own style. */
  style?: CSSProperties;
}

/**
 * The uploader's CAPTION box under an enlarged topo: one labelled text area and Save caption, with the result
 * announced (status on success, alert on failure). Reads `C` at render time. Moved verbatim from
 * RouteDetail.jsx; only the types were added.
 */
export default function TopoCaptionBox({initial,onSave,style}: TopoCaptionBoxProps){
  const [v,setV]=useState(initial||"");const [busy,setBusy]=useState(false);const [msg,setMsg]=useState<{ok:boolean,t:string}|null>(null);
  const dirty=String(v||"").trim()!==String(initial||"").trim();
  return <div style={Object.assign({background:C.surface,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px"},style||{})}>
    <label style={{display:"block",fontSize:12,fontWeight:700,color:C.text,marginBottom:3}}>{"Caption"}<span style={{fontWeight:400,color:C.textMuted}}>{" — everyone who opens this topo reads it"}</span>
      <textarea aria-label="Caption — everyone who opens this topo reads it" value={v} onChange={function(e){setV(e.target.value);setMsg(null);}} rows={3} placeholder="Add context — which face this is, when you took it, where the line goes or what to watch for" style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"8px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:13,fontWeight:400,lineHeight:1.45,fontFamily:"inherit",resize:"vertical",outline:"none"}}/>
    </label>
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
      <button disabled={!dirty||busy} onClick={function(){setBusy(true);setMsg(null);Promise.resolve(onSave(String(v||"").trim())).then(function(){setMsg({ok:true,t:"Caption saved"});},function(e: {message?: string}|null){setMsg({ok:false,t:"Couldn’t save the caption — "+((e&&e.message)||"try again")});}).finally(function(){setBusy(false);});}} style={{padding:"7px 14px",borderRadius:8,border:"none",background:dirty&&!busy?C.blueSolid:C.border,color:dirty&&!busy?C.onSolid:C.textSub,fontSize:12.5,fontWeight:700,cursor:dirty&&!busy?"pointer":"default"}}>{busy?"Saving…":"Save caption"}</button>
      {msg?<span role={msg.ok?"status":"alert"} style={{fontSize:12,color:msg.ok?C.green:C.red,lineHeight:1.4}}>{msg.t}</span>:null}
    </div>
  </div>;
}
