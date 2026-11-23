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
}

const svg={width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};

/* The quote or link the caret sits in, if any: neither has a queryCommandState to ask. */
function inTag(el: HTMLElement | null,sel: string): Element | null{const s=window.getSelection(),n=s?s.anchorNode:null;if(!el||!n||!el.contains(n))return null;const e=n.nodeType===1?(n as Element):n.parentElement;const hit=e?e.closest(sel):null;return hit&&hit!==el&&el.contains(hit)?hit:null;}

/** The markdown-backed rich text box: a bold / italic / strikethrough / list / quote / link toolbar over a contentEditable that round-trips through `mdToEditorHtml` and `editorHtmlToMd`, so the stored text stays markdown. Rendered by the log form and core's comments. */
export default function RichEditor({value,onChange,elRef,ariaLabel,placeholder,minHeight}: RichEditorProps){
  const ref=useRef<HTMLDivElement | null>(null),last=useRef<string | null>(null);const [act,setAct]=useState<Record<string, boolean>>({});
  const [linkOpen,setLinkOpen]=useState(false);const [url,setUrl]=useState("");const [linkErr,setLinkErr]=useState(false);const saved=useRef<Range | null>(null);const urlRef=useRef<HTMLInputElement | null>(null);
  const setEl=function(el: HTMLDivElement | null){ref.current=el;if(elRef)elRef.current=el;};
  /* A quote is drawn as renderMD draws it: a bar down its left. The browser's own blockquote is a 40px indent and no bar. */
  const paintQuotes=function(){const el=ref.current;if(!el)return;Array.prototype.forEach.call(el.querySelectorAll("blockquote"),function(q: HTMLElement){q.style.cssText="margin:4px 0;padding:1px 0 1px 10px;border-left:3px solid "+C.border+";color:"+C.textSub;});};
  /* The stored text is the source of truth. It is only written INTO the box when it changed from
     outside (a prompt chip, a mention pick, a reset) — rewriting it on every keystroke would throw
     the caret back to the start. */
  useLayoutEffect(function(){const el=ref.current;if(!el)return;const v=value||"";if(v===last.current)return;last.current=v;el.innerHTML=mdToEditorHtml(v);paintQuotes();if(document.activeElement===el)caretToEnd(el);},[value]);
  const refresh=function(){try{setAct({b:document.queryCommandState("bold"),i:document.queryCommandState("italic"),s:document.queryCommandState("strikeThrough"),ul:document.queryCommandState("insertUnorderedList"),ol:document.queryCommandState("insertOrderedList"),q:!!inTag(ref.current,"blockquote"),a:!!inTag(ref.current,"a")});}catch{/* no selection to ask about */}};
  useEffect(function(){const on=function(){if(ref.current&&document.activeElement===ref.current)refresh();};document.addEventListener("selectionchange",on);return function(){document.removeEventListener("selectionchange",on);};},[]);
  useEffect(function(){if(linkOpen&&urlRef.current)urlRef.current.focus();},[linkOpen]);
  const emit=function(){const el=ref.current;if(!el)return;const md=editorHtmlToMd(el);if(!md.trim()&&el.innerHTML&&!el.querySelector("ul,ol,blockquote"))el.innerHTML="";last.current=md;onChange(md);};
  const cmd=function(c: string,arg?: string){const el=ref.current;if(!el)return;if(document.activeElement!==el)caretToEnd(el);try{document.execCommand("styleWithCSS",false,"false");document.execCommand(c,false,arg);}catch{/* the command is unsupported here */}paintQuotes();emit();refresh();};
  /* Taking a wrapper off by hand: the browser has no dependable "unquote" or caret-only "unlink". The children keep their nodes, and the caret is put back on them: moving a node drops the selection it held. */
  const unwrap=function(node: Element,into: HTMLElement | null){const p=node.parentNode;if(!p)return;const s=window.getSelection();const at=s&&s.anchorNode&&s.focusNode?{an:s.anchorNode,ao:s.anchorOffset,fn:s.focusNode,fo:s.focusOffset}:null;const dest: Node=into||document.createDocumentFragment();while(node.firstChild)dest.appendChild(node.firstChild);p.replaceChild(dest,node);if(s&&at)try{s.setBaseAndExtent(at.an,at.ao,at.fn,at.fo);}catch{/* the caret sat on the wrapper itself */}emit();refresh();};
  const quote=function(){const el=ref.current;if(!el)return;if(document.activeElement!==el)caretToEnd(el);const q=inTag(ref.current,"blockquote");if(q)unwrap(q,document.createElement("div"));else cmd("formatBlock","blockquote");};
  const link=function(){const a=inTag(ref.current,"a");if(a){unwrap(a,null);return;}if(linkOpen){setLinkOpen(false);return;}const el=ref.current,s=window.getSelection();saved.current=el&&s&&s.rangeCount&&el.contains(s.anchorNode)?s.getRangeAt(0).cloneRange():null;setUrl("");setLinkErr(false);setLinkOpen(true);};
  /* The address is held to what renderMD will turn back into a link: http(s), no spaces or brackets. With words selected they
     become the link; with none, the address itself is written in as the link's words. */
  const addLink=function(){const el=ref.current;if(!el)return;let u=url.trim();if(u&&!/^https?:\/\//i.test(u))u="https://"+u;if(!/^https?:\/\/[^\s()]+\.[^\s()]+$/i.test(u)){setLinkErr(true);return;}
    el.focus({preventScroll:true});const s=window.getSelection();const r=saved.current;if(s&&r){s.removeAllRanges();s.addRange(r);}else caretToEnd(el);
    const cur=s&&s.rangeCount?s.getRangeAt(0):null;
    if(cur&&cur.collapsed){const a=document.createElement("a");a.setAttribute("href",u);a.textContent=u.replace(/^https?:\/\//i,"").replace(/[[\]]/g,"");const sp=document.createTextNode(" ");cur.insertNode(sp);cur.insertNode(a);cur.setStartAfter(sp);cur.collapse(true);if(s){s.removeAllRanges();s.addRange(cur);}emit();refresh();}
    else cmd("createLink",u);
    setLinkOpen(false);setUrl("");};
  /* Drawn 30px (owner, 2026-11-19: the 44px row was too large over a comment box). A touch still gets 44px: lib/tapSlop.js
     sends a tap that lands just off a small control to it. */
  const btn: CSSProperties={flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",width:30,height:30,padding:0,borderRadius:6,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:13,cursor:"pointer"};
  const onB=function(on: boolean): CSSProperties{return on?{background:C.blueBg,border:"1px solid "+C.blueDim,color:C.onSolid}:{};};
  const keep=function(e: SyntheticEvent){e.preventDefault();};
  const sep=<div style={{width:1,alignSelf:"stretch",background:C.border,margin:"3px 1px"}}/>;
  return <div>
    <div role="toolbar" aria-label="Text formatting" style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:4,marginBottom:6}}>
      <button type="button" title="Bold (Ctrl+B)" aria-label="Bold" aria-pressed={!!act.b} onMouseDown={keep} onClick={function(){cmd("bold");}} style={Object.assign({},btn,{fontWeight:800},onB(act.b))}>B</button>
      <button type="button" title="Italic (Ctrl+I)" aria-label="Italic" aria-pressed={!!act.i} onMouseDown={keep} onClick={function(){cmd("italic");}} style={Object.assign({},btn,{fontStyle:"italic",fontWeight:600},onB(act.i))}>I</button>
      <button type="button" title="Strikethrough" aria-label="Strikethrough" aria-pressed={!!act.s} onMouseDown={keep} onClick={function(){cmd("strikeThrough");}} style={Object.assign({},btn,{textDecoration:"line-through",fontWeight:600},onB(act.s))}>S</button>
      {sep}
      <button type="button" title="Bullet list" aria-label="Bullet list" aria-pressed={!!act.ul} onMouseDown={keep} onClick={function(){cmd("insertUnorderedList");}} style={Object.assign({},btn,onB(act.ul))}>
        <svg {...svg}><circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none"/><line x1="9.5" y1="6" x2="21" y2="6"/><line x1="9.5" y1="12" x2="21" y2="12"/><line x1="9.5" y1="18" x2="21" y2="18"/></svg>
      </button>
      <button type="button" title="Numbered list" aria-label="Numbered list" aria-pressed={!!act.ol} onMouseDown={keep} onClick={function(){cmd("insertOrderedList");}} style={Object.assign({},btn,onB(act.ol))}>
        <svg {...svg}>{/* The digits are DRAWN, not <text>: SVG text is page text, so "123" became the button's visible label and its name "Numbered list" no longer contained it (WCAG 2.5.3). */}<path d="M2.2 4.6 L3.4 3.6 V8.6" strokeWidth="1.3"/><path d="M1.7 11.2 Q2.6 9.8 3.7 10.2 Q4.8 10.9 3.6 12.2 L1.7 14.4 H4.6" strokeWidth="1.3"/><path d="M1.8 16.4 H4.4 L2.9 18.2 Q4.7 18.3 4.6 19.5 Q4.3 21 1.8 20.6" strokeWidth="1.3"/><line x1="9.5" y1="6" x2="21" y2="6"/><line x1="9.5" y1="12" x2="21" y2="12"/><line x1="9.5" y1="18" x2="21" y2="18"/></svg>
      </button>
      <button type="button" title="Quote" aria-label="Quote" aria-pressed={!!act.q} onMouseDown={keep} onClick={quote} style={Object.assign({},btn,onB(act.q))}>
        <svg {...svg}><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" fill="currentColor" stroke="none"/></svg>
      </button>
      {sep}
      <button type="button" title={act.a?"Remove link":"Add a link"} aria-label="Link" aria-pressed={!!act.a||linkOpen} onMouseDown={keep} onClick={link} style={Object.assign({},btn,onB(act.a||linkOpen))}>
        <svg {...svg}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
    </div>
    {linkOpen?<div style={{marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:6}}>
      <input ref={urlRef} type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Link address" aria-invalid={linkErr} placeholder="Paste a web address" value={url} onChange={function(e){setUrl(e.target.value);setLinkErr(false);}} onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();addLink();}}} style={{flex:1,minWidth:0,boxSizing:"border-box",padding:"6px 10px",borderRadius:8,border:"1px solid "+(linkErr?C.red:C.border),background:C.card,color:C.text,fontSize:16,outline:"none"}}/>
      <button type="button" onClick={addLink} style={{flexShrink:0,padding:"8px 12px",borderRadius:8,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:12,fontWeight:700,cursor:"pointer"}}>Add link</button>
      <button type="button" onClick={function(){setLinkOpen(false);}} style={{flexShrink:0,padding:"8px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cancel</button>
    </div>{linkErr?<div role="alert" style={{fontSize:11.5,color:C.red,marginTop:4}}>That doesn’t look like a web address.</div>:null}</div>:null}
    <div style={{position:"relative"}}>
      {!value?<div aria-hidden="true" style={{position:"absolute",top:9,left:11,right:11,color:C.textMuted,fontSize:16,lineHeight:1.5,pointerEvents:"none"}}>{placeholder}</div>:null}
      <div ref={setEl} role="textbox" aria-multiline="true" aria-label={ariaLabel} aria-placeholder={placeholder} tabIndex={0} contentEditable suppressContentEditableWarning onInput={emit} onKeyUp={refresh} onMouseUp={refresh} onFocus={refresh} onPaste={function(e){const t=e.clipboardData&&e.clipboardData.getData("text/plain");if(t==null)return;e.preventDefault();try{document.execCommand("insertText",false,t);}catch{/* insertText is unsupported here */}emit();}} style={{width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:16,boxSizing:"border-box",minHeight:minHeight||78,maxHeight:"50vh",overflowY:"auto",overscrollBehavior:"contain",outline:"none",lineHeight:1.5,wordBreak:"break-word",whiteSpace:"pre-wrap"}}/>
    </div>
  </div>;
}
