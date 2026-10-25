import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject, type SyntheticEvent } from "react";
import { C, caretToEnd, editorHtmlToMd, mdToEditorHtml } from "../../ClimbMatchCore.jsx";

export interface RichEditorProps {
  /** The stored markdown; the editor's source of truth. */
  value?: string | null;
  onChange: (md: string) => void;
  /** The caller's own ref to the editable element (a prompt chip or a mention pick writes through it). */
  elRef?: MutableRefObject<HTMLElement | null> | null;
  ariaLabel?: string;
  placeholder?: string;
  /** Pixels; 78 when unset. */
  minHeight?: number;
  /** Smaller toolbar buttons. */
  compact?: boolean;
}

/** The markdown-backed rich text box: a bold / italic / list toolbar over a contentEditable that round-trips through `mdToEditorHtml` and `editorHtmlToMd`, so the stored text stays markdown. Rendered by the log form and core's comments. */
export default function RichEditor({value,onChange,elRef,ariaLabel,placeholder,minHeight,compact}: RichEditorProps){
  const ref=useRef<HTMLDivElement | null>(null),last=useRef<string | null>(null);const [act,setAct]=useState<Record<string, boolean>>({});
  const setEl=function(el: HTMLDivElement | null){ref.current=el;if(elRef)elRef.current=el;};
  /* The stored text is the source of truth. It is only written INTO the box when it changed from
     outside (a prompt chip, a mention pick, a reset) — rewriting it on every keystroke would throw
     the caret back to the start. */
  useLayoutEffect(function(){const el=ref.current;if(!el)return;const v=value||"";if(v===last.current)return;last.current=v;el.innerHTML=mdToEditorHtml(v);if(document.activeElement===el)caretToEnd(el);},[value]);
  const refresh=function(){try{setAct({b:document.queryCommandState("bold"),i:document.queryCommandState("italic"),ul:document.queryCommandState("insertUnorderedList"),ol:document.queryCommandState("insertOrderedList")});}catch{/* no selection to ask about */}};
  useEffect(function(){const on=function(){if(ref.current&&document.activeElement===ref.current)refresh();};document.addEventListener("selectionchange",on);return function(){document.removeEventListener("selectionchange",on);};},[]);
  const emit=function(){const el=ref.current;if(!el)return;const md=editorHtmlToMd(el);if(!md.trim()&&el.innerHTML&&!el.querySelector("ul,ol"))el.innerHTML="";last.current=md;onChange(md);};
  const cmd=function(c: string){const el=ref.current;if(!el)return;if(document.activeElement!==el)caretToEnd(el);try{document.execCommand("styleWithCSS",false,"false");document.execCommand(c,false);}catch{/* the command is unsupported here */}emit();refresh();};
  const btn: CSSProperties={display:"flex",alignItems:"center",justifyContent:"center",width:compact?32:36,height:compact?28:32,borderRadius:7,border:"1px solid "+C.border,background:C.surface,color:C.textSub,cursor:"pointer"};
  const onB=function(on: boolean): CSSProperties{return on?{background:C.blueBg,border:"1px solid "+C.blueDim,color:C.onSolid}:{};};
  const keep=function(e: SyntheticEvent){e.preventDefault();};
  return <div>
    <div role="toolbar" aria-label="Text formatting" style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
      <button type="button" title="Bold (Ctrl+B)" aria-label="Bold" aria-pressed={!!act.b} onMouseDown={keep} onClick={function(){cmd("bold");}} style={Object.assign({},btn,{fontWeight:800,fontSize:15},onB(act.b))}>B</button>
      <button type="button" title="Italic (Ctrl+I)" aria-label="Italic" aria-pressed={!!act.i} onMouseDown={keep} onClick={function(){cmd("italic");}} style={Object.assign({},btn,{fontStyle:"italic",fontSize:15},onB(act.i))}>I</button>
      <div style={{width:1,alignSelf:"stretch",background:C.border,margin:"2px 1px"}}/>
      <button type="button" title="Bullet list" aria-label="Bullet list" aria-pressed={!!act.ul} onMouseDown={keep} onClick={function(){cmd("insertUnorderedList");}} style={Object.assign({},btn,onB(act.ul))}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none"/><line x1="9.5" y1="6" x2="21" y2="6"/><line x1="9.5" y1="12" x2="21" y2="12"/><line x1="9.5" y1="18" x2="21" y2="18"/></svg>
      </button>
      <button type="button" title="Numbered list" aria-label="Numbered list" aria-pressed={!!act.ol} onMouseDown={keep} onClick={function(){cmd("insertOrderedList");}} style={Object.assign({},btn,onB(act.ol))}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><text x="1" y="8.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text><text x="1" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text><text x="1" y="20.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text><line x1="9.5" y1="6" x2="21" y2="6"/><line x1="9.5" y1="12" x2="21" y2="12"/><line x1="9.5" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <div style={{position:"relative"}}>
      {!value?<div aria-hidden="true" style={{position:"absolute",top:9,left:11,right:11,color:C.textMuted,fontSize:16,lineHeight:1.5,pointerEvents:"none"}}>{placeholder}</div>:null}
      <div ref={setEl} role="textbox" aria-multiline="true" aria-label={ariaLabel} aria-placeholder={placeholder} tabIndex={0} contentEditable suppressContentEditableWarning onInput={emit} onKeyUp={refresh} onMouseUp={refresh} onFocus={refresh} onPaste={function(e){const t=e.clipboardData&&e.clipboardData.getData("text/plain");if(t==null)return;e.preventDefault();try{document.execCommand("insertText",false,t);}catch{/* insertText is unsupported here */}emit();}} style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:16,boxSizing:"border-box",minHeight:minHeight||78,maxHeight:"50vh",overflowY:"auto",overscrollBehavior:"contain",outline:"none",lineHeight:1.5,wordBreak:"break-word",whiteSpace:"pre-wrap"}}/>
    </div>
  </div>;
}
