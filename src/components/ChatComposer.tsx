import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { C, photoAlt } from "../../ClimbMatchCore.jsx";
import PhotoAltField from "./PhotoAltField.tsx";

export interface ChatComposerProps {
  /** "dm" or "crew": the quick replies are drawn as a scrolling strip of grey chips for a DM and blue chips for a crew. */
  variant?: string;
  /** Tappable canned replies shown while the box is empty. */
  quickReplies: readonly string[];
  placeholder?: string;
  /** Called with the text, or with a data URL and `{ image: true, alt }` when a photo is sent. */
  onSend: (value: string, opts?: { image: true; alt: string }) => void;
  /** Fires on each keystroke while there is text, so the other side can show a typing indicator. */
  onTyping?: () => void;
}

/**
 * The message composer under a DM or crew chat: quick replies while empty, a photo picker whose
 * picked image waits with an alt-text field before it is sent, the text input and the send button.
 * Reads core (`C`, `photoAlt`, `PhotoAltField`) at render time only. Core's own line, moved by script;
 * only types and the FileReader result check were added.
 */
export default function ChatComposer({variant,quickReplies,placeholder,onSend,onTyping}: ChatComposerProps) {const [text,setText]=useState("");const [pendingImg,setPendingImg]=useState<string | null>(null);const [imgAlt,setImgAlt]=useState("");const send=(t?: string)=>{const v=t!=null?t:text;if(!v.trim())return;onSend(v);setText("");};const dm=variant!=="crew";return <>{!text?<div className="cm-hscroll" style={dm?{display:"flex",gap:6,overflowX:"auto",flexShrink:0,marginBottom:7,paddingBottom:2,WebkitOverflowScrolling:"touch"}:{display:"flex",gap:6,flexWrap:"nowrap",overflowX:"auto",marginBottom:8,flexShrink:0,paddingBottom:2}}>{quickReplies.map(q=><button key={q} onClick={()=>send(q)} style={dm?{flexShrink:0,padding:"7px 13px",borderRadius:16,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}:{fontSize:12,fontWeight:600,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:16,padding:"8px 12px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{q}</button>)}</div>:null}{pendingImg?<div style={{display:"flex",gap:10,alignItems:"flex-start",background:C.surface,border:"1px solid "+C.border,borderRadius:12,padding:10,marginBottom:8,flexShrink:0}}><img src={pendingImg} alt={photoAlt(imgAlt,"Photo ready to send")} style={{width:56,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}}/><div style={{flex:1,minWidth:0}}><PhotoAltField value={imgAlt} onChange={setImgAlt} autoFocus/><div style={{display:"flex",gap:12,marginTop:8}}><button onClick={()=>{onSend(pendingImg,{image:true,alt:imgAlt.trim()});setPendingImg(null);setImgAlt("");}} style={{padding:"8px 14px",borderRadius:9,border:"none",background:C.blueSolid,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Send photo</button><button onClick={()=>{setPendingImg(null);setImgAlt("");}} style={{padding:"8px 14px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button></div></div></div>:null}<div style={{display:"flex",gap:7,flexShrink:0,alignItems:"center"}}><label style={{flexShrink:0,width:40,height:40,borderRadius:"50%",background:C.card,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,cursor:"pointer"}}><span style={{fontSize:24,fontWeight:300,lineHeight:1,marginTop:-2}}>+</span><input aria-label="Attach a photo" type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>)=>{const f=e.target.files&&e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{if(typeof rd.result==="string")setPendingImg(rd.result);setImgAlt("");};rd.readAsDataURL(f);e.target.value="";}} className="cm-file-input"/></label><input aria-label="Message" value={text} onChange={(e: ChangeEvent<HTMLInputElement>)=>{setText(e.target.value);if(e.target.value&&onTyping)onTyping();}} onKeyDown={(e: KeyboardEvent<HTMLInputElement>)=>{if(e.key==="Enter")send();}} placeholder={placeholder} style={{flex:1,padding:"9px 12px",borderRadius:22,border:`1px solid ${C.border}`,fontSize:14,background:C.card,color:C.text,outline:"none"}}/><button aria-label="Send message" onClick={()=>send()} style={{background:C.blueSolid,color:"white",border:"none",borderRadius:"50%",width:40,height:40,fontSize:16,cursor:"pointer",flexShrink:0}}>↑</button></div></>;}
