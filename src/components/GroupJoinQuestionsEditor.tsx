import { C } from "../../ClimbMatchCore.jsx";
import { POP_REMOVE } from "../../lib/popupChrome.js";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";

/** One membership question on the group form. */
interface GroupJoinQuestionsEditorQuestion { prompt?: string; type?: string; options?: string[]; required?: boolean }
/** The group form, as far as this editor reads and writes it. */
interface GroupJoinQuestionsEditorForm { questions?: GroupJoinQuestionsEditorQuestion[]; err?: string; [k: string]: unknown }

export interface GroupJoinQuestionsEditorProps {
  /** The form's section heading (title, optional subtitle, first-section flag). */
  H: (t: string, sub?: string, first?: boolean) => ReactNode;
  INP: CSSProperties;
  pill: (on: boolean) => CSSProperties;
  qs: GroupJoinQuestionsEditorQuestion[];
  setGroupForm: Dispatch<SetStateAction<GroupJoinQuestionsEditorForm>>;
  setQ: (ix: number, patch: GroupJoinQuestionsEditorQuestion) => void;
}

/* gated? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function GroupJoinQuestionsEditor({H,INP,pill,qs,setGroupForm,setQ}: GroupJoinQuestionsEditorProps){
  return <div>{H("Membership questions","Optional, up to 5. Climbers answer them when they ask to join; only you and your moderators see the answers.")}{qs.map(function(q: GroupJoinQuestionsEditorQuestion,ix: number){const isC=q.type==="choice";const os=q.options||[];return <div key={ix} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:11,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:11.5,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3}}>{"Question "+(ix+1)}</span><button onClick={function(){setGroupForm(function(f: GroupJoinQuestionsEditorForm){const a=(f.questions||[]).slice();a.splice(ix,1);return Object.assign({},f,{questions:a,err:""});});}} aria-label={"Remove question "+(ix+1)} style={POP_REMOVE}>✕</button></div><input aria-label={"Question "+(ix+1)} value={q.prompt||""} maxLength={200} onChange={function(e){setQ(ix,{prompt:e.target.value});}} placeholder="e.g. What’s the hardest route you’ve led?" style={INP}/><div style={{display:"flex",gap:7,marginTop:8}}>{[["text","Written answer"],["choice","Multiple choice"]].map(function(t){const on=(q.type||"text")===t[0];return <button key={t[0]} onClick={function(){setQ(ix,{type:t[0],options:t[0]==="choice"&&os.length<2?os.concat(["",""]).slice(0,Math.max(2,os.length)):os});}} aria-pressed={on} style={pill(on)}>{t[1]}</button>;})}</div>{isC?<div style={{marginTop:9}}>{os.map(function(o,oi){return <div key={oi} style={{display:"flex",gap:7,alignItems:"center",marginBottom:6}}><input aria-label={"Answer choice "+(oi+1)+" for question "+(ix+1)} value={o} maxLength={80} onChange={function(e){const v=e.target.value;setQ(ix,{options:os.map(function(x,xi){return xi===oi?v:x;})});}} placeholder={"Choice "+(oi+1)} style={Object.assign({},INP,{flex:1,padding:"8px 11px",fontSize:13.5})}/>{os.length>2?<button onClick={function(){setQ(ix,{options:os.filter(function(_,xi){return xi!==oi;})});}} aria-label={"Remove choice "+(oi+1)} style={POP_REMOVE}>✕</button>:null}</div>;})}{os.length<8?<button onClick={function(){setQ(ix,{options:os.concat([""])});}} style={{background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",padding:"4px 0"}}>+ Add a choice</button>:null}</div>:null}<label style={{display:"flex",alignItems:"center",gap:8,marginTop:9,fontSize:12.5,color:C.textSub,cursor:"pointer"}}><input type="checkbox" checked={!!q.required} onChange={function(e){setQ(ix,{required:e.target.checked});}}/>Required — they can’t send the request without answering</label></div>;})}{qs.length<5?<button onClick={function(){setGroupForm(function(f: GroupJoinQuestionsEditorForm){return Object.assign({},f,{questions:(f.questions||[]).concat([{prompt:"",type:"text",options:[],required:false}]),err:""});});}} style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px dashed "+C.border,background:"transparent",color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add a question</button>:null}</div>;
}
