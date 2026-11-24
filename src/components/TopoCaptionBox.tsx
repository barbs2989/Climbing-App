import { useState, useEffect, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface TopoCaptionBoxProps {
  /** The caption as stored; the Save button wakes only once the text differs from it. */
  initial?: string | null;
  /** Saves the trimmed caption; a rejection is shown under the box and the text is kept. */
  onSave: (caption: string) => unknown;
  /** Merged over the box's own style. */
  style?: CSSProperties;
  /** Written with the caption typed but not yet saved (null when there is none), so the sheet around the box can save it too. */
  draftRef?: { current: string | null } | null;
}

/**
 * The uploader's CAPTION box under an enlarged topo: one labelled text area and Save caption, with the result
 * announced (status on success, alert on failure). Reads `C` at render time. Moved verbatim from
 * RouteDetail.jsx; only the types were added.
 */
export default function TopoCaptionBox({initial,onSave,style,draftRef}: TopoCaptionBoxProps){
  const [v,setV]=useState(initial||"");const [busy,setBusy]=useState(false);const [msg,setMsg]=useState<{ok:boolean,t:string}|null>(null);
  /* What is stored: `initial`, until a save lands here. Where `initial` never changes (the box over a photo just posted is given null), Save caption used to stay awake after saving, as if the text were still unsaved. */
  const [saved,setSaved]=useState(initial||"");
  const dirty=String(v||"").trim()!==String(saved||"").trim();
  /* A caption typed and not saved, for the sheet around the box: Save topo sends it with the line, so it is not lost to a climber who never pressed Save caption. null when there is nothing unsaved. */
  useEffect(function(){if(draftRef)draftRef.current=dirty?String(v||"").trim():null;},[draftRef,dirty,v]);
  return <div style={Object.assign({background:C.surface,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px"},style||{})}>
    <label style={{display:"block",fontSize:12,fontWeight:700,color:C.text,marginBottom:3}}>{"Caption"}<span style={{fontWeight:400,color:C.textMuted}}>{" — everyone who opens this topo reads it"}</span>
      <textarea aria-label="Caption — everyone who opens this topo reads it" value={v} onChange={function(e){setV(e.target.value);setMsg(null);}} rows={3} placeholder="Add context — which face this is, when you took it, where the line goes or what to watch for" style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"8px 10px",borderRadius:8,border:"1px solid "+C.field,background:C.card,color:C.text,fontSize:13,fontWeight:400,lineHeight:1.45,fontFamily:"inherit",resize:"vertical",outline:"none"}}/>
    </label>
    <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
      <button disabled={!dirty||busy} onClick={function(){setBusy(true);setMsg(null);const t=String(v||"").trim();Promise.resolve(onSave(t)).then(function(){setSaved(t);setMsg({ok:true,t:"Caption saved"});},function(e: {message?: string}|null){setMsg({ok:false,t:"Couldn’t save the caption — "+((e&&e.message)||"try again")});}).finally(function(){setBusy(false);});}} style={{padding:"7px 14px",borderRadius:8,border:"none",background:dirty&&!busy?C.actionSolid:C.border,color:dirty&&!busy?C.onSolid:C.textSub,fontSize:12.5,fontWeight:700,cursor:dirty&&!busy?"pointer":"default"}}>{busy?"Saving…":"Save caption"}</button>
      {msg?<span role={msg.ok?"status":"alert"} style={{fontSize:12,color:msg.ok?C.green:C.red,lineHeight:1.4}}>{msg.t}</span>:null}
    </div>
  </div>;
}
