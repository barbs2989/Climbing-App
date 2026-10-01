// Crews › Float plans — every float plan this account has saved on this phone, in one place.
//
// The form used to live on a route's Safety tab, so a plan was only findable by reopening the
// route it was filed against. It belongs with the trip, which is a crew (or a trip with no crew),
// so it lives here now; the route page links in with that route pre-filled. Plans are still
// DEVICE-LOCAL (lib/offline.js), which is what the Privacy Policy says: what you type stays on
// your phone until you send it. Plans saved from the route page before the move are `route:<id>`
// scopes and are listed here too, so nothing filed earlier went missing.
import { useState, useEffect, useRef } from "react";
import { C, SL, FloatPlan, floatPlanState } from "../ClimbMatchCore.jsx";
import { listFloatPlans, saveFloatPlan, deleteFloatPlan } from "./offline";

export default function FloatPlans({who,crews,routeById,focus,onFocusDone,onFiledCrew}){
  const [rows,setRows]=useState(null),[readErr,setReadErr]=useState(false);
  const [open,setOpen]=useState(null),[openSt,setOpenSt]=useState(null),[confirmDel,setConfirmDel]=useState(null);
  const boxRef=useRef(null);
  useEffect(function(){var alive=true;setRows(null);setReadErr(false);listFloatPlans(who).then(function(r){if(alive)setRows(r);}).catch(function(){if(alive){setReadErr(true);setRows([]);}});return function(){alive=false;};},[who]);
  /* The open plan's edits are mirrored into the list, so its row says what the form says without a re-read. */
  useEffect(function(){if(!open||!openSt)return;setRows(function(rs){return rs?rs.map(function(r){return r.scope===open?Object.assign({},r,{form:openSt.form,saved:openSt.saved}):r;}):rs;});},[open,openSt]);
  const openPlan=function(r){setConfirmDel(null);if(open===r.scope){setOpen(null);setOpenSt(null);return;}var st=floatPlanState(r.form);st.saved=!!r.saved;setOpenSt(st);setOpen(r.scope);};
  const create=function(scope,defaults){var st=floatPlanState(defaults);var row={scope:scope,form:st.form,saved:false,savedAt:Date.now()};saveFloatPlan(who,scope,st).catch(function(){});setRows(function(rs){return [row].concat((rs||[]).filter(function(x){return x.scope!==scope;}));});setConfirmDel(null);setOpenSt(st);setOpen(scope);};
  /* A request from elsewhere — the route page's "File a float plan", a crew card's float-plan button — opens that
     plan, creating it with the route filled in if this phone has none for it yet. Waits for the list, so an
     existing plan is opened rather than overwritten by a blank one. */
  useEffect(function(){if(!focus||rows===null||readErr)return;var hit=rows.find(function(r){return r.scope===focus.scope;});if(hit){if(open!==hit.scope)openPlan(hit);}else create(focus.scope,focus.defaults);if(onFocusDone)onFocusDone();/* Twice: arriving from another tab, App resets the scroll to the top after this first runs. */[60,450].forEach(function(ms){setTimeout(function(){if(boxRef.current&&boxRef.current.scrollIntoView)boxRef.current.scrollIntoView({behavior:ms<100?"auto":"smooth",block:"start"});},ms);});},[focus,rows===null,readErr]);
  const remove=function(scope){if(confirmDel!==scope){setConfirmDel(scope);return;}deleteFloatPlan(who,scope).then(function(){setRows(function(rs){return (rs||[]).filter(function(x){return x.scope!==scope;});});if(open===scope){setOpen(null);setOpenSt(null);}setConfirmDel(null);}).catch(function(){setConfirmDel(null);});};
  const crewOf=function(scope){if(!/^crew:/.test(scope))return null;var id=scope.slice(5);return (crews||[]).find(function(c){return String(c.id)===id;})||null;};
  const kind=function(scope){var cr=crewOf(scope);if(cr){var r=routeById&&routeById(cr.routeId);return "Crew"+(r&&r.name?" · "+r.name:"");}return /^crew:/.test(scope)?"Crew":"No crew";};
  const when=function(f){var a=(f.depart||"").trim(),b=(f.ret||"").trim();return a&&b?a+" → back by "+b:b?"Back by "+b:a?"Leaving "+a:"No times yet";};
  return <div ref={boxRef} id="float-plans" style={{marginTop:18,marginBottom:14,scrollMarginTop:150}}>{/* clears the sticky header + nav (~141px) when a link scrolls here */}
    <SL>Float plans</SL>
    <div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 10px",lineHeight:1.5}}>Saved on this phone. Fill one in for each trip, then send it — Share, Email or Save as PDF — to someone staying home. ClimbMatch can't alert anyone for you.</div>
    <button onClick={function(){create("trip:"+Date.now(),{});}} style={{width:"100%",marginBottom:10,padding:"11px",borderRadius:12,border:"1px solid "+C.amber,background:C.amberBg,color:C.amber,fontSize:13.5,fontWeight:800,cursor:"pointer"}}>+ New float plan</button>
    {rows===null?<div role="status" style={{fontSize:12.5,color:C.textMuted,padding:"8px 2px"}}>Loading your float plans…</div>:readErr?<div role="status" style={{fontSize:12.5,color:C.red,padding:"8px 2px",lineHeight:1.5}}>Couldn't read the float plans saved on this phone. Any you saved are still there — try reopening the app.</div>:!rows.length?<div style={{fontSize:12.5,color:C.textMuted,padding:"8px 2px",lineHeight:1.5}}>No float plans on this phone yet. Start one above, or from a crew's float-plan button.</div>:rows.map(function(r){var isOpen=open===r.scope;var f=r.form||{};return <div key={r.scope} style={{background:C.card,border:"1px solid "+(isOpen?C.amber:C.border),borderRadius:12,marginBottom:9,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px"}}>
        <button onClick={function(){openPlan(r);}} aria-expanded={isOpen} style={{flex:1,minWidth:0,textAlign:"left",background:"none",border:"none",padding:0,cursor:"pointer",color:C.text,fontFamily:"inherit"}}><div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.route||"Untitled float plan"}</div><div style={{fontSize:12,color:C.textMuted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{kind(r.scope)+" · "+when(f)}</div></button>
        <span style={{flexShrink:0,fontSize:11,fontWeight:700,borderRadius:20,padding:"2px 9px",color:r.saved?C.green:C.textMuted,background:r.saved?C.greenBg:C.surface,border:"1px solid "+(r.saved?C.green:C.border)}}>{r.saved?"Ready to send":"Draft"}</span>
        <button onClick={function(){remove(r.scope);}} aria-label={confirmDel===r.scope?"Tap again to delete "+(f.route||"this float plan"):"Delete "+(f.route||"this float plan")} style={{flexShrink:0,padding:"6px 9px",borderRadius:8,border:"1px solid "+(confirmDel===r.scope?C.red:C.border),background:confirmDel===r.scope?C.redBg:C.surface,color:confirmDel===r.scope?C.red:C.textSub,fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{confirmDel===r.scope?"Delete?":"Delete"}</button>
      </div>
      {isOpen&&openSt?<div style={{padding:"0 10px 10px"}}><FloatPlan key={r.scope} plan={openSt} onPlan={setOpenSt} who={who} scope={r.scope} coords={f._coords||null} onFiled={/^crew:/.test(r.scope)&&onFiledCrew?function(){onFiledCrew(r.scope.slice(5));}:undefined}/></div>:null}
    </div>;})}
  </div>;
}
