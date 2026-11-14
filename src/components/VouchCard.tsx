import { C, SKILLS, VOUCH_RATING_LABEL, shortDate, vouchAvg, vouchRated } from "../../ClimbMatchCore.jsx";
import Av from "./Av.tsx";
import Bar from "./Bar.tsx";
import Lbl from "./Lbl.tsx";
import Stars from "./Stars.tsx";

/** A vouch as the profile shows it: who gave it, where, the per-skill ratings (`vouchRated` keeps the 1–5 ones) and the words. */
export interface Vouch {
  from: string;
  avatar?: string | null;
  route?: string | null;
  date?: string | null;
  wouldClimbAgain?: boolean;
  text?: string | null;
  /** Skill keys (`SKILLS`) the voucher ticked. */
  skills?: string[] | null;
  /** "YYYY-MM-DD" when the voucher says the two practiced the ticked skills together. */
  practicedOn?: string | null;
  ratings?: Record<string, number | string | null> | null;
}

export interface VouchCardProps {
  v: Vouch;
}

/** One vouch on a profile: the voucher, the climb and date, the average stars, each rated skill as a bar, the words, and the skills ticked. */
export default function VouchCard({v}: VouchCardProps){
  /* `SKILLS` keyed by skill id, for the ticked-skill chips' labels. Read HERE, at render time, never at module scope:
     core imports this component back, so a module-scope read of a core export runs before core has finished
     evaluating and throws "Cannot access … before initialization" in the production bundle (the 2026-10-23 outage). */
  const SKILL_LABELS: Record<string, { label?: string }> = SKILLS;
  const rated=vouchRated(v),avg=vouchAvg(v);
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}><Av src={v.avatar} size={40}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{v.from}</div><div style={{fontSize:12,color:C.textMuted}}>{<Lbl s={"📍 "+v.route}/>}</div><div style={{fontSize:12,color:C.textMuted}}>{shortDate(v.date)}</div></div><div style={{textAlign:"right"}}>{avg!=null?<Stars n={avg}/>:null}{v.wouldClimbAgain?<div style={{fontSize:12,color:C.blue,marginTop:2}}>✓ Would climb again</div>:null}</div></div>{rated.length?<div style={{display:"grid",gridTemplateColumns:"auto minmax(24px,1fr) auto",columnGap:6,rowGap:6,alignItems:"center",marginBottom:10}}>{rated.map(([k,val])=>[<span key={k+"l"} style={{fontSize:12,color:C.textMuted,lineHeight:1.3}}>{VOUCH_RATING_LABEL[k]||k}</span>,<div key={k+"b"}><Bar val={val} max={5} color={val>=4?C.green:val>=3?C.blue:C.amber} h={5}/></div>,<span key={k+"v"} style={{fontSize:12,color:C.textSub,textAlign:"right"}}>{val}</span>])}</div>:null}{v.text?<p style={{fontSize:14,color:C.textSub,lineHeight:1.7,margin:0,fontStyle:"italic"}}>"{v.text}"</p>:null}{v.skills&&v.skills.length?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:11}}>{v.practicedOn?<span style={{width:"100%",fontSize:11.5,fontWeight:700,color:C.green}}>{"Practiced together · "+shortDate(v.practicedOn)}</span>:null}{v.skills.map(k=><span key={k} style={{fontSize:12,fontWeight:600,background:C.blueBg,color:C.onSolid,padding:"3px 9px",borderRadius:20}}>{"✓ "+(SKILL_LABELS[k]?SKILL_LABELS[k].label:k)}</span>)}</div>:null}</div>;
}
