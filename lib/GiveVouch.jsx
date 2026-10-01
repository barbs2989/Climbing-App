// Moved out of ClimbMatchCore.jsx verbatim so it can load lazily, off the first-paint
// bundle. It is rendered only from App (ClimbMatch.jsx) behind React.lazy + Suspense.
import { USE_DB } from "./supabase";
import { clickable } from "./clickable";
import { useRouteSearch } from "./db";
import { useState } from "react";
import { ActionIcon, C, DiscBadges, ME, ROUTES, SKILLS, SKILL_GROUPS, VOUCH_RATINGS, VOUCH_RATINGS_RETIRED, areaPathNames, fuzzyMatchAny, mtnOf, shortDate } from "../ClimbMatchCore.jsx";
import { POP_CLOSE, POP_REMOVE } from "./popupChrome.js";

/* `suggest` is the climber's OWN logbook, resolved to routes by App: [{route, date, together}], the
   climbs logged WITH this partner first. It is what makes the picker usable without typing -- the
   climb you did together is almost always one you logged -- and it is honest under USE_DB, where the
   seed ROUTES are never offered (see the comment on seedMs below). */
export default function GiveVouch({friend,onClose,onSave,suggest,initial}){
  // `initial` is the vouch you already gave this climber: the form opens on YOUR earlier answers, so editing a one-tap vouch adds to it rather than starting over.
  const [route,setRoute]=useState(initial&&initial.route&&initial.route!=="Climbed together"?{name:initial.route,sub:initial.date?"Vouched "+initial.date:""}:null);
  const [q,setQ]=useState("");
  // EMPTY, not five stars each: a default rating is a rating the voucher never gave, published as theirs.
  const [ratings,setRatings]=useState(initial?Object.assign({},initial.ratings):{});
  const [skills,setSkills]=useState(initial?(initial.skills||[]).slice():[]);
  const [text,setText]=useState(initial?initial.text||"":"");
  const [again,setAgain]=useState(!!(initial&&initial.wouldClimbAgain));
  // An older vouch can hold stars for a category the form no longer asks (Punctuality, Gear prep, Belay). Show those rows when editing it, so the voucher can keep, change or clear them -- otherwise they would ride along unseen on every save. Fixed at open, so clearing one does not make its row vanish mid-edit.
  const [rows]=useState(()=>VOUCH_RATINGS.concat(VOUCH_RATINGS_RETIRED.filter(r=>initial&&initial.ratings&&initial.ratings[r.k]).map(r=>Object.assign({},r,{hint:"No longer asked — left blank, it comes off this vouch"}))));
  const fn=friend.name.split(" ")[0];
  const toggle=k=>setSkills(pp=>pp.indexOf(k)>=0?pp.filter(x=>x!==k):[...pp,k]);
  // Tapping the star that is already the rating clears it, so a category can be put back to unrated.
  const rate=(k,n)=>setRatings(r=>{const o=Object.assign({},r);if(o[k]===n)delete o[k];else o[k]=n;return o;});
  const dbVouchSearch=useRouteSearch(USE_DB?q:"");
  const H=(t,m)=><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,margin:m||"0 0 6px",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{t}</div>;
  const sub={fontSize:12,color:C.textSub,lineHeight:1.45,marginBottom:10};
  const pick=(r)=>{setRoute({name:r.name,sub:r.grade+" · "+mtnOf(r)});setQ("");};
  const row=(r,ix,tag)=><div key={r.id} {...clickable(()=>pick(r))} aria-label={"Choose "+r.name} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderTop:ix?"1px solid "+C.borderLight:"none",cursor:"pointer"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div><div style={{fontSize:11,color:C.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{tag?<span style={{color:C.blue,fontWeight:700}}>{tag+" · "}</span>:null}{r.grade+" · "+mtnOf(r)}</div></div><DiscBadges route={r} sm/><span style={{flexShrink:0,fontSize:12,fontWeight:700,color:C.blue,border:"1px solid "+C.blueDim,borderRadius:7,padding:"3px 9px"}}>Choose</span></div>;
  return <div onClick={onClose} role="dialog" aria-label={initial?"Edit your vouch":"Vouch for a climber"} aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:220,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",padding:18,maxHeight:"88vh",overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.borderHi,borderBottom:"none",boxShadow:"0 -12px 40px rgba(0,0,0,0.55)",boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{initial?"Edit your vouch for "+fn:"Vouch for "+fn}</div><button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button></div>
    <div style={{fontSize:13,color:C.textSub,marginBottom:15,lineHeight:1.5}}>A vouch is a public reference for someone you’ve actually climbed with. Every part is optional — only say what you saw.</div>

    {H("Climb you did together")}
    {route?<div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1.5px solid "+C.blue,background:C.blueBg,marginBottom:6}}><span style={{color:C.blue,fontWeight:800,fontSize:15}}>✓</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{route.name}</div><div style={{fontSize:11,color:C.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{route.sub}</div></div><button onClick={()=>setRoute(null)} style={{flexShrink:0,background:"transparent",border:"1px solid "+C.blueDim,color:C.blue,borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Change</button></div>
    :<><div style={{display:"flex",alignItems:"center",gap:8,padding:"0 11px",borderRadius:10,border:"1.5px solid "+(q?C.blue:C.borderHi),background:C.surface,marginBottom:8}}><ActionIcon name="search" size={15} color={q?C.blue:C.textSub}/><input aria-label="Search by climb name or area" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by climb name or area…" style={{flex:1,minWidth:0,padding:"11px 0",border:"none",outline:"none",background:"transparent",color:C.text,fontSize:14}}/>{q?<button onClick={()=>setQ("")} aria-label="Clear search" style={Object.assign({},POP_REMOVE,{width:26,height:26,fontSize:12})}>✕</button>:null}</div>{(()=>{
    var sh=(friend.objectiveIds||[]).filter(function(id){return (ME.objectiveIds||[]).indexOf(id)>=0;});
    if(!q){
      /* Nothing typed: offer what the climber has LOGGED (with this partner first), then shared
         objectives. Never the whole catalog, which is what an empty filter over ROUTES used to list. */
      var seen={},items=[];
      (suggest||[]).forEach(function(s){if(s&&s.route&&!seen[s.route.id]&&!(USE_DB&&ROUTES.some(function(x){return x.id===s.route.id;}))){seen[s.route.id]=1;items.push({r:s.route,logged:true,tag:s.together?("Logged with "+fn+(s.date?" "+shortDate(s.date):"")):("You logged"+(s.date?" "+shortDate(s.date):""))});}});
      sh.forEach(function(id){var r=ROUTES.find(function(x){return x.id===id;});if(r&&!seen[r.id]){seen[r.id]=1;items.push({r:r,tag:"Shared objective"});}});
      if(items.length)return <><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,letterSpacing:0.4,margin:"2px 0 5px"}}>{/* the heading names the SOURCE: a partner with no climbs logged together falls back to shared objectives, which are not in your logbook */items.every(function(it){return it.logged;})?"FROM YOUR LOGBOOK":items.some(function(it){return it.logged;})?"SUGGESTED":"SHARED OBJECTIVES"}</div><div style={{maxHeight:208,overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderRadius:10}}>{items.slice(0,12).map(function(it,ix){return row(it.r,ix,it.tag);})}</div></>;
    }
    /* The seed ROUTES are the DEMO catalog. Under USE_DB they are climbs nobody can have done together, and this picker's choice is PERSISTED -- giveVouch stores the route NAME inside the reason blob -- so offering them writes a demo climb onto a real trust record about another climber. Even a search put them ahead of the real catalog. The DB search below is the only honest source there. */
    var seedMs=USE_DB||!q?[]:ROUTES.filter(function(r){return fuzzyMatchAny(q,r.name,areaPathNames(r.mountainId));});
    var ms=!q?[]:seedMs.concat((dbVouchSearch.data||[]).filter(function(d){return !seedMs.some(function(s){return s.id===d.id;});}));
    if(!ms.length)return <div style={{padding:q?"10px 2px":"2px 2px",color:C.textMuted,fontSize:12}}>{dbVouchSearch.isFetching?"Searching…":dbVouchSearch.isError?"Couldn’t search the catalog — check your connection and try again":!q?"Search for the climb you did together":"No climbs match."}</div>;
    return <div style={{maxHeight:208,overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderRadius:10}}>{ms.slice(0,40).map(function(r,ix){return row(r,ix,null);})}</div>;
  })()}</>}

    {H("How were they?","22px 0 4px")}
    <div style={sub}>Tap a star to rate — tap it again to clear. Leave blank anything you didn’t see.</div>
    {rows.map(({k,label,hint})=>{const v=ratings[k]||0;return <div key={k} role="radiogroup" aria-label={label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:C.text}}>{label}</div><div style={{fontSize:11,color:v?C.amber:C.textMuted,marginTop:1,lineHeight:1.35}}>{v?(["","Poor","Fair","Good","Great","Excellent"][v]):hint}</div></div><div style={{display:"flex",gap:1,flexShrink:0}}>{[1,2,3,4,5].map(n=><button key={n} role="radio" aria-checked={v===n} aria-label={label+": "+n+" of 5"} onClick={()=>rate(k,n)} style={{background:"transparent",border:"none",padding:"2px 3px",cursor:"pointer",fontSize:24,lineHeight:1,color:n<=v?C.amber:C.textMuted}}>{n<=v?"★":"☆"}</button>)}</div></div>;})}

    {H("Skills they’re solid on","22px 0 4px")}
    <div style={sub}>Only what you’ve watched {fn} do.</div>
    {SKILL_GROUPS.map(g=><div key={g.label} style={{marginBottom:10}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,letterSpacing:0.4,marginBottom:6,textTransform:"uppercase"}}>{g.label}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{g.keys.map(k=>{const on=skills.indexOf(k)>=0;return <button key={k} onClick={()=>toggle(k)} aria-pressed={on} style={{padding:"7px 12px",borderRadius:20,border:`1.5px solid ${on?C.blue:C.border}`,background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{(on?"✓ ":"+ ")+SKILLS[k].label}</button>;})}</div></div>)}

    {H("A few words","18px 0 8px")}
    <textarea aria-label="A few words (optional)" value={text} onChange={e=>setText(e.target.value)} placeholder={"What was it like climbing with "+fn+"?"} style={{width:"100%",minHeight:62,padding:"10px 11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,marginBottom:13,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
    <label style={{display:"flex",alignItems:"center",gap:11,marginBottom:16,cursor:"pointer",fontSize:15,fontWeight:700,color:again?C.green:C.text,background:again?C.greenBg:C.surface,border:"1px solid "+(again?C.green:C.border),borderRadius:11,padding:"12px 14px"}}><input type="checkbox" checked={again} onChange={e=>setAgain(e.target.checked)} style={{width:20,height:20,accentColor:C.green,cursor:"pointer",flexShrink:0}}/><span>I&rsquo;d climb with {fn} again</span></label>
    <button onClick={()=>onSave({_targetId:friend.id,from:ME.name,avatar:ME.avatar,route:(route&&route.name)||"Climbed together",date:initial&&initial.date?initial.date:"Today",ratings:ratings,skills:skills,text:text||"",wouldClimbAgain:again})} style={{width:"100%",padding:12,background:C.blueSolid,color:"#fff",border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer"}}>{initial?"Save changes":"Post vouch"}</button>
  </div></div>;
}
