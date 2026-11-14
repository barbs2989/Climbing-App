import { useState } from "react";
import { createPortal } from "react-dom";
import { C, SKILLS } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import { CHECKLISTS, COURSES, GUIDE_DISCLAIMER, TIER_LABEL, skillGuide } from "../../lib/skillGuides.js";

export interface SkillGuideSheetProps {
  /** A SKILLS key with a guide in lib/skillGuides.js. */
  skillKey?: string;
  /** A CHECKLISTS key, to open straight on a checklist (the route Safety tab). */
  checklistKey?: string;
  onClose: () => void;
}

/* One skill's card, or one field checklist (owner, 2026-11-14; lib/skillGuides.js says what a card is and is
   not). Its own component, portalled to the body, as CommentMenu is: overlay discovery reads a component that
   renders a dialog as a dialog. SKILLS is read here, at render time, never at module scope. */
export default function SkillGuideSheet({skillKey, checklistKey, onClose}: SkillGuideSheetProps){
  const guide = skillGuide(skillKey);
  const [listKey, setListKey] = useState<string | null>(checklistKey && CHECKLISTS[checklistKey] ? checklistKey : null);
  const list = listKey ? CHECKLISTS[listKey] : null;
  const skillTable: Record<string, { label: string }> = SKILLS;
  const skillName = skillKey && skillTable[skillKey] ? skillTable[skillKey].label : "Skill guide";
  const title = list ? list.title : skillName;
  const H = {fontSize:11,fontWeight:800,color:C.label,textTransform:"uppercase" as const,letterSpacing:0.6,margin:"14px 0 5px"};
  const linkSt = {display:"block",color:C.blue,fontSize:13.5,lineHeight:1.4,padding:"7px 0",textDecoration:"underline"};
  const links = (ls: {label: string; url: string}[]) => ls.map(l => <a key={l.url+l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={linkSt}>{l.label}</a>);
  const note = <div style={{fontSize:12,color:C.textSub,lineHeight:1.5,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:9,padding:"8px 10px",marginTop:4}}>{GUIDE_DISCLAIMER}</div>;
  let body = null;
  if (list) {
    body = <><ol style={{margin:"10px 0 0",paddingLeft:22,color:C.text}}>{list.items.map(([k, v]) => <li key={k} style={{fontSize:13.5,lineHeight:1.5,marginBottom:7}}><b>{k}</b>{" "}<span style={{color:C.textSub}}>{v}</span></li>)}</ol>
      {list.after ? <div style={{fontSize:13.5,fontWeight:700,color:C.text,margin:"4px 0 10px"}}>{list.after}</div> : null}
      {note}
      <div style={H}>Learn more</div>{links([list.more])}
      {guide ? <button onClick={() => setListKey(null)} style={{marginTop:10,minHeight:44,width:"100%",borderRadius:10,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:14,fontWeight:700,cursor:"pointer"}}>{"Back to "+skillName}</button> : null}</>;
  } else if (guide) {
    body = <><div style={{fontSize:12,fontWeight:700,color:guide.tier === "G" ? C.amber : C.textMuted,marginTop:2}}>{TIER_LABEL[guide.tier]+(guide.tier === "G" ? " — learn it from a guide" : "")}</div>
      <div style={{fontSize:14,color:C.text,lineHeight:1.5,marginTop:8}}>{guide.what}</div>
      <div style={H}>When you need it</div><div style={{fontSize:13.5,color:C.textSub,lineHeight:1.5}}>{guide.when}</div>
      <div style={H}>What goes wrong</div><ul style={{margin:0,paddingLeft:20}}>{guide.watch.map(w => <li key={w} style={{fontSize:13.5,color:C.textSub,lineHeight:1.5,marginBottom:6}}>{w}</li>)}</ul>
      {guide.checklist && CHECKLISTS[guide.checklist] ? <button onClick={() => setListKey(guide.checklist || null)} style={{marginTop:10,minHeight:44,width:"100%",borderRadius:10,border:"1px solid "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:14,fontWeight:700,cursor:"pointer"}}>{"Field checklist: "+CHECKLISTS[guide.checklist].title}</button> : null}
      <div style={H}>Learn more</div>{links(guide.links)}
      <div style={H}>Learn it in person</div>{links(COURSES[guide.courses] || [])}
      <div style={{marginTop:10}}>{note}</div></>;
  }
  return createPortal(<div onClick={onClose} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape") onClose(); }} role="dialog" aria-modal="true" aria-label={title} style={{position:"fixed",inset:0,background:C.scrim,zIndex:9700,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e => e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto",overscrollBehavior:"contain",borderRadius:"16px 16px 0 0",padding:"14px 16px 20px",border:"1px solid "+C.border,borderBottom:"none",boxSizing:"border-box"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{title}</div><button aria-label={"Close "+title} onClick={onClose} style={POP_CLOSE}>✕</button></div>{body}</div></div>, document.body);
}
